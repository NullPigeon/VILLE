import { createHash, randomBytes } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { LINKED_AGENT_LIMIT, validateLinkedAgent } from '@/lib/linked-agents';
import { ApiError, apiFailure, jsonBody, requireMutation, requireWallet } from '@/lib/server/api';
import { enforceRate, rpc } from '@/lib/server/database';
import { linkedAgentRecord, readLinkedAgents, type LinkedAgentRow } from '@/lib/server/linked-agents';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const owner = requireWallet(request);
    return NextResponse.json({ agents: await readLinkedAgents(owner), limit: LINKED_AGENT_LIMIT }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) { return apiFailure(error); }
}

export async function POST(request: NextRequest) {
  try {
    requireMutation(request);
    const owner = requireWallet(request);
    const body = await jsonBody(request);
    if (Object.keys(body).some((key) => !['name', 'description'].includes(key))) throw new ApiError(400, 'Unsupported agent setting.');
    let agent;
    try { agent = validateLinkedAgent(body); }
    catch (error) { throw new ApiError(400, error instanceof Error ? error.message : 'Invalid agent.'); }
    await enforceRate(owner, 'linked-agent-create', 5);
    const token = `lvag_${randomBytes(32).toString('hex')}`;
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const row = await rpc<LinkedAgentRow>('landville_register_linked_agent', {
      p_owner: owner, p_name: agent.name, p_description: agent.description, p_token_hash: tokenHash,
    });
    return NextResponse.json({ agent: linkedAgentRecord(row), token }, { status: 201, headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) { return apiFailure(error); }
}
