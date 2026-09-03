'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, Check, CircleDollarSign, Copy, ExternalLink, Network, RefreshCw, ShieldCheck, WalletCards } from 'lucide-react';
import { ProductShell } from '@/components/landville/product-shell';
import { useLandville } from '@/components/landville/provider';
import { useWallet } from '@/components/landville/wallet-provider';
import { addRobinhoodNetwork, activeRobinhoodChain } from '@/lib/robinhood-chain';
import { SCRAPY_TOKEN, scrapyAccess, scrapyTokenExplorerUrl, type ScrapyTokenStatus } from '@/lib/scrapy-token';

export default function TreasuryPage() {
  const { proposals } = useLandville();
  const wallet = useWallet();
  const [networkMessage, setNetworkMessage] = useState('');
  const [token, setToken] = useState<ScrapyTokenStatus | null>(null);
  const [tokenError, setTokenError] = useState('');
  const [copied, setCopied] = useState(false);
  const treasuryAddress = process.env.NEXT_PUBLIC_TREASURY_ADDRESS || '';
  const activeProposals = proposals.filter((proposal) => proposal.status === 'LIVE').length;
  const access = wallet.snapshot ? scrapyAccess(wallet.snapshot.tokenBalance, wallet.snapshot.tokenDecimals) : null;

  useEffect(() => {
    let active = true;
    fetch('/api/token', { cache: 'no-store' }).then(async (response) => {
      const result = await response.json() as ScrapyTokenStatus & { error?: string };
      if (!response.ok) throw new Error(result.error || 'Token verification unavailable.');
      if (active) { setToken(result); setTokenError(''); }
    }).catch((error: Error) => { if (active) setTokenError(error.message); });
    return () => { active = false; };
  }, []);

  async function addNetwork() {
    try { await addRobinhoodNetwork(); setNetworkMessage('ROBINHOOD MAINNET READY'); }
    catch (error) { setNetworkMessage((error as Error).message === 'NO_WALLET' ? 'NO EVM WALLET FOUND' : 'WALLET DECLINED THE NETWORK'); }
  }

  async function importToken() {
    try { await wallet.addScrapyToken(); setNetworkMessage('$SCRAPY ADDED TO WALLET'); }
    catch (error) { setNetworkMessage(error instanceof Error ? error.message.toUpperCase() : 'TOKEN IMPORT FAILED'); }
  }

  async function copyContract() {
    await navigator.clipboard.writeText(SCRAPY_TOKEN.address);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return <ProductShell title="$SCRAPY / TREASURY" eyebrow="OFFICIAL TOKEN / PUBLIC CHAIN DATA" actions={<div className="build-actions"><button className="lv-button" onClick={addNetwork}><Network /> CONNECT MAINNET</button><button className="lv-button primary" onClick={importToken}><WalletCards /> ADD $SCRAPY TO WALLET</button></div>}>
    <div className="admin-warning" style={{borderColor:'var(--acid)',color:'var(--acid)',background:'#17200d'}}><ShieldCheck /> VERIFIED CONTRACT · ROBINHOOD MAINNET · READ-ONLY PLATFORM ACCESS</div>
    {networkMessage && <div className="status-tag">{networkMessage}</div>}
    {tokenError && <div className="admin-warning">{tokenError} The contract address and governance rules remain available.</div>}

    <section className="treasury-summary">
      <article className="metric-card"><small>TOTAL SUPPLY</small><strong>{token?.totalSupplyFormatted ?? 'CHECKING…'}</strong><span>{token ? `${token.symbol} · BLOCK ${token.blockNumber}` : 'LIVE MAINNET READ'}</span></article>
      <article className="metric-card"><small>ACTIVE VOTES</small><strong>{activeProposals}</strong><span>INDEPENDENT 12-HOUR WINDOWS</span></article>
      <article className="metric-card"><small>VOTING POWER</small><strong>1 + 1</strong><span>BASE + EACH 250,000 SCRAPY</span></article>
    </section>

    <div className="product-grid">
      <section className="lv-panel">
        <header className="lv-panel-head"><h2><CircleDollarSign /> OFFICIAL TOKEN</h2><span>{token ? 'VERIFIED ONCHAIN' : 'VERIFYING CONTRACT'}</span></header>
        <div className="chain-card">
          <div className="token-identity"><span>$</span><div><small>LANDVILLE GOVERNANCE TOKEN</small><h2>{SCRAPY_TOKEN.ticker}</h2></div></div>
          <div className="token-contract"><small>CONTRACT ADDRESS</small><code>{SCRAPY_TOKEN.address}</code><button type="button" className="lv-button" onClick={() => void copyContract()}>{copied ? <Check /> : <Copy />}{copied ? 'COPIED' : 'COPY CA'}</button></div>
          <div className="chain-facts"><div><span>NETWORK</span><b>ROBINHOOD MAINNET</b></div><div><span>CHAIN ID</span><b>{SCRAPY_TOKEN.chainId}</b></div><div><span>SYMBOL</span><b>{token?.symbol || SCRAPY_TOKEN.symbol}</b></div><div><span>DECIMALS</span><b>{token?.decimals ?? SCRAPY_TOKEN.decimals}</b></div></div>
          <div className="build-actions"><button className="lv-button primary" onClick={importToken}><WalletCards /> ADD TO WALLET</button><a className="lv-button" href={scrapyTokenExplorerUrl(activeRobinhoodChain.explorerUrl)} target="_blank" rel="noreferrer">VIEW CONTRACT <ExternalLink /></a></div>
        </div>
      </section>

      <aside className="lv-panel">
        <header className="lv-panel-head"><h2><WalletCards /> YOUR TOKEN ACCESS</h2><span>{wallet.address ? 'SIGNED CITIZEN' : 'ACCOUNT REQUIRED'}</span></header>
        <div className="chain-card">
          {wallet.address ? <>
            <div className="chain-status"><i /><div><b>{wallet.snapshot ? `${wallet.snapshot.tokenBalanceFormatted} SCRAPY` : 'BALANCE NOT CHECKED'}</b><small>{wallet.snapshot ? `${wallet.snapshot.weight} VOTES AT BLOCK ${wallet.snapshot.blockNumber}` : 'MAINNET SNAPSHOT REQUIRED'}</small></div></div>
            <div className="chain-facts"><div><span>DAILY MESSAGES</span><b>{access?.dailyMessageLimit ?? '—'}</b></div><div><span>BUILD REQUEST</span><b>{access ? access.buildEligible ? 'ELIGIBLE' : '250K REQUIRED' : '—'}</b></div><div><span>BASE VOTE</span><b>1</b></div><div><span>HOLDER BONUS</span><b>{wallet.snapshot ? Math.max(0, wallet.snapshot.weight - 1) : '—'}</b></div></div>
            <button className="lv-button" onClick={() => wallet.refreshVotingPower().catch(() => undefined)}><RefreshCw /> REFRESH HOLDINGS</button>
          </> : <><p className="chain-note">Create a citizen account to read your SCRAPY balance, calculate voting power and unlock holder access.</p><Link className="lv-button primary" href="/citizens">CREATE ACCOUNT <ArrowUpRight /></Link></>}
        </div>
      </aside>
    </div>

    <div className="product-grid">
      <section className="lv-panel"><header className="lv-panel-head"><h2><ShieldCheck /> TOKEN UTILITY</h2><span>PLATFORM RULES</span></header><div className="chain-card"><div className="chain-facts"><div><span>WITHOUT TOKENS</span><b>1 VOTE · 10 MESSAGES</b></div><div><span>EACH 250,000</span><b>+1 VOTE</b></div><div><span>ANY POSITIVE HOLD</span><b>50 MESSAGES / DAY</b></div><div><span>BUILD REQUEST</span><b>250,000 MINIMUM</b></div></div><p className="chain-note">Balances are read from the official contract at the block used for each vote or build request. The browser cannot submit its own voting weight.</p><Link className="lv-button" href="/proposals">OPEN GOVERNANCE <ArrowUpRight /></Link></div></section>
      <aside className="lv-panel"><header className="lv-panel-head"><h2><WalletCards /> COMMUNITY TREASURY</h2><span>SEPARATE FROM TOKEN CONTRACT</span></header><div className="chain-card"><div className="chain-status"><i /><div><b>{treasuryAddress || 'NOT CONFIGURED'}</b><small>PUBLIC TREASURY ADDRESS</small></div></div><p className="chain-note">The token contract is live. Treasury asset indexing remains separate and will activate after a public treasury address and indexer are configured.</p><a className="lv-button" href={treasuryAddress ? `${activeRobinhoodChain.explorerUrl}/address/${treasuryAddress}` : activeRobinhoodChain.explorerUrl} target="_blank" rel="noreferrer">OPEN EXPLORER <ExternalLink /></a></div></aside>
    </div>
  </ProductShell>;
}
