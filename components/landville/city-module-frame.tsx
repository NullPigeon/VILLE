'use client';
import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { useWallet } from '@/components/landville/wallet-provider';
import { MODULE_CAPABILITY_RESPONSE, parseModuleCapabilityRequest } from '@/lib/module-runtime';

export function CityModuleFrame({ id }: { id: string }) {
  const { address } = useWallet();
  const frame = useRef<HTMLIFrameElement>(null);
  useEffect(() => {
    const active = new Set<string>();
    const onMessage = async (event: MessageEvent) => {
      const target = frame.current?.contentWindow;
      if (!target || event.source !== target) return;
      const request = parseModuleCapabilityRequest(event.data);
      if (!request || active.has(request.requestId) || active.size >= 2) return;
      active.add(request.requestId);
      try {
        const response = await fetch(`/api/modules/${encodeURIComponent(id)}/data`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ capability: request.capability, input: request.input }),
        });
        const result = await response.json().catch(() => ({ error: 'Invalid capability response.' }));
        target.postMessage({ type: MODULE_CAPABILITY_RESPONSE, requestId: request.requestId, ok: response.ok, ...(response.ok ? { data: result } : { error: result.error || 'Live data request failed.' }) }, '*');
      } catch {
        target.postMessage({ type: MODULE_CAPABILITY_RESPONSE, requestId: request.requestId, ok: false, error: 'Live data request failed.' }, '*');
      } finally { active.delete(request.requestId); }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [id]);
  if (!address) return <section className="lv-panel chat-sidebar-body"><h2>BECOME A CITIZEN</h2><p>Explore the world freely. Sign in to interact with its objects.</p><Link href="/citizens" className="lv-button primary">CREATE ACCOUNT / SIGN IN</Link></section>;
  return <><p className="admin-warning">Independent city module. Approved public market data may be relayed by LANDVILLE. No wallet control or shared storage; local progress resets when you leave.</p><iframe ref={frame} key={`${id}:${address}`} title={`City module ${id}`} src={`/api/modules/${id}`} sandbox="allow-scripts" referrerPolicy="no-referrer" style={{ width: '100%', height: '75vh', border: '1px solid #626d26', background: '#10110d' }} /></>;
}
