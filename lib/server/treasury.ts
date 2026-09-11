import 'server-only';
import { createPublicClient, createWalletClient, defineChain, formatEther, http, isAddress, type Address, type Hex } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { activeRobinhoodChain } from '@/lib/robinhood-chain';
import type { CreatorReward, TreasuryBoard, TreasuryPolicy, TreasuryProposal, TreasuryVoteReceipt, TreasuryWalletState } from '@/lib/treasury';
import { citizenLabel } from '@/lib/citizen-identity';
import { citizenIdentities } from '@/lib/server/citizens';
import { citizenAccount, database, rpc } from '@/lib/server/database';
import { readVotingSnapshot, readVotingSnapshotAt } from '@/lib/server/voting';

type PolicyRow = { minimum_reward_tokens: string; updated_at: string };
type RewardRow = {
  proposal_id: string; creator_wallet: string; title: string; recipient_wallet: string | null; status: CreatorReward['status'];
  eligibility_snapshot: { tokenBalance?: string; tokenBalanceFormatted?: string } | null; reward_wei: string;
  payment_lease: string | null; transaction_hash: string | null; created_at: string; paid_at: string | null;
};
type ProposalRow = {
  id: string; creator_wallet: string; title: string; summary: string; category: TreasuryProposal['category']; status: TreasuryProposal['status'];
  requested_wei: string | null; policy_minimum_tokens: string | null; snapshot_block: string;
  yes_weight: number | string; no_weight: number | string; created_at: string; starts_at: string | null; closes_at: string | null;
};
type BallotRow = { proposal_id: string; wallet: string; choice: 'YES' | 'NO'; weight: number };

function treasuryChain() {
  return defineChain({
    id: activeRobinhoodChain.id,
    name: activeRobinhoodChain.name,
    nativeCurrency: activeRobinhoodChain.nativeCurrency,
    rpcUrls: { default: { http: [process.env.ROBINHOOD_MAINNET_RPC_URL || activeRobinhoodChain.rpcUrl] } },
  });
}

export function configuredTreasuryAddress(): Address | null {
  const value = (process.env.SCRAPY_TREASURY_ADDRESS || process.env.NEXT_PUBLIC_TREASURY_ADDRESS || '').trim().toLowerCase();
  return isAddress(value) ? value : null;
}

export async function readTreasuryState(): Promise<TreasuryWalletState> {
  const address = configuredTreasuryAddress();
  if (!address) return { configured: false, address: '', balanceWei: '0', balanceEth: '0', blockNumber: '0' };
  const client = createPublicClient({ chain: treasuryChain(), transport: http(undefined, { timeout: 10_000, retryCount: 1 }) });
  const [balance, blockNumber, chainId] = await Promise.all([client.getBalance({ address }), client.getBlockNumber({ cacheTime: 0 }), client.getChainId()]);
  if (chainId !== activeRobinhoodChain.id) throw new Error('Treasury RPC is not connected to Robinhood mainnet.');
  return { configured: true, address, balanceWei: balance.toString(), balanceEth: formatEther(balance), blockNumber: blockNumber.toString() };
}

function proposalRecord(row: ProposalRow, creator: string): TreasuryProposal {
  return {
    id: row.id, creatorWallet: row.creator_wallet, creator, title: row.title, summary: row.summary,
    category: row.category, status: row.status, requestedWei: row.requested_wei || '',
    requestedEth: row.requested_wei ? formatEther(BigInt(row.requested_wei)) : '',
    policyMinimumTokens: row.policy_minimum_tokens || '', yes: Number(row.yes_weight), no: Number(row.no_weight),
    createdAt: row.created_at, startsAt: row.starts_at || '', closesAt: row.closes_at || '',
  };
}

function rewardRecord(row: RewardRow, creator: string): CreatorReward {
  return {
    proposalId: row.proposal_id, title: row.title, creatorWallet: row.creator_wallet, creator,
    recipientWallet: row.recipient_wallet || '', status: row.status,
    tokenBalance: row.eligibility_snapshot?.tokenBalance || '0', tokenBalanceFormatted: row.eligibility_snapshot?.tokenBalanceFormatted || '0',
    rewardWei: row.reward_wei || '0', rewardEth: formatEther(BigInt(row.reward_wei || '0')),
    transactionHash: row.transaction_hash || '', createdAt: row.created_at, paidAt: row.paid_at || '',
  };
}

export async function settleTreasuryVotes() {
  return rpc<{ promoted?: string | null }>('landville_treasury_tick', {});
}

