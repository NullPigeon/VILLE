export type ProposalStatus = 'LIVE' | 'PASSED' | 'BUILDING' | 'BUILT' | 'REJECTED';
export type VoteChoice = 'YES' | 'NO';

export type WorldObjectRecord = {
  id: string;
  title: string;
  district: string;
  creator: string;
  description: string;
  yesPercent: number;
  builtAt: string;
  kind: 'venue' | 'utility' | 'art' | 'media' | 'meme';
  x: number;
  y: number;
};

export type ProposalRecord = {
  id: string;
  title: string;
  summary: string;
  category: string;
  creator: string;
  yes: number;
  no: number;
  status: ProposalStatus;
  closesIn: string;
  district: string;
  createdAt: string;
  eligibilitySnapshot?: {
    wallet: string;
    tokenBalance: string;
    weight: number;
    blockNumber: string;
    capturedAt: string;
  };
  buildTier?: 'PENDING_REVIEW' | 'SMALL' | 'MEDIUM' | 'LARGE' | 'MONUMENTAL';
};

export const initialWorldObjects: WorldObjectRecord[] = [];

export const initialProposals: ProposalRecord[] = [];
