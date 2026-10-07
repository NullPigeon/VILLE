'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, Bot, Trash2 } from 'lucide-react';
import { readJsonResponse } from '@/lib/http-response';
import './market-stall-workshop.css';

type Service = { id: string; name: string; kind: string; holderOnly: boolean; priceUsd: string };
export type MarketStallDraft = { id: string; slot: number; baseServiceId: string; title: string; description: string; instructions: string;
  status: 'draft' | 'published'; markupMicro: number; updatedAt: string };

export function MarketStallWorkshop({ services, agentExists, holder, onTest, onPublishChange }: { services: Service[]; agentExists: boolean; holder: boolean; onTest: (draft: MarketStallDraft) => void; onPublishChange?: () => void }) {
  const [drafts, setDrafts] = useState<MarketStallDraft[]>([]);
  const [baseServiceId, setBaseServiceId] = useState('long-form');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [instructions, setInstructions] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [markups, setMarkups] = useState<Record<string, string>>({});
  const [balance, setBalance] = useState<{ availableMicro: number; earnedMicro: number; payoutsReady: boolean; payouts: Array<{ id: string; status: string; transaction_hash: string | null }> } | null>(null);
  const eligible = services.filter((service) => ['model', 'long-form', 'research-brief'].includes(service.kind) && (holder || !service.holderOnly));

  useEffect(() => {
    if (!agentExists) return;
    let active = true;
    fetch('/api/agent-market/stalls', { cache: 'no-store' })
      .then((response) => readJsonResponse<{ drafts: MarketStallDraft[] }>(response, 'Load your service drafts'))
      .then((result) => { if (active) setDrafts(result.drafts); })
      .catch((cause: Error) => { if (active) setError(cause.message); });
    return () => { active = false; };
  }, [agentExists]);

  useEffect(() => {
    if (!agentExists) return;
    fetch('/api/agent-market/payouts', { cache: 'no-store' })
      .then((response) => readJsonResponse<NonNullable<typeof balance>>(response, 'Load seller balance'))
      .then(setBalance).catch(() => undefined);
  }, [agentExists]);

  async function setPublished(draft: MarketStallDraft, publish: boolean) {
    setBusy(true); setError(''); setNotice('');
    try {
      const response = await fetch('/api/agent-market/stalls', { method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: draft.id, publish, ...(publish ? { markupUsd: markups[draft.id] || '0.05' } : {}) }) });
      const result = await readJsonResponse<{ draft: MarketStallDraft }>(response, 'Update service listing');
      setDrafts((current) => current.map((item) => item.id === draft.id ? result.draft : item));
      onPublishChange?.();
      setNotice(publish ? 'Your service is open to the city.' : 'Service removed from the public board.');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not update service listing.'); }
    finally { setBusy(false); }
  }

  async function withdraw() {
    setBusy(true); setError(''); setNotice('');
    try {
      const response = await fetch('/api/agent-market/payouts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
      const result = await readJsonResponse<{ payout: { transaction: string } }>(response, 'Withdraw seller earnings');
      setNotice(`Payout sent onchain: ${result.payout.transaction.slice(0, 12)}…`);
      const refreshed = await fetch('/api/agent-market/payouts', { cache: 'no-store' });
      setBalance(await readJsonResponse<NonNullable<typeof balance>>(refreshed, 'Refresh seller balance'));
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Payout needs review.'); }
    finally { setBusy(false); }
  }

  async function save() {
    setBusy(true); setError(''); setNotice('');
    try {
      const response = await fetch('/api/agent-market/stalls', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ baseServiceId, title: title.trim(), description: description.trim(), instructions: instructions.trim() }) });
      const result = await readJsonResponse<{ draft: MarketStallDraft }>(response, 'Save service draft');
      setDrafts((current) => [...current, result.draft].sort((a, b) => a.slot - b.slot));
      setTitle(''); setDescription(''); setInstructions('');
      setNotice('Service recipe saved privately. Test it, then publish when city checkout opens.');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not save service.'); }
    finally { setBusy(false); }
  }

  async function remove(id: string) {
    setBusy(true); setError(''); setNotice('');
    try {
      const response = await fetch('/api/agent-market/stalls', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
      await readJsonResponse(response, 'Remove service draft');
      setDrafts((current) => current.filter((draft) => draft.id !== id));
      setNotice('Draft removed.');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not remove draft.'); }
    finally { setBusy(false); }
  }

  return <section className="am-stall-workshop" aria-labelledby="am-stall-title">
    <header className="am-section-head"><div><small>06 / YOUR AGENT&apos;S WORKSHOP</small><h2 id="am-stall-title">BUILD A SERVICE.</h2></div><span>{holder ? '10 HOLDER DRAFT SLOTS' : '3 CITIZEN DRAFT SLOTS'}</span></header>
    <p className="am-section-intro">Give your robot a specialty and save a private recipe. Publishing currently uses a LANDVILLE-operated foundation and opens only when city checkout and payouts are configured. Direct x402 model purchases cannot yet be resold. For live city sales, you earn 90% of your markup; 10% goes to the treasury.</p>
    {!agentExists ? <div className="am-stall-empty"><Bot /><span>Create your personal agent first to prepare a service.</span><Link href="/citizens">CREATE AGENT <ArrowUpRight /></Link></div> : <>
      <div className="am-stall-layout"><div className="am-stall-form"><label>FOUNDATION MODEL<select value={baseServiceId} onChange={(event) => setBaseServiceId(event.target.value)}>{eligible.map((service) => <option key={service.id} value={service.id}>{service.name}{service.holderOnly ? ' · HOLDER' : ''}</option>)}</select></label>
        <label>SERVICE NAME<input maxLength={80} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Pitch Doctor" /></label>
        <label>WHAT IT DOES<input maxLength={280} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Turns a rough pitch into a sharp one-page brief" /></label>
        <label>ROBOT&apos;S RECIPE<textarea maxLength={1000} value={instructions} onChange={(event) => setInstructions(event.target.value)} placeholder="Describe the steps and style your agent should follow..." /></label>
        <button type="button" onClick={() => void save()} disabled={busy || drafts.length >= (holder ? 10 : 3) || !eligible.some((service) => service.id === baseServiceId) || title.trim().length < 3 || description.trim().length < 10 || instructions.trim().length < 10}>{busy ? 'SAVING...' : 'SAVE PRIVATE DRAFT'} <ArrowUpRight /></button></div>
        <div className="am-stall-list"><small>YOUR RECIPES / {drafts.length} SAVED</small>{drafts.length ? drafts.map((draft) => <article key={draft.id}><div><span>STALL {String(draft.slot).padStart(2, '0')} / {draft.status === 'published' ? 'LIVE IN MARKET' : 'PRIVATE DRAFT'}</span><button type="button" aria-label={`Remove ${draft.title}`} disabled={busy || draft.status === 'published'} onClick={() => void remove(draft.id)}><Trash2 /></button></div><h3>{draft.title}</h3><p>{draft.description}</p><small>BUILT ON {services.find((service) => service.id === draft.baseServiceId)?.name || draft.baseServiceId}</small>
          {draft.status === 'published' ? <p className="am-stall-price">Price: {(Number(services.find((service) => service.id === draft.baseServiceId)?.priceUsd || '0') + draft.markupMicro / 1_000_000).toFixed(6)} USDG / call</p> : <label className="am-stall-markup">YOUR MARKUP / USDG<input type="number" min="0.01" max="1" step="0.01" value={markups[draft.id] || '0.05'} onChange={(event) => setMarkups((current) => ({ ...current, [draft.id]: event.target.value }))} /></label>}
          <div className="am-stall-actions"><button className="am-stall-test" type="button" onClick={() => onTest(draft)}>TEST WITH A JOB <ArrowUpRight /></button><button className="am-stall-publish" type="button" disabled={busy} onClick={() => void setPublished(draft, draft.status !== 'published')}>{draft.status === 'published' ? 'UNPUBLISH' : 'PUBLISH SERVICE'}</button></div></article>) : <p>Your robot&apos;s first specialty starts here.</p>}</div></div>
      {balance && <div className="am-stall-balance"><div><strong>{(balance.availableMicro / 1_000_000).toFixed(3)} USDG</strong><span>READY TO WITHDRAW · {(balance.earnedMicro / 1_000_000).toFixed(3)} USDG EARNED</span></div><button type="button" disabled={busy || !balance.payoutsReady || balance.availableMicro < 10_000} onClick={() => void withdraw()}>WITHDRAW TO MY WALLET <ArrowUpRight /></button></div>}
      {error && <p className="am-error" role="alert">{error}</p>}{notice && <output className="am-success">{notice}</output>}
    </>}
  </section>;
}
