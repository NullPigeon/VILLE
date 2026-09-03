import { NextRequest, NextResponse } from 'next/server';
import { readWalletSession, SESSION_COOKIE } from '@/lib/wallet-session';
import { apiFailure } from '@/lib/server/api';
import { assertCitizen } from '@/lib/server/database';

export async function GET(request: NextRequest) {
  try {
  const session = readWalletSession(request.cookies.get(SESSION_COOKIE)?.value);
  if (session) await assertCitizen(session.address);
  return NextResponse.json({ address: session?.address || null });
  } catch (error) { return apiFailure(error); }
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.delete(SESSION_COOKIE);
  return response;
}
