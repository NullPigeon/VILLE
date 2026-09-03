'use client';
/* oxlint-disable react/react-compiler -- server history is hydrated after mount */
import { useCallback, useEffect, useRef, useState } from 'react';
import type { TownMessage } from '@/lib/chat-data';
import { useWallet } from '@/components/landville/wallet-provider';

type ChatPage = { messages: TownMessage[]; hasMore: boolean; nextCursor: string | null; error?: string };
function mergeMessages(previous: TownMessage[], incoming: TownMessage[]) {
  const unique = new Map(previous.map((message) => [message.id, message]));
  incoming.forEach((message) => unique.set(message.id, message));
  return [...unique.values()].sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt) || a.id.localeCompare(b.id));
}

export function useCitizenChat(channel: 'TOWN' | 'WORKSHOP') {
  const wallet = useWallet();
  const endpoint = channel === 'TOWN' ? '/api/chat' : '/api/mayor';
  const [data, setData] = useState<{ wallet: string; messages: TownMessage[] }>({ wallet: '', messages: [] });
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [historyError, setHistoryError] = useState('');
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [source, setSource] = useState('stored');
  const currentWallet = useRef(wallet.address);
  currentWallet.current = wallet.address;
  const pending = useRef(new Map<string, string>());
  const started = useRef(false);

  const load = useCallback(async (before?: string) => {
    const identity = currentWallet.current;
    if (channel === 'WORKSHOP' && !identity) return;
    const response = await fetch(`${endpoint}${before ? `?before=${encodeURIComponent(before)}` : ''}`, { cache: 'no-store' });
    const result = await response.json() as ChatPage;
    if (!response.ok) throw new Error(result.error || 'Chat history unavailable.');
    if (identity !== currentWallet.current) return;
    setData((previous) => ({ wallet: identity, messages: mergeMessages(previous.wallet === identity ? previous.messages : [], result.messages) }));
    if (before || !started.current) { setCursor(result.nextCursor); setHasMore(result.hasMore); started.current = true; }
    setHistoryError('');
  }, [channel, endpoint]);

  useEffect(() => {
    setData({ wallet: wallet.address, messages: [] });
    setError(''); setHistoryError(''); setCursor(null); setHasMore(false); started.current = false;
    void load().catch((caught: Error) => setHistoryError(caught.message));
    const timer = window.setInterval(() => { if (!document.hidden) void load().catch((caught: Error) => setHistoryError(caught.message)); }, 8_000);
    return () => window.clearInterval(timer);
  }, [load, wallet.address]);

  async function older() {
    if (!cursor || loading) return;
    setLoading(true);
    try { await load(cursor); } catch (caught) { setHistoryError((caught as Error).message); }
    finally { setLoading(false); }
  }

  async function send(body: string) {
    if (!wallet.address || sending) return false;
    const identity = wallet.address;
    const key = `${identity}:${body}`;
    const requestId = pending.current.get(key) || crypto.randomUUID();
    pending.current.set(key, requestId);
    setSending(true); setError('');
    try {
      const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ body, requestId }) });
      const result = await response.json() as { messages?: TownMessage[]; source?: string; error?: string };
      if (!response.ok) throw new Error(result.error || 'Message was not delivered.');
      pending.current.delete(key);
      if (identity === currentWallet.current) {
        setData((previous) => ({ wallet: identity, messages: mergeMessages(previous.wallet === identity ? previous.messages : [], result.messages || []) }));
        setSource(result.source || 'stored');
      }
      return true;
    } catch (caught) { setError((caught as Error).message); return false; }
    finally { setSending(false); }
  }

  return { messages: channel === 'WORKSHOP' && data.wallet !== wallet.address ? [] : data.messages, error: error || historyError, send, sending, source, hasMore, older, loading };
}
