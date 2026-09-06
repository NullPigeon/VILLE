import { isAddress, verifyMessage } from 'viem';
import { NextRequest, NextResponse } from 'next/server';
import { apiFailure, jsonBody, requireMutation } from '@/lib/server/api';
import { citizenForLinkedWallet, linkCitizenWallet, registerCitizen } from '@/lib/server/database';
import {
  CHALLENGE_COOKIE,
  readWalletSession,
  readWalletChallenge,
  sealWalletSession,
  SESSION_COOKIE,
} from '@/lib/wallet-session';

export async function POST(request: NextRequest) {
  try {
  requireMutation(request);
  const body = (await jsonBody(request)) as
    | { address?: string; signature?: `0x${string}` }
    | null;
  const address = typeof body?.address === 'string' ? body.address.toLowerCase() : '';
  const challenge = readWalletChallenge(
    request.cookies.get(CHALLENGE_COOKIE)?.value,
  );

  if (!challenge || !isAddress(address) || typeof body?.signature !== 'string' || challenge.address !== address) {
    return NextResponse.json({ error: 'Wallet challenge is invalid or expired.' }, { status: 401 });
  }

  const valid = await verifyMessage({
    address: address as `0x${string}`,
    message: challenge.message,
    signature: body.signature,
  }).catch(() => false);
  if (!valid) return NextResponse.json({ error: 'Wallet signature is invalid.' }, { status: 401 });

  const current = readWalletSession(request.cookies.get(SESSION_COOKIE)?.value);
  let citizen;
  if (current?.method === 'email') {
    citizen = await linkCitizenWallet(current.address, address);
  } else {
    citizen = await citizenForLinkedWallet(address);
    if (!citizen) {
      await registerCitizen(address);
      citizen = await citizenForLinkedWallet(address) || { wallet: address, linked_wallet: address, auth_user_id: null, email: null };
    }
  }
  const method = current?.method === 'email' ? 'email' : 'wallet';

  const response = NextResponse.json({ address: citizen.wallet, linkedWallet: citizen.linked_wallet, email: citizen.email, method }, { headers: { 'Cache-Control': 'private, no-store' } });
  response.cookies.set(
    SESSION_COOKIE,
    sealWalletSession({ address: citizen.wallet, method, ...(method === 'email' && citizen.email ? { email: citizen.email } : {}), expiresAt: Date.now() + 7 * 24 * 60 * 60_000 }),
    { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 604_800, path: '/' },
  );
  response.cookies.delete(CHALLENGE_COOKIE);
  return response;
  } catch (error) { return apiFailure(error); }
}
