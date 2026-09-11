import { NextRequest, NextResponse } from 'next/server';
import { ApiError, apiFailure, jsonBody, requireMutation, requireWallet } from '@/lib/server/api';
import { assertCitizen, database, enforceRate, rpc } from '@/lib/server/database';
import { oneOf, treasuryProposalId } from '@/lib/server/validation';
import { treasuryVotingSnapshot, treasuryVotingWallet } from '@/lib/server/treasury';

type ProposalRow = { id: string; snapshot_block: string };

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    requireMutation(request);
    const wallet = requireWallet(request);
    await assertCitizen(wallet);
    await enforceRate(wallet, 'treasury-vote', 20);
    const id = treasuryProposalId((await params).id);
    const choice = oneOf((await jsonBody(request)).choice, ['YES','NO']);
    const rows = await database<ProposalRow[]>(`landville_treasury_proposals?select=id,snapshot_block&id=eq.${id}&limit=1`);
    if (!rows[0]) return NextResponse.json({ error: 'Treasury proposal not found.' }, { status: 404 });
    const votingWallet = await treasuryVotingWallet(wallet);
    if (!votingWallet) throw new ApiError(403, 'Link the wallet holding SCRAPY to this citizen account first.');
    const snapshot = await treasuryVotingSnapshot(votingWallet, rows[0].snapshot_block);
    const receipt = await rpc('landville_cast_treasury_vote', { p_id: id, p_wallet: wallet, p_choice: choice, p_snapshot: snapshot });
    return NextResponse.json({ receipt });
  } catch (error) { return apiFailure(error); }
}
