'use client';

import { createContext, useContext, useMemo } from 'react';
import {
  PrivyProvider,
  useLinkAccount,
  useLogin,
  useLoginWithEmail,
  usePrivy,
} from '@privy-io/react-auth';

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
  async logout() {},
};

const PrivyAuthContext = createContext<PrivyAuthContextValue>(unavailable);

function PrivyBridge({ children }: { children: React.ReactNode }) {
  const { authenticated, getAccessToken, logout, ready, user } = usePrivy();
  const { loginWithCode, sendCode } = useLoginWithEmail();
  const { login } = useLogin();
  const { linkEmail, linkWallet } = useLinkAccount();
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
    logout,
  }), [
    authenticated, getAccessToken, identityVersion, linkEmail, linkWallet,
    login, loginWithCode, logout, ready, sendCode,
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
