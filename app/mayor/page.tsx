'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowUpRight, Bot, Send, Sparkles, Wallet } from 'lucide-react';
import { ProductShell } from '@/components/landville/product-shell';
import { useLandville } from '@/components/landville/provider';
import { useWallet } from '@/components/landville/wallet-provider';
import { useCitizenChat } from '@/components/landville/use-citizen-chat';

export default function MayorPage() {
  const wallet = useWallet();
  return <MayorWorkshop key={wallet.address} />;
}

function MayorWorkshop() {
  const wallet = useWallet();
  const { createProposal, activeProposal, status } = useLandville();
  const chat = useCitizenChat('WORKSHOP');
  const [input, setInput] = useState('');
  const [draft, setDraft] = useState({ title: '', summary: '', category: 'UTILITY', district: 'THE DUMP' });
  const [created, setCreated] = useState('');
  const [publishing, setPublishing] = useState(false);
  const [notice, setNotice] = useState('');

  async function send(event: { preventDefault(): void }) {
    event.preventDefault();
    const text = input.trim();
    if (text && await chat.send(text)) setInput('');
  }

  function prepareDraft(text: string) {
    setDraft({ title: text.slice(0, 80), summary: text, category: 'UTILITY', district: 'THE DUMP' });
    setCreated(''); setNotice('Review the description and functions before submitting. This is your draft, not an automatic engineering specification.');
  }

  async function publish(event: { preventDefault(): void }) {
    event.preventDefault();
    if (publishing || created || !wallet.address || activeProposal || status !== 'ready') return;
    setPublishing(true); setNotice('Checking your active request and mainnet SCRAPY holdings…');
    try { const proposal = await createProposal(draft); setCreated(proposal.id); setNotice(`${proposal.id} saved. Voting closes ${new Date(proposal.closesAt || '').toLocaleString()}.`); }
    catch (error) { setNotice((error as Error).message); }
    finally { setPublishing(false); }
  }

  return <ProductShell title="SCRAPY WORKSHOP" eyebrow="PERSONAL CONVERSATION / REVIEW YOUR PROPOSAL">
    {!wallet.address ? <section className="lv-panel chat-sidebar-body"><h2>YOUR ACCOUNT. YOUR WORKSHOP.</h2><p>Sign in to talk with Scrapy, save your conversation and prepare a proposal. The public town remains open to explore.</p><Link className="lv-button primary" href="/citizens"><Wallet /> CREATE ACCOUNT / SIGN IN</Link></section> : <div className="mayor-workspace">
      <section className="lv-panel mayor-terminal"><header className="lv-panel-head"><h2><Bot /> YOUR IDEA / SCRAPY’S DESK</h2><span>{chat.source === 'openai' ? 'AI REPLY' : chat.source === 'local' ? 'SCRIPTED REPLY / AI NOT AVAILABLE' : 'SAVED PRIVATE HISTORY'}</span></header>
        <div className="chat-log">
          {chat.hasMore && <button className="lv-button" onClick={() => void chat.older()} disabled={chat.loading}>LOAD EARLIER MESSAGES</button>}
          {!chat.messages.length && !chat.error && <p>What should the town build next?</p>}
          {chat.messages.map((message) => <div className={message.kind === 'CITIZEN' ? 'terminal-message you' : 'terminal-message'} key={message.id}><small>{message.kind === 'CITIZEN' ? 'YOU' : 'SCRAPY'}</small><p>{message.body}</p>{message.kind === 'CITIZEN' && <button className="lv-button" onClick={() => prepareDraft(message.body)} disabled={publishing}><Sparkles /> USE AS PROPOSAL DRAFT</button>}</div>)}
          {chat.sending && <p>Scrapy is considering the municipal consequences…</p>}
        </div>
        {chat.error && <p className="chat-notice" role="alert">{chat.error}</p>}
        <form className="mayor-composer" onSubmit={send}><input value={input} onChange={(event) => setInput(event.target.value)} maxLength={600} disabled={chat.sending} placeholder="Explain what it does and why the town needs it…" aria-label="Message Scrapy" /><button aria-label="Send message" disabled={chat.sending || !input.trim()}><Send /></button></form>
        {draft.title && <form className="proposal-form" onSubmit={publish}>
          <h3><Sparkles /> REVIEW YOUR PROPOSAL</h3><p>One active proposal per account. Submit again after it is built or rejected. Each vote lasts 12 hours. At least 250,000 SCRAPY is currently required. Posting this draft starts a real vote.</p>
          <label>OBJECT NAME<input required minLength={4} maxLength={80} value={draft.title} disabled={Boolean(created) || publishing} onChange={(event) => setDraft({ ...draft, title: event.target.value })} /></label>
          <label>WHAT WILL IT DO?<textarea required minLength={10} maxLength={2000} value={draft.summary} disabled={Boolean(created) || publishing} onChange={(event) => setDraft({ ...draft, summary: event.target.value })} /></label>
          <label>CATEGORY<select value={draft.category} disabled={Boolean(created) || publishing} onChange={(event) => setDraft({ ...draft, category: event.target.value })}>{['UTILITY','GAME','ART','MEME','TOKEN','OTHER'].map((item) => <option key={item}>{item}</option>)}</select></label>
          <label>DISTRICT<select value={draft.district} disabled={Boolean(created) || publishing} onChange={(event) => setDraft({ ...draft, district: event.target.value })}>{['THE DUMP','TOKEN ALLEY','MARKET','MEME PIT','TOWNWIDE'].map((item) => <option key={item}>{item}</option>)}</select></label>
          {activeProposal && <p>Your active request: <Link href={`/proposals#${activeProposal.id}`}>{activeProposal.id} · {activeProposal.title}</Link> ({activeProposal.status}). You can keep discussing ideas, but cannot submit another yet.</p>}
          {notice && <output>{notice}</output>}{created ? <Link className="lv-button primary" href="/proposals">VIEW {created} <ArrowUpRight /></Link> : <button className="lv-button primary" disabled={publishing || Boolean(activeProposal) || status !== 'ready'}>{publishing ? 'CHECKING…' : 'CONFIRM + OPEN VOTING'} <ArrowUpRight /></button>}
        </form>}
      </section>
      <aside className="lv-panel mayor-face"><Image src="/scrapy-sheet.png" alt="Mayor Scrapy" width={1536} height={1024} /><h2>YOUR WORKSHOP</h2><p>This history belongs to your signed account. It is not posted to Town Chat.</p><p>10 messages a day without SCRAPY; 50 with a positive balance. Both chats share this allowance, resetting at 00:00 UTC.</p><p>Scrapy helps refine the idea. You review and submit it. Passing a vote sends it to the build queue; it does not deploy a module automatically.</p><Link className="lv-button" href="/chat">OPEN PUBLIC TOWN CHAT <ArrowUpRight /></Link></aside>
    </div>}
  </ProductShell>;
}
