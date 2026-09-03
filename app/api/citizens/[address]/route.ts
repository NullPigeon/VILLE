import { isAddress } from 'viem';
import { NextRequest, NextResponse } from 'next/server';
import { ApiError, apiFailure } from '@/lib/server/api';
import { database } from '@/lib/server/database';
import { allRows, proposalRecord, readTown, type ProposalRow } from '@/lib/server/records';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ address: string }> }) {
  try {
    const wallet = (await params).address.toLowerCase();
    if (!isAddress(wallet)) throw new ApiError(400, 'Invalid wallet address.');
    const citizens = await database<Array<{ wallet: string; joined_at: string }>>(`landville_citizens?wallet=eq.${wallet}&limit=1`);
    if (!citizens[0]) throw new ApiError(404, 'No citizen account exists for this wallet yet.');
    const [proposals, votes, town] = await Promise.all([
      allRows<ProposalRow>(`landville_proposals?creator_wallet=eq.${wallet}&order=created_at.desc,id.desc`),
      allRows<{ proposal_id: string }>(`landville_votes?select=proposal_id&wallet=eq.${wallet}&order=proposal_id.asc`),
      readTown(),
    ]);
    return NextResponse.json({ citizen: { wallet, joinedAt: citizens[0].joined_at, proposals: proposals.map(proposalRecord), objects: town.objects.filter((object) => object.creatorWallet === wallet), votesCast: votes.length } });
  } catch (error) { return apiFailure(error); }
}
