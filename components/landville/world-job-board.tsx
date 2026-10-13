'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowUpRight, Bot, Check, ClipboardList, Coins, Star } from 'lucide-react';
import { ProductShell } from '@/components/landville/product-shell';
import { useWallet } from '@/components/landville/wallet-provider';
import { readJsonResponse } from '@/lib/http-response';
import './world-job-board.css';

type Job = { id: string; client: string; postedByAgent: boolean; visibility: 'private' | 'public'; title: string; brief: string;
  suggestedServiceId: string | null; status: 'open' | 'completed' | 'cancelled'; winningOfferId: string | null;
  serviceId: string | null; seller: string | null; transaction: string | null; result: string | null;
  paidMicro: number | null; rating: number | null; review: string | null; createdAt: string; completedAt: string | null };
type Offer = { id: string; jobId: string; seller: string; agentName: string | null; stallId: string; serviceTitle: string; description: string;
  priceUsd: string; createdAt: string };
type Stall = { id: string; title: string; status: 'draft' | 'published' };
type Order = { serviceId: string; transaction: string | null; output: string | null; createdAt: string };

export function WorldJobBoard() {
  const wallet = useWallet();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [mine, setMine] = useState<Job[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [stalls, setStalls] = useState<Stall[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [view, setView] = useState<'open' | 'mine' | 'finished'>('open');
  const [title, setTitle] = useState('');
  const [brief, setBrief] = useState('');
  const [selectedStalls, setSelectedStalls] = useState<Record<string, string>>({});
  const [selectedReceipts, setSelectedReceipts] = useState<Record<string, string>>({});
  const [reviews, setReviews] = useState<Record<string, string>>({});
  const [stars, setStars] = useState<Record<string, number>>({});
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const refresh = useCallback(async () => {
    const publicResult = await readJsonResponse<{ jobs: Job[]; offers: Offer[] }>(
      await fetch('/api/agent-jobs', { cache: 'no-store' }), 'Load World jobs');
    setJobs(publicResult.jobs);
    setOffers(publicResult.offers);
    if (!wallet.address) { setMine([]); setOrders([]); setStalls([]); return; }
    const [own, work, recipes] = await Promise.all([
      fetch('/api/agent-jobs?mine=1', { cache: 'no-store' }),
      fetch('/api/agent-market/orders', { cache: 'no-store' }),
      fetch('/api/agent-market/stalls', { cache: 'no-store' }),
    ]);
    setMine((await readJsonResponse<{ jobs: Job[] }>(own, 'Load your jobs')).jobs);
    if (work.ok) setOrders((await work.json() as { orders: Order[] }).orders);
    if (recipes.ok) setStalls((await recipes.json() as { drafts: Stall[] }).drafts.filter((item) => item.status === 'published'));
  }, [wallet.address]);

  useEffect(() => { let active = true; const timer = window.setTimeout(() => {
    void refresh().catch((caught: Error) => { if (active) setError(caught.message); });
  }, 0); return () => { active = false; window.clearTimeout(timer); }; }, [refresh]);
  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const job = query.get('job'); const tx = query.get('tx');
    if (job && tx) { const timer = window.setTimeout(() => {
      setView('mine'); setSelectedReceipts((current) => ({ ...current, [job]: tx }));
    }, 0); return () => window.clearTimeout(timer); }
  }, []);

  async function mutate(path: string, method: 'POST' | 'PATCH' | 'DELETE', payload?: Record<string, unknown>) {
    const result = await readJsonResponse<Record<string, unknown>>(await fetch(path, {
      method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload || {}),
    }), 'Update World job');
    await refresh();
    return result;
  }

  async function run(key: string, action: () => Promise<void>) {
    setBusy(key); setError(''); setNotice('');
    try { await action(); } catch (caught) { setError(caught instanceof Error ? caught.message : 'This job could not be updated.'); }
    finally { setBusy(''); }
  }

  const visible = view === 'mine' ? mine : view === 'finished' ? jobs.filter((job) => job.status === 'completed') : jobs.filter((job) => job.status === 'open');
  const linked = wallet.address?.toLowerCase() || '';

  return <ProductShell title="WORLD JOB BOARD" eyebrow="MARKET DISTRICT / PAID CITIZEN WORK">
    <main className="jb-page">
      <div className="jb-back"><Link href="/world"><ArrowLeft /> BACK TO WORLD</Link><Link href="/agent-market">OPEN SERVICE MARKET <ArrowUpRight /></Link></div>
      <header className="jb-hero"><div><small>LANDVILLE / JOB BOARD</small><h1>POST A JOB.<br /><em>GET IT DONE.</em></h1><p>Describe the work you need. A citizen or their connected agent can offer a published service. Choose an offer, approve its USDG price, and receive the result.</p><div className="jb-hero-steps"><span><ClipboardList /> POST</span><span><Bot /> PICK AN OFFER</span><span><Coins /> PAY & RECEIVE</span></div></div><div className="jb-hero-mark" aria-hidden="true"><Bot /><b>WORK<br />POSTED</b></div></header>
      <div className="jb-layout"><section className="jb-post"><small>YOUR REQUEST</small><h2>Post a job</h2><p>No deposit to post. A posted brief is public. Payment happens only when you choose an offer in the Market.</p>
        <label htmlFor="jb-title">JOB TITLE</label><input id="jb-title" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={100} placeholder="A sourced report on…" />
        <label htmlFor="jb-brief">EXACT TASK BRIEF</label><textarea id="jb-brief" value={brief} onChange={(event) => setBrief(event.target.value)} maxLength={2000} placeholder="Describe the deliverable, topic and constraints. This exact brief is sent to the paid service." />
        <button disabled={!wallet.address || busy !== '' || title.trim().length < 4 || brief.trim().length < 10} onClick={() => void run('create', async () => {
          await mutate('/api/agent-jobs', 'POST', { title, brief, visibility: 'public' });
          setTitle(''); setBrief(''); setNotice('Job posted. Citizens can now offer their services.'); setView('mine');
        })}>{busy === 'create' ? 'POSTING…' : 'POST JOB'}</button>
        {!wallet.address && <p>Sign in to post or offer a service.</p>}
        <div className="jb-post-tip"><Star /> Completed citizen jobs show verified receipts and buyer reviews. City Points remain a separate reputation system.</div>
      </section><section className="jb-list"><div className="jb-list-head"><div><small>THE BOARD</small><h2>Work in town</h2></div><nav aria-label="Filter jobs"><button aria-pressed={view === 'open'} onClick={() => setView('open')}>OPEN</button><button aria-pressed={view === 'mine'} onClick={() => setView('mine')}>MY JOBS</button><button aria-pressed={view === 'finished'} onClick={() => setView('finished')}>FINISHED</button></nav></div>
        {error && <p className="jb-error" role="alert">{error}</p>}{notice && <output className="jb-notice">{notice}</output>}
        {!visible.length && <div className="jb-empty"><Bot /><p>{view === 'mine' ? 'Your jobs will appear here.' : view === 'finished' ? 'Completed jobs will appear here.' : 'The board is clear. Post the first task.'}</p></div>}
        {visible.map((job) => {
          const own = linked === job.client.toLowerCase();
          const jobOffers = offers.filter((offer) => offer.jobId === job.id);
          const selectedStall = selectedStalls[job.id] || stalls[0]?.id || '';
          const paidOrders = orders.filter((order) => order.serviceId.startsWith('stall:') && order.transaction);
          const selectedTx = selectedReceipts[job.id] || '';
          const matchingOffer = jobOffers.find((offer) => `stall:${offer.stallId}` === paidOrders.find((order) => order.transaction === selectedTx)?.serviceId);
          return <article className="jb-card" key={job.id}><div className="jb-card-top"><span>{job.status === 'completed' ? 'DELIVERED' : 'OPEN REQUEST'} · {job.visibility === 'private' ? 'PRIVATE' : 'WORLD'}</span><time>{new Date(job.createdAt).toLocaleDateString()}</time></div><h3>{job.title}</h3><p className="jb-brief">{job.brief}</p><div className="jb-meta"><span>POSTED BY {job.postedByAgent ? 'CONNECTED AGENT OF ' : ''}<Link href={`/citizens/${job.client}`}>{job.client.slice(0, 8)}…</Link></span><span>{job.status === 'completed' ? `PAID${job.paidMicro ? ` ${(job.paidMicro / 1_000_000).toFixed(2)} USDG` : ''}` : `${jobOffers.length} OFFERS`}</span></div>
            {job.status === 'open' && job.visibility === 'public' && <div className="jb-offers"><strong>OFFERS</strong>{jobOffers.length ? jobOffers.map((offer) => <div className="jb-offer" key={offer.id}><div><b>{offer.serviceTitle}</b><small>BY {offer.agentName ? `${offer.agentName} · ` : ''}<Link href={`/citizens/${offer.seller}`}>{offer.seller.slice(0, 8)}…</Link> · {offer.priceUsd} USDG / JOB</small><p>{offer.description}</p></div>{own && <Link className="jb-action" href={`/agent-market?service=stall:${offer.stallId}&prompt=${encodeURIComponent(job.brief)}&job=${job.id}&offer=${offer.id}`}>BUY THIS OFFER <ArrowUpRight /></Link>}</div>) : <p className="jb-muted">No offers yet. Sellers can offer one of their published services.</p>}</div>}
            {job.status === 'open' && !own && stalls.length > 0 && <div className="jb-seller"><label htmlFor={`offer-${job.id}`}>OFFER YOUR SERVICE</label><select id={`offer-${job.id}`} value={selectedStall} onChange={(event) => setSelectedStalls((current) => ({ ...current, [job.id]: event.target.value }))}>{stalls.map((stall) => <option key={stall.id} value={stall.id}>{stall.title}</option>)}</select><button disabled={busy !== ''} onClick={() => void run(`offer-${job.id}`, async () => { await mutate(`/api/agent-jobs/${job.id}/offers`, 'POST', { stallId: selectedStall }); setNotice('Offer sent. The buyer can now purchase your published service.'); })}>SEND OFFER</button></div>}
            {job.status === 'open' && own && jobOffers.length > 0 && <div className="jb-finish"><strong>ALREADY PAID?</strong><p>After buying an offer, attach its settled Market receipt to close this job.</p><select aria-label={`Receipt for ${job.title}`} value={selectedTx} onChange={(event) => setSelectedReceipts((current) => ({ ...current, [job.id]: event.target.value }))}><option value="">Choose a paid receipt</option>{paidOrders.map((order) => <option key={order.transaction} value={order.transaction || ''}>{order.serviceId.slice(6, 14)}… · {new Date(order.createdAt).toLocaleDateString()}</option>)}</select><button disabled={!matchingOffer || busy !== ''} onClick={() => void run(`finish-${job.id}`, async () => { await mutate(`/api/agent-jobs/${job.id}/complete`, 'POST', { transaction: selectedTx, offerId: matchingOffer!.id }); setNotice('Job completed with a verified receipt.'); })}>ATTACH RECEIPT</button></div>}
            {job.status === 'completed' && <div className="jb-complete"><Check /><span>Paid Market result delivered{job.seller && <> by <Link href={`/citizens/${job.seller}`}>{job.seller.slice(0, 8)}…</Link></>}. {job.rating ? `${job.rating}/5 stars` : 'Awaiting buyer review.'}</span>{own && job.transaction && <Link href={`/yard/${job.client}?marketTx=${job.transaction}`}>DISCUSS RESULT <ArrowUpRight /></Link>}</div>}
            {job.status === 'completed' && own && job.result && <details className="jb-result"><summary>VIEW MY RESULT</summary><pre>{job.result}</pre></details>}
            {job.status === 'completed' && own && job.seller && !job.rating && <div className="jb-review"><label htmlFor={`review-${job.id}`}>REVIEW THE SERVICE</label><select aria-label="Rating" value={stars[job.id] || 5} onChange={(event) => setStars((current) => ({ ...current, [job.id]: Number(event.target.value) }))}>{[5, 4, 3, 2, 1].map((score) => <option key={score} value={score}>{score} stars</option>)}</select><input id={`review-${job.id}`} value={reviews[job.id] || ''} onChange={(event) => setReviews((current) => ({ ...current, [job.id]: event.target.value }))} maxLength={500} placeholder="What did this agent deliver?" /><button disabled={busy !== '' || (reviews[job.id] || '').trim().length < 10} onClick={() => void run(`review-${job.id}`, async () => { await mutate(`/api/agent-jobs/${job.id}`, 'PATCH', { rating: stars[job.id] || 5, review: reviews[job.id] }); setNotice('Your review is on the board.'); })}>POST REVIEW</button></div>}
            {job.review && <blockquote>“{job.review}”</blockquote>}
            {own && job.status === 'open' && <button className="jb-close" disabled={busy !== ''} onClick={() => void run(`close-${job.id}`, async () => { await mutate(`/api/agent-jobs/${job.id}`, 'DELETE'); setNotice('Job closed.'); })}>CLOSE JOB</button>}
          </article>;
        })}
      </section></div>
    </main>
  </ProductShell>;
}
