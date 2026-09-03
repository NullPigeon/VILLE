'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Bot, Radio, Send, Users, Wallet } from 'lucide-react';
import { ProductShell } from '@/components/landville/product-shell';
import { useWallet } from '@/components/landville/wallet-provider';
import { useCitizenChat } from '@/components/landville/use-citizen-chat';
import { shortWallet } from '@/lib/governance';

export default function ChatPage() {
  const wallet = useWallet();
  const chat = useCitizenChat('TOWN');
  const [input, setInput] = useState('');
  const feed = useRef<HTMLDivElement>(null);
  const follow = useRef(true);

  useEffect(() => { if (follow.current && feed.current) feed.current.scrollTop = feed.current.scrollHeight; }, [chat.messages]);

  async function send(event: { preventDefault(): void }) {
    event.preventDefault();
    const body = input.trim();
    if (!body || !wallet.address) return;
    follow.current = true;
    if (await chat.send(body)) setInput('');
  }

  return <ProductShell title="TOWN CHAT" eyebrow="ONE TOWN / ONE SHARED CONVERSATION">
    <div className="chat-layout">
      <section className="lv-panel town-chat">
        <header className="lv-panel-head"><h2><Radio /> PUBLIC TOWN HISTORY</h2><span>ALL CITIZENS SEE THE SAME MESSAGES</span></header>
        <div className="town-feed" ref={feed} onScroll={() => { const element = feed.current; if (element) follow.current = element.scrollHeight - element.clientHeight - element.scrollTop < 100; }} aria-live="polite">
          {chat.hasMore && <button className="lv-button" disabled={chat.loading} onClick={() => { follow.current = false; void chat.older(); }}>{chat.loading ? 'LOADING…' : 'LOAD EARLIER MESSAGES'}</button>}
          {chat.messages.map((message) => <article className={`town-message ${message.kind.toLowerCase()}`} key={message.id}>
            <div className="town-avatar">{message.kind === 'CITIZEN' ? <Users /> : <Bot />}</div>
            <div><header>{message.wallet ? <Link href={`/citizens/${message.wallet}`}>{message.author}</Link> : <b>{message.author}</b>}<time dateTime={message.createdAt}>{new Date(message.createdAt).toLocaleString()}</time></header><p>{message.body}</p>{message.wallet && <small>{shortWallet(message.wallet)}</small>}</div>
          </article>)}
          {!chat.messages.length && !chat.error && <p className="empty-state">No messages loaded yet.</p>}
        </div>
        {chat.error && <p className="chat-notice" role="alert">{chat.error}</p>}
        {!wallet.address ? <div className="chat-sidebar-body"><p>You can read the town. Create a citizen account to speak.</p><Link className="lv-button primary" href="/citizens"><Wallet /> CREATE ACCOUNT / SIGN IN</Link></div> : <form className="town-composer" onSubmit={send}>
          <input value={input} onChange={(event) => setInput(event.target.value)} placeholder="Say something to the town…" maxLength={600} disabled={chat.sending} aria-label="Town Chat message" />
          <button disabled={chat.sending || !input.trim()} aria-label="Broadcast message"><Send /></button>
        </form>}
      </section>
      <aside className="lv-panel chat-sidebar"><header className="lv-panel-head"><h2><Bot /> THE TOWN FREQUENCY</h2><span>PUBLIC</span></header><div className="chat-sidebar-body">
        <p>This history is shared and saved for everyone. Scrapy’s replies and confirmed build updates appear here too.</p>
        <p>10 messages per UTC day without SCRAPY. 50 with any positive SCRAPY balance. The allowance covers Town Chat and Workshop together; Scrapy’s replies do not use your allowance.</p>
        <p>One active proposal per account. Submit again after it is built or rejected. A conversation does not submit a proposal automatically.</p>
        <Link className="lv-button" href={wallet.address ? '/mayor' : '/citizens'}>REFINE AN IDEA WITH SCRAPY</Link>
      </div></aside>
    </div>
  </ProductShell>;
}
