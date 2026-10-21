import { NextRequest, NextResponse } from 'next/server';
import { apiFailure, requireMutation, requireWallet } from '@/lib/server/api';
import { enforceRate } from '@/lib/server/database';
import { verifyPrivyIdentity } from '@/lib/server/privy';
import { createRobotWallet, robotWalletView } from '@/lib/server/robot-wallet';

export const runtime = 'nodejs';
const noStore = { 'Cache-Control': 'private, no-store' };

export async function GET(request: NextRequest) {
  try { return NextResponse.json(await robotWalletView(requireWallet(request)), { headers: noStore }); }
  catch (error) { return apiFailure(error); }
}

export async function POST(request: NextRequest) {
  try {
    requireMutation(request);
    const owner = requireWallet(request);
    const identity = await verifyPrivyIdentity(request.headers.get('authorization'));
    await enforceRate(owner, 'robot-wallet-create', 3);
    return NextResponse.json(await createRobotWallet(owner, identity), { headers: noStore });
  } catch (error) { return apiFailure(error); }
}
