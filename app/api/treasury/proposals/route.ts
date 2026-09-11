import { NextRequest, NextResponse } from 'next/server';
import { parseEther } from 'viem';
import { ApiError, apiFailure, jsonBody, requireMutation, requireWallet } from '@/lib/server/api';
import { assertCitizen, enforceRate, rpc } from '@/lib/server/database';
import { field, oneOf } from '@/lib/server/validation';
import { readTreasuryState, treasuryVotingWallet } from '@/lib/server/treasury';
import { readVotingSnapshot } from '@/lib/server/voting';
import type { TreasuryProposalCategory } from '@/lib/treasury';

const categories = ['BUY','STAKE','DISTRIBUTE','OPERATIONS','REWARD_POLICY','OTHER'] as const satisfies readonly TreasuryProposalCategory[];

export async function POST(request: NextRequest) {
  try {
    requireMutation(request);
    const wallet = requireWallet(request);
    await assertCitizen(wallet);
    await enforceRate(wallet, 'treasury-proposal', 6);
    const body = await jsonBody(request);
    const category = oneOf(body.category, categories);
    const votingWallet = await treasuryVotingWallet(wallet);
    if (!votingWallet) throw new ApiError(403, 'Link the wallet holding SCRAPY to this citizen account first.');
    const snapshot = await readVotingSnapshot(votingWallet);
    if (snapshot.source !== 'chain' || BigInt(snapshot.tokenBalance) <= 0n) throw new ApiError(403, 'Hold SCRAPY in your linked wallet to submit a Treasury proposal.');
    const treasury = await readTreasuryState();
    if (!treasury.configured) throw new ApiError(503, 'The SCRAPY Treasury wallet is not configured yet.');
    let requestedWei: string | null = null;
    if (typeof body.requestedEth === 'string' && body.requestedEth.trim()) {
      try { requestedWei = parseEther(body.requestedEth.trim()).toString(); }
      catch { throw new ApiError(400, 'Enter a valid positive ETH amount.'); }
    }
    let policyMinimum: string | null = null;
    if (category === 'REWARD_POLICY') {
      const value = typeof body.policyMinimumTokens === 'string' ? body.policyMinimumTokens.trim() : '';
      if (!/^[1-9][0-9]{0,17}$/.test(value)) throw new ApiError(400, 'Enter the proposed minimum SCRAPY hold as a whole token amount.');
      policyMinimum = value;
    }
    const proposal = await rpc('landville_submit_treasury_proposal', {
      p_wallet: wallet, p_title: field(body, 'title', 4, 80), p_summary: field(body, 'summary', 20, 2000),
      p_category: category, p_requested_wei: requestedWei, p_policy_minimum_tokens: policyMinimum,
      p_snapshot: snapshot, p_treasury_balance_wei: treasury.balanceWei,
    });
    return NextResponse.json({ proposal }, { status: 201 });
  } catch (error) { return apiFailure(error); }
}
