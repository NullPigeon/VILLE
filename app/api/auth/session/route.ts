import { NextRequest, NextResponse } from 'next/server';
import { readWalletSession, SESSION_COOKIE } from '@/lib/wallet-session';

export async function GET(request: NextRequest) {
  const session = readWalletSession(request.cookies.get(SESSION_COOKIE)?.value);
  return NextResponse.json({ address: session?.address || null });
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.delete(SESSION_COOKIE);
  return response;
}
