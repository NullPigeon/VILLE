import { NextRequest, NextResponse } from 'next/server';
import { apiFailure, jsonBody, requireMutation, requireWallet } from '@/lib/server/api';
import { assertCitizen, database, enforceRate, rpc } from '@/lib/server/database';
import type { VotingPowerSnapshot } from '@/lib/governance';
import { proposalId } from '@/lib/server/validation';
import { readVotingSnapshot } from '@/lib/server/voting';

type ExistingLike = { snapshot: VotingPowerSnapshot };

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    requireMutation(request);
    const wallet = requireWallet(request);
    await assertCitizen(wallet);
    await jsonBody(request);
    const id = proposalId((await params).id);
    await enforceRate(wallet, 'module-like', 12);

    // A duplicate click is idempotent and does not need another chain request.
    const existing = await database<ExistingLike[]>(
      `landville_module_likes?select=snapshot&module_id=eq.${id}&wallet=eq.${wallet}&limit=1`,
    );
    const snapshot = existing[0]?.snapshot || await readVotingSnapshot(wallet);
    const state = await rpc<Record<string, unknown>>('landville_like_module', {
      p_module_id: id,
      p_wallet: wallet,
      p_snapshot: snapshot,
    });
    return NextResponse.json({ liked: true, state }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) { return apiFailure(error); }
}
