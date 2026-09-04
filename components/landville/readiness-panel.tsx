'use client';
import { useState } from 'react';
import { readJsonResponse } from '@/lib/http-response';

type Status = { storage: string; sessionConfigured: boolean; ai: { configured: boolean; model: string }; builderEnabled: boolean; builderConfigurationPresent: boolean };
export function ReadinessPanel() {
  const [status, setStatus] = useState<Status | null>(null);
  const [result, setResult] = useState('');
  const [busy, setBusy] = useState(false);
  async function check(live: boolean) {
    if (busy) return;
    setBusy(true); setResult('');
    try {
      const response = await fetch('/api/admin/readiness', live ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' } : { cache: 'no-store' });
      if (live) {
        const data = await readJsonResponse<{ ok: boolean; message: string; checkedAt: string }>(response, 'AI check');
        setResult(`${data.ok ? 'PASSED' : 'FAILED'} · ${data.message} · ${new Date(data.checkedAt).toLocaleString()}`);
      } else {
        setStatus(await readJsonResponse<Status>(response, 'Configuration check'));
      }
    } catch (error) { setResult(error instanceof Error ? error.message : 'Check failed.'); }
    finally { setBusy(false); }
  }
  return <section className="lv-panel chat-sidebar-body">
    <h2>LAUNCH CHECKS</h2>
    <p>Configuration checks never reveal secret values. A configured key is not proof that AI works.</p>
    <div className="build-actions"><button className="lv-button" disabled={busy} onClick={() => void check(false)}>CHECK CONFIGURATION</button><button className="lv-button" disabled={busy} onClick={() => void check(true)}>TEST LIVE AI · API COST</button></div>
    <p>The live test makes one small billable API request, at most once per minute per operator. It does not post to chat. No tests run automatically.</p>
    {status && <dl><dt>SUPABASE</dt><dd>{status.storage}</dd><dt>WALLET SESSION SECRET</dt><dd>{status.sessionConfigured ? 'Configured' : 'Missing or too short'}</dd><dt>SCRAPY AI</dt><dd>{status.ai.configured ? 'Key present; run live test' : 'Key missing'} · {status.ai.model}</dd><dt>BUILDER</dt><dd>{status.builderEnabled ? 'Enabled' : 'Disabled'} · {status.builderConfigurationPresent ? 'Coordinator settings present, not verified' : 'Coordinator settings incomplete'}</dd></dl>}
    {result && <output>{result}</output>}
  </section>;
}
