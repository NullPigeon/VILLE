'use client';
import { useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, Bot, Check, RefreshCw, Vote } from 'lucide-react';
import { ProductShell } from '@/components/landville/product-shell';
import { useLandville } from '@/components/landville/provider';
import { useWallet } from '@/components/landville/wallet-provider';
import { getBuildQueue, MINIMUM_MODULE_VOTERS, VOTING_HOURS } from '@/lib/proposal-lifecycle';
import { BuildJourney } from '@/components/landville/build-journey';
import { ScrapyBot } from '@/components/landville/scrapy-bot';

const filters = [{ id: 'ALL', label: 'All ideas' }, { id: 'LIVE', label: 'Vote now' }, { id: 'PASSED', label: 'In queue' }, { id: 'BUILDING', label: 'Being built' }, { id: 'BUILT', label: 'Built' }, { id: 'MINE', label: 'My ideas' }, { id: 'REJECTED', label: 'Not approved' }];

export default function ProposalsPage() {
  const { proposals, objects, voted, vote, status } = useLandville();
  const wallet = useWallet();
  const [filter, setFilter] = useState('ALL');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState('');
  const queue = getBuildQueue(proposals);
  const visible = proposals.filter((proposal) => filter === 'ALL' || (filter === 'MINE' ? Boolean(wallet.address && proposal.creatorWallet === wallet.address) : proposal.status === filter));

  async function castVote(id: string, choice: 'YES' | 'NO') {
    if (busy) return;
    setBusy(id); setNotice('Checking voting power…');
    try { const receipt = await vote(id, choice); setNotice(`Vote recorded: ${choice.toLowerCase()} with ${receipt.weight} voting power.`); }
    catch (error) { setNotice(error instanceof Error ? error.message : 'Your vote could not be saved.'); }
    finally { setBusy(''); }
  }

  return <ProductShell title="What goes up next?" eyebrow="YOUR IDEAS / THE TOWN DECIDES" actions={<Link className="lv-button primary" href="/chat?room=BUILD"><Bot />Pitch an idea</Link>}>
    <div className="city-proposal-intro"><ScrapyBot portrait /><p>“I’ve got the tools. You lot pick the next building.”<span>— Scrapy</span></p></div>
    <details className="city-rules-disclosure"><summary>How voting works · {VOTING_HOURS} hours · {MINIMUM_MODULE_VOTERS} citizens minimum</summary><div><p>Every citizen has one vote of power, plus one per full 250K SCRAPY. At least {MINIMUM_MODULE_VOTERS} citizens must vote and YES must exceed NO. Approved ideas enter the build queue. Scrapy builds, then the result is reviewed before it opens in World.</p><button className="lv-button" disabled={!wallet.address || Boolean(busy)} onClick={async () => { setBusy('power'); try { const power = await wallet.refreshVotingPower(); setNotice(`Your verified voting power: ${power.weight}.`); } catch (error) { setNotice(error instanceof Error ? error.message : 'Could not check voting power.'); } finally { setBusy(''); } }}><RefreshCw />Check my voting power</button></div></details>
    {notice && <output className="city-action-notice">{notice}</output>}
    <div className="filter-row" aria-label="Filter proposals">{filters.filter((item) => item.id !== 'MINE' || wallet.address).map((item) => <button key={item.id} className={filter === item.id ? 'active' : ''} aria-pressed={filter === item.id} onClick={() => setFilter(item.id)}>{item.label}</button>)}</div>
    <section className="proposal-list">{visible.map((proposal) => {
      const yes = Math.round(proposal.yes / Math.max(1, proposal.yes + proposal.no) * 100);
      const object = objects.find((item) => item.id === proposal.id);
      const live = proposal.status === 'LIVE' && proposal.closesIn !== 'ENDED';
      const label = proposal.status === 'LIVE' ? 'Voting open' : proposal.status === 'PASSED' ? `Queue #${queue.findIndex((item) => item.id === proposal.id) + 1}` : proposal.status === 'BUILDING' ? 'Building & review' : proposal.status === 'BUILT' ? 'Open in World' : 'Not approved';
      return <article className="proposal-row city-proposal-card" id={proposal.id} key={proposal.id}>
        <div className="proposal-id">{proposal.id}<b className={`status-tag ${proposal.status}`}>{label}</b><small>{live ? proposal.closesIn : proposal.status === 'LIVE' ? 'Finalizing vote…' : ''}</small></div>
        <div className="proposal-copy"><small>{proposal.district} · {proposal.creator}</small><h2>{proposal.title}</h2><p>{proposal.summary.split('\n')[0].slice(0, 180)}</p><details className="city-proposal-brief"><summary>Read the full plan</summary><p>{proposal.summary}</p></details>{['PASSED','BUILDING','BUILT'].includes(proposal.status) && <BuildJourney proposal={proposal} />}</div>
        <div className="vote-zone"><div className="vote-numbers"><b>{proposal.yes.toLocaleString()} YES</b><span>{proposal.no.toLocaleString()} NO</span></div><div className="vote-track" aria-label={`${yes}% yes voting power`}><i style={{ width: `${yes}%` }} /></div>
          {live ? !wallet.address ? <Link className="lv-button primary" href={`/citizens?returnTo=${encodeURIComponent(`/proposals#${proposal.id}`)}`}>Sign in to vote</Link> : voted[proposal.id] ? <span className="city-vote-receipt"><Check />You voted {voted[proposal.id].choice.toLowerCase()}</span> : <div className="vote-actions"><button disabled={status !== 'ready' || Boolean(busy)} onClick={() => void castVote(proposal.id, 'YES')}>{busy === proposal.id ? 'Saving…' : 'Build it'}</button><button className="no" disabled={status !== 'ready' || Boolean(busy)} onClick={() => void castVote(proposal.id, 'NO')}>Vote no</button></div> : object?.modulePath ? <Link className="lv-button primary" href={object.modulePath}>Visit building <ArrowUpRight /></Link> : <small>{proposal.status === 'PASSED' ? 'Waiting for Scrapy' : proposal.status === 'BUILDING' ? 'Checks & review before release' : 'Voting closed'}</small>}
        </div>
      </article>;
    })}{status === 'ready' && !visible.length && <div className="city-proposals-empty"><ScrapyBot /><h2>A little room for a big idea.</h2><Link className="lv-button primary" href="/chat?room=BUILD"><Vote />Start with Scrapy</Link></div>}</section>
  </ProductShell>;
}
