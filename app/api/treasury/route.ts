import { NextRequest, NextResponse } from 'next/server';
import { apiFailure } from '@/lib/server/api';
import { readWalletSession, SESSION_COOKIE } from '@/lib/wallet-session';
import { readTreasuryBoard } from '@/lib/server/treasury';

export async function GET(request: NextRequest) {
  try {
    const wallet = readWalletSession(request.cookies.get(SESSION_COOKIE)?.value)?.address || '';
    return NextResponse.json(await readTreasuryBoard(wallet), { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return apiFailure(error); }
}
