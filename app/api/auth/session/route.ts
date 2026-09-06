import { NextRequest, NextResponse } from 'next/server';
import { readWalletSession, SESSION_COOKIE } from '@/lib/wallet-session';
import { apiFailure } from '@/lib/server/api';
import { assertCitizen, citizenAccount } from '@/lib/server/database';

export async function GET(request: NextRequest) {
  try {
  const session = readWalletSession(request.cookies.get(SESSION_COOKIE)?.value);
  if (!session) return NextResponse.json({ address: null }, { headers: { 'Cache-Control': 'private, no-store' } });
  await assertCitizen(session.address);
  const citizen = await citizenAccount(session.address);
  return NextResponse.json({ address: session.address, linkedWallet: citizen?.linked_wallet || null, email: citizen?.email || null, method: session.method || 'wallet' }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) { return apiFailure(error); }
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.delete(SESSION_COOKIE);
  return response;
}
