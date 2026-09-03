import { NextRequest, NextResponse } from 'next/server';
import { apiFailure, jsonBody, requireMutation, requireWallet } from '@/lib/server/api';
import { assertCitizen, database, enforceRate, rpc } from '@/lib/server/database';
import { voteReceipt, type VoteRow } from '@/lib/server/records';
import { oneOf, proposalId } from '@/lib/server/validation';
import { readVotingSnapshot } from '@/lib/server/voting';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    requireMutation(request);
    const wallet = requireWallet(request);
    await assertCitizen(wallet);
    const id = proposalId((await params).id);
    const choice = oneOf((await jsonBody(request)).choice, ['YES','NO']);
    await enforceRate(wallet, 'vote', 20);
    const existing = await database<VoteRow[]>(`landville_votes?proposal_id=eq.${id}&wallet=eq.${wallet}&limit=1`);
    const snapshot = existing[0]?.snapshot || await readVotingSnapshot(wallet);
    const row = await rpc<VoteRow>('landville_cast_vote', { p_id: id, p_wallet: wallet, p_choice: choice, p_snapshot: snapshot });
    return NextResponse.json({ receipt: voteReceipt(row) });
  } catch (error) { return apiFailure(error); }
}
