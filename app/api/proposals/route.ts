import { NextRequest, NextResponse } from 'next/server';
import { ApiError, apiFailure, jsonBody, requireMutation, requireWallet } from '@/lib/server/api';
import { assertCitizen, database, enforceRate, rpc } from '@/lib/server/database';
import { proposalRecord, type ProposalRow } from '@/lib/server/records';
import { field, oneOf, requestId } from '@/lib/server/validation';
import { readVotingSnapshot } from '@/lib/server/voting';

export async function POST(request: NextRequest) {
  try {
    requireMutation(request);
    const wallet = requireWallet(request);
    await assertCitizen(wallet);
    const body = await jsonBody(request);
    const id = requestId(body.requestId);
    const title = field(body, 'title', 4, 80);
    const summary = field(body, 'summary', 10, 2000);
    const category = oneOf(body.category, ['UTILITY','GAME','ART','MEME','TOKEN','OTHER']);
    const district = oneOf(body.district, ['THE DUMP','TOKEN ALLEY','MARKET','MEME PIT','TOWNWIDE']);
    // An uncertain HTTP result can be retried without creating a second proposal.
    const existing = await database<ProposalRow[]>(`landville_proposals?creator_wallet=eq.${wallet}&request_id=eq.${id}&limit=1`);
    await enforceRate(wallet, 'proposal', 8);
    if (!existing.length) {
      const active = await database<Array<{ id: string }>>(`landville_proposals?select=id&creator_wallet=eq.${wallet}&status=in.(LIVE,PASSED,BUILDING)&limit=1`);
      if (active.length) throw new ApiError(409, `Your proposal ${active[0].id} is still active. Submit another after it is built or rejected.`);
    }
    // The RPC repeats this check under a wallet lock; the read above only saves an RPC balance request.
    const snapshot = existing[0]?.eligibility_snapshot || await readVotingSnapshot(wallet);
    const row = await rpc<ProposalRow>('landville_create_proposal', {
      p_wallet: wallet, p_request_id: id, p_title: title, p_summary: summary, p_category: category, p_district: district,
      p_snapshot: snapshot,
    });
    return NextResponse.json({ proposal: proposalRecord(row) });
  } catch (error) { return apiFailure(error); }
}
