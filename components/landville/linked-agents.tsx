'use client';

import { Bot, Check, Copy, Plus, RadioTower, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { LinkedAgent } from '@/lib/linked-agents';
import styles from './linked-agents.module.css';

export function LinkedAgents({ owner, editable }: { owner: string; editable: boolean }) {
  const [agents, setAgents] = useState<LinkedAgent[]>([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [token, setToken] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    const path = editable ? '/api/linked-agents' : `/api/citizens/${encodeURIComponent(owner)}/agents`;
    fetch(path, { cache: 'no-store' }).then(async (response) => {
      const data = await response.json() as { agents?: LinkedAgent[]; error?: string };
      if (!response.ok) throw new Error(data.error || 'Agent connections are unavailable.');
      if (active) { setAgents(data.agents || []); setLoaded(true); }
    }).catch((cause) => { if (active) { setError(cause instanceof Error ? cause.message : 'Agent connections are unavailable.'); setLoaded(true); } });
    return () => { active = false; };
  }, [owner, editable]);

  async function addAgent(event: React.SyntheticEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(''); setToken('');
    try {
      const response = await fetch('/api/linked-agents', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, description }) });
      const result = await response.json() as { agent?: LinkedAgent; token?: string; error?: string };
      if (!response.ok || !result.agent || !result.token) throw new Error(result.error || 'Could not connect this agent.');
      setAgents((current) => [result.agent!, ...current]);
      setToken(result.token); setName(''); setDescription('');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not connect this agent.'); }
    finally { setBusy(false); }
  }

  async function removeAgent(agent: LinkedAgent) {
    if (!window.confirm(`Disconnect ${agent.name}? Its connection token will stop working.`)) return;
    setBusy(true); setError(''); setToken('');
    try {
      const response = await fetch(`/api/linked-agents/${encodeURIComponent(agent.id)}`, { method: 'DELETE' });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || 'Could not disconnect this agent.');
      setAgents((current) => current.filter((item) => item.id !== agent.id));
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not disconnect this agent.'); }
    finally { setBusy(false); }
  }

  if (!editable && loaded && !agents.length) return null;
  return <section className={styles.section} aria-labelledby="linked-agents-title">
    <div className={styles.header}><div><small>YOUR NETWORK / EXTERNAL AGENTS</small><h3 id="linked-agents-title">AGENTS IN YOUR CREW.</h3><p>Keep your own agents connected to your LANDVILLE citizen profile.</p></div><RadioTower aria-hidden="true" /></div>
    {error && <p className={styles.error} role="alert">{error}</p>}
    {!loaded && !error && <p>Checking agent connections…</p>}
    {loaded && <div className={styles.grid}>{agents.map((agent) => {
      const checkedIn = Boolean(agent.connectedAt);
      return <article className={styles.card} key={agent.id}>
        <div className={styles.cardTop}><Bot aria-hidden="true" /><span className={checkedIn ? styles.online : styles.pending}>{checkedIn ? 'CHECKED IN' : 'WAITING FOR PING'}</span></div>
        <strong>{agent.name}</strong><p>{agent.description}</p>
        {agent.capabilities.length > 0 && <div className={styles.tags}>{agent.capabilities.map((capability) => <span key={capability}>{capability}</span>)}</div>}
        <small>{agent.connectedAt ? `Last check-in: ${new Date(agent.connectedAt).toLocaleString()}` : 'Connect it using the token shown when added.'}</small>
        {editable && <button className={styles.remove} type="button" onClick={() => removeAgent(agent)} disabled={busy}><Trash2 size={14} /> DISCONNECT</button>}
      </article>;
    })}</div>}
    {editable && loaded && <>
      {token && <div className={styles.token} aria-live="polite"><div><Check size={17} /><strong>Connection key - shown once</strong></div><p>Add this key to your agent&apos;s server. It lets that agent check in to this profile; it cannot use your wallet or spend funds.</p><code>{token}</code><button type="button" onClick={() => navigator.clipboard.writeText(token).catch(() => setError('Could not copy the key.'))}><Copy size={15} /> COPY KEY</button><p>Send JSON <code>{'{}'}</code> to <code>POST /api/linked-agents/connect</code> with <code>Authorization: Bearer YOUR_KEY</code>. Optionally send capability tags such as <code>{'{"capabilities":["research","code"]}'}</code>. Keep the key private.</p></div>}
      {agents.length < 5 && <form className={styles.form} onSubmit={addAgent}><div><label htmlFor="linked-agent-name">AGENT NAME</label><input id="linked-agent-name" value={name} onChange={(event) => setName(event.target.value)} maxLength={32} placeholder="My research bot" required /></div><div><label htmlFor="linked-agent-description">WHAT DOES IT DO?</label><input id="linked-agent-description" value={description} onChange={(event) => setDescription(event.target.value)} maxLength={240} placeholder="Finds useful information for my city projects" required /></div><button type="submit" disabled={busy}><Plus size={17} /> {busy ? 'CONNECTING…' : 'CONNECT AN AGENT'}</button></form>}
      <p className={styles.foot}>Your LANDVILLE yard robot is already tied to your profile. External agents appear publicly after their first check-in. Linking alone does not give them market or payment access.</p>
    </>}
  </section>;
}
