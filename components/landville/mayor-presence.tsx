'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Bot, MessageCircle, X } from 'lucide-react';
import type { TownMessage } from '@/lib/chat-data';

export function MayorPresence() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<TownMessage[]>([]);

  useEffect(() => {
    if (!open) return;
    fetch('/api/chat', { cache: 'no-store' })
      .then((response) => response.json())
      .then((result: { messages?: TownMessage[] }) => setMessages(result.messages?.slice(-3) || []))
      .catch(() => undefined);
  }, [open]);

  return (
    <div className={open ? 'mayor-presence open' : 'mayor-presence'}>
      {open && <section className="mayor-presence-panel"><header><span><Bot /> MAYOR SCRAPY</span><button onClick={() => setOpen(false)} aria-label="Close Mayor presence"><X /></button></header><small>● ONLINE · TOWN CHAT</small><div>{messages.map((message) => <p key={message.id}><b>{message.author}</b>{message.body}</p>)}</div><nav><Link href="/chat">OPEN TOWN CHAT</Link><Link href="/mayor">TALK PRIVATELY</Link></nav></section>}
      <button className="mayor-presence-trigger" onClick={() => setOpen((current) => !current)} aria-label="Open Mayor Scrapy"><Bot /><i /><MessageCircle /></button>
    </div>
  );
}
