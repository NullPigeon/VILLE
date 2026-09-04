'use client';
/* oxlint-disable react/react-compiler -- wallet session hydration happens after mount */

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { CitizenIdentity } from '@/lib/citizen-identity';
import type { VotingPowerSnapshot } from '@/lib/governance';
import { addRobinhoodNetwork } from '@/lib/robinhood-chain';
import { SCRAPY_TOKEN } from '@/lib/scrapy-token';
import { readJsonResponse } from '@/lib/http-response';

type WalletStatus = 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED' | 'ERROR';

type WalletContextValue = {
  address: string;
  status: WalletStatus;
  snapshot: VotingPowerSnapshot | null;
  error: string;
  profile: CitizenIdentity | null;
  refreshProfile(): Promise<void>;
  connectWallet(): Promise<string>;
  refreshVotingPower(): Promise<VotingPowerSnapshot>;
  addScrapyToken(): Promise<void>;
  disconnectWallet(): Promise<void>;
};

type EthereumProvider = {
  request(args: { method: string; params?: unknown }): Promise<unknown>;
};

const WalletContext = createContext<WalletContextValue | null>(null);

async function fetchSnapshot() {
  const response = await fetch('/api/governance/snapshot', { cache: 'no-store' });
  const result = await readJsonResponse<VotingPowerSnapshot>(response, 'SCRAPY balance check');
  return result;
}

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [address, setAddress] = useState('');
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

  useEffect(() => {
    let active = true;
    fetch('/api/auth/session', { cache: 'no-store' })
      .then((response) => readJsonResponse<{ address?: string | null }>(response, 'Wallet session'))
      .then(async (session: { address?: string | null }) => {
        if (!active || !session.address) return;
        setAddress(session.address);
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
      status,
      snapshot,
      error,
      profile: profile?.wallet === address ? profile : null,
      refreshProfile,
      async connectWallet() {
        setStatus('CONNECTING');
        setError('');
        try {
          const provider = (window as typeof window & { ethereum?: EthereumProvider }).ethereum;
          if (!provider) throw new Error('NO_WALLET');

          const accounts = (await provider.request({ method: 'eth_requestAccounts' })) as string[];
          const account = accounts[0]?.toLowerCase();
          if (!account) throw new Error('NO_ACCOUNT');

          await addRobinhoodNetwork();
          const challengeResponse = await fetch(
            `/api/auth/challenge?address=${encodeURIComponent(account)}`,
            { cache: 'no-store' },
          );
          const challenge = await readJsonResponse<{ message?: string; error?: string }>(challengeResponse, 'Wallet sign-in challenge');
          if (!challengeResponse.ok || !challenge.message) {
            throw new Error(challenge.error || 'Could not create wallet challenge.');
          }

          const signature = (await provider.request({
            method: 'personal_sign',
            params: [challenge.message, account],
          })) as string;
          const verifyResponse = await fetch('/api/auth/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ address: account, signature }),
          });
          const verified = await readJsonResponse<{ address?: string; error?: string }>(verifyResponse, 'Wallet verification');
          if (!verifyResponse.ok || !verified.address) {
            throw new Error(verified.error || 'Wallet verification failed.');
          }

          setAddress(verified.address);
          setSnapshot(null);
          setStatus('CONNECTED');
          void fetchSnapshot().then((current) => { if (currentAddress.current === current.wallet) setSnapshot(current); }).catch(() => undefined);
          router.push(`/citizens/${verified.address}`);
          // Citizen identity and chat access never depend on token holdings or RPC availability.
          return verified.address;
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
        setAddress('');
        setSnapshot(null);
        setError('');
        setStatus('DISCONNECTED');
      },
    }),
    [address, error, snapshot, status, profile, refreshProfile, router],
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet() {
  const value = useContext(WalletContext);
  if (!value) throw new Error('useWallet must be inside WalletProvider');
  return value;
}
