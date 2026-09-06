import type { ProposalRecord } from './landville-data';

export const VOTING_HOURS = 12;

export function activeProposalsForWallet(proposals: ProposalRecord[], wallet: string) {
  if (!wallet) return [];
  return proposals.filter((proposal) => proposal.creatorWallet?.toLowerCase() === wallet.toLowerCase()
    && ['LIVE', 'PASSED', 'BUILDING'].includes(proposal.status));
}

export function activeProposalForWallet(proposals: ProposalRecord[], wallet: string) {
  return activeProposalsForWallet(proposals, wallet)[0];
}

export function hasWinningVote(proposal: Pick<ProposalRecord, 'yes' | 'no'>) {
  return proposal.yes > proposal.no;
}

// Include expired winners awaiting finalization so the UI cannot suggest skipping them.
// PostgreSQL repeats ordering/availability checks under a transaction lock.
export function getBuildQueue(proposals: ProposalRecord[], now = Date.now()) {
  return proposals.filter((proposal) => proposal.status === 'BUILDING' || proposal.status === 'PASSED'
    || (proposal.status === 'LIVE' && Boolean(proposal.closesAt)
      && Date.parse(proposal.closesAt!) <= now && hasWinningVote(proposal)))
    .sort((a, b) => {
      if (a.status === 'BUILDING' && b.status !== 'BUILDING') return -1;
      if (b.status === 'BUILDING' && a.status !== 'BUILDING') return 1;
      const time = Date.parse(a.closesAt || '') - Date.parse(b.closesAt || '');
      return time || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
    });
}

export function nextBuildId(proposals: ProposalRecord[], now = Date.now()) {
  const first = getBuildQueue(proposals, now)[0];
  return first?.status === 'PASSED' ? first.id : undefined;
}
