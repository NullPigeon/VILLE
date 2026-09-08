'use client';
import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { useWallet } from '@/components/landville/wallet-provider';
import { MODULE_CAPABILITY_RESPONSE, parseModuleCapabilityRequest } from '@/lib/module-runtime';

type PreviewRecord = { id: string; data: Record<string, unknown>; createdAt: string; updatedAt: string; ownedByViewer: true };
type PreviewStorage = {
  privateState: Map<string, Record<string, unknown>>;
  shared: Map<string, PreviewRecord[]>;
  counters: Map<string, number>;
};

function previewStorageResponse(store: PreviewStorage, inputValue: unknown) {
  const input = inputValue as { operation?: string; collection?: string; id?: string; data?: Record<string, unknown>; limit?: number };
  const operation = input?.operation || '';
  const collection = input?.collection || '';
  if (!/^[a-z][a-z0-9_-]{0,31}$/.test(collection)) throw new Error('Invalid preview collection.');
  const now = new Date().toISOString();
  if (operation === 'private.get') return { value: store.privateState.get(collection) ?? null, updatedAt: null };
  if (operation === 'private.set') { store.privateState.set(collection, input.data || {}); return { value: input.data || {}, updatedAt: now }; }
  if (operation === 'private.delete') { store.privateState.delete(collection); return { deleted: true }; }
  if (operation === 'shared.list') return { records: (store.shared.get(collection) || []).slice(0, input.limit || 25).map((record) => ({ ...record, author: { username: 'preview-admin', citizenNumber: 0, label: '@preview-admin' } })) };
  if (operation === 'shared.create') {
    const record: PreviewRecord = { id: crypto.randomUUID(), data: input.data || {}, createdAt: now, updatedAt: now, ownedByViewer: true };
    store.shared.set(collection, [record, ...(store.shared.get(collection) || [])]);
    return { record };
  }
  if (operation === 'shared.update') {
    const records = store.shared.get(collection) || [];
    const record = records.find((item) => item.id === input.id);
    if (!record) throw new Error('Preview record not found.');
    record.data = input.data || {}; record.updatedAt = now;
    return { record };
  }
  if (operation === 'shared.delete') {
    const records = store.shared.get(collection) || [];
    if (!records.some((item) => item.id === input.id)) throw new Error('Preview record not found.');
    store.shared.set(collection, records.filter((item) => item.id !== input.id));
    return { deleted: true };
  }
  if (operation === 'counter.get') return { value: store.counters.get(collection) || 0, updatedAt: null };
  if (operation === 'counter.increment') { const value = (store.counters.get(collection) || 0) + 1; store.counters.set(collection, value); return { value }; }
  throw new Error('Unsupported preview storage operation.');
}

export function CityModuleFrame({ id, preview = false }: { id: string; preview?: boolean }) {
  const { address } = useWallet();
  const frame = useRef<HTMLIFrameElement>(null);
  const previewStorage = useRef<PreviewStorage>({ privateState: new Map(), shared: new Map(), counters: new Map() });
  useEffect(() => {
    const active = new Set<string>();
    const onMessage = async (event: MessageEvent) => {
      const target = frame.current?.contentWindow;
      if (!target || event.source !== target) return;
      const request = parseModuleCapabilityRequest(event.data);
      if (!request || active.has(request.requestId) || active.size >= 4) return;
      active.add(request.requestId);
      try {
        if (preview && request.capability === 'module.storage') {
          const data = previewStorageResponse(previewStorage.current, request.input);
          target.postMessage({ type: MODULE_CAPABILITY_RESPONSE, requestId: request.requestId, ok: true, data }, '*');
          return;
        }
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
  }, [id, preview]);
  if (!address) return <section className="lv-panel chat-sidebar-body"><h2>BECOME A CITIZEN</h2><p>Explore the world freely. Sign in to interact with its objects.</p><Link href="/citizens" className="lv-button primary">CREATE ACCOUNT / SIGN IN</Link></section>;
  return <><p className="admin-warning">{preview ? 'ADMIN PREVIEW: storage is simulated in this tab and clears on reload. Test every interaction before release.' : 'Independent city module. LANDVILLE relays only its declared data and storage permissions. It cannot control your wallet, sign or submit transactions.'}</p><iframe ref={frame} key={`${id}:${address}:${preview}`} title={`City module ${id}`} src={preview ? `/api/admin/build-jobs/${id}/preview` : `/api/modules/${id}`} sandbox="allow-scripts" referrerPolicy="no-referrer" style={{ width: '100%', height: '75vh', border: '1px solid #626d26', background: '#10110d' }} /></>;
}
