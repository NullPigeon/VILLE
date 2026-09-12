import 'server-only';
import { createHash } from 'node:crypto';
import { ApiError } from '@/lib/server/api';

export function databaseConfigured() {
  return Boolean((process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL) && (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY));
}

const databaseErrors: Record<string, [number, string]> = {
  INVALID_BUILD_SPEC: [400, 'The build specification must match the approved proposal.'],
  HOLD_CHECK_REQUIRED: [409, 'Messages beyond the first 10 require verified SCRAPY holdings.'],
  ACCOUNT_REQUIRED: [401, 'Create or sign in to your citizen account first.'],
  INVALID_PRIVY_IDENTITY: [400, 'The verified Privy identity is invalid.'],
  EMAIL_IDENTITY_CONFLICT: [409, 'That email is already attached to another citizen account.'],
  INVALID_LINKED_WALLET: [400, 'A valid EVM wallet is required.'],
  LINKED_WALLET_IN_USE: [409, 'That wallet is already attached to another citizen account. Sign in with that wallet instead.'],
  LINKED_WALLET_IMMUTABLE: [409, 'This citizen account already has a wallet attached.'],
  IMMUTABLE_EMAIL_IDENTITY: [409, 'The email attached to this citizen account cannot be changed.'],
  IMMUTABLE_PRIVY_IDENTITY: [409, 'This citizen account is already attached to another Privy identity.'],
  ACCOUNT_MERGE_CONFLICT: [409, 'These login methods have conflicting citizen activity. Contact LANDVILLE support before retrying.'],
  PRIVY_ACCOUNT_REQUIRED: [409, 'Sign in with Privy before linking a wallet.'],
  ACTIVE_PROPOSAL_EXISTS: [409, 'You already have an active proposal. Submit another after it is built or rejected.'],
  ACTIVE_PROPOSAL_LIMIT: [409, 'You already have two active proposals. At least one must be built or rejected before submitting another.'],
  BUILD_ALREADY_RUNNING: [409, 'Another build is running. Finish or reject it before starting the next.'],
  BUILD_QUEUE_ORDER: [409, 'An earlier approved proposal is waiting. Finalize and build proposals in voting-deadline order.'],
  DAILY_MESSAGE_LIMIT: [429, 'Daily message limit reached: 10 without SCRAPY, 50 with SCRAPY, in Town Chat. Resets at 00:00 UTC.'],
  INVALID_SNAPSHOT: [409, 'The balance snapshot expired or is invalid. Please retry.'],
  ALREADY_VOTED: [409, 'This wallet has already voted on this proposal.'],
  VOTING_CLOSED: [409, 'Voting has closed.'],
  TOKEN_CHANGED: [409, 'The configured SCRAPY contract differs from this proposal.'],
  PROPOSAL_NOT_FOUND: [404, 'Proposal not found.'],
  STALE_STATUS: [409, 'The proposal changed. Refresh before trying again.'],
  VOTING_STILL_OPEN: [409, 'The voting deadline has not passed.'],
  INVALID_TRANSITION: [409, 'That build action is not allowed from the current status.'],
  RELEASE_REQUIRED: [400, 'A deployed module path and release reference are required.'],
  IDEMPOTENCY_CONFLICT: [409, 'This submission ID already belongs to different content.'],
  INVALID_VOTING_RULES: [503, 'Voting rules are not configured.'],
  INVALID_MODULE_STORAGE: [400, 'Invalid module storage request.'],
  MODULE_COUNTER_LIMIT: [409, 'This module counter reached its maximum value.'],
  MODULE_STORAGE_QUOTA: [429, 'This module storage collection is full. Remove an old record before adding another.'],
  REWARD_NOT_FOUND: [404, 'Creator reward not found.'],
  TREASURY_HOLDER_REQUIRED: [403, 'Hold SCRAPY in your linked wallet to propose or vote in Treasury.'],
  TREASURY_PROPOSAL_NOT_FOUND: [404, 'Treasury proposal not found.'],
  INVALID_TREASURY_PROPOSAL: [400, 'The treasury proposal is invalid.'],
  INVALID_TREASURY_SNAPSHOT: [409, 'The treasury voting snapshot is invalid. Refresh and retry.'],
  INVALID_REWARD_POLICY: [400, 'The creator reward policy is invalid.'],
  TREASURY_SPEND_LIMIT: [400, 'A proposal may request at most 10% of the current Treasury ETH balance.'],
  REWARD_NOT_EXECUTABLE: [409, 'This creator reward is not ready for payment.'],
  REWARD_PAYMENT_BUSY: [409, 'Another creator reward requires payment review first.'],
  INVALID_REWARD_PAYMENT: [409, 'The creator reward payment receipt is invalid.'],
};

