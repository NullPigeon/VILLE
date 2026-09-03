'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Hammer, ShieldAlert } from 'lucide-react';
import { ProductShell } from '@/components/landville/product-shell';
import { useLandville } from '@/components/landville/provider';
import { getBuildQueue, nextBuildId } from '@/lib/proposal-lifecycle';
import type { BuildAction, ProposalRecord } from '@/lib/landville-data';

export default function AdminPage() {
  const { proposals, isAdmin, status, updateBuild } = useLandville();
  const [selected, setSelected] = useState<{ proposal: ProposalRecord; action: BuildAction } | null>(null);
  const [form, setForm] = useState({ note: '', modulePath: '', releaseRef: '' });
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const approvedQueue = getBuildQueue(proposals);
  const readyId = nextBuildId(proposals);
  const queuedIds = new Set(approvedQueue.map((proposal) => proposal.id));
  const queue = [...approvedQueue, ...proposals.filter((proposal) => proposal.status === 'LIVE' && !queuedIds.has(proposal.id))];

  async function submit(event: { preventDefault(): void }) {
    event.preventDefault();
    if (!selected || busy) return;
    setBusy(true); setNotice('');
    try {
      const record = await updateBuild(selected.proposal.id, { action: selected.action, expectedStatus: selected.proposal.status, ...form });
      setNotice(`${record.id} → ${record.status}. Saved with an audit record.`); setSelected(null);
    } catch (error) { setNotice((error as Error).message); }
    finally { setBusy(false); }
  }

  return <ProductShell title="BUILD CONTROL" eyebrow="SERVER-AUTHORIZED / AUDITED ACTIONS">
    {!isAdmin ? <section className="lv-panel chat-sidebar-body"><h2><ShieldAlert /> ADMIN ACCESS REQUIRED</h2><p>{status === 'loading' ? 'Checking access…' : 'Sign in with a wallet listed in LANDVILLE_ADMIN_WALLETS. The server checks every action; this page cannot grant access.'}</p><Link className="lv-button" href="/citizens">MY PROFILE / SIGN IN</Link></section> : <>
      <p className="admin-warning">Each vote lasts 12 hours. Finalize after the deadline: YES must exceed NO; ties and zero votes are rejected. Build one approved proposal at a time, oldest voting deadline first. An earlier winning vote must be finalized before later work can start. Publishing registers an already deployed module; it does not generate or deploy code.</p>
      <section className="lv-panel"><header className="lv-panel-head"><h2><Hammer /> BUILD QUEUE</h2><span>{queue.length} PROPOSALS</span></header><div style={{ overflowX: 'auto' }}><table className="build-table"><thead><tr><th>PROPOSAL</th><th>VOTES</th><th>STATUS</th><th>ACTION</th></tr></thead><tbody>{queue.map((proposal) => <tr key={proposal.id}><td><strong>{proposal.title}</strong><br />{proposal.id} · {proposal.creator}</td><td>{proposal.yes} YES / {proposal.no} NO<br />YES must exceed NO</td><td>{proposal.status}{queuedIds.has(proposal.id) && <><br />{proposal.status === 'BUILDING' ? 'CURRENT BUILD' : `QUEUE #${approvedQueue.findIndex((item) => item.id === proposal.id) + 1}`}</>}<br />{proposal.closesAt && new Date(proposal.closesAt).toLocaleString()}</td><td><div className="build-actions">
        <button aria-label="Advance proposal" disabled={busy || status !== 'ready' || (proposal.status === 'LIVE' && proposal.closesIn !== 'ENDED') || (proposal.status === 'PASSED' && readyId !== proposal.id)} onClick={() => { setSelected({ proposal, action: proposal.status === 'LIVE' ? 'FINALIZE' : proposal.status === 'PASSED' ? 'START_BUILD' : 'PUBLISH' }); setForm({ note: '', modulePath: '', releaseRef: '' }); }}>{proposal.status === 'LIVE' ? 'FINALIZE VOTE' : proposal.status === 'PASSED' ? 'START BUILD' : 'REGISTER RELEASE'}</button>
        <button disabled={busy} className="reject" onClick={() => { setSelected({ proposal, action: 'REJECT' }); setForm({ note: '', modulePath: '', releaseRef: '' }); }}>REJECT</button>
      </div></td></tr>)}</tbody></table>{queue.length === 0 && <p className="empty-state">No pending proposals.</p>}</div></section>
      {selected && <section className="lv-panel"><form className="proposal-form" onSubmit={submit}><h2>{selected.action} · {selected.proposal.id}</h2><label>REVIEW NOTE<textarea required minLength={3} maxLength={1000} value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} /></label>{selected.action === 'PUBLISH' && <><label>DEPLOYED MODULE PATH<input required placeholder="/builds/town-radio" value={form.modulePath} onChange={(event) => setForm({ ...form, modulePath: event.target.value })} /></label><label>RELEASE REFERENCE<input required minLength={8} maxLength={200} placeholder="Verified deployment URL or commit SHA" value={form.releaseRef} onChange={(event) => setForm({ ...form, releaseRef: event.target.value })} /></label></>}<div className="build-actions"><button className="lv-button primary" disabled={busy}>{busy ? 'SAVING…' : 'CONFIRM ACTION'}</button><button type="button" className="lv-button" disabled={busy} onClick={() => setSelected(null)}>CANCEL</button></div></form></section>}
      {notice && <output className="admin-warning">{notice}</output>}
    </>}
  </ProductShell>;
}
