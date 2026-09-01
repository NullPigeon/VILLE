import { NextRequest, NextResponse } from 'next/server';
import {
  localScrapyReply,
  MAYOR_INSTRUCTIONS,
  type MayorChatMessage,
} from '@/lib/mayor-prompt';

export const runtime = 'nodejs';

const REQUEST_LIMIT = 20;
const WINDOW_MS = 60_000;
const visitors = new Map<string, { count: number; resetAt: number }>();

function getVisitorId(request: NextRequest) {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
}

function isRateLimited(visitorId: string) {
  const now = Date.now();
  const current = visitors.get(visitorId);

  if (!current || current.resetAt <= now) {
    visitors.set(visitorId, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }

  current.count += 1;
  return current.count > REQUEST_LIMIT;
}

function sanitizeMessages(value: unknown): MayorChatMessage[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter(
      (message): message is MayorChatMessage =>
        typeof message === 'object' &&
        message !== null &&
        'role' in message &&
        (message.role === 'user' || message.role === 'assistant') &&
        'content' in message &&
        typeof message.content === 'string',
    )
    .slice(-12)
    .map((message) => ({
      role: message.role,
      content: message.content.trim().slice(0, 1_000),
    }))
    .filter((message) => message.content.length > 0);
}

export async function POST(request: NextRequest) {
  const visitorId = getVisitorId(request);
  if (isRateLimited(visitorId)) {
    return NextResponse.json(
      { error: 'Mayor is processing too much municipal nonsense. Try again shortly.' },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const messages = sanitizeMessages(
    typeof body === 'object' && body !== null && 'messages' in body
      ? body.messages
      : undefined,
  );
  const latestUserMessage = [...messages]
    .reverse()
    .find((message) => message.role === 'user')?.content;

  if (!latestUserMessage) {
    return NextResponse.json({ error: 'A citizen message is required.' }, { status: 400 });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({
      reply: localScrapyReply(latestUserMessage),
      source: 'local',
    });
  }

  try {
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-5.4-mini',
        instructions: MAYOR_INSTRUCTIONS,
        input: messages,
        max_output_tokens: 220,
        store: false,
      }),
      signal: AbortSignal.timeout(20_000),
    });

    if (!response.ok) throw new Error(`OpenAI request failed with ${response.status}`);

    const result = (await response.json()) as {
      output_text?: string;
      output?: Array<{
        type?: string;
        content?: Array<{ type?: string; text?: string }>;
      }>;
    };
    const reply = (
      result.output_text ||
      result.output
        ?.flatMap((item) => item.content || [])
        .filter((item) => item.type === 'output_text')
        .map((item) => item.text || '')
        .join('') ||
      ''
    ).trim();
    if (!reply) throw new Error('OpenAI returned an empty response');

    return NextResponse.json({ reply, source: 'openai' });
  } catch (error) {
    console.error('Mayor API fallback:', error);
    return NextResponse.json({
      reply: localScrapyReply(latestUserMessage),
      source: 'local',
    });
  }
}