export async function readTreasuryBoard(wallet = ''): Promise<TreasuryBoard> {
  await settleTreasuryVotes();
  const votingWallet = wallet ? await treasuryVotingWallet(wallet) : null;
  const [walletState, policies, rewards, proposals, ballots, viewerSnapshot] = await Promise.all([
    readTreasuryState(),
    database<PolicyRow[]>('landville_treasury_policy?select=minimum_reward_tokens,updated_at&singleton=eq.true&limit=1'),
    database<RewardRow[]>('landville_creator_rewards?select=*&order=created_at.desc,proposal_id.desc&limit=200'),
    database<ProposalRow[]>('landville_treasury_proposals?select=*&order=created_at.desc,id.desc&limit=200'),
    wallet ? database<BallotRow[]>(`landville_treasury_ballots?select=proposal_id,wallet,choice,weight&wallet=eq.${wallet}&limit=200`) : Promise.resolve([]),
    votingWallet ? readVotingSnapshot(votingWallet) : Promise.resolve(null),
  ]);
  const identities = await citizenIdentities([...rewards.map((row) => row.creator_wallet), ...proposals.map((row) => row.creator_wallet)]);
  const policy: TreasuryPolicy = { minimumRewardTokens: policies[0]?.minimum_reward_tokens || '1000000', updatedAt: policies[0]?.updated_at || '' };
  return {
    wallet: walletState, holder: viewerSnapshot?.source === 'chain' && BigInt(viewerSnapshot.tokenBalance) > 0n, policy,
    rewards: rewards.map((row) => rewardRecord(row, citizenLabel(identities.get(row.creator_wallet)))),
    proposals: proposals.map((row) => proposalRecord(row, citizenLabel(identities.get(row.creator_wallet)))),
    voted: Object.fromEntries(ballots.map((row) => [row.proposal_id, { proposalId: row.proposal_id, wallet: row.wallet, choice: row.choice, weight: Number(row.weight) } satisfies TreasuryVoteReceipt])),
  };
}

export async function treasuryVotingWallet(citizen: string): Promise<Address | null> {
  const account = await citizenAccount(citizen);
  return account?.linked_wallet && isAddress(account.linked_wallet) ? account.linked_wallet.toLowerCase() as Address : null;
}

export async function refreshTreasuryCycle() {
  const walletState = await readTreasuryState();
  await settleTreasuryVotes();
  if (!walletState.configured) return { state: 'UNCONFIGURED' as const };
  const pending = await database<RewardRow[]>('landville_creator_rewards?select=*&status=eq.CHECKING_ELIGIBILITY&order=created_at.asc,proposal_id.asc&limit=1');
  if (pending[0]) {
    const votingWallet = await treasuryVotingWallet(pending[0].creator_wallet);
    const snapshot = votingWallet ? await readVotingSnapshot(votingWallet) : null;
    await rpc('landville_resolve_creator_reward', {
      p_proposal_id: pending[0].proposal_id,
      p_recipient_wallet: votingWallet,
      p_snapshot: snapshot,
      p_treasury_balance_wei: walletState.balanceWei,
    });
  }
  await rpc('landville_refresh_creator_rewards', { p_treasury_balance_wei: walletState.balanceWei });
  return { state: 'REFRESHED' as const };
}

export async function payNextCreatorReward(actor: string) {
  if (process.env.SCRAPY_REWARD_PAYOUT_ENABLED !== 'true') return { state: 'PAYOUT_DISABLED' as const };
  const treasuryAddress = configuredTreasuryAddress();
  const privateKey = (process.env.SCRAPY_TREASURY_PRIVATE_KEY || '').trim();
  if (!treasuryAddress || !/^0x[0-9a-f]{64}$/i.test(privateKey)) throw new Error('Treasury payout credentials are not configured.');
  const account = privateKeyToAccount(privateKey as Hex);
  if (account.address.toLowerCase() !== treasuryAddress.toLowerCase()) throw new Error('Treasury private key does not match its public address.');
  const reward = await rpc<RewardRow | null>('landville_claim_creator_reward', { p_actor: actor });
  if (!reward) return { state: 'IDLE' as const };
  if (!reward.payment_lease || !reward.recipient_wallet || !isAddress(reward.recipient_wallet) || BigInt(reward.reward_wei) <= 0n) throw new Error('Invalid claimed creator reward.');
  try {
    const client = createWalletClient({ account, chain: treasuryChain(), transport: http(undefined, { timeout: 20_000, retryCount: 0 }) });
    const hash = await client.sendTransaction({ account, to: reward.recipient_wallet as Address, value: BigInt(reward.reward_wei), chain: treasuryChain() });
    await rpc('landville_finish_creator_reward', { p_proposal_id: reward.proposal_id, p_lease: reward.payment_lease, p_transaction_hash: hash });
    return { state: 'PAID' as const, proposalId: reward.proposal_id, hash };
  } catch (error) {
    await rpc('landville_flag_creator_reward', { p_proposal_id: reward.proposal_id, p_lease: reward.payment_lease }).catch(() => undefined);
    throw error;
  }
}

export async function treasuryVotingSnapshot(wallet: string, snapshotBlock: string) {
  return readVotingSnapshotAt(wallet, BigInt(snapshotBlock));
}
