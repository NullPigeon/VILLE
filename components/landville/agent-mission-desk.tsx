'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, Bot, Check, Compass, X } from 'lucide-react';
import { readJsonResponse } from '@/lib/http-response';
import './agent-mission-desk.css';

type MissionView = { id: string; status: string; goal: string; reason: string | null; createdAt: string;
  plan: string[]; stepIndex: number; attempts: number;
  job: { id: string; title: string; brief: string; status: string } | null;
  service: { id: string; title: string; status: string } | null;
  outcome: { state: 'waiting' | 'cancelled' | 'not_selected' | 'delivered'; transaction?: string | null;
    paidMicro?: number | null; rating?: number | null; completedAt?: string | null } | null;
  events: Array<{ at: string; status: string; message: string }> };
type MissionResponse = { available: boolean; missions: MissionView[]; aiBudget: { calls: number; reservedUsd: number; actualUsd: number; dailyCalls: number; dailyUsd: number } | null };

const PLAN_LABELS: Record<string, string> = {
  scan_public_jobs: 'Scan public jobs', match_published_service: 'Match your service',
  owner_review: 'Your approval', publish_offer: 'Publish offer',
};

export function AgentMissionDesk({ robotName }: { robotName: string }) {
  const [missions, setMissions] = useState<MissionView[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [aiBudget, setAiBudget] = useState<MissionResponse['aiBudget']>(null);
  const [available, setAvailable] = useState(false);
  const load = useCallback(async () => {
    const response = await fetch('/api/agents/missions', { cache: 'no-store' });
    const result = await readJsonResponse<MissionResponse>(response, 'Load robot missions');
    setMissions(result.missions);
    setAiBudget(result.aiBudget);
    setAvailable(result.available);
  }, []);
  useEffect(() => {
    let active = true;
    fetch('/api/agents/missions', { cache: 'no-store' })
      .then((response) => readJsonResponse<MissionResponse>(response, 'Load robot missions'))
      .then((result) => { if (active) { setMissions(result.missions); setAiBudget(result.aiBudget); setAvailable(result.available); } })
      .catch((caught: Error) => { if (active) setError(caught.message); });
    return () => { active = false; };
  }, []);
  useEffect(() => {
    if (!available || !missions.some((mission) => ['queued','planning','publishing'].includes(mission.status))) return;
    const timer = window.setInterval(() => { void load().catch(() => {}); }, 15_000);
    return () => window.clearInterval(timer);
  }, [available, missions, load]);

  async function act(action: 'start' | 'approve' | 'cancel', id?: string) {
    if (busy) return;
    setBusy(true); setError('');
    try {
      const response = await fetch('/api/agents/missions', { method: 'POST',
        headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(id ? { action, id } : { action }) });
      const result = await readJsonResponse<MissionResponse>(response, 'Update robot mission');
      setMissions(result.missions);
      setAiBudget(result.aiBudget);
      setAvailable(result.available);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Mission could not be updated.');
      void load().catch(() => {});
    } finally { setBusy(false); }
  }

  const active = missions.some((mission) => ['queued','planning','awaiting_approval','publishing'].includes(mission.status));
  return <section className="agent-mission-desk" aria-label="Robot missions">
    <header><div><small>YOUR ROBOT / WORLD JOBS</small><h2><Bot aria-hidden="true" /> {robotName}’s missions</h2></div>
      <Link href="/world/jobs">JOB BOARD <ArrowUpRight aria-hidden="true" /></Link></header>
    <p>Send your robot to find a public World Job for one of your published Market services. It prepares a match and keeps a journal. You decide whether to post the offer; buyers decide whether to purchase.</p>
    {aiBudget && <p className="agent-mission-budget">AI decisions today: {aiBudget.calls}/{aiBudget.dailyCalls} · Estimated usage: ${aiBudget.actualUsd.toFixed(4)} · Reserved limit: ${aiBudget.reservedUsd.toFixed(3)}/${aiBudget.dailyUsd.toFixed(2)} USD. Pending or interrupted calls retain their reservation. This is separate from USDG.</p>}
    {!available && !error && <p>Robot missions are being prepared. The city operator will open them after the database update.</p>}
    <button className="lv-button primary" type="button" disabled={!available || busy || active} onClick={() => void act('start')}><Compass aria-hidden="true" /> {busy ? 'WORKING…' : 'FIND A JOB'}</button>
    {error && <p className="yard-error" role="alert">{error}</p>}
    <div className="agent-mission-list">{missions.map((mission) => <article key={mission.id}>
      <small>{mission.status.replaceAll('_', ' ').toUpperCase()} · {new Date(mission.createdAt).toLocaleDateString()}</small>
      <h3>{mission.job?.title || mission.goal}</h3>
      <div className="agent-mission-progress" aria-label="Saved mission plan">{mission.plan.map((step, index) => <span key={`${step}-${index}`} className={index < mission.stepIndex ? 'done' : ''}>{String(index + 1).padStart(2, '0')} {PLAN_LABELS[step] || step.replaceAll('_', ' ')}</span>)}</div>
      {mission.job && <p>{mission.job.brief}</p>}
      {mission.service && <p className="agent-mission-service">YOUR SERVICE: {mission.service.title}</p>}
      {mission.reason && <p>{mission.reason}</p>}
      {mission.status === 'awaiting_approval' && <div className="agent-mission-actions">
        <button type="button" disabled={busy || mission.job?.status !== 'open' || mission.service?.status !== 'published'} onClick={() => void act('approve', mission.id)}><Check aria-hidden="true" /> PUBLISH OFFER</button>
        <button type="button" disabled={busy} onClick={() => void act('cancel', mission.id)}><X aria-hidden="true" /> CANCEL</button>
      </div>}
      {mission.status === 'publishing' && <button type="button" disabled={busy} onClick={() => void act('approve', mission.id)}>RETRY / CHECK OFFER</button>}
      {['queued','planning'].includes(mission.status) && <div><p>{mission.status === 'queued' ? 'Waiting for the mission worker.' : `Robot is checking jobs. Attempt ${mission.attempts}/3; interrupted work resumes automatically.`}</p><button type="button" disabled={busy} onClick={() => void act('cancel', mission.id)}>CANCEL SEARCH</button></div>}
      {mission.status === 'offer_submitted' && mission.outcome?.state === 'waiting' && <p>The offer is live. The buyer has not attached a settled receipt yet.</p>}
      {mission.outcome?.state === 'delivered' && <div className="agent-mission-result"><strong>PAID JOB DELIVERED</strong><p>The buyer selected your offer and attached a settled receipt{mission.outcome.paidMicro ? ` for ${(mission.outcome.paidMicro / 1_000_000).toFixed(3)} USDG` : ''}. {mission.outcome.rating ? `Buyer rating: ${mission.outcome.rating}/5.` : 'Buyer review is pending.'}</p>{mission.outcome.transaction && <small>RECEIPT · {mission.outcome.transaction}</small>}</div>}
      {mission.outcome?.state === 'not_selected' && <p>This job was completed with a different offer. Your proposal remains in the journal.</p>}
      {mission.outcome?.state === 'cancelled' && <p>The buyer closed this job without a purchase.</p>}
      <details><summary>MISSION JOURNAL · {mission.events.length} STEPS</summary><ol>{mission.events.map((event, index) => <li key={`${event.at}-${index}`}><time dateTime={event.at}>{new Date(event.at).toLocaleString()}</time> · {event.message}</li>)}</ol></details>
    </article>)}</div>
  </section>;
}
