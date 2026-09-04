'use client';
import './chat.css';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Bot, Radio, Send, Wallet } from 'lucide-react';
import { CitizenAvatar } from '@/components/landville/citizen-avatar';
import { ProductShell } from '@/components/landville/product-shell';
import { useWallet } from '@/components/landville/wallet-provider';
import { useCitizenChat } from '@/components/landville/use-citizen-chat';
import { shortWallet } from '@/lib/governance';
import { ChatProposalDraft } from '@/components/landville/chat-proposal-draft';

export default function ChatPage() {
  const wallet = useWallet();
  const chat = useCitizenChat('TOWN');
  const [input, setInput] = useState('');
  const [draft, setDraft] = useState<{ id: string; text: string; wallet: string } | null>(null);
  const feed = useRef<HTMLDivElement>(null);
  const follow = useRef(true);

  useEffect(() => { if (follow.current && feed.current) feed.current.scrollTop = feed.current.scrollHeight; }, [chat.messages]);

  async function send(askScrapy = false) {
    const body = input.trim();
    if (!body || !wallet.address) return;
    follow.current = true;
    if (await chat.send(body, askScrapy)) setInput('');
  }

  return <ProductShell title="TOWN CHAT" eyebrow="ONE TOWN / ONE SHARED CONVERSATION">
    <div className="chat-layout">
      <section className="lv-panel town-chat">
        <header className="lv-panel-head"><h2><Radio /> PUBLIC TOWN HISTORY</h2><span>ALL CITIZENS SEE THE SAME MESSAGES</span></header>
        <div className="town-feed" ref={feed} onScroll={() => { const element = feed.current; if (element) follow.current = element.scrollHeight - element.clientHeight - element.scrollTop < 100; }} aria-live="polite">
          {chat.hasMore && <button className="lv-button" disabled={chat.loading} onClick={() => { follow.current = false; void chat.older(); }}>{chat.loading ? 'LOADING…' : 'LOAD EARLIER MESSAGES'}</button>}
          {chat.messages.map((message) => <article className={`town-message ${message.kind.toLowerCase()}`} key={message.id}>
            <div className="town-avatar">{message.kind === 'CITIZEN' ? <CitizenAvatar avatar={message.avatar} /> : <Bot />}</div>
            <div><header>{message.wallet ? <Link href={`/citizens/${message.wallet}`}>{message.author}</Link> : <b>{message.author}</b>}<time dateTime={message.createdAt}>{new Date(message.createdAt).toLocaleString()}</time></header><p>{message.body}</p>{message.kind === 'MAYOR' && <small>{message.aiSource === 'openai' ? 'AI RESPONSE' : message.aiSource === 'scripted' ? 'SCRIPTED RESPONSE · AI UNAVAILABLE' : 'OLDER REPLY · SOURCE NOT RECORDED'}</small>}{message.wallet && <small>{shortWallet(message.wallet)}</small>}{wallet.address && message.kind === 'CITIZEN' && message.wallet?.toLowerCase() === wallet.address.toLowerCase() && <button className="lv-button" onClick={() => setDraft({ id: message.id, text: message.body, wallet: wallet.address })} disabled={draft?.wallet === wallet.address}>PREPARE MY PROPOSAL</button>}</div>
          </article>)}
          {!chat.messages.length && !chat.error && <p className="empty-state">No messages loaded yet.</p>}
        </div>
        {chat.error && <p className="chat-notice" role="alert">{chat.error}</p>}
        {!wallet.address ? <div className="chat-sidebar-body"><p>You can read the town. Create a citizen account to speak.</p><Link className="lv-button primary" href="/citizens"><Wallet /> CREATE ACCOUNT / SIGN IN</Link></div> : <form className="town-composer" onSubmit={(event) => { event.preventDefault(); void send(false); }}>
          <input value={input} onChange={(event) => setInput(event.target.value)} placeholder="Public message — everyone can read it…" maxLength={600} disabled={chat.sending} aria-label="Town Chat message" />
          <button type="submit" disabled={chat.sending || !input.trim()} title="Send to citizens without an AI reply"><Send /> SEND</button>
          <button type="button" className="ask-scrapy" disabled={chat.sending || !input.trim()} onClick={() => void send(true)} title="Ask Scrapy publicly; everyone sees the reply"><Bot /> ASK SCRAPY</button>
        </form>}
      </section>
      <aside className="lv-panel chat-sidebar"><header className="lv-panel-head"><h2><Bot /> THE TOWN FREQUENCY</h2><span>PUBLIC</span></header><div className="chat-sidebar-body">
        <p>This history is shared and saved for everyone. Scrapy’s replies and confirmed build updates appear here too.</p>
        <p>SEND (or Enter) talks to your fellow citizens. ASK SCRAPY requests an AI reply here in public. Scrapy does not interrupt ordinary conversations.</p>
        <p>10 messages per UTC day without SCRAPY. 50 with any positive SCRAPY balance. Scrapy’s replies do not use your allowance.</p>
        <p>One active proposal per account. Submit again after it is built or rejected. A conversation does not submit a proposal automatically.</p>
        <p>{chat.aiConfigured === null ? 'Checking Scrapy configuration…' : chat.aiConfigured ? 'AI key configured. Each reply shows whether AI actually answered.' : 'AI is not configured. Scrapy uses clearly marked scripted replies.'}</p>
        <p>Discuss your idea here, then choose PREPARE MY PROPOSAL on your own message. Review the draft before opening voting.</p>
        {wallet.address && <Link href="/chat/archive">MY OLD PRIVATE ARCHIVE</Link>}
      </div></aside>
    </div>
    {draft && wallet.address === draft.wallet && <section className="lv-panel"><ChatProposalDraft key={`${draft.id}:${draft.wallet}`} text={draft.text} onClose={() => setDraft(null)} /></section>}
  </ProductShell>;
}
