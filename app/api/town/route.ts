import { NextRequest, NextResponse } from 'next/server';
import { apiFailure, isAdmin } from '@/lib/server/api';
import { workerActor } from '@/lib/server/builds';
import { rpc } from '@/lib/server/database';
import { readTown } from '@/lib/server/records';
import { readWalletSession, SESSION_COOKIE } from '@/lib/wallet-session';

export async function GET(request: NextRequest) {
  try {
    const wallet = readWalletSession(request.cookies.get(SESSION_COOKIE)?.value)?.address || '';
    // GitHub scheduled workflows can be delayed. Settle expired votes before
    // returning the public town state, but never claim or run a build here.
    await rpc('landville_claim_build', { p_actor: workerActor(), p_claim: false });
    return NextResponse.json({ ...await readTown(wallet), isAdmin: isAdmin(wallet), wallet, mode: 'shared' }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) { return apiFailure(error); }
}
