'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useLandville } from '@/components/landville/provider';

export function ChatProposalDraft({ text, onClose }: { text: string; onClose(): void }) {
  const { createProposal, activeProposal, status } = useLandville();
  const [draft, setDraft] = useState({ title: text.slice(0, 80), summary: text, category: 'UTILITY', district: 'THE DUMP' });
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [created, setCreated] = useState('');
  async function submit(event: { preventDefault(): void }) {
    event.preventDefault();
    if (busy || created || activeProposal || status !== 'ready') return;
    setBusy(true); setNotice('Checking your account and SCRAPY holdings…');
    try {
      const proposal = await createProposal(draft);
      setCreated(proposal.id); setNotice(`Vote opened. Deadline: ${new Date(proposal.closesAt || '').toLocaleString()}.`);
    } catch (error) { setNotice((error as Error).message); }
    finally { setBusy(false); }
  }
  return <form className="proposal-form" id="proposal-draft" onSubmit={submit}>
    <h3>REVIEW YOUR PROPOSAL</h3><p>This draft is not submitted yet. Confirming opens a public 12-hour vote. You need 250,000 SCRAPY and no other active proposal.</p>
    <label>OBJECT NAME<input required minLength={4} maxLength={80} value={draft.title} disabled={busy || Boolean(created)} onChange={(event) => setDraft({ ...draft, title: event.target.value })} /></label>
    <label>WHAT WILL IT DO?<textarea required minLength={10} maxLength={2000} value={draft.summary} disabled={busy || Boolean(created)} onChange={(event) => setDraft({ ...draft, summary: event.target.value })} /></label>
    <label>CATEGORY<select value={draft.category} disabled={busy || Boolean(created)} onChange={(event) => setDraft({ ...draft, category: event.target.value })}>{['UTILITY','GAME','ART','MEME','TOKEN','OTHER'].map((item) => <option key={item}>{item}</option>)}</select></label>
    <label>DISTRICT<select value={draft.district} disabled={busy || Boolean(created)} onChange={(event) => setDraft({ ...draft, district: event.target.value })}>{['THE DUMP','TOKEN ALLEY','MARKET','MEME PIT','TOWNWIDE'].map((item) => <option key={item}>{item}</option>)}</select></label>
    {activeProposal && !created && <p>Your active request: <Link href={`/proposals#${activeProposal.id}`}>{activeProposal.id}</Link>. You can keep discussing ideas; another proposal unlocks after it is built or rejected.</p>}
    {notice && <output aria-live="polite">{notice}</output>}
    {created ? <Link className="lv-button primary" href={`/proposals#${created}`}>VIEW {created}</Link> : <button className="lv-button primary" disabled={busy || Boolean(activeProposal) || status !== 'ready'}>{busy ? 'SUBMITTING…' : 'CONFIRM + OPEN VOTING'}</button>}
    <button type="button" className="lv-button" disabled={busy} onClick={onClose}>{created ? 'CLOSE' : 'DISCARD DRAFT'}</button>
  </form>;
}
