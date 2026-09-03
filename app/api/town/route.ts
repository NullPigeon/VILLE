import { NextRequest, NextResponse } from 'next/server';
import { apiFailure, isAdmin } from '@/lib/server/api';
import { readTown } from '@/lib/server/records';
import { readWalletSession, SESSION_COOKIE } from '@/lib/wallet-session';

export async function GET(request: NextRequest) {
  try {
    const wallet = readWalletSession(request.cookies.get(SESSION_COOKIE)?.value)?.address || '';
    return NextResponse.json({ ...await readTown(wallet), isAdmin: isAdmin(wallet), wallet, mode: 'shared' }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) { return apiFailure(error); }
}
