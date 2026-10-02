'use client';
/* oxlint-disable react/react-compiler -- remote history is hydrated after mount */
import { useCallback, useEffect, useRef, useState } from 'react';
import type { ChatRoom, TownMessage } from '@/lib/chat-data';
import { useWallet } from '@/components/landville/wallet-provider';
import { readJsonResponse } from '@/lib/http-response';

type ChatPage = { messages: TownMessage[]; hasMore: boolean; nextCursor: string | null; aiConfigured?: boolean };
function mergeMessages(previous: TownMessage[], incoming: TownMessage[]) {
  const unique = new Map(previous.map((message) => [message.id, message]));
  incoming.forEach((message) => unique.set(message.id, message));
  return [...unique.values()].sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt) || a.id.localeCompare(b.id));
}

export function useCitizenChat(channel: 'TOWN' | 'WORKSHOP', room: ChatRoom = 'TOWN') {
  const wallet = useWallet();
  const endpoint = channel === 'TOWN' ? '/api/chat' : '/api/mayor';
  const scope = `${channel}:${room}:${wallet.address}`;
  const currentScope = useRef(scope);
  currentScope.current = scope;
  const [data, setData] = useState<{ scope: string; messages: TownMessage[] }>({ scope: '', messages: [] });
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [historyError, setHistoryError] = useState('');
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [source, setSource] = useState('stored');
  const [aiConfigured, setAiConfigured] = useState<boolean | null>(null);
  const pending = useRef(new Map<string, string>());
  const started = useRef(false);
  const sendingNow = useRef(false);

  const load = useCallback(async (before?: string) => {
    if (channel === 'WORKSHOP' && !wallet.address) return;
    const query = new URLSearchParams(channel === 'TOWN' ? { room } : {});
    if (before) query.set('before', before);
    const response = await fetch(`${endpoint}?${query}`, { cache: 'no-store' });
    const result = await readJsonResponse<ChatPage>(response, 'Chat history');
    if (scope !== currentScope.current) return;
    setAiConfigured(result.aiConfigured ?? null);
    setData((previous) => ({ scope, messages: mergeMessages(previous.scope === scope ? previous.messages : [], result.messages) }));
    if (before || !started.current) { setCursor(result.nextCursor); setHasMore(result.hasMore); started.current = true; }
    setHistoryError('');
  }, [channel, room, endpoint, scope, wallet.address]);

  const reload = useCallback(async () => {
    setLoading(true);
    try { await load(); }
    catch (caught) { if (scope === currentScope.current) setHistoryError((caught as Error).message); }
    finally { if (scope === currentScope.current) setLoading(false); }
  }, [load, scope]);

  useEffect(() => {
    setError(''); setHistoryError(''); setCursor(null); setHasMore(false); started.current = false;
    void reload();
    const timer = window.setInterval(() => {
      if (!document.hidden) void load().catch((caught: Error) => { if (scope === currentScope.current) setHistoryError(caught.message); });
    }, 8_000);
    return () => window.clearInterval(timer);
  }, [load, reload, scope]);

  async function older() {
    if (!cursor || loading) return;
    setLoading(true);
    try { await load(cursor); } catch (caught) { if (scope === currentScope.current) setHistoryError((caught as Error).message); }
    finally { if (scope === currentScope.current) setLoading(false); }
  }

  async function send(body: string, askScrapy = room === 'BUILD') {
    if (channel !== 'TOWN') { setError('This archive is read-only. Open the city chat to write.'); return false; }
    if (!wallet.address || sendingNow.current) return false;
    const key = JSON.stringify([scope, body, askScrapy]);
    const requestId = pending.current.get(key) || crypto.randomUUID();
    pending.current.set(key, requestId);
    sendingNow.current = true;
    setSending(true); setError('');
    try {
      const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ body, requestId, askScrapy, room }) });
      const result = await readJsonResponse<{ messages?: TownMessage[]; source?: string }>(response, 'Send message');
      pending.current.delete(key);
      if (scope === currentScope.current) {
        setData((previous) => ({ scope, messages: mergeMessages(previous.scope === scope ? previous.messages : [], result.messages || []) }));
        setSource(result.source || 'stored');
      }
      return true;
    } catch (caught) { if (scope === currentScope.current) setError((caught as Error).message); return false; }
    finally { sendingNow.current = false; setSending(false); }
  }

  return { messages: data.scope === scope ? data.messages : [], error: error || historyError, send, sending, source, hasMore, older, loading, aiConfigured, reload };
}
