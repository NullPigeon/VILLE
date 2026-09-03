'use client';
/* oxlint-disable react/react-compiler -- polling intentionally updates server state after mount */

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Bot, Radio, Send, Users, Wallet } from 'lucide-react';
import { ProductShell } from '@/components/landville/product-shell';
import { useWallet } from '@/components/landville/wallet-provider';
import type { TownMessage } from '@/lib/chat-data';
import { shortWallet } from '@/lib/governance';

export default function ChatPage() {
  const wallet = useWallet();
  const [messages, setMessages] = useState<TownMessage[]>([]);
  const [input, setInput] = useState('');
  const [mode, setMode] = useState<'shared' | 'local'>('local');
  const [notice, setNotice] = useState('');
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const loadMessages = useCallback(async () => {
    const response = await fetch('/api/chat', { cache: 'no-store' });
    const result = (await response.json()) as {
      messages?: TownMessage[];
      mode?: 'shared' | 'local';
      error?: string;
    };
    if (!response.ok) throw new Error(result.error || 'Town Chat unavailable.');
    setMessages(result.messages || []);
    setMode(result.mode || 'local');
  }, []);

  useEffect(() => {
    loadMessages().catch((error) => setNotice((error as Error).message));
    const timer = window.setInterval(() => loadMessages().catch(() => undefined), 4_000);
    return () => window.clearInterval(timer);
  }, [loadMessages]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function send(event: { preventDefault(): void }) {
    event.preventDefault();
    const body = input.trim();
    if (!body || sending) return;
    setSending(true);
    setNotice('');
    try {
      if (!wallet.address) await wallet.connectWallet();
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body }),
      });
      const result = (await response.json()) as { messages?: TownMessage[]; error?: string };
      if (!response.ok) throw new Error(result.error || 'Message failed.');
      setInput('');
      await loadMessages();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Message failed.');
    } finally {
      setSending(false);
    }
  }

  return (
    <ProductShell title="TOWN CHAT" eyebrow="PUBLIC CONVERSATION / CITIZENS + SCRAPY">
      <div className="chat-layout">
        <section className="lv-panel town-chat">
          <header className="lv-panel-head">
            <h2><Radio /> LIVE TOWN FREQUENCY</h2>
            <span>{mode === 'shared' ? 'SHARED RELAY ONLINE' : 'LOCAL RELAY / ADD SUPABASE'}</span>
          </header>
          <div className="town-feed" aria-live="polite">
            {messages.map((message) => (
              <article className={`town-message ${message.kind.toLowerCase()}`} key={message.id}>
                <div className="town-avatar">{message.kind === 'MAYOR' ? <Bot /> : <Users />}</div>
                <div>
                  <header>
                    {message.wallet ? <Link href={`/citizens/${message.wallet}`}>{message.author}</Link> : <b>{message.author}</b>}
                    <time>{new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</time>
                  </header>
                  <p>{message.body}</p>
                  {message.wallet && <small>{shortWallet(message.wallet)}</small>}
                </div>
              </article>
            ))}
            <div ref={endRef} />
          </div>
          {notice && <div className="chat-notice">{notice}</div>}
          <form className="town-composer" onSubmit={send}>
            <input value={input} onChange={(event) => setInput(event.target.value)} placeholder="Say something to the town… @scrapy is listening." maxLength={600} disabled={sending} aria-label="Town Chat message" />
            <button disabled={sending || !input.trim()} aria-label="Broadcast message"><Send /></button>
          </form>
        </section>
        <aside className="lv-panel chat-sidebar">
          <header className="lv-panel-head"><h2><Bot /> SCRAPY IN THE TOWN</h2><span>REPLIES ON MESSAGE</span></header>
          <div className="chat-sidebar-body">
            <p>This is the public conversation for everyone. Scrapy reads recent messages and replies here. AI replies need the server API key; otherwise he uses scripted replies.</p>
            <p>A chat message does not create a proposal or build anything. Take your idea to the workshop, refine it, then explicitly submit it for a vote.</p>
            <Link className="lv-button" href="/mayor">REFINE AN IDEA WITH SCRAPY</Link>
            <div className="object-facts"><div><dt>IDENTITY</dt><dd>{wallet.address ? shortWallet(wallet.address) : 'NOT CONNECTED'}</dd></div><div><dt>VOTE POWER</dt><dd>{wallet.snapshot?.weight ?? '—'}</dd></div><div><dt>PRIVACY</dt><dd>PUBLIC CHAT</dd></div></div>
            {!wallet.address && <button className="lv-button primary" onClick={() => wallet.connectWallet().catch((error) => setNotice((error as Error).message))}><Wallet /> CONNECT TO SPEAK</button>}
          </div>
        </aside>
      </div>
    </ProductShell>
  );
}
