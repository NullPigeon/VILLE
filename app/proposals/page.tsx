'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Bot, Vote } from 'lucide-react';
import { ProductShell } from '@/components/landville/product-shell';
import { useLandville } from '@/components/landville/provider';
import { useWallet } from '@/components/landville/wallet-provider';
import { getBuildQueue, VOTING_HOURS } from '@/lib/proposal-lifecycle';
import { BASE_VOTE_WEIGHT, shortWallet, TOKENS_PER_VOTE } from '@/lib/governance';
import { SCRAPY_TOKEN, scrapyTokenExplorerUrl } from '@/lib/scrapy-token';
import { activeRobinhoodChain } from '@/lib/robinhood-chain';

const filters = ['ALL', 'LIVE', 'PASSED', 'BUILDING', 'BUILT', 'REJECTED'] as const;

export default function ProposalsPage() {
  const { proposals, voted, vote, status, activeProposals } = useLandville();
  const wallet = useWallet();
  const [filter, setFilter] = useState<(typeof filters)[number]>('ALL');
  const [actionMessage, setActionMessage] = useState('');
  const [busyId, setBusyId] = useState('');
  const [checkingPower, setCheckingPower] = useState(false);
  const canAct = Boolean(wallet.address && status === 'ready');
  const buildQueue = getBuildQueue(proposals);
  const visible = useMemo(() => filter === 'ALL' ? proposals : proposals.filter((item) => item.status === filter), [filter, proposals]);

  async function checkPower() {
    if (checkingPower) return;
    if (!wallet.address) { setActionMessage('CREATE OR SIGN IN TO YOUR CITIZEN ACCOUNT FIRST'); return; }
    setCheckingPower(true);
    setActionMessage('CHECKING MAINNET SCRAPY HOLD…');
    try {
      const power = await wallet.refreshVotingPower();
      setActionMessage(power.source === 'chain' ? `${power.weight} VOTES VERIFIED ON MAINNET · BLOCK ${power.blockNumber}` : '1 BASE VOTE · LINK A WALLET TO ADD SCRAPY POWER');
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : 'Could not check holdings.');
    } finally {
      setCheckingPower(false);
    }
  }

  async function castVote(id: string, choice: 'YES' | 'NO') {
    setBusyId(id);
    setActionMessage('SNAPSHOTTING SCRAPY HOLD…');
    try {
      const receipt = await vote(id, choice);
      setActionMessage(`${receipt.weight} VOTE${receipt.weight === 1 ? '' : 'S'} CAST · BLOCK ${receipt.blockNumber} · ${shortWallet(receipt.wallet)}`);
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message.toUpperCase() : 'VOTE FAILED');
    } finally {
      setBusyId('');
    }
  }

  return <ProductShell title="PROPOSALS" eyebrow="IMAGINE / HOLD / VOTE" actions={<Link className="lv-button primary" href="/chat"><Bot /> DISCUSS WITH SCRAPY</Link>}>
    <p className="admin-warning">WANT TO BUILD SOMETHING? Open Town Chat, discuss the idea with Scrapy, and refine it until REVIEW &amp; PROPOSE appears. Proposals cannot be submitted directly from this page. <Link href="/chat">GO TO TOWN CHAT →</Link></p>
    <section className="governance-rule"><div><small>VOTING RULE / MAINNET</small><strong>{BASE_VOTE_WEIGHT} BASE VOTE + 1 PER {TOKENS_PER_VOTE.toLocaleString('en-US')} SCRAPY</strong><span>No tokens required to vote. Each full 250,000 SCRAPY in a linked wallet adds one vote.</span><a href={scrapyTokenExplorerUrl(activeRobinhoodChain.explorerUrl)} target="_blank" rel="noreferrer">{SCRAPY_TOKEN.ticker} · {shortWallet(SCRAPY_TOKEN.address)} · VERIFIED CONTRACT</a></div><div><small>YOUR LAST VERIFIED POWER</small><strong>{wallet.snapshot ? `${wallet.snapshot.weight} VOTES` : 'NOT CHECKED'}</strong><span>{wallet.address ? wallet.linkedWallet ? `${shortWallet(wallet.linkedWallet)} · ${wallet.snapshot?.tokenBalanceFormatted || '—'} SCRAPY` : 'EMAIL CITIZEN · NO WALLET LINKED' : 'Create or sign in to a citizen account.'}</span></div><button className="lv-button" onClick={checkPower} disabled={checkingPower}>{checkingPower ? 'CHECKING…' : wallet.address ? wallet.linkedWallet ? 'REFRESH HOLD' : 'CHECK BASE POWER' : 'SIGN IN TO CHECK'}</button></section>
    {actionMessage && <div className="admin-warning" style={{borderColor:'var(--acid)',color:'var(--acid)',background:'#17200d'}}>{actionMessage}</div>}
    <p className="admin-warning">Each proposal has its own {VOTING_HOURS}-hour vote. YES must exceed NO; ties and zero votes are rejected. Approved proposals are built one at a time, in voting-deadline order.</p>
    {activeProposals.length > 0 && <p className="admin-warning">YOUR ACTIVE PROPOSALS ({activeProposals.length}/2): {activeProposals.map((proposal, index) => <span key={proposal.id}>{index > 0 && ' · '}<Link href={`#${proposal.id}`}>{proposal.id} · {proposal.title}</Link> ({proposal.status})</span>)}. {activeProposals.length >= 2 ? 'At least one must be built or rejected before you can submit a third.' : 'You may submit one more through Town Chat.'}</p>}
    <div className="filter-row">{filters.map((item) => <button key={item} className={filter === item ? 'active' : ''} onClick={() => setFilter(item)}>{item}</button>)}</div>
    <section className="proposal-list">{visible.map((proposal) => {
      const total = proposal.yes + proposal.no;
      const yesPercent = Math.round((proposal.yes / Math.max(1,total))*100);
      return <article className="proposal-row" id={proposal.id} key={proposal.id}>
        <div className="proposal-id">{proposal.id}<b className={`status-tag ${proposal.status}`}>{proposal.status}</b><small>{proposal.closesIn}</small>{buildQueue.some((item) => item.id === proposal.id) && <small>{proposal.status === 'BUILDING' ? 'BUILD IN PROGRESS' : `QUEUE #${buildQueue.findIndex((item) => item.id === proposal.id) + 1}`}</small>}</div>
        <div className="proposal-copy"><small>{proposal.category} · {proposal.district} · {proposal.creator}</small><h2>{proposal.title}</h2><p>{proposal.summary}</p><small>YES MUST EXCEED NO · CLOSES: {proposal.closesAt ? new Date(proposal.closesAt).toLocaleString() : '—'}</small></div>
        <div className="vote-zone"><div className="vote-numbers"><b>{yesPercent}% YES · {proposal.yes.toLocaleString()} POWER</b><span>{100-yesPercent}% NO · {proposal.no.toLocaleString()} POWER</span></div><div className="vote-track"><i style={{width:`${yesPercent}%`}} /></div>{proposal.status === 'LIVE' && proposal.closesIn !== 'ENDED' ? <div className="vote-actions"><button disabled={!canAct || Boolean(voted[proposal.id]) || busyId === proposal.id} onClick={() => castVote(proposal.id,'YES')}>{voted[proposal.id]?.choice === 'YES' ? `VOTED YES ×${voted[proposal.id].weight} ✓` : 'VOTE YES'}</button><button className="no" disabled={!canAct || Boolean(voted[proposal.id]) || busyId === proposal.id} onClick={() => castVote(proposal.id,'NO')}>{voted[proposal.id]?.choice === 'NO' ? `VOTED NO ×${voted[proposal.id].weight} ✓` : 'VOTE NO'}</button></div> : <span className={`status-tag ${proposal.status}`}>{proposal.status === 'BUILDING' ? 'BUILD IN PROGRESS' : proposal.status === 'PASSED' ? 'WAITING TO BUILD' : 'VOTE CLOSED'}</span>}{proposal.eligibilitySnapshot&&<small className="snapshot-line">PROPOSED WITH ×{proposal.eligibilitySnapshot.weight} POWER · BLOCK {proposal.eligibilitySnapshot.blockNumber}</small>}</div>
      </article>;
    })}{status === 'ready' && visible.length === 0 && <div className="empty-state"><Vote />No proposals in this pile.</div>}</section>

  </ProductShell>;
}
