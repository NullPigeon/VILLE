import { createHash, randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { initialTownMessages, type TownMessage } from '@/lib/chat-data';
import { localScrapyReply, MAYOR_INSTRUCTIONS } from '@/lib/mayor-prompt';
import { walletUsername } from '@/lib/governance';
import { readWalletSession, SESSION_COOKIE } from '@/lib/wallet-session';

export const runtime = 'nodejs';

let localMessages = [...initialTownMessages];
const chatRate = new Map<string, { count: number; resetAt: number }>();

function supabaseConfig() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return url && key ? { url, key } : null;
}

async function readMessages(): Promise<TownMessage[]> {
  const config = supabaseConfig();
  if (!config) return localMessages.slice(-50);

  const response = await fetch(
    `${config.url}/rest/v1/landville_messages?select=id,author,wallet,body,kind,created_at&order=created_at.asc&limit=50`,
    { headers: { apikey: config.key, Authorization: `Bearer ${config.key}` }, cache: 'no-store' },
  );
  if (!response.ok) throw new Error(`Chat read failed with ${response.status}`);
  const rows = (await response.json()) as Array<{
    id: string;
    author: string;
    wallet: string | null;
    body: string;
    kind: TownMessage['kind'];
    created_at: string;
  }>;
  return rows.map((row) => ({ ...row, createdAt: row.created_at }));
}

async function insertMessage(message: TownMessage) {
  const config = supabaseConfig();
  if (!config) {
    localMessages = [...localMessages.slice(-99), message];
    return;
  }

  const response = await fetch(`${config.url}/rest/v1/landville_messages`, {
    method: 'POST',
    headers: {
      apikey: config.key,
      Authorization: `Bearer ${config.key}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify({
      id: message.id,
      author: message.author,
      wallet: message.wallet,
      body: message.body,
      kind: message.kind,
      created_at: message.createdAt,
    }),
  });
  if (!response.ok) throw new Error(`Chat insert failed with ${response.status}`);
}

function extractOutput(result: {
  output?: Array<{ content?: Array<{ type?: string; text?: string }> }>;
}) {
  return (
    result.output
      ?.flatMap((item) => item.content || [])
      .filter((item) => item.type === 'output_text')
      .map((item) => item.text || '')
      .join('') || ''
  ).trim();
}

async function scrapyTownReply(messages: TownMessage[], input: string, wallet: string) {
  if (!process.env.OPENAI_API_KEY) return localScrapyReply(input);
  try {
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-5.4-mini',
        instructions: `${MAYOR_INSTRUCTIONS}\nYou are speaking in the public LANDVILLE Town Chat. Address the room naturally and never reveal private wallet data.`,
        input: messages.slice(-12).map((message) => ({
          role: message.kind === 'MAYOR' ? 'assistant' : 'user',
          content: `${message.author}: ${message.body}`,
        })),
        max_output_tokens: 160,
        store: false,
        safety_identifier: createHash('sha256').update(wallet).digest('hex').slice(0, 64),
      }),
      signal: AbortSignal.timeout(20_000),
    });
    if (!response.ok) throw new Error(`OpenAI request failed with ${response.status}`);
    const reply = extractOutput(await response.json());
    return reply || localScrapyReply(input);
  } catch (error) {
    console.error('Town Mayor fallback:', error);
    return localScrapyReply(input);
  }
}

export async function GET() {
  try {
    return NextResponse.json({ messages: await readMessages(), mode: supabaseConfig() ? 'shared' : 'local' });
  } catch (error) {
    console.error('Town Chat read:', error);
    return NextResponse.json({ error: 'Town Chat is temporarily buried under scrap.' }, { status: 502 });
  }
}

export async function POST(request: NextRequest) {
  const session = readWalletSession(request.cookies.get(SESSION_COOKIE)?.value);
  if (!session) return NextResponse.json({ error: 'Sign your wallet to speak in Town Chat.' }, { status: 401 });

  const now = Date.now();
  const rate = chatRate.get(session.address);
  if (!rate || rate.resetAt <= now) chatRate.set(session.address, { count: 1, resetAt: now + 60_000 });
  else {
    rate.count += 1;
    if (rate.count > 8) return NextResponse.json({ error: 'Eight messages a minute. Breathe, citizen.' }, { status: 429 });
  }

  const body = (await request.json().catch(() => null)) as { body?: string } | null;
  const text = body?.body?.trim().slice(0, 600) || '';
  if (!text) return NextResponse.json({ error: 'Say something first.' }, { status: 400 });

  try {
    const citizenMessage: TownMessage = {
      id: randomUUID(),
      author: `@${walletUsername(session.address)}`,
      wallet: session.address,
      body: text,
      kind: 'CITIZEN',
      createdAt: new Date().toISOString(),
    };
    await insertMessage(citizenMessage);
    const context = await readMessages();
    const mayorMessage: TownMessage = {
      id: randomUUID(),
      author: '@scrapy',
      wallet: null,
      body: await scrapyTownReply(context, text, session.address),
      kind: 'MAYOR',
      createdAt: new Date().toISOString(),
    };
    await insertMessage(mayorMessage);
    return NextResponse.json({ messages: [citizenMessage, mayorMessage] });
  } catch (error) {
    console.error('Town Chat write:', error);
    return NextResponse.json({ error: 'Town Chat failed to broadcast.' }, { status: 502 });
  }
}
