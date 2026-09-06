'use client';
/* oxlint-disable react/react-compiler -- wallet session hydration happens after mount */

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { CitizenIdentity } from '@/lib/citizen-identity';
import type { VotingPowerSnapshot } from '@/lib/governance';
import { addRobinhoodNetwork } from '@/lib/robinhood-chain';
import { SCRAPY_TOKEN } from '@/lib/scrapy-token';
import { readJsonResponse } from '@/lib/http-response';
import { usePrivyAuth } from '@/components/landville/privy-auth-provider';

type WalletStatus = 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED' | 'ERROR';

type WalletContextValue = {
  address: string;
  linkedWallet: string;
  email: string;
  authMethod: 'wallet' | 'email' | '';
  status: WalletStatus;
  snapshot: VotingPowerSnapshot | null;
  error: string;
  profile: CitizenIdentity | null;
  refreshProfile(): Promise<void>;
  sendEmailCode(email: string): Promise<void>;
  verifyEmailCode(email: string, token: string): Promise<string>;
  connectWallet(): Promise<string>;
  refreshVotingPower(): Promise<VotingPowerSnapshot>;
  addScrapyToken(): Promise<void>;
  disconnectWallet(): Promise<void>;
};

type EthereumProvider = {
  request(args: { method: string; params?: unknown }): Promise<unknown>;
};

const WalletContext = createContext<WalletContextValue | null>(null);
type AccountSession = { address?: string | null; linkedWallet?: string | null; email?: string | null; method?: 'wallet' | 'email' };

