'use client';
/* oxlint-disable react/react-compiler -- protected remote job hydration */
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { ProductShell } from '@/components/landville/product-shell';
import { ReadinessPanel } from '@/components/landville/readiness-panel';
import { useLandville } from '@/components/landville/provider';
import { getBuildQueue } from '@/lib/proposal-lifecycle';
import type { BuildJob } from '@/lib/build-contract';
import type { ProposalRecord } from '@/lib/landville-data';

type Selection = { proposal: ProposalRecord; action: 'PREPARE' | 'RETRY' | 'FINALIZE' | 'REJECT' | 'RELEASE' };

export default function AdminPage() {
  const { proposals, isAdmin, status, updateBuild, refresh } = useLandville();
  const [jobs, setJobs] = useState<BuildJob[]>([]);
  const [selected, setSelected] = useState<Selection | null>(null);
  const [note, setNote] = useState('');
  const [checks, setChecks] = useState('');
  const [constraints, setConstraints] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [jobError, setJobError] = useState('');
  const loadJobs = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const response = await fetch('/api/admin/build-jobs', { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Cannot load builder jobs.');
      setJobs(data.jobs); setJobError('');
    } catch (error) { setJobError((error as Error).message); }
  }, [isAdmin]);
  useEffect(() => {
    if (!isAdmin) return;
    void loadJobs();
    const timer = setInterval(() => { void loadJobs(); }, 10_000);
    return () => clearInterval(timer);
  }, [isAdmin, loadJobs]);
  const ordered = getBuildQueue(proposals);
  const ids = new Set(ordered.map((proposal) => proposal.id));
  const queue = [...ordered, ...proposals.filter((proposal) => proposal.status === 'LIVE' && !ids.has(proposal.id))];
  function choose(proposal: ProposalRecord, action: Selection['action']) {
    const job = jobs.find((item) => item.proposal_id === proposal.id);
    setSelected({ proposal, action }); setNote(''); setChecks(job?.spec.acceptance.join('\n') || ''); setConstraints(job?.spec.constraints || '');
  }
  async function submit(event: { preventDefault(): void }) {
    event.preventDefault();
    if (!selected || busy) return;
    setBusy(true); setNotice('');
    try {
      const { proposal, action } = selected;
      if (action === 'FINALIZE' || action === 'REJECT') {
        await updateBuild(proposal.id, { action, expectedStatus: proposal.status, note });
      } else {
        const url = `/api/admin/build-jobs/${proposal.id}${action === 'RELEASE' ? '/release' : ''}`;
        const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action, acceptance: checks.split('\n').map((line) => line.trim()).filter(Boolean), constraints }) });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Build action failed.');
      }
      setNotice(`${proposal.id}: ${action} confirmed.`); setSelected(null);
      await Promise.all([loadJobs(), refresh()]);
    } catch (error) { setNotice((error as Error).message); }
    finally { setBusy(false); }
  }
  return <ProductShell title="BUILD CONTROL" eyebrow="REVIEW → BUILD → PR → VERIFIED RELEASE">
    {!isAdmin ? <section className="lv-panel chat-sidebar-body"><h2>ADMIN ACCESS REQUIRED</h2><p>{status === 'loading' ? 'Checking access…' : 'Sign in with an authorized operator wallet.'}</p><Link className="lv-button" href="/citizens">MY PROFILE / SIGN IN</Link></section> : <>
      <ReadinessPanel />
      <p className="admin-warning">Votes close after 12 hours. YES must exceed NO. Review a sandbox-compatible specification, then the enabled worker builds one module at a time. Review its PR, wait for City checks, test the acceptance checklist and merge manually. Only a verified production release adds the object to the World.</p>
      <p className="admin-warning">V1 modules cannot access wallets, shared storage or external APIs. Keep the approved goal unchanged. Do not send unsupported work to the automatic builder.</p>
      {jobError && <p role="alert" className="admin-warning">{jobError} <button onClick={() => void loadJobs()}>RETRY LOAD</button></p>}
      <section className="lv-panel"><header className="lv-panel-head"><h2>BUILD QUEUE</h2><span>{queue.length} PROPOSALS</span></header><div style={{ overflowX: 'auto' }}><table className="build-table"><thead><tr><th>PROPOSAL</th><th>VOTES / DEADLINE</th><th>BUILDER</th><th>ACTION</th></tr></thead><tbody>{queue.map((proposal) => {
        const job = jobs.find((item) => item.proposal_id === proposal.id);
        return <tr key={proposal.id}><td><strong>{proposal.title}</strong><br />{proposal.id} · {proposal.creator}<p>{proposal.summary}</p></td><td>{proposal.yes} YES / {proposal.no} NO<br />{proposal.closesAt && new Date(proposal.closesAt).toLocaleString()}</td><td>{proposal.status}<br />{job ? `${job.state} · attempt ${job.attempt}/3` : 'Needs specification'}{job?.error && <p>{job.error}</p>}{job?.pr_number && <p><a href={`https://github.com/NullPigeon/VILLE/pull/${job.pr_number}`} target="_blank" rel="noreferrer">REVIEW PR #{job.pr_number}</a></p>}</td><td><div className="build-actions">
          {proposal.status === 'LIVE' && <button disabled={busy || proposal.closesIn !== 'ENDED'} onClick={() => choose(proposal, 'FINALIZE')}>FINALIZE VOTE</button>}
          {proposal.status === 'PASSED' && <button disabled={busy || Boolean(jobError)} onClick={() => choose(proposal, 'PREPARE')}>{job ? 'EDIT SPECIFICATION' : 'REVIEW SPECIFICATION'}</button>}
          {(job?.state === 'FAILED' || job?.state === 'REVIEW') && proposal.status === 'BUILDING' && <button disabled={busy || job.attempt >= 3} onClick={() => choose(proposal, 'RETRY')}>{job.state === 'REVIEW' ? 'REBUILD AFTER CLOSING PR' : 'RETRY BUILD'}</button>}
          {job?.state === 'REVIEW' && <button disabled={busy} onClick={() => choose(proposal, 'RELEASE')}>VERIFY PRODUCTION RELEASE</button>}
          <button className="reject" disabled={busy} onClick={() => choose(proposal, 'REJECT')}>REJECT</button>
        </div></td></tr>;
      })}</tbody></table>{!queue.length && <p className="empty-state">No pending proposals.</p>}</div></section>
      {selected && <section className="lv-panel"><form className="proposal-form" onSubmit={submit}><h2>{selected.action} · {selected.proposal.id}</h2>
        {selected.action === 'PREPARE' ? <><p>Approved goal: {selected.proposal.summary}</p><label>ACCEPTANCE CHECKS — ONE PER LINE<textarea required value={checks} maxLength={3100} onChange={(event) => setChecks(event.target.value)} placeholder="Clicking Start begins the game.&#10;Reset clears the current score." /></label><label>IMPLEMENTATION CONSTRAINTS<textarea value={constraints} maxLength={2000} onChange={(event) => setConstraints(event.target.value)} /></label><p>Confirm that this is an isolated, transient module and the checks do not change the voted scope.</p></> :
        selected.action === 'RELEASE' ? <p>Confirm you tested every acceptance check and approved the code. The server will verify the exact PR, CI result, active Vercel production deployment and artifact hash before publication.</p> :
        selected.action === 'RETRY' ? <p>Inspect the previous workflow and branch first. A timeout may have left an unregistered PR. Close or reconcile it before approving another paid attempt. Maximum three attempts.</p> :
        <label>REVIEW NOTE<textarea required minLength={3} maxLength={1000} value={note} onChange={(event) => setNote(event.target.value)} /></label>}
        <div className="build-actions"><button className="lv-button primary" disabled={busy}>{busy ? 'CHECKING…' : 'CONFIRM'}</button><button type="button" className="lv-button" disabled={busy} onClick={() => setSelected(null)}>CANCEL</button></div></form></section>}
      {notice && <output aria-live="polite" className="admin-warning">{notice}</output>}
    </>}
  </ProductShell>;
}
