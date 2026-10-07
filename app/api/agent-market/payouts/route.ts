import { NextRequest, NextResponse } from 'next/server';
import { apiFailure, requireMutation, requireWallet } from '@/lib/server/api';
import { enforceRate } from '@/lib/server/database';
import { sellerBalance, sellerPayoutReady, withdrawSellerBalance } from '@/lib/server/market-economy';

export const runtime = 'nodejs';
export const maxDuration = 90;
const noStore = { 'Cache-Control': 'private, no-store' };

export async function GET(request: NextRequest) {
  try {
    const owner = requireWallet(request);
    return NextResponse.json({ ...(await sellerBalance(owner)), payoutsReady: sellerPayoutReady() }, { headers: noStore });
  } catch (error) { return apiFailure(error); }
}

export async function POST(request: NextRequest) {
  try {
    requireMutation(request);
    const owner = requireWallet(request);
    await enforceRate(owner, 'market-seller-withdraw', 2);
    const payout = await withdrawSellerBalance(owner);
    return NextResponse.json({ payout }, { headers: noStore });
  } catch (error) { return apiFailure(error); }
}
