'use client';
/* oxlint-disable react/react-compiler -- remote state hydration and polling run after mount */

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { BuildUpdate, ProposalRecord, VoteChoice, WorldObjectRecord } from '@/lib/landville-data';
import type { VoteReceipt } from '@/lib/governance';
import { activeProposalForWallet } from '@/lib/proposal-lifecycle';
import { useWallet } from '@/components/landville/wallet-provider';

type NewProposal = Pick<ProposalRecord, 'title' | 'summary' | 'category' | 'district'>;
type RemoteState = { proposals: ProposalRecord[]; objects: WorldObjectRecord[]; voted: Record<string, VoteReceipt>; wallet: string; isAdmin: boolean };
type Store = Omit<RemoteState, 'wallet'> & {
  activeProposal: ProposalRecord | undefined;
  status: 'loading' | 'ready' | 'unavailable'; error: string;
  refresh(): Promise<void>;
  createProposal(input: NewProposal): Promise<ProposalRecord>;
  vote(id: string, choice: VoteChoice): Promise<VoteReceipt>;
  updateBuild(id: string, input: BuildUpdate): Promise<ProposalRecord>;
};
const empty: RemoteState = { proposals: [], objects: [], voted: {}, wallet: '', isAdmin: false };
const StoreContext = createContext<Store | null>(null);

async function serverAction<T>(url: string, body: unknown, method = 'POST'): Promise<T> {
  const response = await fetch(url, { method: method === 'PATCH' ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const result = await response.json() as T & { error?: string };
  if (!response.ok) throw new Error(result.error || 'The server could not save this action.');
  return result;
}

export function LandvilleProvider({ children }: { children: React.ReactNode }) {
  const wallet = useWallet();
  const currentWallet = useRef(wallet.address);
  currentWallet.current = wallet.address;
  const [state, setState] = useState<RemoteState>(empty);
  const [status, setStatus] = useState<Store['status']>('loading');
  const [error, setError] = useState('');
  const pending = useRef(new Map<string, string>());
  const sequence = useRef(0);

  const refresh = useCallback(async () => {
    const turn = ++sequence.current;
    const identity = currentWallet.current;
    try {
      const response = await fetch('/api/town', { cache: 'no-store' });
      const result = await response.json() as RemoteState & { error?: string };
      if (!response.ok) throw new Error(result.error || 'Shared town data is unavailable.');
      if (turn !== sequence.current || identity !== currentWallet.current) return;
      setState(result); setStatus('ready'); setError('');
    } catch (caught) {
      if (turn === sequence.current && identity === currentWallet.current) {
        setStatus('unavailable');
        setError(caught instanceof Error ? caught.message : 'Shared town data is unavailable.');
      }
    }
  }, []);

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => { if (!document.hidden) void refresh(); }, 8_000);
    const onFocus = () => { void refresh(); };
    window.addEventListener('focus', onFocus);
    return () => { window.clearInterval(timer); window.removeEventListener('focus', onFocus); };
  }, [refresh, wallet.address]);

  const store = useMemo<Store>(() => ({
    proposals: state.proposals, objects: state.objects,
    activeProposal: activeProposalForWallet(state.proposals, wallet.address),
    voted: wallet.address && state.wallet === wallet.address ? state.voted : {},
    isAdmin: Boolean(wallet.address && state.wallet === wallet.address && state.isAdmin),
    status, error, refresh,
    async createProposal(input) {
      if (!wallet.address) throw new Error('Create your citizen account before submitting a proposal.');
      const key = JSON.stringify([wallet.address, input]);
      const requestId = pending.current.get(key) || crypto.randomUUID();
      pending.current.set(key, requestId);
      const result = await serverAction<{ proposal: ProposalRecord }>('/api/proposals', { ...input, requestId });
      pending.current.delete(key);
      await refresh();
      return result.proposal;
    },
    async vote(id, choice) {
      if (!wallet.address) throw new Error('Create your citizen account before voting.');
      const result = await serverAction<{ receipt: VoteReceipt }>(`/api/proposals/${encodeURIComponent(id)}/vote`, { choice });
      await refresh();
      return result.receipt;
    },
    async updateBuild(id, input) {
      const result = await serverAction<{ proposal: ProposalRecord }>(`/api/admin/builds/${encodeURIComponent(id)}`, input, 'PATCH');
      await refresh();
      return result.proposal;
    },
  }), [state, wallet.address, status, error, refresh]);

  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
}

export function useLandville() {
  const store = useContext(StoreContext);
  if (!store) throw new Error('useLandville must be inside LandvilleProvider');
  return store;
}
