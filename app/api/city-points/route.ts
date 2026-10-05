import { NextRequest, NextResponse } from 'next/server';
import type { CityPointsState } from '@/lib/city-points';
import { ApiError, apiFailure, jsonBody, requireMutation, requireWallet } from '@/lib/server/api';
import { assertCitizen, enforceRate, rpc } from '@/lib/server/database';
import { readVotingSnapshot } from '@/lib/server/voting';
import { readWalletSession, SESSION_COOKIE } from '@/lib/wallet-session';

export async function GET(request: NextRequest) {
  try {
    const wallet = readWalletSession(request.cookies.get(SESSION_COOKIE)?.value)?.address || '';
    const state = await rpc<CityPointsState>('landville_city_points_state', { p_wallet: wallet });
    return NextResponse.json(state, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) { return apiFailure(error); }
}

export async function POST(request: NextRequest) {
  try {
    requireMutation(request);
    const wallet = requireWallet(request);
    await assertCitizen(wallet);
    const body = await jsonBody(request);
    if (Object.keys(body).length) throw new ApiError(400, 'Check-in does not accept settings.');
    await enforceRate(wallet, 'city-check-in', 6);
    const before = await rpc<CityPointsState>('landville_city_points_state', { p_wallet: wallet });
    if (before.checkedInToday && before.farm) {
      return NextResponse.json(before, { headers: { 'Cache-Control': 'private, no-store' } });
    }
    let snapshot = null;
    let verificationUnavailable = false;
    let minimumNotMet = false;
    if (before.hasAgent) {
      try {
        const verified = await readVotingSnapshot(wallet);
        if (verified.source === 'chain') {
          if (BigInt(verified.tokenBalance) >= 250_000n * 10n ** 18n) snapshot = verified;
          else minimumNotMet = true;
        }
      } catch (error) {
        if (!(error instanceof ApiError) || ![502,503].includes(error.status)) throw error;
        verificationUnavailable = true;
      }
    }
    const state = await rpc<CityPointsState>('landville_city_check_in', { p_wallet: wallet, p_snapshot: snapshot });
    return NextResponse.json({ ...state, verificationUnavailable, minimumNotMet }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) { return apiFailure(error); }
}
