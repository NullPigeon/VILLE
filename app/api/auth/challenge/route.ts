import { randomUUID } from 'node:crypto';
import { isAddress } from 'viem';
import { NextRequest, NextResponse } from 'next/server';
import { CHALLENGE_COOKIE, sealCookie } from '@/lib/wallet-session';
import { activeRobinhoodChain } from '@/lib/robinhood-chain';

export async function GET(request: NextRequest) {
  const address = request.nextUrl.searchParams.get('address')?.toLowerCase() || '';
  if (!isAddress(address)) {
    return NextResponse.json({ error: 'A valid EVM wallet is required.' }, { status: 400 });
  }

  const nonce = randomUUID();
  const issuedAt = new Date().toISOString();
  const message = [
    'LANDVILLE WALLET SIGN-IN',
    '',
    `Wallet: ${address}`,
    'Purpose: prove this citizen file belongs to you.',
    'This request does not create a transaction or spend funds.',
    `Robinhood Chain ID: ${activeRobinhoodChain.id}`,
    `Nonce: ${nonce}`,
    `Issued At: ${issuedAt}`,
  ].join('\n');

  const response = NextResponse.json({ message });
  response.cookies.set(
    CHALLENGE_COOKIE,
    sealCookie({ address, message, expiresAt: Date.now() + 5 * 60_000 }),
    { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 300, path: '/' },
  );
  return response;
}
