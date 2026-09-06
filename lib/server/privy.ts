import 'server-only';

import { PrivyClient } from '@privy-io/node';
import { isAddress } from 'viem';
import { ApiError } from '@/lib/server/api';

let client: PrivyClient | null = null;

function privyClient() {
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID?.trim();
  const appSecret = process.env.PRIVY_APP_SECRET?.trim();
  if (!appId || !appSecret) throw new ApiError(503, 'Privy sign-in is not configured.');
  client ||= new PrivyClient({ appId, appSecret });
  return client;
}

export type VerifiedPrivyIdentity = {
  id: string;
  email: string | null;
  linkedWallets: string[];
};

export async function verifyPrivyIdentity(authorization: string | null): Promise<VerifiedPrivyIdentity> {
  const token = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token || token.length > 8192) throw new ApiError(401, 'Privy session is missing or expired.');

  try {
    const claims = await privyClient().utils().auth().verifyAccessToken(token);
    const user = await privyClient().users()._get(claims.user_id);
    const emailAccount = user.linked_accounts.find((account) => account.type === 'email');
    const email = emailAccount?.type === 'email' ? emailAccount.address.trim().toLowerCase() : null;
    const linkedWallets = user.linked_accounts.flatMap((account) => {
      if (account.type !== 'wallet' || account.chain_type !== 'ethereum') return [];
      const address = account.address.toLowerCase();
      return isAddress(address) ? [address] : [];
    });
    return { id: user.id, email, linkedWallets: [...new Set(linkedWallets)] };
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(401, 'Privy session is invalid or expired. Sign in again.');
  }
}
