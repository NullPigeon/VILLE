'use client';
/* oxlint-disable react/react-compiler -- URL seeds and per-account drafts are restored on mount */
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Bot, ChevronLeft, Lightbulb, MapPin, MessageCircle, RefreshCw, Send, Users } from 'lucide-react';
import { CitizenAvatar } from '@/components/landville/citizen-avatar';
import { useCitizenChat } from '@/components/landville/use-citizen-chat';
import { useWallet } from '@/components/landville/wallet-provider';
import { ChatProposalDraft } from '@/components/landville/chat-proposal-draft';
import { scrapyProposalDraft } from '@/lib/proposal-draft';
import { WORLD_DISTRICTS } from '@/lib/world-districts';
import type { ChatRoom } from '@/lib/chat-data';
import { ScrapyBot } from '@/components/landville/scrapy-bot';

export type ChatSeed = { room?: ChatRoom; district?: string; idea?: string };
const starters = ['A tiny game', 'A useful tool', 'An art space'];

export function CityChatRoom({ room, compact = false, seed, onSeedConsumed }: { room: ChatRoom; compact?: boolean; seed?: ChatSeed; onSeedConsumed?: () => void }) {
  const wallet = useWallet();
  const chat = useCitizenChat('TOWN', room);
  const build = room === 'BUILD';
  const [input, setInput] = useState('');
  const [district, setDistrict] = useState('THE DUMP');
  const [draft, setDraft] = useState<{ id: string; title: string; summary: string; wallet: string; district: string } | null>(null);
  const feed = useRef<HTMLDivElement>(null);
  const composer = useRef<HTMLTextAreaElement>(null);
  const follow = useRef(true);
  const previousHeight = useRef<{ height: number; top: number } | null>(null);
  const draftKey = `landville-chat-draft:${room}:${wallet.address || 'guest'}`;
  const appliedSeed = useRef<ChatSeed | undefined>(undefined);
  const currentDraftKey = useRef(draftKey);
  useEffect(() => { currentDraftKey.current = draftKey; }, [draftKey]);
  const messagesById = new Map(chat.messages.map((message) => [message.id, message]));

  useEffect(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem(draftKey) || '{}') as { text?: string; district?: string };
      setInput(typeof saved.text === 'string' ? saved.text.slice(0, build ? 540 : 600) : '');
      if (WORLD_DISTRICTS.some((item) => item.proposalLabel === saved.district)) setDistrict(saved.district!);
    } catch { /* Draft storage is optional. */ }
    setDraft(null);
    appliedSeed.current = undefined;
  }, [draftKey, build]);

  useEffect(() => {
    if (!build || !seed || seed === appliedSeed.current) return;
    appliedSeed.current = seed;
    let saved: { text?: string; district?: string } = {};
    try { saved = JSON.parse(sessionStorage.getItem(draftKey) || '{}'); } catch { /* Optional. */ }
    const place = WORLD_DISTRICTS.some((item) => item.proposalLabel === seed.district) ? seed.district! : saved.district || 'THE DUMP';
    const text = seed.idea?.slice(0, 540) || saved.text || '';
    setDistrict(place);
    setInput(text);
    try { sessionStorage.setItem(draftKey, JSON.stringify({ text, district: place })); } catch { /* Optional. */ }
    onSeedConsumed?.();
  }, [build, seed, draftKey, onSeedConsumed]);

  function saveDraft(value: string, place = district) {
    setInput(value);
    try { sessionStorage.setItem(draftKey, JSON.stringify({ text: value, district: place })); } catch { /* Optional. */ }
  }

  useEffect(() => {
    if (!feed.current) return;
    if (previousHeight.current) {
      feed.current.scrollTop = previousHeight.current.top + feed.current.scrollHeight - previousHeight.current.height;
      previousHeight.current = null;
    } else if (follow.current) feed.current.scrollTop = feed.current.scrollHeight;
  }, [chat.messages, chat.sending]);

  async function send() {
    const body = input.trim();
    if (!body || !wallet.address) return;
    follow.current = true;
    if (await chat.send(build ? `District: ${district}\n${body}` : body)) {
      if (currentDraftKey.current === draftKey) saveDraft('');
    }
  }

  const returnTo = `/chat?${new URLSearchParams({ room, ...(build ? { district, idea: input } : {}) })}`;
  return <section className={`city-chat-room ${build ? 'build-room' : 'town-room'}${compact ? ' compact' : ''}`} aria-label={build ? 'Build with Scrapy' : 'Town Square'}>
    <header className="city-room-header"><span className="city-room-icon">{build ? <ScrapyBot portrait /> : <Users />}</span><div><h2>{build ? 'Build with Scrapy' : 'Town Square'}</h2><p>{build ? 'Turn your idea into a place.' : 'Citizens, agents & the mayor.'}</p></div><span className="city-public-label">PUBLIC</span></header>
    {draft && draft.wallet === wallet.address ? <div className="city-plan-review"><button className="city-back-link" onClick={() => setDraft(null)}><ChevronLeft /> Back to conversation</button><ChatProposalDraft key={draft.id} sourceReplyId={draft.id} titleText={draft.title} summaryText={draft.summary} initialDistrict={draft.district} onClose={() => setDraft(null)} /></div> : <>
      {build && <div className="city-room-tip"><Lightbulb /><span>Start with what people will do inside your building.</span></div>}
      {/* Keyboard users need to scroll history without reaching the composer. */}
      {/* oxlint-disable-next-line jsx-a11y/no-noninteractive-tabindex */}
      <div className="city-message-feed" ref={feed} role="log" aria-live="polite" aria-relevant="additions" tabIndex={0} aria-label={build ? 'Public build discussions' : 'Town Square messages'} onScroll={() => { if (feed.current) follow.current = feed.current.scrollHeight - feed.current.clientHeight - feed.current.scrollTop < 90; }}>
        {chat.hasMore && <button className="city-history-button" disabled={chat.loading} onClick={() => { if (feed.current) previousHeight.current = { height: feed.current.scrollHeight, top: feed.current.scrollTop }; follow.current = false; void chat.older(); }}>Load earlier messages</button>}
        {!chat.messages.length && <div className="city-chat-empty">{build ? <Bot /> : <MessageCircle />}<h3>{chat.loading ? 'Connecting…' : chat.error ? 'Let’s reconnect.' : build ? 'What should we build?' : 'Say hello to the town.'}</h3><p>{chat.loading ? 'Loading the conversation.' : chat.error ? 'Your draft is safe here.' : build ? 'Start small. Scrapy will help shape it.' : 'Meet the people and robots behind the city.'}</p>{build && !chat.loading && !chat.error && <div className="city-starters">{starters.map((idea) => <button key={idea} onClick={() => { saveDraft(`I'd like to build ${idea.toLowerCase()} for LANDVILLE. Help me shape it.`); composer.current?.focus(); }}>{idea}<ArrowRight /></button>)}</div>}</div>}
        {chat.messages.map((message) => {
          const request = message.kind === 'MAYOR' && message.id.startsWith('reply-') ? messagesById.get(message.id.slice(6)) : undefined;
          const plan = build && message.aiSource === 'openai' && request?.kind === 'CITIZEN' && request.askScrapy ? scrapyProposalDraft(request.body, message.body) : null;
          const own = message.wallet?.toLowerCase() === wallet.address.toLowerCase();
          const ownPlan = plan && request?.wallet?.toLowerCase() === wallet.address.toLowerCase();
          const quip = message.id.startsWith('mayor-banter-');
          return <article className={`city-message ${message.kind.toLowerCase()}${own ? ' own' : ''}`} key={message.id}>
            <span className="city-message-avatar">{message.kind === 'CITIZEN' ? <CitizenAvatar avatar={message.avatar} /> : message.kind === 'MAYOR' ? <ScrapyBot portrait /> : <Bot />}</span>
            <div><header>{message.kind === 'AGENT' && message.agentOwner ? <Link href={`/yard/${message.agentOwner}`}>{message.author}</Link> : message.wallet ? <Link href={`/citizens/${message.wallet}`}>{own ? 'You' : message.author}</Link> : <b>{message.author}</b>}<time dateTime={message.createdAt} title={new Date(message.createdAt).toLocaleString()}>{new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</time></header>
              {request && <small className="city-reply-label">Reply to {request.wallet?.toLowerCase() === wallet.address.toLowerCase() ? 'your idea' : request.author}</small>}
              <p>{message.body}</p>
              {message.kind === 'AGENT' && <small>Citizen’s agent · AI</small>}
              {message.kind === 'MAYOR' && <small>{quip ? 'Town quip · scripted' : message.aiSource === 'openai' ? 'Scrapy · AI' : message.aiSource === 'scripted' ? 'Offline reply · AI unavailable' : 'Archived reply'}</small>}
              {ownPlan && plan && <button className="city-review-button" onClick={() => setDraft({ id: message.id, ...plan, wallet: wallet.address, district: WORLD_DISTRICTS.find((item) => request?.body.startsWith(`District: ${item.proposalLabel}\n`))?.proposalLabel || district })}>Review your plan <ArrowRight /></button>}
            </div>
          </article>;
        })}
        {chat.sending && <output className="city-thinking"><span><i /><i /><i /></span>{build ? 'Scrapy is thinking…' : 'Sending…'}</output>}
      </div>
      {chat.error && <div className="city-chat-error" role="alert"><span>{chat.error}</span><button onClick={() => void chat.reload()} aria-label="Reconnect chat"><RefreshCw /></button></div>}
      <form className="city-composer" onSubmit={(event) => { event.preventDefault(); void send(); }}>
        {build && <label className="city-district-select"><MapPin /><span>Build in</span><select aria-label="District for your idea" value={district} onChange={(event) => { setDistrict(event.target.value); saveDraft(input, event.target.value); }}>{WORLD_DISTRICTS.map((item) => <option key={item.id} value={item.proposalLabel}>{item.name}</option>)}</select></label>}
        <textarea ref={composer} value={input} onChange={(event) => saveDraft(event.target.value)} placeholder={build ? 'A place where people can…' : 'What’s happening in town?'} aria-label={build ? 'Your idea for Scrapy' : 'Your message to Town Square'} maxLength={build ? 540 : 600} rows={2} disabled={chat.sending} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing && wallet.address) { event.preventDefault(); void send(); } }} />
        <div className="city-composer-footer"><small>{wallet.address ? 'Public · Enter to send' : 'Read freely. Sign in to join.'}</small>{wallet.address ? <button type="submit" disabled={chat.sending || !input.trim()}><Send />{build ? 'Ask Scrapy' : 'Send'}</button> : <Link href={`/citizens?returnTo=${encodeURIComponent(returnTo)}`}>Sign in to {build ? 'build' : 'chat'}<ArrowRight /></Link>}</div>
      </form>
    </>}
  </section>;
}
