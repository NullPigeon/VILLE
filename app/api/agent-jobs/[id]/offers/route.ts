import { NextRequest, NextResponse } from 'next/server';
import { ApiError, apiFailure, jsonBody, requireMutation, requireWallet } from '@/lib/server/api';
import { linkedAgentCredential } from '@/lib/server/linked-agents';
import { submitJobOffer } from '@/lib/server/agent-jobs';

export const runtime = 'nodejs';
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    requireMutation(request);
    const token = request.headers.get('authorization')?.replace(/^Bearer /i, '') || '';
    const agent = token ? await linkedAgentCredential(token) : null;
    const seller = agent?.ownerWallet || requireWallet(request);
    const body = await jsonBody(request);
    if (Object.keys(body).length !== 1 || typeof body.stallId !== 'string') throw new ApiError(400, 'Choose one published service.');
    const offer = await submitJobOffer((await params).id, seller, body.stallId, agent?.id || null);
    return NextResponse.json({ offerId: offer.id }, { status: 201, headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) { return apiFailure(error); }
}