// Server-only HTTP adapter. Privy verifies users, while all Supabase table
// access remains behind this service-only application API.
export async function database<T>(path: string, init: RequestInit = {}): Promise<T> {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new ApiError(503, 'Shared storage is not connected. Configure the LANDVILLE Supabase project.');
  const headers = new Headers(init.headers);
  headers.set('apikey', key);
  // New sb_secret_ keys are not JWTs. Only legacy service_role uses Bearer.
  if (!key.startsWith('sb_secret_')) headers.set('Authorization', `Bearer ${key}`);
  headers.set('Content-Type', 'application/json');
  let response: Response;
  try {
    response = await fetch(`${url.replace(/\/$/, '')}/rest/v1/${path}`, { ...init, headers, cache: 'no-store', signal: AbortSignal.timeout(12_000) });
  } catch { throw new ApiError(503, 'Shared storage is temporarily unavailable. Nothing was saved locally.'); }
  if (!response.ok) {
    const failure = await response.json().catch(() => ({})) as { message?: string; code?: string };
    const known = failure.message ? databaseErrors[failure.message] : undefined;
    if (known) { const error = new ApiError(...known); error.code = failure.message; throw error; }
    if (failure.code === '23505') throw new ApiError(409, 'This record already exists. Refresh and retry.');
    if (['23514', '23502', '22P02'].includes(failure.code || '')) throw new ApiError(400, 'Invalid record values.');
    // Do not echo SQL, provider responses, or credentials to clients/logs.
    throw new ApiError(503, 'Shared storage is unavailable or its migrations are missing.');
  }
  if (response.status === 204 || response.headers.get('content-length') === '0') return undefined as T;
  const text = await response.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

export function rpc<T>(name: string, body: Record<string, unknown>) {
  return database<T>(`rpc/${name}`, { method: 'POST', body: JSON.stringify(body) });
}

export async function enforceRate(wallet: string, action: string, limit: number) {
  const allowed = await rpc<boolean>('landville_rate_limit', { p_key: `${action}:${wallet}`, p_limit: limit });
  if (!allowed) throw new ApiError(429, 'Too many requests. Wait a minute and try again.');
}

export type CitizenAccountRow = { wallet: string; linked_wallet: string | null; privy_user_id: string | null; email: string | null };

export async function registerCitizen(wallet: string) {
  await database('landville_citizens?on_conflict=wallet', {
    method: 'POST', headers: { Prefer: 'resolution=ignore-duplicates,return=minimal' }, body: JSON.stringify({ wallet, linked_wallet: wallet }),
  });
}

export async function citizenAccount(wallet: string) {
  const rows = await database<CitizenAccountRow[]>(`landville_citizens?select=wallet,linked_wallet,privy_user_id,email&wallet=eq.${wallet}&limit=1`);
  return rows[0] || null;
}

export async function citizenForLinkedWallet(wallet: string) {
  const rows = await database<CitizenAccountRow[]>(`landville_citizens?select=wallet,linked_wallet,privy_user_id,email&linked_wallet=eq.${wallet}&limit=1`);
  return rows[0] || null;
}

export async function citizenForPrivyUser(privyUserId: string) {
  const rows = await database<CitizenAccountRow[]>(`landville_citizens?select=wallet,linked_wallet,privy_user_id,email&privy_user_id=eq.${encodeURIComponent(privyUserId)}&limit=1`);
  return rows[0] || null;
}

export async function claimPrivyCitizen(privyUserId: string, email: string | null, linkedWallet: string | null, existingCitizen: string | null) {
  const identity = `0x${createHash('sha256').update(`landville:privy:${privyUserId}`).digest('hex').slice(0, 40)}`;
  return rpc<CitizenAccountRow>('landville_claim_privy_citizen', {
    p_privy_user_id: privyUserId, p_email: email, p_linked_wallet: linkedWallet,
    p_existing_citizen: existingCitizen, p_new_citizen: identity,
  });
}

export function linkCitizenWallet(citizen: string, wallet: string) {
  return rpc<CitizenAccountRow>('landville_link_citizen_wallet', { p_citizen: citizen, p_linked_wallet: wallet });
}

export function mergePrivyCitizenWithWallet(privyUserId: string, linkedWallet: string) {
  return rpc<CitizenAccountRow>('landville_merge_privy_wallet_citizens', {
    p_privy_user_id: privyUserId,
    p_linked_wallet: linkedWallet,
  });
}

export async function assertCitizen(wallet: string) {
  const records = await database<Array<{ wallet: string }>>(`landville_citizens?select=wallet&wallet=eq.${wallet}&limit=1`);
  if (!records.length) throw new ApiError(401, 'Create or sign in to your citizen account first.');
}
