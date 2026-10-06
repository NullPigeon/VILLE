'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, Bot, Trash2 } from 'lucide-react';
import { readJsonResponse } from '@/lib/http-response';
import './market-stall-workshop.css';

type Service = { id: string; name: string; kind: string; holderOnly: boolean };
type Draft = { id: string; slot: number; baseServiceId: string; title: string; description: string; instructions: string };

export function MarketStallWorkshop({ services, agentExists, holder }: { services: Service[]; agentExists: boolean; holder: boolean }) {
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [baseServiceId, setBaseServiceId] = useState('long-form');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [instructions, setInstructions] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const eligible = services.filter((service) => ['model', 'long-form', 'research-brief'].includes(service.kind) && (holder || !service.holderOnly));

  useEffect(() => {
    if (!agentExists) return;
    let active = true;
    fetch('/api/agent-market/stalls', { cache: 'no-store' })
      .then((response) => readJsonResponse<{ drafts: Draft[] }>(response, 'Load your service drafts'))
      .then((result) => { if (active) setDrafts(result.drafts); })
      .catch((cause: Error) => { if (active) setError(cause.message); });
    return () => { active = false; };
  }, [agentExists]);

  async function save() {
    setBusy(true); setError(''); setNotice('');
    try {
      const response = await fetch('/api/agent-market/stalls', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ baseServiceId, title: title.trim(), description: description.trim(), instructions: instructions.trim() }) });
      const result = await readJsonResponse<{ draft: Draft }>(response, 'Save service draft');
      setDrafts((current) => [...current, result.draft].sort((a, b) => a.slot - b.slot));
      setTitle(''); setDescription(''); setInstructions('');
      setNotice('Service recipe saved privately. Test it before citizen sales open.');
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
    <p className="am-section-intro">Give your robot a specialty using a LANDVILLE model. Save a private recipe and test it with your wallet. Citizen sales open when seller payouts are ready.</p>
    {!agentExists ? <div className="am-stall-empty"><Bot /><span>Create your personal agent first to prepare a service.</span><Link href="/citizens">CREATE AGENT <ArrowUpRight /></Link></div> : <>
      <div className="am-stall-layout"><div className="am-stall-form"><label>FOUNDATION MODEL<select value={baseServiceId} onChange={(event) => setBaseServiceId(event.target.value)}>{eligible.map((service) => <option key={service.id} value={service.id}>{service.name}{service.holderOnly ? ' · HOLDER' : ''}</option>)}</select></label>
        <label>SERVICE NAME<input maxLength={80} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Pitch Doctor" /></label>
        <label>WHAT IT DOES<input maxLength={280} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Turns a rough pitch into a sharp one-page brief" /></label>
        <label>ROBOT&apos;S RECIPE<textarea maxLength={1000} value={instructions} onChange={(event) => setInstructions(event.target.value)} placeholder="Describe the steps and style your agent should follow..." /></label>
        <button type="button" onClick={() => void save()} disabled={busy || drafts.length >= (holder ? 10 : 3) || !eligible.some((service) => service.id === baseServiceId) || title.trim().length < 3 || description.trim().length < 10 || instructions.trim().length < 10}>{busy ? 'SAVING...' : 'SAVE PRIVATE DRAFT'} <ArrowUpRight /></button></div>
        <div className="am-stall-list"><small>YOUR RECIPES / {drafts.length} SAVED</small>{drafts.length ? drafts.map((draft) => <article key={draft.id}><div><span>STALL {String(draft.slot).padStart(2, '0')} / PRIVATE DRAFT</span><button type="button" aria-label={`Remove ${draft.title}`} disabled={busy} onClick={() => void remove(draft.id)}><Trash2 /></button></div><h3>{draft.title}</h3><p>{draft.description}</p><small>BUILT ON {services.find((service) => service.id === draft.baseServiceId)?.name || draft.baseServiceId}</small><Link href={`/agent-market?service=${encodeURIComponent(draft.baseServiceId)}&prompt=${encodeURIComponent(draft.instructions)}`}>TEST WITH MY WALLET <ArrowUpRight /></Link></article>) : <p>Your robot&apos;s first specialty starts here.</p>}</div></div>
      {error && <p className="am-error" role="alert">{error}</p>}{notice && <output className="am-success">{notice}</output>}
    </>}
  </section>;
}
