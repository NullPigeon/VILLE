import { isAddress, verifyMessage } from 'viem';
import { NextRequest, NextResponse } from 'next/server';
import {
  CHALLENGE_COOKIE,
  readCookie,
  sealCookie,
  SESSION_COOKIE,
} from '@/lib/wallet-session';

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as
    | { address?: string; signature?: `0x${string}` }
    | null;
  const address = body?.address?.toLowerCase() || '';
  const challenge = readCookie<{ address: string; message: string; expiresAt: number }>(
    request.cookies.get(CHALLENGE_COOKIE)?.value,
  );

  if (!challenge || !isAddress(address) || !body?.signature || challenge.address !== address) {
    return NextResponse.json({ error: 'Wallet challenge is invalid or expired.' }, { status: 401 });
  }

  const valid = await verifyMessage({
    address: address as `0x${string}`,
    message: challenge.message,
    signature: body.signature,
  });
  if (!valid) return NextResponse.json({ error: 'Wallet signature is invalid.' }, { status: 401 });

  const response = NextResponse.json({ address });
  response.cookies.set(
    SESSION_COOKIE,
    sealCookie({ address, expiresAt: Date.now() + 7 * 24 * 60 * 60_000 }),
    { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 604_800, path: '/' },
  );
  response.cookies.delete(CHALLENGE_COOKIE);
  return response;
}
