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
import { WorldFeatureArt } from '@/components/landville/world-feature-art';
import { worldFeatureKindFromBrief, worldFeaturePlacement } from '@/lib/world-change';
import './world-change-proposals.css';

const filters = [{ id: 'ALL', label: 'All ideas' }, { id: 'LIVE', label: 'Vote now' }, { id: 'PASSED', label: 'In queue' }, { id: 'BUILDING', label: 'Being built' }, { id: 'BUILT', label: 'Built' }, { id: 'MINE', label: 'My ideas' }, { id: 'REJECTED', label: 'Not approved' }];

export default function ProposalsPage() {
  const { proposals, objects, worldFeatures, isAdmin, voted, vote, refresh, status } = useLandville();
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

  async function publishWorldChange(id: string) {
    if (busy) return;
    setBusy(id); setNotice('Publishing reviewed World change…');
    try {
      const response = await fetch(`/api/admin/world-changes/${encodeURIComponent(id)}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || 'Could not publish World change.');
      await refresh();
      setNotice('World change is live.');
    } catch (error) { setNotice(error instanceof Error ? error.message : 'Could not publish World change.'); }
    finally { setBusy(''); }
  }

  return <ProductShell title="What goes up next?" eyebrow="YOUR IDEAS / THE TOWN DECIDES" actions={<Link className="lv-button primary" href="/chat?room=BUILD"><Bot />Pitch an idea</Link>}>
    <div className="city-proposal-intro"><ScrapyBot portrait /><p>“Give me an idea. You lot decide what earns a place in this city.”<span>— Scrapy</span></p></div>
    <details className="city-rules-disclosure"><summary>How voting works · {VOTING_HOURS} hours · {MINIMUM_MODULE_VOTERS} citizens minimum</summary><div><p>Every citizen has one vote of power, plus one per full 250K SCRAPY. At least {MINIMUM_MODULE_VOTERS} citizens must vote and YES must exceed NO. Approved modules enter the build queue and open after review. World scenery changes have a map preview and separate visual review before publication.</p><button className="lv-button" disabled={!wallet.address || Boolean(busy)} onClick={async () => { setBusy('power'); try { const power = await wallet.refreshVotingPower(); setNotice(`Your verified voting power: ${power.weight}.`); } catch (error) { setNotice(error instanceof Error ? error.message : 'Could not check voting power.'); } finally { setBusy(''); } }}><RefreshCw />Check my voting power</button></div></details>
    {notice && <output className="city-action-notice">{notice}</output>}
    <div className="filter-row" aria-label="Filter proposals">{filters.filter((item) => item.id !== 'MINE' || wallet.address).map((item) => <button key={item.id} className={filter === item.id ? 'active' : ''} aria-pressed={filter === item.id} onClick={() => setFilter(item.id)}>{item.label}</button>)}</div>
    <section className="proposal-list">{visible.map((proposal) => {
      const yes = Math.round(proposal.yes / Math.max(1, proposal.yes + proposal.no) * 100);
      const object = objects.find((item) => item.id === proposal.id);
      const live = proposal.status === 'LIVE' && proposal.closesIn !== 'ENDED';
      const world = proposal.category === 'WORLD';
      const worldBrief = proposal.summary.split("SCRAPY'S PLAN:\n")[1] || '';
      const featureKind = world ? worldFeatureKindFromBrief(worldBrief) : null;
      const placement = world ? worldFeaturePlacement(proposal.id, proposal.district) : null;
      const publishedFeature = worldFeatures.find((item) => item.proposalId === proposal.id);
      const label = proposal.status === 'LIVE' ? 'Voting open' : proposal.status === 'PASSED' ? world ? 'Approved · visual review' : `Queue #${queue.findIndex((item) => item.id === proposal.id) + 1}` : proposal.status === 'BUILDING' ? 'Building & review' : proposal.status === 'BUILT' ? world ? 'Live in World' : 'Open in World' : 'Not approved';
      return <article className="proposal-row city-proposal-card" id={proposal.id} key={proposal.id}>
        <div className="proposal-id">{proposal.id}<b className={`status-tag ${proposal.status}`}>{label}</b><small>{live ? proposal.closesIn : proposal.status === 'LIVE' ? 'Finalizing vote…' : ''}</small></div>
        <div className="proposal-copy"><small>{proposal.district} · {proposal.creator}{world ? ' · WORLD CHANGE' : ''}</small><h2>{proposal.title}</h2><p>{proposal.summary.split('\n')[0].slice(0, 180)}</p>{featureKind && placement && <div className="world-change-proposal-preview"><WorldFeatureArt kind={featureKind} /><div><b>{featureKind.replaceAll('_', ' ')}</b><small>Illustrated LANDVILLE scene piece · {proposal.district}</small><Link href={`/world?preview=${encodeURIComponent(proposal.id)}`}>Preview on map <ArrowUpRight size={14} /></Link></div></div>}<details className="city-proposal-brief"><summary>Read the full plan</summary><p>{proposal.summary}</p></details>{!world && ['PASSED','BUILDING','BUILT'].includes(proposal.status) && <BuildJourney proposal={proposal} />}{world && proposal.status === 'PASSED' && isAdmin && <button className="lv-button primary world-change-release" disabled={Boolean(busy) || !featureKind} onClick={() => void publishWorldChange(proposal.id)}>Publish reviewed change</button>}</div>
        <div className="vote-zone"><div className="vote-numbers"><b>{proposal.yes.toLocaleString()} YES</b><span>{proposal.no.toLocaleString()} NO</span></div><div className="vote-track" aria-label={`${yes}% yes voting power`}><i style={{ width: `${yes}%` }} /></div>
          {live ? !wallet.address ? <Link className="lv-button primary" href={`/citizens?returnTo=${encodeURIComponent(`/proposals#${proposal.id}`)}`}>Sign in to vote</Link> : voted[proposal.id] ? <span className="city-vote-receipt"><Check />You voted {voted[proposal.id].choice.toLowerCase()}</span> : <div className="vote-actions"><button disabled={status !== 'ready' || Boolean(busy)} onClick={() => void castVote(proposal.id, 'YES')}>{busy === proposal.id ? 'Saving…' : world ? 'Change the World' : 'Build it'}</button><button className="no" disabled={status !== 'ready' || Boolean(busy)} onClick={() => void castVote(proposal.id, 'NO')}>Vote no</button></div> : publishedFeature ? <Link className="lv-button primary" href={`/world?preview=${encodeURIComponent(proposal.id)}`}>See in World <ArrowUpRight /></Link> : object?.modulePath ? <Link className="lv-button primary" href={object.modulePath}>Visit building <ArrowUpRight /></Link> : <small>{proposal.status === 'PASSED' ? world ? 'Approved · awaiting visual review' : 'Waiting for Scrapy' : proposal.status === 'BUILDING' ? 'Checks & review before release' : 'Voting closed'}</small>}
        </div>
      </article>;
    })}{status === 'ready' && !visible.length && <div className="city-proposals-empty"><ScrapyBot /><h2>A little room for a big idea.</h2><Link className="lv-button primary" href="/chat?room=BUILD"><Vote />Start with Scrapy</Link></div>}</section>
  </ProductShell>;
}
