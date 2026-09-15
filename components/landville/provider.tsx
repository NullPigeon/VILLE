'use client';
/* oxlint-disable react/react-compiler -- remote state hydration and polling run after mount */

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { BuildUpdate, ModuleLikeBudget, ProposalRecord, VoteChoice, WorldCitizenRecord, WorldObjectRecord } from '@/lib/landville-data';
import { BASE_WEEKLY_MODULE_LIKES, calculateWeeklyModuleLikes, type VoteReceipt } from '@/lib/governance';
import { activeProposalForWallet, activeProposalsForWallet } from '@/lib/proposal-lifecycle';
import { useWallet } from '@/components/landville/wallet-provider';

type NewProposal = Pick<ProposalRecord, 'category' | 'district'> & { sourceReplyId: string };
type LikeWeekState = { used: number; verifiedAllowance: number; weekStart: string; resetsAt: string };
type RemoteState = { proposals: ProposalRecord[]; objects: WorldObjectRecord[]; citizens: WorldCitizenRecord[]; voted: Record<string, VoteReceipt>; likeWeek: LikeWeekState; wallet: string; isAdmin: boolean };
type Store = Omit<RemoteState, 'wallet' | 'likeWeek'> & {
  activeProposal: ProposalRecord | undefined;
  activeProposals: ProposalRecord[];
  likeBudget: ModuleLikeBudget;
  status: 'loading' | 'ready' | 'unavailable'; error: string;
  refresh(): Promise<void>;
  createProposal(input: NewProposal): Promise<ProposalRecord>;
  vote(id: string, choice: VoteChoice): Promise<VoteReceipt>;
  likeModule(id: string): Promise<void>;
  updateBuild(id: string, input: BuildUpdate): Promise<ProposalRecord>;
};
const empty: RemoteState = { proposals: [], objects: [], citizens: [], voted: {}, likeWeek: { used: 0, verifiedAllowance: BASE_WEEKLY_MODULE_LIKES, weekStart: '', resetsAt: '' }, wallet: '', isAdmin: false };
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
    proposals: state.proposals, objects: state.objects, citizens: state.citizens,
    activeProposal: activeProposalForWallet(state.proposals, wallet.address),
    activeProposals: activeProposalsForWallet(state.proposals, wallet.address),
    voted: wallet.address && state.wallet === wallet.address ? state.voted : {},
    isAdmin: Boolean(wallet.address && state.wallet === wallet.address && state.isAdmin),
    likeBudget: (() => {
      const ownState = wallet.address && state.wallet === wallet.address ? state.likeWeek || empty.likeWeek : empty.likeWeek;
      const allowance = wallet.snapshot
        ? calculateWeeklyModuleLikes(wallet.snapshot.tokenBalance, wallet.snapshot.tokenDecimals)
        : BASE_WEEKLY_MODULE_LIKES;
      const used = Number(ownState.used || 0);
      return { allowance, used, remaining: Math.max(0, allowance - used), resetsAt: ownState.resetsAt || '' };
    })(),
    status, error, refresh,
    async createProposal(input) {
      if (!wallet.address) throw new Error('Create your citizen account before submitting a proposal.');
      const result = await serverAction<{ proposal: ProposalRecord }>('/api/proposals', input);
      await refresh();
      return result.proposal;
    },
    async vote(id, choice) {
      if (!wallet.address) throw new Error('Create your citizen account before voting.');
      const result = await serverAction<{ receipt: VoteReceipt }>(`/api/proposals/${encodeURIComponent(id)}/vote`, { choice });
      await refresh();
      return result.receipt;
    },
    async likeModule(id) {
      if (!wallet.address) throw new Error('Create or sign in to your citizen account before liking a module.');
      await serverAction(`/api/modules/${encodeURIComponent(id)}/like`, {});
      await refresh();
    },
    async updateBuild(id, input) {
      const result = await serverAction<{ proposal: ProposalRecord }>(`/api/admin/builds/${encodeURIComponent(id)}`, input, 'PATCH');
      await refresh();
      return result.proposal;
    },
  }), [state, wallet.address, wallet.snapshot, status, error, refresh]);

  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
}

export function useLandville() {
  const store = useContext(StoreContext);
  if (!store) throw new Error('useLandville must be inside LandvilleProvider');
  return store;
}
