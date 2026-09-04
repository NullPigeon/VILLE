import 'server-only';
import type { TownMessage } from '@/lib/chat-data';
import type { VotingPowerSnapshot } from '@/lib/governance';
import { localScrapyReply } from '@/lib/mayor-prompt';
import { requestMayorReply } from '@/lib/server/mayor-ai';
import { ApiError } from '@/lib/server/api';
import { assertCitizen, database, enforceRate, rpc } from '@/lib/server/database';
import { readVotingSnapshot } from '@/lib/server/voting';
import { citizenIdentities } from '@/lib/server/citizens';
import { citizenLabel } from '@/lib/citizen-identity';

export type ChatChannel = 'TOWN' | 'WORKSHOP';
type MessageRow = {
  id: string; author: string; wallet: string | null; body: string; kind: TownMessage['kind']; created_at: string;
  channel: ChatChannel; owner_wallet: string | null; request_id: string | null; hold_snapshot: VotingPowerSnapshot | null;
  ai_source?: 'openai' | 'scripted' | null;
  ask_scrapy?: boolean;
};
const channelFilter = (channel: ChatChannel, wallet: string) => `channel=eq.${channel}&${channel === 'WORKSHOP' ? `owner_wallet=eq.${wallet}` : 'owner_wallet=is.null'}`;
const messageRecord = (row: MessageRow): TownMessage => ({ id: row.id, author: row.author, wallet: row.wallet, body: row.body, kind: row.kind, createdAt: row.created_at, aiSource: row.ai_source || null, askScrapy: row.kind === 'CITIZEN' && row.ask_scrapy === true });
async function messageRecords(rows: MessageRow[]) {
  const identities = await citizenIdentities(rows.filter((row) => row.kind === 'CITIZEN' && row.wallet).map((row) => row.wallet!));
  return rows.map((row): TownMessage => {
    const message = messageRecord(row);
    if (row.kind === 'MAYOR') return { ...message, author: 'Scrapy #1', citizenNumber: 1 };
    const identity = row.wallet ? identities.get(row.wallet) : undefined;
    return identity ? { ...message, author: citizenLabel(identity), citizenNumber: identity.citizenNumber, avatar: identity.avatar } : message;
  });
}

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
  return { messages: (await messageRecords(page)).reverse(), hasMore: rows.length > 50, nextCursor: page.at(-1)?.id || null };
}

export async function sendMessage(wallet: string, channel: ChatChannel, body: string, requestId: string, askScrapy = false) {
  if (channel !== 'TOWN') throw new ApiError(410, 'Workshop is now a read-only private archive. Open Town Chat to write publicly. Nothing was posted.');
  await assertCitizen(wallet);
  // Refuse before consuming quota or saving a citizen message if the upgrade is missing.
  await database('landville_messages?select=ai_source,ask_scrapy&limit=0');
  await enforceRate(wallet, 'chat', 8);
  const submission = { p_wallet: wallet, p_request_id: requestId, p_body: body, p_ask_scrapy: askScrapy };
  let citizen: MessageRow;
  try {
    // Everyone is entitled to the first ten; no balance needs to be invented if RPC is unavailable.
    citizen = await rpc<MessageRow>('landville_submit_public_message', { ...submission, p_snapshot: null });
  } catch (error) {
    if (!(error instanceof ApiError) || error.code !== 'HOLD_CHECK_REQUIRED') throw error;
    const snapshot = await readVotingSnapshot(wallet);
    citizen = await rpc<MessageRow>('landville_submit_public_message', { ...submission, p_snapshot: snapshot });
  }
  if (!askScrapy) return { messages: await messageRecords([citizen]), source: 'citizen' as const };
  const replyId = `reply-${citizen.id}`;
  const existing = await database<MessageRow[]>(`landville_messages?id=eq.${replyId}&${channelFilter(channel, wallet)}&limit=1`);
  if (existing[0]) return { messages: await messageRecords([citizen, existing[0]]), source: 'stored' as const };
  const context = await readMessages(channel, wallet);
  const latest = [...context.messages.filter((message) => message.id !== citizen.id).slice(-11), messageRecord(citizen)];
  const generated = await requestMayorReply(latest, wallet);
  const reply = generated.ok ? { text: generated.text, source: 'openai' as const } : { text: localScrapyReply(body), source: 'scripted' as const };
  await database('landville_messages?on_conflict=id', {
    method: 'POST', headers: { Prefer: 'resolution=ignore-duplicates,return=minimal' },
    body: JSON.stringify({ id: replyId, author: '@scrapy', wallet: null, body: reply.text.slice(0, 600), kind: 'MAYOR', channel: 'TOWN', owner_wallet: null, ai_source: reply.source }),
  });
  const saved = await database<MessageRow[]>(`landville_messages?id=eq.${replyId}&${channelFilter(channel, wallet)}&limit=1`);
  return { messages: await messageRecords([citizen, ...saved]), source: reply.source };
}
