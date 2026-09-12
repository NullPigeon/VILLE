'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, Check, CircleDollarSign, Clock3, Copy, ExternalLink, Landmark, ShieldCheck, Vote, WalletCards } from 'lucide-react';
import { ProductShell } from '@/components/landville/product-shell';
import { useWallet } from '@/components/landville/wallet-provider';
import { activeRobinhoodChain } from '@/lib/robinhood-chain';
import type { TreasuryBoard, TreasuryProposalCategory } from '@/lib/treasury';
import './treasury.css';

const categories: Array<{ value: TreasuryProposalCategory; label: string }> = [
  { value: 'BUY', label: 'BUY AN ASSET' },
  { value: 'STAKE', label: 'STAKE / EARN' },
  { value: 'DISTRIBUTE', label: 'DISTRIBUTE TO HOLDERS' },
  { value: 'OPERATIONS', label: 'TOWN OPERATIONS' },
  { value: 'REWARD_POLICY', label: 'CHANGE CREATOR HOLD' },
  { value: 'OTHER', label: 'OTHER TREASURY USE' },
];

async function treasuryRequest<T>(url: string, body?: unknown) {
  const response = await fetch(url, body === undefined ? { cache: 'no-store' } : {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  const result = await response.json() as T & { error?: string };
  if (!response.ok) throw new Error(result.error || 'Treasury request failed.');
  return result;
}

function shortAddress(value: string) { return value ? `${value.slice(0, 8)}…${value.slice(-6)}` : 'NOT CONFIGURED'; }
function numberLabel(value: string) { try { return BigInt(value).toLocaleString('en-US'); } catch { return value || '0'; } }
function timeLabel(value: string) { return value ? new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : 'WAITING IN QUEUE'; }

export default function TreasuryPage() {
  const wallet = useWallet();
  const [board, setBoard] = useState<TreasuryBoard | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState('');
  const [copied, setCopied] = useState(false);
  const [category, setCategory] = useState<TreasuryProposalCategory>('OTHER');
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [requestedEth, setRequestedEth] = useState('');
  const [policyMinimumTokens, setPolicyMinimumTokens] = useState('1000000');

  const load = useCallback(async () => {
    try { setBoard(await treasuryRequest<TreasuryBoard>('/api/treasury')); setError(''); }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Treasury is unavailable.'); }
  }, []);

  useEffect(() => {
    const firstLoad = window.setTimeout(() => void load(), 0);
    const timer = window.setInterval(() => { if (!document.hidden) void load(); }, 15_000);
    return () => { window.clearTimeout(firstLoad); window.clearInterval(timer); };
  }, [load, wallet.address]);

  const holder = board?.holder || false;

  async function submitProposal() {
    setBusy('submit'); setNotice(''); setError('');
    try {
      await treasuryRequest('/api/treasury/proposals', { title, summary, category, requestedEth, policyMinimumTokens });
      setTitle(''); setSummary(''); setRequestedEth(''); setNotice('TREASURY PROPOSAL FILED. SCRAPY FOUND ANOTHER CLIPBOARD.');
      await load();
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Proposal failed.'); }
    finally { setBusy(''); }
  }

  async function vote(id: string, choice: 'YES' | 'NO') {
    setBusy(`${id}:${choice}`); setNotice(''); setError('');
    try { await treasuryRequest(`/api/treasury/proposals/${encodeURIComponent(id)}/vote`, { choice }); await load(); }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Vote failed.'); }
    finally { setBusy(''); }
  }

  async function copyAddress() {
    if (!board?.wallet.address) return;
    await navigator.clipboard.writeText(board.wallet.address); setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  const live = board?.proposals.find((proposal) => proposal.status === 'LIVE');
  const queued = board?.proposals.filter((proposal) => proposal.status === 'QUEUED').length || 0;

  return <ProductShell title="SCRAPY TREASURY" eyebrow="PUBLIC VAULT / HOLDER GOVERNANCE" actions={<div className="build-actions">
    <Link className="lv-button" href="/proposals"><Vote /> CITY BUILDS</Link>
    <a className="lv-button primary" href={board?.wallet.address ? `${activeRobinhoodChain.explorerUrl}/address/${board.wallet.address}` : activeRobinhoodChain.explorerUrl} target="_blank" rel="noreferrer">EXPLORER <ExternalLink /></a>
  </div>}>
    <div className="treasury-marquee"><ShieldCheck /><span>PUBLIC ADDRESS ONLY</span><b>PRIVATE KEY NEVER LEAVES THE SERVER</b><span>ROBINHOOD MAINNET · 4663</span></div>
    {error && <div className="admin-warning">{error}</div>}
    {notice && <div className="treasury-notice">{notice}</div>}

    <section className="vault-hero">
      <div className="vault-seal"><Landmark /><small>MUNICIPAL<br/>VAULT</small></div>
      <div className="vault-balance"><small>AVAILABLE TREASURY</small><strong>{board ? board.wallet.balanceEth : '…'} <em>ETH</em></strong><button type="button" onClick={() => void copyAddress()}>{copied ? <Check /> : <Copy />}{shortAddress(board?.wallet.address || '')}</button></div>
      <div className="vault-policy"><small>CREATOR REWARD</small><b>UP TO 0.05 ETH</b><span>MIN HOLD · {numberLabel(board?.policy.minimumRewardTokens || '1000000')} SCRAPY</span><span>OR 1% OF AVAILABLE ETH — WHICHEVER IS LOWER</span></div>
    </section>

    <section className="treasury-summary">
      <article className="metric-card"><small>ACTIVE VOTE</small><strong>{live ? live.id : 'NONE'}</strong><span>{live ? `CLOSES ${timeLabel(live.closesAt)}` : 'THE CLIPBOARD IS EMPTY'}</span></article>
      <article className="metric-card"><small>QUEUED DECISIONS</small><strong>{queued}</strong><span>ONE VOTE RUNS AT A TIME</span></article>
      <article className="metric-card"><small>VOTING WINDOW</small><strong>48H</strong><span>NO QUORUM · YES MUST EXCEED NO</span></article>
    </section>

    <div className="treasury-layout">
      <section className="lv-panel treasury-proposals">
        <header className="lv-panel-head"><h2><Vote /> TREASURY BALLOT BOARD</h2><span>HOLDERS DECIDE</span></header>
        {!board?.proposals.length && <div className="empty-state"><CircleDollarSign /><p>No Treasury proposals yet. Suspiciously peaceful.</p></div>}
        {board?.proposals.map((proposal) => {
          const receipt = board.voted[proposal.id];
          const total = proposal.yes + proposal.no;
          const yesPercent = total ? Math.round(proposal.yes / total * 100) : 0;
          return <article className={`treasury-ballot ${proposal.status}`} key={proposal.id}>
            <div className="ballot-head"><span>{proposal.id} · {proposal.category.replaceAll('_',' ')}</span><b>{proposal.status}</b></div>
            <h3>{proposal.title}</h3><p>{proposal.summary}</p>
            <div className="ballot-meta"><span>BY {proposal.creator}</span>{proposal.requestedEth && <span>REQUEST · {proposal.requestedEth} ETH</span>}{proposal.policyMinimumTokens && <span>NEW MIN · {numberLabel(proposal.policyMinimumTokens)} SCRAPY</span>}<span><Clock3 /> {proposal.status === 'QUEUED' ? 'QUEUED' : timeLabel(proposal.closesAt)}</span></div>
            <div className="vote-meter"><i style={{ width: `${yesPercent}%` }} /></div>
            <div className="vote-counts"><b>{proposal.yes} YES POWER</b><b>{proposal.no} NO POWER</b></div>
            {proposal.status === 'LIVE' && <div className="treasury-vote-actions">
              {receipt ? <span>YOUR VOTE · {receipt.choice} · {receipt.weight} POWER</span> : holder ? <><button disabled={Boolean(busy)} onClick={() => void vote(proposal.id,'YES')}>VOTE YES</button><button disabled={Boolean(busy)} className="no" onClick={() => void vote(proposal.id,'NO')}>VOTE NO</button></> : <span>LINK A SCRAPY-HOLDING WALLET TO VOTE</span>}
            </div>}
          </article>;
        })}
      </section>

      <aside className="lv-panel treasury-submit">
        <header className="lv-panel-head"><h2><WalletCards /> FILE A DECISION</h2><span>HOLDERS ONLY</span></header>
        {!wallet.address ? <div className="chain-card"><p className="chain-note">Create a citizen account and link the wallet holding SCRAPY.</p><Link href="/citizens" className="lv-button primary">SIGN IN</Link></div> : !holder ? <div className="chain-card"><p className="chain-note">Any positive SCRAPY balance unlocks Treasury proposals and votes. Refresh your holdings after linking a wallet.</p><button className="lv-button" onClick={() => wallet.refreshVotingPower().then(load).catch(() => undefined)}>REFRESH HOLDINGS</button></div> : <form onSubmit={(event) => { event.preventDefault(); void submitProposal(); }} className="treasury-form">
          <label>CATEGORY<select value={category} onChange={(event) => setCategory(event.target.value as TreasuryProposalCategory)}>{categories.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
          <label>TITLE<input minLength={4} maxLength={80} required value={title} onChange={(event) => setTitle(event.target.value)} placeholder="WHAT SHOULD THE VAULT DO?" /></label>
          <label>PLAN<textarea minLength={20} maxLength={2000} required value={summary} onChange={(event) => setSummary(event.target.value)} placeholder="Explain the action, destination, reason and expected result." /></label>
          {category === 'REWARD_POLICY' ? <label>PROPOSED MINIMUM SCRAPY<input inputMode="numeric" required value={policyMinimumTokens} onChange={(event) => setPolicyMinimumTokens(event.target.value.replace(/\D/g,''))} /></label> : <label>REQUESTED ETH · OPTIONAL<input inputMode="decimal" value={requestedEth} onChange={(event) => setRequestedEth(event.target.value)} placeholder="MAX 10% OF CURRENT BALANCE" /></label>}
          <button className="lv-button primary" disabled={Boolean(busy)}>{busy === 'submit' ? 'FILING…' : 'FILE TREASURY PROPOSAL'}</button>
          <small>Passed free-form decisions are public mandates, not arbitrary automatic transactions. Scrapy cannot be prompt-injected into draining the vault.</small>
        </form>}
      </aside>
    </div>

    <section className="lv-panel reward-ledger">
      <header className="lv-panel-head"><h2><CircleDollarSign /> CREATOR REWARD LEDGER</h2><span>FIRST RELEASES ONLY</span></header>
      <div className="reward-rules"><span>01 · MODULE VERIFIED IN WORLD</span><span>02 · CREATOR HELD THE REQUIRED SCRAPY</span><span>03 · SERVER PAYS ONCE</span><span>REBUILDS · 0 ETH</span></div>
      {!board?.rewards.length && <div className="empty-state"><p>New verified modules will appear here automatically.</p></div>}
      {board?.rewards.map((reward) => <article className="reward-row" key={reward.proposalId}>
        <div><small>{reward.proposalId}</small><b>{reward.title}</b><span>{reward.creator}</span></div>
        <div><small>HELD AT CHECK</small><b>{reward.tokenBalanceFormatted} SCRAPY</b></div>
        <div><small>REWARD</small><b>{reward.rewardEth} ETH</b></div>
        <div><small>STATUS</small><b className={reward.status}>{reward.status.replaceAll('_',' ')}</b>{reward.transactionHash && <a href={`${activeRobinhoodChain.explorerUrl}/tx/${reward.transactionHash}`} target="_blank" rel="noreferrer">TRANSACTION <ArrowUpRight /></a>}</div>
      </article>)}
    </section>
  </ProductShell>;
}