async function fetchSnapshot() {
  const response = await fetch('/api/governance/snapshot', { cache: 'no-store' });
  const result = await readJsonResponse<VotingPowerSnapshot>(response, 'SCRAPY balance check');
  return result;
}

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const {
    authenticated: privyAuthenticated,
    configured: privyConfigured,
    getAccessToken,
    identityVersion,
    linkWallet: linkPrivyWallet,
    loginWithWallet,
    logout: logoutPrivy,
    ready: privyReady,
    sendEmailCode: sendPrivyEmailCode,
    verifyEmailCode: verifyPrivyEmailCode,
  } = usePrivyAuth();
  const [address, setAddress] = useState('');
  const [linkedWallet, setLinkedWallet] = useState('');
  const [email, setEmail] = useState('');
  const [authMethod, setAuthMethod] = useState<WalletContextValue['authMethod']>('');
  const currentAddress = useRef(address);
  currentAddress.current = address;
  const [profile, setProfile] = useState<CitizenIdentity | null>(null);
  const refreshProfile = useCallback(async () => {
    const identity = currentAddress.current;
    if (!identity) return;
    const response = await fetch('/api/profile', { cache: 'no-store' });
    const result = await readJsonResponse<{ profile: CitizenIdentity }>(response, 'Citizen profile');
    if (currentAddress.current === identity && result.profile.wallet === identity) setProfile(result.profile);
  }, []);
  useEffect(() => { void refreshProfile().catch(() => undefined); }, [address, refreshProfile]);
  const [status, setStatus] = useState<WalletStatus>('DISCONNECTED');
  const [snapshot, setSnapshot] = useState<VotingPowerSnapshot | null>(null);
  const [error, setError] = useState('');

  const applySession = useCallback((session: AccountSession) => {
    if (!session.address) throw new Error('Privy did not return a LANDVILLE citizen account.');
    currentAddress.current = session.address;
    setAddress(session.address);
    setLinkedWallet(session.linkedWallet || '');
    setEmail(session.email || '');
    setAuthMethod(session.method || 'wallet');
    setSnapshot(null);
    setStatus('CONNECTED');
    void fetchSnapshot().then((current) => {
      if (currentAddress.current === current.wallet) setSnapshot(current);
    }).catch(() => undefined);
    return session.address;
  }, []);

  const syncPrivySession = useCallback(async () => {
    const token = await getAccessToken();
    if (!token) throw new Error('Privy session is not ready. Try again.');
    const response = await fetch('/api/auth/privy', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: '{}',
    });
    const result = await readJsonResponse<AccountSession & { error?: string }>(response, 'Privy sign-in');
    if (!response.ok) throw new Error(result.error || 'Privy sign-in failed.');
    return applySession(result);
  }, [applySession, getAccessToken]);

  useEffect(() => {
    if (!privyConfigured || !privyReady || !privyAuthenticated || !identityVersion) return;
    void syncPrivySession().catch((caught: unknown) => {
      setError(caught instanceof Error ? caught.message : 'Privy sign-in failed.');
    });
  }, [identityVersion, privyAuthenticated, privyConfigured, privyReady, syncPrivySession]);

  useEffect(() => {
    let active = true;
    fetch('/api/auth/session', { cache: 'no-store' })
      .then((response) => readJsonResponse<AccountSession>(response, 'Citizen session'))
      .then(async (session) => {
        if (!active || !session.address) return;
        currentAddress.current = session.address;
        setAddress(session.address);
        setLinkedWallet(session.linkedWallet || '');
        setEmail(session.email || '');
        setAuthMethod(session.method || 'wallet');
        setStatus('CONNECTED');
        try {
          const current = await fetchSnapshot();
          if (active) setSnapshot(current);
        } catch {
          // A valid identity can remain connected while an RPC is temporarily unavailable.
        }
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  const value = useMemo<WalletContextValue>(
    () => ({
      address,
      linkedWallet,
      email,
      authMethod,
      status,
      snapshot,
      error,
      profile: profile?.wallet === address ? profile : null,
      refreshProfile,
      async sendEmailCode(requestedEmail) {
        setError('');
        await sendPrivyEmailCode(requestedEmail.trim().toLowerCase());
      },
      async verifyEmailCode(_requestedEmail, token) {
        setStatus('CONNECTING'); setError('');
        try {
          await verifyPrivyEmailCode(token);
          const citizen = await syncPrivySession();
          router.push(`/citizens/${citizen}`);
          return citizen;
        } catch (caught) {
          const message = caught instanceof Error ? caught.message : 'Email verification failed.';
          setError(message); setStatus(address ? 'CONNECTED' : 'ERROR'); throw new Error(message);
        }
      },
      async connectWallet() {
        setStatus('CONNECTING');
        setError('');
        try {
          if (!privyConfigured) throw new Error('PRIVY SIGN-IN IS NOT CONFIGURED');
          if (privyAuthenticated) linkPrivyWallet();
          else loginWithWallet();
          return address;
        } catch (caught) {
          const message = caught instanceof Error ? caught.message : 'Wallet connection failed.';
          const readable =
            message === 'NO_WALLET'
              ? 'NO EVM WALLET FOUND'
              : message === 'NO_ACCOUNT'
                ? 'NO WALLET ACCOUNT FOUND'
                : message;
          setError(readable);
          setStatus('ERROR');
          throw new Error(readable);
        }
      },
      async refreshVotingPower() {
        setError('');
        try {
          const current = await fetchSnapshot();
          setSnapshot(current);
          return current;
        } catch (caught) {
          const message = caught instanceof Error ? caught.message : 'Could not check SCRAPY holdings.';
          setSnapshot(null);
          setError(message);
          throw new Error(message);
        }
      },
      async addScrapyToken() {
        if (!linkedWallet) throw new Error('LINK A WALLET TO THIS CITIZEN ACCOUNT FIRST');
        const provider = (window as typeof window & { ethereum?: EthereumProvider }).ethereum;
        if (!provider) throw new Error('NO EVM WALLET FOUND');
        await addRobinhoodNetwork();
        const accepted = await provider.request({
          method: 'wallet_watchAsset',
          params: { type: 'ERC20', options: { address: SCRAPY_TOKEN.address, symbol: SCRAPY_TOKEN.symbol, decimals: SCRAPY_TOKEN.decimals } },
        });
        if (accepted === false) throw new Error('Token import was declined.');
      },
      async disconnectWallet() {
        const response = await fetch('/api/auth/session', { method: 'DELETE' });
        if (!response.ok) throw new Error('Could not sign out. Try again.');
        if (privyAuthenticated) await logoutPrivy();
        setAddress('');
        currentAddress.current = '';
        setLinkedWallet('');
        setEmail('');
        setAuthMethod('');
        setSnapshot(null);
        setError('');
        setStatus('DISCONNECTED');
      },
    }),
    [
      address, linkedWallet, email, authMethod, error, snapshot, status, profile,
      refreshProfile, router, privyAuthenticated, privyConfigured, linkPrivyWallet,
      loginWithWallet, logoutPrivy, sendPrivyEmailCode, syncPrivySession, verifyPrivyEmailCode,
    ],
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet() {
  const value = useContext(WalletContext);
  if (!value) throw new Error('useWallet must be inside WalletProvider');
  return value;
}
