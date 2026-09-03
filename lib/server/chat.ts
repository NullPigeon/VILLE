import 'server-only';
import { createHash } from 'node:crypto';
import type { TownMessage } from '@/lib/chat-data';
import type { VotingPowerSnapshot } from '@/lib/governance';
import { localScrapyReply, MAYOR_INSTRUCTIONS } from '@/lib/mayor-prompt';
import { ApiError } from '@/lib/server/api';
import { assertCitizen, database, enforceRate, rpc } from '@/lib/server/database';
import { readVotingSnapshot } from '@/lib/server/voting';

export type ChatChannel = 'TOWN' | 'WORKSHOP';
type MessageRow = {
  id: string; author: string; wallet: string | null; body: string; kind: TownMessage['kind']; created_at: string;
  channel: ChatChannel; owner_wallet: string | null; request_id: string | null; hold_snapshot: VotingPowerSnapshot | null;
};
const channelFilter = (channel: ChatChannel, wallet: string) => `channel=eq.${channel}&${channel === 'WORKSHOP' ? `owner_wallet=eq.${wallet}` : 'owner_wallet=is.null'}`;
const messageRecord = (row: MessageRow): TownMessage => ({ id: row.id, author: row.author, wallet: row.wallet, body: row.body, kind: row.kind, createdAt: row.created_at });

export async function readMessages(channel: ChatChannel, wallet = '', before?: string) {
  const filter = channelFilter(channel, wallet);
  let cursor = '';
  if (before) {
    if (!/^[a-zA-Z0-9-]{1,100}$/.test(before)) throw new ApiError(400, 'Invalid history cursor.');
    const anchor = await database<MessageRow[]>(`landville_messages?${filter}&id=eq.${before}&limit=1`);
    if (!anchor.length) throw new ApiError(404, 'History cursor not found.');
    cursor = `&or=${encodeURIComponent(`(created_at.lt.${anchor[0].created_at},and(created_at.eq.${anchor[0].created_at},id.lt.${before}))`)}`;
  }
  const rows = await database<MessageRow[]>(`landville_messages?${filter}${cursor}&order=created_at.desc,id.desc&limit=51`);
  const page = rows.slice(0, 50);
  return { messages: page.map(messageRecord).reverse(), hasMore: rows.length > 50, nextCursor: page.at(-1)?.id || null };
}

async function generateReply(channel: ChatChannel, messages: TownMessage[], input: string, wallet: string) {
  if (!process.env.OPENAI_API_KEY) return { text: localScrapyReply(input), source: 'local' as const };
  try {
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST', headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-5.4-mini', store: false,
        instructions: `${MAYOR_INSTRUCTIONS}\n${channel === 'TOWN' ? 'This is the public Town Chat. Address the room naturally.' : 'This is the citizen’s personal workshop. Refine their proposal without claiming it has been submitted.'}\nNever claim an object already exists without evidence in the supplied context.`,
        input: messages.slice(-12).map((message) => ({ role: message.kind === 'MAYOR' ? 'assistant' : 'user', content: `${message.author}: ${message.body}` })),
        max_output_tokens: 200, safety_identifier: createHash('sha256').update(wallet).digest('hex'),
      }), signal: AbortSignal.timeout(20_000),
    });
    if (!response.ok) throw new Error();
    const result = await response.json() as { output?: Array<{ content?: Array<{ type?: string; text?: string }> }> };
    const text = result.output?.flatMap((entry) => entry.content || []).filter((entry) => entry.type === 'output_text').map((entry) => entry.text || '').join('').trim();
    if (!text) throw new Error();
    return { text: text.slice(0, 600), source: 'openai' as const };
  } catch { return { text: localScrapyReply(input), source: 'local' as const }; }
}

export async function sendMessage(wallet: string, channel: ChatChannel, body: string, requestId: string) {
  await assertCitizen(wallet);
  await enforceRate(wallet, 'chat', 8);
  const submission = { p_wallet: wallet, p_request_id: requestId, p_channel: channel, p_body: body };
  let citizen: MessageRow;
  try {
    // Everyone is entitled to the first ten; no balance needs to be invented if RPC is unavailable.
    citizen = await rpc<MessageRow>('landville_submit_message', { ...submission, p_snapshot: null });
  } catch (error) {
    if (!(error instanceof ApiError) || error.code !== 'HOLD_CHECK_REQUIRED') throw error;
    const snapshot = await readVotingSnapshot(wallet);
    citizen = await rpc<MessageRow>('landville_submit_message', { ...submission, p_snapshot: snapshot });
  }
  const replyId = `reply-${citizen.id}`;
  const existing = await database<MessageRow[]>(`landville_messages?id=eq.${replyId}&${channelFilter(channel, wallet)}&limit=1`);
  if (existing[0]) return { messages: [messageRecord(citizen), messageRecord(existing[0])], source: 'stored' as const };
  const context = await readMessages(channel, wallet);
  const reply = await generateReply(channel, context.messages, body, wallet);
  await database('landville_messages?on_conflict=id', {
    method: 'POST', headers: { Prefer: 'resolution=ignore-duplicates,return=minimal' },
    body: JSON.stringify({ id: replyId, author: '@scrapy', wallet: null, body: reply.text.slice(0, 600), kind: 'MAYOR', channel, owner_wallet: channel === 'WORKSHOP' ? wallet : null }),
  });
  const saved = await database<MessageRow[]>(`landville_messages?id=eq.${replyId}&${channelFilter(channel, wallet)}&limit=1`);
  return { messages: [messageRecord(citizen), ...saved.map(messageRecord)], source: reply.source };
}
