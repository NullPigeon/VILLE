'use client';
import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { useWallet } from '@/components/landville/wallet-provider';
import { MODULE_CAPABILITY_RESPONSE, parseModuleCapabilityRequest } from '@/lib/module-runtime';
import { activeRobinhoodChain } from '@/lib/robinhood-chain';

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
  const { address, linkedWallet, sendModuleTransaction } = useWallet();
  const frame = useRef<HTMLIFrameElement>(null);
  const previewStorage = useRef<PreviewStorage>({ privateState: new Map(), shared: new Map(), counters: new Map() });
  const previewCitizenPublished = useRef(false);
  useEffect(() => {
    const active = new Set<string>();
    const onMessage = async (event: MessageEvent) => {
      const target = frame.current?.contentWindow;
      if (!target || event.source !== target) return;
      const request = parseModuleCapabilityRequest(event.data);
      if (!request || active.has(request.requestId) || active.size >= 4) return;
      active.add(request.requestId);
      try {
        if (request.capability === 'wallet.robinhood') {
          if (preview) throw new Error('Wallet transactions are disabled in admin preview. Release only after reviewing the declared permission.');
          const response = await fetch(`/api/modules/${encodeURIComponent(id)}/transaction`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ input: request.input }),
          });
          const result = await response.json().catch(() => ({ error: 'Invalid transaction response.' }));
          if (!response.ok) throw new Error(result.error || 'Transaction request failed.');
          if (request.input.operation === 'uniswap.quoteExactInputSingle') {
            target.postMessage({ type: MODULE_CAPABILITY_RESPONSE, requestId: request.requestId, ok: true, data: result }, '*');
            return;
          }
          const transaction = result?.transaction as { from?: unknown; to?: unknown; data?: unknown; value?: unknown } | undefined;
          if (!linkedWallet || !transaction || typeof transaction.from !== 'string' || transaction.from.toLowerCase() !== linkedWallet.toLowerCase() ||
            typeof transaction.to !== 'string' || !/^0x[0-9a-fA-F]{40}$/.test(transaction.to) || typeof transaction.data !== 'string' ||
            !/^0x(?:[0-9a-fA-F]{2})+$/.test(transaction.data) || transaction.value !== '0x0' || typeof result.confirmation !== 'string' || result.confirmation.length > 600) {
            throw new Error('LANDVILLE rejected an invalid transaction plan.');
          }
          if (!window.confirm(`LANDVILLE WALLET REQUEST\n\n${result.confirmation}\n\nYour wallet will show the final transaction. Scrapy cannot sign it.`)) {
            throw new Error('Citizen cancelled this wallet transaction.');
          }
          const transactionHash = await sendModuleTransaction(transaction as { from: string; to: string; data: string; value: string });
          target.postMessage({ type: MODULE_CAPABILITY_RESPONSE, requestId: request.requestId, ok: true, data: {
            action: result.action, adapter: result.adapter, transactionHash, amountOutMinimum: result.amountOutMinimum,
            platformFee: result.platformFee,
            explorerUrl: `${activeRobinhoodChain.explorerUrl}/tx/${transactionHash}`,
          } }, '*');
          return;
        }
        if (request.capability === 'world.citizen.publish') {
          const operation = request.input.operation;
          if (operation !== 'status') {
            const confirmed = window.confirm(operation === 'publish'
              ? 'Publish your generated character and username publicly in World? You can remove it later.'
              : 'Remove your character from World?');
            if (!confirmed) {
              target.postMessage({ type: MODULE_CAPABILITY_RESPONSE, requestId: request.requestId, ok: false, error: 'Citizen cancelled this World change.' }, '*');
              return;
            }
          }
          if (preview) {
            if (operation === 'publish') previewCitizenPublished.current = true;
            if (operation === 'unpublish') previewCitizenPublished.current = false;
            target.postMessage({ type: MODULE_CAPABILITY_RESPONSE, requestId: request.requestId, ok: true,
              data: { published: previewCitizenPublished.current, publishedAt: previewCitizenPublished.current ? new Date().toISOString() : null, preview: true } }, '*');
            return;
          }
        }
        if (preview && request.capability === 'module.storage') {
          const data = previewStorageResponse(previewStorage.current, request.input);
          target.postMessage({ type: MODULE_CAPABILITY_RESPONSE, requestId: request.requestId, ok: true, data }, '*');
          return;
        }
        const endpoint = preview && request.capability === 'module.image.generate'
          ? `/api/admin/build-jobs/${encodeURIComponent(id)}/image`
          : `/api/modules/${encodeURIComponent(id)}/data`;
        const response = await fetch(endpoint, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ capability: request.capability, input: request.input }),
        });
        const result = await response.json().catch(() => ({ error: 'Invalid capability response.' }));
        target.postMessage({ type: MODULE_CAPABILITY_RESPONSE, requestId: request.requestId, ok: response.ok, ...(response.ok ? { data: result } : { error: result.error || 'Live data request failed.' }) }, '*');
      } catch (caught) {
        const error = caught instanceof Error && caught.message.length <= 300 ? caught.message : 'Live data request failed.';
        target.postMessage({ type: MODULE_CAPABILITY_RESPONSE, requestId: request.requestId, ok: false, error }, '*');
      } finally { active.delete(request.requestId); }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [id, linkedWallet, preview, sendModuleTransaction]);
  if (!address) return <section className="lv-panel chat-sidebar-body"><h2>BECOME A CITIZEN</h2><p>Explore the world freely. Sign in to interact with its objects.</p><Link href="/citizens" className="lv-button primary">CREATE ACCOUNT / SIGN IN</Link></section>;
  return <><p className="admin-warning">{preview ? 'ADMIN PREVIEW: storage and World publishing are simulated and clear on reload. Image generations are real and billed. Wallet transactions are disabled. Test every interaction before release.' : 'Independent city module. LANDVILLE relays only reviewed transaction adapters. The host validates inputs and creates calldata; only your linked wallet can approve and sign. Scrapy never receives wallet access, keys or arbitrary contract permissions.'}</p><iframe ref={frame} key={`${id}:${address}:${preview}`} title={`City module ${id}`} src={preview ? `/api/admin/build-jobs/${id}/preview` : `/api/modules/${id}`} sandbox="allow-scripts" referrerPolicy="no-referrer" style={{ width: '100%', height: '75vh', border: '1px solid #626d26', background: '#10110d' }} /></>;
}
