'use client';

import { createContext, useContext, useMemo } from 'react';
import {
  PrivyProvider,
  useLinkAccount,
  useLogin,
  useLoginWithEmail,
  usePrivy,
  useWallets,
} from '@privy-io/react-auth';

type WalletTransaction = { from: string; to: string; data: string; value: string };

type PrivyAuthContextValue = {
  configured: boolean;
  ready: boolean;
  authenticated: boolean;
  identityVersion: string;
  sendEmailCode(email: string): Promise<void>;
  verifyEmailCode(code: string): Promise<void>;
  loginWithWallet(): void;
  linkWallet(): void;
  linkEmail(): void;
  getAccessToken(): Promise<string | null>;
  sendTransaction(transaction: WalletTransaction, expectedAddress: string): Promise<string>;
  logout(): Promise<void>;
};

const unavailable: PrivyAuthContextValue = {
  configured: false,
  ready: true,
  authenticated: false,
  identityVersion: '',
  async sendEmailCode() { throw new Error('PRIVY SIGN-IN IS NOT CONFIGURED'); },
  async verifyEmailCode() { throw new Error('PRIVY SIGN-IN IS NOT CONFIGURED'); },
  loginWithWallet() { throw new Error('PRIVY SIGN-IN IS NOT CONFIGURED'); },
  linkWallet() { throw new Error('PRIVY SIGN-IN IS NOT CONFIGURED'); },
  linkEmail() { throw new Error('PRIVY SIGN-IN IS NOT CONFIGURED'); },
  async getAccessToken() { return null; },
  async sendTransaction() { throw new Error('CONNECT THE LINKED WALLET TO CONTINUE'); },
  async logout() {},
};

const PrivyAuthContext = createContext<PrivyAuthContextValue>(unavailable);

function PrivyBridge({ children }: { children: React.ReactNode }) {
  const { authenticated, getAccessToken, logout, ready, user } = usePrivy();
  const { loginWithCode, sendCode } = useLoginWithEmail();
  const { login } = useLogin();
  const { linkEmail, linkWallet } = useLinkAccount();
  const { ready: walletsReady, wallets } = useWallets();
  const identityVersion = user
    ? `${user.id}:${user.linkedAccounts.map((account) => `${account.type}:${'address' in account ? account.address : ''}`).join('|')}`
    : '';
  const value = useMemo<PrivyAuthContextValue>(() => ({
    configured: true,
    ready,
    authenticated,
    identityVersion,
    sendEmailCode: (address) => sendCode({ email: address }),
    verifyEmailCode: (code) => loginWithCode({ code }),
    loginWithWallet: () => login({ loginMethods: ['wallet'] }),
    linkWallet: () => linkWallet(),
    linkEmail: () => linkEmail(),
    getAccessToken,
    async sendTransaction(transaction, expectedAddress) {
      if (!walletsReady) throw new Error('WALLET CONNECTION IS STILL LOADING');
      const expected = expectedAddress.toLowerCase();
      const wallet = wallets.find((candidate) => candidate.type === 'ethereum' && candidate.address.toLowerCase() === expected);
      if (!wallet || wallet.type !== 'ethereum') throw new Error('CONNECT THE LINKED WALLET TO CONTINUE');
      await wallet.switchChain(4663);
      const provider = await wallet.getEthereumProvider();
      const chainId = await provider.request({ method: 'eth_chainId' });
      if (typeof chainId !== 'string' || Number(chainId) !== 4663) throw new Error('SWITCH YOUR WALLET TO ROBINHOOD MAINNET');
      const accounts = await provider.request({ method: 'eth_accounts' });
      if (!Array.isArray(accounts) || !accounts.some((account) => typeof account === 'string' && account.toLowerCase() === expected)) throw new Error('THE CONNECTED WALLET DOES NOT MATCH YOUR LINKED WALLET');
      const hash = await provider.request({ method: 'eth_sendTransaction', params: [transaction] });
      if (typeof hash !== 'string' || !/^0x[0-9a-fA-F]{64}$/.test(hash)) throw new Error('WALLET DID NOT RETURN A TRANSACTION HASH');
      return hash.toLowerCase();
    },
    logout,
  }), [
    authenticated, getAccessToken, identityVersion, linkEmail, linkWallet,
    login, loginWithCode, logout, ready, sendCode, wallets, walletsReady,
  ]);

  return <PrivyAuthContext.Provider value={value}>{children}</PrivyAuthContext.Provider>;
}

export function PrivyAuthProvider({ children }: { children: React.ReactNode }) {
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
  if (!appId) return <PrivyAuthContext.Provider value={unavailable}>{children}</PrivyAuthContext.Provider>;
  return <PrivyProvider appId={appId} config={{
    loginMethods: ['email', 'wallet'],
    appearance: { theme: 'dark', accentColor: '#baff00', walletChainType: 'ethereum-only' },
    embeddedWallets: { ethereum: { createOnLogin: 'off' } },
  }}><PrivyBridge>{children}</PrivyBridge></PrivyProvider>;
}

export function usePrivyAuth() {
  return useContext(PrivyAuthContext);
}
