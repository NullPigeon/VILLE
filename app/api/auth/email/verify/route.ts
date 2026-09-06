import { createHash } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { apiFailure, jsonBody, requireMutation } from '@/lib/server/api';
import { claimEmailCitizen, enforceRate } from '@/lib/server/database';
import { normalizeEmail, verifyEmailOtp } from '@/lib/server/supabase-auth';
import { readWalletSession, sealWalletSession, SESSION_COOKIE } from '@/lib/wallet-session';

export async function POST(request: NextRequest) {
  try {
    requireMutation(request);
    const body = await jsonBody(request);
    const email = normalizeEmail(body.email);
    const token = typeof body.token === 'string' ? body.token.trim() : '';
    const key = createHash('sha256').update(email).digest('hex');
    await enforceRate(key, 'email-verify', 8);
    const user = await verifyEmailOtp(email, token);
    const current = readWalletSession(request.cookies.get(SESSION_COOKIE)?.value);
    const citizen = await claimEmailCitizen(user.id, user.email, current?.address || null);
    const response = NextResponse.json({ address: citizen.wallet, linkedWallet: citizen.linked_wallet, email: citizen.email, method: 'email' }, { headers: { 'Cache-Control': 'private, no-store' } });
    response.cookies.set(
      SESSION_COOKIE,
      sealWalletSession({ address: citizen.wallet, method: 'email', email: citizen.email!, expiresAt: Date.now() + 7 * 24 * 60 * 60_000 }),
      { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 604_800, path: '/' },
    );
    return response;
  } catch (error) { return apiFailure(error); }
}
