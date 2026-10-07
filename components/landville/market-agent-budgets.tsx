'use client';

import Link from 'next/link';
import { ArrowUpRight, Bot, ShieldCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { readJsonResponse } from '@/lib/http-response';
import './market-agent-budgets.css';

type AgentBudget = { id: string; name: string; enabled: boolean; dailyLimitMicro: number; usedTodayMicro: number;
  allowLandville: boolean; allowCitizens: boolean; allowMerchants: boolean };

function BudgetCard({ initial }: { initial: AgentBudget }) {
  const [agent, setAgent] = useState(initial);
  const [limit, setLimit] = useState((agent.dailyLimitMicro / 1_000_000).toString());
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  async function save() {
    setBusy(true); setMessage(''); setError('');
    try {
      const response = await fetch('/api/agent-market/budgets', { method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId: agent.id, enabled: agent.enabled, dailyLimitUsd: limit,
          allowLandville: agent.allowLandville, allowCitizens: agent.allowCitizens, allowMerchants: agent.allowMerchants }) });
      await readJsonResponse(response, 'Save agent spending rules');
      setMessage('Rules saved. Your agent pays from its own wallet and cannot exceed this LANDVILLE limit.');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not save agent rules.'); }
    finally { setBusy(false); }
  }
  return <article className="am-budget-card"><div className="am-budget-title"><Bot /><div><small>CONNECTED AGENT</small><h3>{agent.name}</h3></div><span>{(agent.usedTodayMicro / 1_000_000).toFixed(3)} USDG USED TODAY</span></div>
    <label className="am-budget-switch"><input type="checkbox" checked={agent.enabled} onChange={(event) => setAgent((current) => ({ ...current, enabled: event.target.checked }))} /> ALLOW PAID LANDVILLE CALLS</label>
    <label className="am-budget-limit">DAILY SPEND LIMIT · USDG<input type="number" min="0" max="2" step="0.01" value={limit} onChange={(event) => setLimit(event.target.value)} /></label>
    <div className="am-budget-sources"><label><input type="checkbox" checked={agent.allowLandville} onChange={(event) => setAgent((current) => ({ ...current, allowLandville: event.target.checked }))} /> City models & tools</label><label><input type="checkbox" checked={agent.allowCitizens} onChange={(event) => setAgent((current) => ({ ...current, allowCitizens: event.target.checked }))} /> Citizen services</label><label><input type="checkbox" checked={agent.allowMerchants} onChange={(event) => setAgent((current) => ({ ...current, allowMerchants: event.target.checked }))} /> Direct merchants</label></div>
    <button type="button" disabled={busy} onClick={() => void save()}>{busy ? 'SAVING…' : 'SAVE SPENDING RULES'} <ArrowUpRight /></button>
    {message && <p className="am-success">{message}</p>}{error && <p className="am-error" role="alert">{error}</p>}
  </article>;
}

export function MarketAgentBudgets({ signedIn }: { signedIn: boolean }) {
  const [agents, setAgents] = useState<AgentBudget[]>([]);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!signedIn) return;
    let active = true;
    fetch('/api/agent-market/budgets', { cache: 'no-store' })
      .then((response) => readJsonResponse<{ agents: AgentBudget[] }>(response, 'Load agent spending rules'))
      .then((result) => { if (active) setAgents(result.agents); })
      .catch((cause: Error) => { if (active) setError(cause.message); });
    return () => { active = false; };
  }, [signedIn]);
  return <section className="am-budget-section" aria-labelledby="am-budget-title"><header className="am-section-head"><div><small>07 / AGENT WALLETS</small><h2 id="am-budget-title">GIVE IT A BUDGET.</h2></div><span>OWNER CONTROLLED</span></header>
    <p className="am-section-intro">A connected external agent may buy permitted services with its own funded wallet and profile key. Set what it may use and a daily LANDVILLE limit. Your profile key never signs payments or spends your wallet.</p>
    {error && <p className="am-error" role="alert">{error}</p>}
    {!agents.length && <div className="am-empty-network"><ShieldCheck /><p>Connect an external agent to give it spending rules.</p><Link href="/citizens">CONNECT AGENT <ArrowUpRight /></Link></div>}
    <div className="am-budget-grid">{agents.map((agent) => <BudgetCard key={agent.id} initial={agent} />)}</div>
  </section>;
}
