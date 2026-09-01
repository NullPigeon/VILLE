'use client';
/* oxlint-disable react/react-compiler -- localStorage demo hydration requires post-mount state */

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { initialProposals, initialWorldObjects, type ProposalRecord, type ProposalStatus, type VoteChoice, type WorldObjectRecord } from '@/lib/landville-data';

type NewProposal = Pick<ProposalRecord, 'title' | 'summary' | 'category' | 'district'>;
type Store = {
  proposals: ProposalRecord[];
  objects: WorldObjectRecord[];
  voted: Record<string, VoteChoice>;
  createProposal(input: NewProposal): ProposalRecord;
  vote(id: string, choice: VoteChoice): void;
  setProposalStatus(id: string, status: ProposalStatus): void;
  resetDemo(): void;
};

const StoreContext = createContext<Store | null>(null);
const STORAGE_KEY = 'landville-state-v2';

export function LandvilleProvider({ children }: { children: React.ReactNode }) {
  const [proposals, setProposals] = useState(initialProposals);
  const [objects, setObjects] = useState(initialWorldObjects);
  const [voted, setVoted] = useState<Record<string, VoteChoice>>({});
  const [hydrated, setHydrated] = useState(false);

  // oxlint-disable-next-line react/react-compiler -- client storage is loaded only after hydration
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as { proposals: ProposalRecord[]; objects: WorldObjectRecord[]; voted: Record<string, VoteChoice> };
        setProposals(parsed.proposals); setObjects(parsed.objects); setVoted(parsed.voted);
      }
    } catch { /* fall back to safe mock state */ }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) localStorage.setItem(STORAGE_KEY, JSON.stringify({ proposals, objects, voted }));
  }, [hydrated, objects, proposals, voted]);

  const store = useMemo<Store>(() => ({
    proposals,
    objects,
    voted,
    createProposal(input) {
      const record: ProposalRecord = { ...input, id: `LV-${185 + proposals.length}`, creator: '@jiyu1337', yes: 1, no: 0, status: 'LIVE', closesIn: '2D LEFT', createdAt: new Date().toISOString().slice(0, 10) };
      setProposals((current) => [record, ...current]);
      return record;
    },
    vote(id, choice) {
      if (voted[id]) return;
      setVoted((current) => ({ ...current, [id]: choice }));
      setProposals((current) => current.map((item) => item.id === id ? { ...item, yes: item.yes + (choice === 'YES' ? 1 : 0), no: item.no + (choice === 'NO' ? 1 : 0) } : item));
    },
    setProposalStatus(id, status) {
      setProposals((current) => current.map((item) => item.id === id ? { ...item, status, closesIn: status === 'LIVE' ? item.closesIn : 'ENDED' } : item));
      if (status === 'BUILT') {
        const proposal = proposals.find((item) => item.id === id);
        if (proposal) setObjects((current) => current.some((item) => item.id === proposal.id) ? current : [...current, { id: proposal.id, title: proposal.title, district: proposal.district, creator: proposal.creator, description: proposal.summary, yesPercent: Math.round((proposal.yes / Math.max(1, proposal.yes + proposal.no)) * 100), builtAt: new Date().toISOString().slice(0, 10), kind: 'utility', x: 34 + (current.length * 11) % 45, y: 31 + (current.length * 9) % 43 }]);
      }
    },
    resetDemo() { setProposals(initialProposals); setObjects(initialWorldObjects); setVoted({}); localStorage.removeItem(STORAGE_KEY); },
  }), [objects, proposals, voted]);

  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
}

export function useLandville() {
  const store = useContext(StoreContext);
  if (!store) throw new Error('useLandville must be inside LandvilleProvider');
  return store;
}
