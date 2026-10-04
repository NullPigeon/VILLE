'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Bot, Send, X } from 'lucide-react';
import { readJsonResponse } from '@/lib/http-response';
import type { YardMessage } from '@/lib/personal-agent';

export function WorldAgentChat({ name, owner, onClose }: { name: string; owner: string; onClose(): void }) {
  const [messages, setMessages] = useState<YardMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const feed = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    fetch('/api/agents/chat', { cache: 'no-store' })
      .then((response) => readJsonResponse<{ messages: YardMessage[] }>(response, 'Load agent conversation'))
      .then((result) => { if (active) setMessages(result.messages); })
      .catch((caught: Error) => { if (active) setError(caught.message); });
    return () => { active = false; };
  }, []);

  useEffect(() => { if (feed.current) feed.current.scrollTop = feed.current.scrollHeight; }, [messages]);

  async function send() {
    const body = draft.trim();
    if (!body || busy) return;
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/agents/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body, summonMayor: false, requestId: crypto.randomUUID() }),
      });
      const result = await readJsonResponse<{ messages: YardMessage[] }>(response, 'Talk to your agent');
      setMessages((current) => [...current, ...result.messages]);
      setDraft('');
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'The message could not be sent.'); }
    finally { setBusy(false); }
  }

  return <aside className="world-agent-chat" aria-label={`Talk to ${name}`}>
    <header><Bot /><div><small>PRIVATE RADIO / YOUR AGENT</small><h2>{name}</h2></div><button onClick={onClose} aria-label="Close agent conversation"><X /></button></header>
    <div className="world-agent-chat-feed" ref={feed} aria-live="polite">
      {messages.length ? messages.slice(-12).map((message) => <div key={message.id} className={message.role === 'CITIZEN' ? 'from-you' : 'from-agent'}><small>{message.role === 'CITIZEN' ? 'YOU' : message.role === 'MAYOR' ? 'SCRAPY' : name.toUpperCase()}</small><p>{message.body}</p></div>) : <p className="world-agent-chat-empty">Your robot is close. Say hello.</p>}
    </div>
    <form onSubmit={(event) => { event.preventDefault(); void send(); }}><textarea aria-label={`Message to ${name}`} value={draft} onChange={(event) => setDraft(event.target.value)} placeholder={`Talk to ${name}...`} maxLength={600} disabled={busy} /><div><Link href={`/yard/${owner}`}>Visit your yard ↗</Link><button type="submit" disabled={busy || !draft.trim()}><Send /> {busy ? 'SENDING' : 'SEND'}</button></div></form>
    {error && <p className="world-agent-chat-error" role="alert">{error}</p>}
  </aside>;
}
