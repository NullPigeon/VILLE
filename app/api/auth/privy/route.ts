import { NextRequest, NextResponse } from 'next/server';
import { apiFailure, requireMutation } from '@/lib/server/api';
import { citizenForLinkedWallet, citizenForPrivyUser, claimPrivyCitizen, mergePrivyCitizenWithWallet } from '@/lib/server/database';
import { verifyPrivyIdentity } from '@/lib/server/privy';
import { readWalletSession, sealWalletSession, SESSION_COOKIE } from '@/lib/wallet-session';

export async function POST(request: NextRequest) {
  try {
    requireMutation(request);
    const identity = await verifyPrivyIdentity(request.headers.get('authorization'));
    let existing = await citizenForPrivyUser(identity.id);
    const currentSession = readWalletSession(request.cookies.get(SESSION_COOKIE)?.value);
    const linkedWallet = existing?.linked_wallet && identity.linkedWallets.includes(existing.linked_wallet)
      ? existing.linked_wallet
      : identity.linkedWallets[0] || null;
    if (existing && !existing.linked_wallet && linkedWallet) {
      const walletCitizen = await citizenForLinkedWallet(linkedWallet);
      if (walletCitizen && walletCitizen.wallet !== existing.wallet) {
        existing = await mergePrivyCitizenWithWallet(identity.id, linkedWallet);
      }
    }
    const citizen = await claimPrivyCitizen(
      identity.id,
      identity.email,
      linkedWallet,
      existing ? null : currentSession?.address || null,
    );
    const method = identity.email ? 'email' : 'wallet';
    const response = NextResponse.json({
      address: citizen.wallet,
      linkedWallet: citizen.linked_wallet,
      email: citizen.email,
      method,
    }, { headers: { 'Cache-Control': 'private, no-store' } });
    response.cookies.set(
      SESSION_COOKIE,
      sealWalletSession({
        address: citizen.wallet,
        method,
        ...(citizen.email ? { email: citizen.email } : {}),
        expiresAt: Date.now() + 24 * 60 * 60_000,
      }),
      { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 86_400, path: '/' },
    );
    return response;
  } catch (error) {
    return apiFailure(error);
  }
}
