import 'server-only';
import { createHash, createPrivateKey } from 'node:crypto';
import { createPublicClient, defineChain, erc20Abi, http, isAddress } from 'viem';
import { ApiError } from '@/lib/server/api';
import { database, citizenForPrivyUser } from '@/lib/server/database';
import { privyClient, type VerifiedPrivyIdentity } from '@/lib/server/privy';
import { readPersonalAgent } from '@/lib/server/personal-agents';
import { activeRobinhoodChain } from '@/lib/robinhood-chain';

const USDG = '0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168';
const chain = defineChain({ id: activeRobinhoodChain.id, name: activeRobinhoodChain.name,
  nativeCurrency: activeRobinhoodChain.nativeCurrency,
  rpcUrls: { default: { http: [activeRobinhoodChain.rpcUrl] } } });
type RobotWallet = { owner_wallet: string; privy_user_id: string; privy_wallet_id: string; address: string;
  enabled: boolean; daily_limit_micro: number; per_call_limit_micro: number;
  allow_landville: boolean; allow_citizens: boolean; allow_merchants: boolean };

export function robotWalletConfigured() {
  const signingKey = process.env.LANDVILLE_ROBOT_WALLET_AUTHORIZATION_PRIVATE_KEY?.trim();
  if (process.env.LANDVILLE_ROBOT_WALLETS_ENABLED !== 'true' || !process.env.NEXT_PUBLIC_PRIVY_APP_ID ||
    !process.env.PRIVY_APP_SECRET || !process.env.LANDVILLE_ROBOT_WALLET_SIGNER_ID ||
    !process.env.LANDVILLE_ROBOT_WALLET_POLICY_ID || !signingKey) return false;
  try {
    const key = createPrivateKey({ key: Buffer.from(signingKey, 'base64'), format: 'der', type: 'pkcs8' });
    return key.asymmetricKeyType === 'ec' && key.asymmetricKeyDetails?.namedCurve === 'prime256v1';
  } catch { return false; }
}

export async function robotWalletForOwner(owner: string) {
  const rows = await database<RobotWallet[]>(`landville_robot_wallets?select=*&owner_wallet=eq.${owner}&limit=1`);
  return rows[0] || null;
}

export async function robotWalletView(owner: string) {
  const wallet = await robotWalletForOwner(owner);
  let balanceMicro: string | null = null;
  if (wallet) {
    try {
      const client = createPublicClient({ chain, transport: http(activeRobinhoodChain.rpcUrl) });
      if (await client.getChainId() === 4663) balanceMicro = (await client.readContract({ address: USDG,
        abi: erc20Abi, functionName: 'balanceOf', args: [wallet.address as `0x${string}`] })).toString();
    } catch { /* Wallet details remain visible if the public RPC is unavailable. */ }
  }
  return { configured: robotWalletConfigured(), wallet: wallet ? { address: wallet.address,
    enabled: wallet.enabled, balanceMicro, dailyLimitMicro: wallet.daily_limit_micro,
    perCallLimitMicro: wallet.per_call_limit_micro, allowLandville: wallet.allow_landville,
    allowCitizens: wallet.allow_citizens, allowMerchants: wallet.allow_merchants } : null };
}

function externalId(owner: string) {
  return `landville_robot_${createHash('sha256').update(owner.toLowerCase()).digest('hex').slice(0, 45)}`;
}

export async function createRobotWallet(owner: string, identity: VerifiedPrivyIdentity) {
  const citizen = await citizenForPrivyUser(identity.id);
  if (!citizen || citizen.wallet !== owner) throw new ApiError(403, 'Your Privy identity does not own this citizen account.');
  if (!await readPersonalAgent(owner)) throw new ApiError(409, 'Build your personal robot first.');
  const saved = await robotWalletForOwner(owner);
  if (saved) {
    if (saved.privy_user_id !== identity.id) throw new ApiError(409, 'This robot wallet belongs to another Privy identity.');
    return robotWalletView(owner);
  }
  if (!robotWalletConfigured()) throw new ApiError(503, 'Robot wallets are not configured yet.');
  const client = privyClient();
  const id = externalId(owner);
  // Privy external IDs make a retry after a database outage resolve the same wallet.
  let wallet = null as Awaited<ReturnType<ReturnType<typeof client.wallets>['create']>> | null;
  for await (const found of client.wallets().list({ external_id: id, user_id: identity.id })) { wallet = found; break; }
  if (!wallet) {
    try {
      wallet = await client.wallets().create({ chain_type: 'ethereum', external_id: id,
        display_name: 'LANDVILLE personal robot', owner: { user_id: identity.id },
        additional_signers: [{ signer_id: process.env.LANDVILLE_ROBOT_WALLET_SIGNER_ID!,
          override_policy_ids: [process.env.LANDVILLE_ROBOT_WALLET_POLICY_ID!] }],
        idempotency_key: id });
    } catch (error) {
      // Two browser requests can race. A conflicting create is safe only if the
      // deterministic external ID now resolves to a real wallet.
      for await (const found of client.wallets().list({ external_id: id, user_id: identity.id })) { wallet = found; break; }
      if (!wallet) throw error;
    }
  }
  if (!wallet || wallet.chain_type !== 'ethereum' || !isAddress(wallet.address) || wallet.external_id !== id) {
    throw new ApiError(503, 'Privy returned an unexpected robot wallet.');
  }
  const existing = await robotWalletForOwner(owner);
  if (existing) {
    if (existing.privy_wallet_id !== wallet.id || existing.privy_user_id !== identity.id) throw new ApiError(409, 'Robot wallet identity changed.');
    return robotWalletView(owner);
  }
  await database('landville_robot_wallets', { method: 'POST', headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({ owner_wallet: owner, privy_user_id: identity.id,
      privy_wallet_id: wallet.id, address: wallet.address.toLowerCase() }) });
  return robotWalletView(owner);
}
