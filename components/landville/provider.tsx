'use client';
/* oxlint-disable react/react-compiler -- localStorage hydration requires post-mount state */

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { initialProposals, initialWorldObjects, type ProposalRecord, type ProposalStatus, type VoteChoice, type WorldObjectRecord } from '@/lib/landville-data';
import { BASE_VOTE_WEIGHT, type VoteReceipt, walletUsername } from '@/lib/governance';
import { useWallet } from '@/components/landville/wallet-provider';

type NewProposal = Pick<ProposalRecord, 'title' | 'summary' | 'category' | 'district'>;
type Store = {
  proposals: ProposalRecord[];
  objects: WorldObjectRecord[];
  voted: Record<string, VoteReceipt>;
  createProposal(input: NewProposal): Promise<ProposalRecord>;
  vote(id: string, choice: VoteChoice): Promise<VoteReceipt>;
  setProposalStatus(id: string, status: ProposalStatus): void;
};

const StoreContext = createContext<Store | null>(null);
const STORAGE_KEY = 'landville-state-v4';
const LEGACY_MOCK_KEY = 'landville-state-v3';

export function LandvilleProvider({ children }: { children: React.ReactNode }) {
  const wallet = useWallet();
  const [proposals, setProposals] = useState(initialProposals);
  const [objects, setObjects] = useState(initialWorldObjects);
  const [voted, setVoted] = useState<Record<string, VoteReceipt>>({});
  const [hydrated, setHydrated] = useState(false);

  // oxlint-disable-next-line react/react-compiler -- client storage is loaded only after hydration
  useEffect(() => {
    try {
      localStorage.removeItem(LEGACY_MOCK_KEY);
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as { proposals: ProposalRecord[]; objects: WorldObjectRecord[]; voted: Record<string, VoteReceipt> };
        setProposals(parsed.proposals); setObjects(parsed.objects); setVoted(parsed.voted);
      }
    } catch { /* start with an empty local state */ }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) localStorage.setItem(STORAGE_KEY, JSON.stringify({ proposals, objects, voted }));
  }, [hydrated, objects, proposals, voted]);

  const store = useMemo<Store>(() => ({
    proposals,
    objects,
    voted,
    async createProposal(input) {
      if (!wallet.address) await wallet.connectWallet();
      const power = await wallet.refreshVotingPower();
      // Build eligibility still requires a token bonus; the free vote does not unlock builds.
      if (power.weight <= BASE_VOTE_WEIGHT) throw new Error('You need at least 250,000 SCRAPY to request a build.');
      const highestId = proposals.reduce((highest, item) => Math.max(highest, Number(item.id.replace('LV-', '')) || 0), 0);
      const record: ProposalRecord = { ...input, id: `LV-${highestId + 1}`, creator: `@${walletUsername(power.wallet)}`, yes: 0, no: 0, status: 'LIVE', closesIn: '2D LEFT', createdAt: new Date().toISOString().slice(0, 10), buildTier: 'PENDING_REVIEW', eligibilitySnapshot: { wallet: power.wallet, tokenBalance: power.tokenBalance, weight: power.weight, blockNumber: power.blockNumber, capturedAt: power.capturedAt } };
      setProposals((current) => [record, ...current]);
      return record;
    },
    async vote(id, choice) {
      if (voted[id]) return voted[id];
      if (!wallet.address) await wallet.connectWallet();
      const power = await wallet.refreshVotingPower();
      if (power.weight < BASE_VOTE_WEIGHT) throw new Error('Voting power could not be verified. Please reconnect your wallet.');
      const receipt: VoteReceipt = { ...power, choice };
      setVoted((current) => ({ ...current, [id]: receipt }));
      setProposals((current) => current.map((item) => item.id === id ? { ...item, yes: item.yes + (choice === 'YES' ? power.weight : 0), no: item.no + (choice === 'NO' ? power.weight : 0) } : item));
      return receipt;
    },
    setProposalStatus(id, status) {
      setProposals((current) => current.map((item) => item.id === id ? { ...item, status, closesIn: status === 'LIVE' ? item.closesIn : 'ENDED' } : item));
      if (status === 'BUILT') {
        const proposal = proposals.find((item) => item.id === id);
        if (proposal) setObjects((current) => current.some((item) => item.id === proposal.id) ? current : [...current, { id: proposal.id, title: proposal.title, district: proposal.district, creator: proposal.creator, description: proposal.summary, yesPercent: Math.round((proposal.yes / Math.max(1, proposal.yes + proposal.no)) * 100), builtAt: new Date().toISOString().slice(0, 10), kind: 'utility', x: 34 + (current.length * 11) % 45, y: 31 + (current.length * 9) % 43 }]);
      }
    },
  }), [objects, proposals, voted, wallet]);

  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
}

export function useLandville() {
  const store = useContext(StoreContext);
  if (!store) throw new Error('useLandville must be inside LandvilleProvider');
  return store;
}
