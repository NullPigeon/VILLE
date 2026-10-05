import { NextRequest, NextResponse } from 'next/server';
import { ApiError, apiFailure, jsonBody, requireMutation, requireWallet } from '@/lib/server/api';
import { enforceRate, rpc } from '@/lib/server/database';
import { generateYardReply } from '@/lib/server/personal-agent-ai';
import { existingYardExchange, readPersonalAgent, readYardMessages, yardMessage } from '@/lib/server/personal-agents';
import { field, requestId } from '@/lib/server/validation';
import type { YardMessage } from '@/lib/personal-agent';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  try {
    const owner = requireWallet(request);
    if (!await readPersonalAgent(owner)) throw new ApiError(404, 'Build your robot first.');
    return NextResponse.json({ messages: await readYardMessages(owner) }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) { return apiFailure(error); }
}

export async function POST(request: NextRequest) {
  try {
    requireMutation(request);
    const owner = requireWallet(request);
    const body = await jsonBody(request);
    if (Object.keys(body).some((key) => !['body', 'requestId', 'summonMayor'].includes(key))
      || (body.summonMayor !== undefined && typeof body.summonMayor !== 'boolean')) {
      throw new ApiError(400, 'Invalid yard message.');
    }
    const text = field(body, 'body', 1, 600);
    const id = requestId(body.requestId);
    const existing = await existingYardExchange(owner, id);
    if (existing.length) {
      if (!existing.some((message) => message.role === 'CITIZEN' && message.body === text)
        || !existing.some((message) => message.role === (body.summonMayor === true ? 'MAYOR' : 'AGENT'))) {
        throw new ApiError(409, 'This message ID already belongs to another request.');
      }
      return NextResponse.json({ messages: existing }, { headers: { 'Cache-Control': 'private, no-store' } });
    }
    const agent = await readPersonalAgent(owner);
    if (!agent) throw new ApiError(404, 'Build your robot first.');
    await enforceRate(owner, 'yard-chat', 4);
    const history = await readYardMessages(owner);
    if (history.filter((message) => message.role === 'CITIZEN'
      && new Date(message.createdAt).toISOString().slice(0, 10) === new Date().toISOString().slice(0, 10)).length >= 20) {
      throw new ApiError(429, 'Your yard reached 20 AI messages for this UTC day.');
    }
    const reply = await generateYardReply(agent, history, text, body.summonMayor === true);
    const rows = await rpc<Array<{ id: string; role: YardMessage['role']; body: string; created_at: string; owner_wallet: string; request_id: string }>>(
      'landville_save_yard_exchange', {
        p_owner: owner, p_request_id: id, p_body: text, p_reply: reply,
        p_role: body.summonMayor === true ? 'MAYOR' : 'AGENT',
      },
    );
    return NextResponse.json({ messages: rows.map(yardMessage) }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) { return apiFailure(error); }
}
