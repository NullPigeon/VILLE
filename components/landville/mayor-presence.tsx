'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Bot, MessageCircle, X } from 'lucide-react';
import type { TownMessage } from '@/lib/chat-data';
import { readJsonResponse } from '@/lib/http-response';

export function MayorPresence() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<TownMessage[]>([]);
  const [state, setState] = useState('LOADING…');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    fetch('/api/chat', { cache: 'no-store' })
      .then((response) => readJsonResponse<{ messages: TownMessage[]; aiConfigured: boolean }>(response, 'Town Chat'))
      .then((result) => { if (!cancelled) { setMessages(result.messages.slice(-3)); setState(result.aiConfigured ? 'AI KEY CONFIGURED' : 'SCRIPTED MODE'); setError(''); } })
      .catch(() => { if (!cancelled) setError('Cannot refresh Town Chat.'); });
    return () => { cancelled = true; };
  }, [open]);

  return (
    <div className={open ? 'mayor-presence open' : 'mayor-presence'}>
      {open && <section className="mayor-presence-panel"><header><span><Bot /> MAYOR SCRAPY</span><button onClick={() => setOpen(false)} aria-label="Close Mayor presence"><X /></button></header><small>PUBLIC TOWN CHAT · {state}</small>{error && <p role="alert">{error}</p>}<div>{messages.length ? messages.map((message) => <p key={message.id}><b>{message.author}</b>{message.body}{message.kind === 'MAYOR' && <small>{message.aiSource === 'openai' ? 'AI RESPONSE' : message.aiSource === 'scripted' ? 'SCRIPTED RESPONSE' : 'SOURCE NOT RECORDED'}</small>}</p>) : state !== 'LOADING…' && !error && <p><b>NO MESSAGES YET</b>The town chat is empty. Suspiciously peaceful.</p>}</div><nav><Link href="/chat">OPEN PUBLIC TOWN CHAT</Link></nav></section>}
      <button className="mayor-presence-trigger" onClick={() => setOpen((current) => !current)} aria-label="Open Mayor Scrapy"><Bot /><i /><MessageCircle /></button>
    </div>
  );
}
