import { isAddress } from 'viem';
import { NextResponse } from 'next/server';
import { ApiError, apiFailure } from '@/lib/server/api';
import { readLinkedAgents } from '@/lib/server/linked-agents';

export async function GET(_request: Request, { params }: { params: Promise<{ address: string }> }) {
  try {
    const address = (await params).address.toLowerCase();
    if (!isAddress(address)) throw new ApiError(400, 'Invalid citizen identity.');
    const agents = await readLinkedAgents(address);
    return NextResponse.json({ agents: agents.filter((agent) => agent.connectedAt) }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return apiFailure(error); }
}
