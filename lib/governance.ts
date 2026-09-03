export const BASE_VOTE_WEIGHT = 1;
export const TOKENS_PER_VOTE = 250_000;

export type VotingPowerSnapshot = {
  wallet: string;
  tokenBalance: string;
  tokenBalanceFormatted: string;
  weight: number;
  blockNumber: string;
  capturedAt: string;
  source: 'chain';
};

export type VoteReceipt = VotingPowerSnapshot & {
  choice: 'YES' | 'NO';
};

export function calculateVoteWeight(rawBalance: bigint, decimals: number) {
  const unit = BigInt(TOKENS_PER_VOTE) * 10n ** BigInt(decimals);
  return BASE_VOTE_WEIGHT + Number(rawBalance / unit);
}

export function shortWallet(address: string) {
  if (!address.startsWith('0x') || address.length < 12) return address;
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function walletUsername(address: string) {
  return address ? `citizen_${address.slice(2, 8).toLowerCase()}` : 'visitor';
}
