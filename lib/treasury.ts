export const TREASURY_VOTING_HOURS = 48;
export const DEFAULT_REWARD_HOLD_TOKENS = '1000000';
export const MAX_CREATOR_REWARD_WEI = '5000000000000000';

export function creatorRewardWei(treasuryBalanceWei: bigint) {
  const onePercent = treasuryBalanceWei > 0n ? treasuryBalanceWei / 100n : 0n;
  const maximum = BigInt(MAX_CREATOR_REWARD_WEI);
  return onePercent < maximum ? onePercent : maximum;
}

export function treasuryProposalPasses(yes: number, no: number) {
  return yes > 0 && yes > no;
}

export type TreasuryProposalCategory = 'BUY' | 'STAKE' | 'DISTRIBUTE' | 'OPERATIONS' | 'REWARD_POLICY' | 'OTHER';
export type TreasuryProposalStatus = 'QUEUED' | 'LIVE' | 'PASSED' | 'REJECTED' | 'EXECUTED';
export type CreatorRewardStatus = 'CHECKING_ELIGIBILITY' | 'INELIGIBLE' | 'WAITING_FUNDS' | 'READY' | 'PAYMENT_PENDING' | 'PAID' | 'PAYMENT_REVIEW';

export type TreasuryWalletState = {
  configured: boolean;
  address: string;
  balanceWei: string;
  balanceEth: string;
  blockNumber: string;
};

export type TreasuryPolicy = {
  minimumRewardTokens: string;
  updatedAt: string;
};

export type CreatorReward = {
  proposalId: string;
  title: string;
  creatorWallet: string;
  creator: string;
  recipientWallet: string;
  status: CreatorRewardStatus;
  tokenBalance: string;
  tokenBalanceFormatted: string;
  rewardWei: string;
  rewardEth: string;
  transactionHash: string;
  createdAt: string;
  paidAt: string;
};

export type TreasuryProposal = {
  id: string;
  creatorWallet: string;
  creator: string;
  title: string;
  summary: string;
  category: TreasuryProposalCategory;
  status: TreasuryProposalStatus;
  requestedWei: string;
  requestedEth: string;
  policyMinimumTokens: string;
  yes: number;
  no: number;
  createdAt: string;
  startsAt: string;
  closesAt: string;
};

export type TreasuryVoteReceipt = {
  proposalId: string;
  wallet: string;
  choice: 'YES' | 'NO';
  weight: number;
};

export type TreasuryBoard = {
  wallet: TreasuryWalletState;
  holder: boolean;
  policy: TreasuryPolicy;
  rewards: CreatorReward[];
  proposals: TreasuryProposal[];
  voted: Record<string, TreasuryVoteReceipt>;
};
