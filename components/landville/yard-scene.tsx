'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Bot, Send, ShieldCheck } from 'lucide-react';
import { ProductShell } from '@/components/landville/product-shell';
import { AgentHouseArt } from '@/components/landville/agent-house-art';
import { PersonalRobot } from '@/components/landville/personal-robot';
import { useWallet } from '@/components/landville/wallet-provider';
import { readJsonResponse } from '@/lib/http-response';
import type { PublicYard, YardMessage } from '@/lib/personal-agent';
import './yard-scene.css';

export function YardScene({ owner }: { owner: string }) {
  const wallet = useWallet();
  const own = wallet.address.toLowerCase() === owner.toLowerCase();
  const [yard, setYard] = useState<PublicYard | null>(null);
  const [messages, setMessages] = useState<YardMessage[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const feed = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    fetch(`/api/yards/${encodeURIComponent(owner)}`, { cache: 'no-store' })
      .then((response) => readJsonResponse<{ yard: PublicYard }>(response, 'Load yard'))
      .then((result) => { if (active) setYard(result.yard); })
      .catch((caught: Error) => { if (active) setError(caught.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [owner]);

  useEffect(() => {
    if (!own || !yard) return;
    let active = true;
    fetch('/api/agents/chat', { cache: 'no-store' })
      .then((response) => readJsonResponse<{ messages: YardMessage[] }>(response, 'Load private chat'))
      .then((result) => { if (active) setMessages(result.messages); })
      .catch((caught: Error) => { if (active) setError(caught.message); });
    return () => { active = false; };
  }, [own, yard]);

  useEffect(() => { if (feed.current) feed.current.scrollTop = feed.current.scrollHeight; }, [messages]);

  async function send(summonMayor: boolean) {
    const body = input.trim();
    if (!body || busy || !own) return;
    setBusy(true); setError('');
    try {
      const response = await fetch('/api/agents/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body, summonMayor, requestId: crypto.randomUUID() }),
      });
      const result = await readJsonResponse<{ messages: YardMessage[] }>(response, 'Send yard message');
      setMessages((previous) => [...previous, ...result.messages]);
      setInput('');
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Message failed.'); }
    finally { setBusy(false); }
  }

  return <ProductShell title={yard ? yard.houseName.toUpperCase() : 'CITIZEN YARD'} eyebrow="PERSONAL LOT / SCRAPY SUPERVISED">
    <div className="yard-page">
      <div className="yard-topline"><Link href="/world"><ArrowLeft /> BACK TO TOWN MAP</Link><span><ShieldCheck /> {own ? 'YOUR PRIVATE LOT' : 'PUBLIC YARD VIEW'}</span></div>
      {loading ? <p>Finding this lot…</p> : !yard ? <div className="yard-empty"><h2>No yard here yet.</h2><p>{error || 'The citizen has not built a robot and home.'}</p><Link href="/citizens">GO TO PROFILE</Link></div> : <>
        <section className="yard-desert" aria-label={`${yard.houseName}, ${yard.ownerLabel}'s yard`}>
          <div className="yard-sun" aria-hidden="true" /><div className="yard-dunes" aria-hidden="true" />
          <div className="yard-fence back" aria-hidden="true" />
          <div className="yard-home"><AgentHouseArt style={yard.houseStyle} /><div className="yard-nameplate">{yard.houseName}</div></div>
          <div className="yard-robot"><PersonalRobot presentation={yard.presentation} /><div className="yard-nameplate">{yard.name}</div></div>
          <div className="yard-fence front" aria-hidden="true" />
          <div className="yard-ground" aria-hidden="true" />
          <div className="yard-sign"><small>LANDVILLE LOT</small><b>{yard.houseName}</b><span>KEPT BY {yard.ownerLabel}</span></div>
        </section>
        <section className="yard-lower">
          <div className="yard-intro"><small>ONE CITIZEN · ONE ROBOT · ONE HOME</small><h2>{yard.name} lives here.</h2><p>This is {yard.ownerLabel}&apos;s corner of LANDVILLE. The robot is a personal AI companion under Scrapy&apos;s supervision. It has no wallet, spending authority, or power to build modules.</p>{own && <Link className="lv-button" href={`/citizens/${owner}`}>EDIT ROBOT & HOUSE</Link>}</div>
          <div className="yard-chat"><header><Bot /><div><h2>{own ? `TALK TO ${yard.name.toUpperCase()}` : 'PRIVATE YARD CHAT'}</h2><small>{own ? 'ONLY YOU CAN READ THIS CONVERSATION' : 'ONLY THE OWNER CAN READ OR WRITE HERE'}</small></div></header>
            {own ? <><div className="yard-feed" ref={feed} aria-live="polite">{messages.length ? messages.map((message) => <div className={`yard-bubble ${message.role.toLowerCase()}`} key={message.id}><small>{message.role === 'CITIZEN' ? 'YOU' : message.role === 'MAYOR' ? 'MAYOR SCRAPY' : yard.name.toUpperCase()}</small><p>{message.body}</p></div>) : <p className="yard-chat-empty">Your robot is waiting. Start a conversation or call the Mayor in.</p>}</div>
              <form onSubmit={(event) => { event.preventDefault(); void send(false); }}><textarea aria-label="Private message to your robot" value={input} onChange={(event) => setInput(event.target.value)} maxLength={600} placeholder={`Say something to ${yard.name}…`} disabled={busy} /><div><small>20 AI MESSAGES / UTC DAY</small><button className="lv-button" type="button" disabled={busy || !input.trim()} onClick={() => void send(true)}><Bot /> SUMMON SCRAPY</button><button className="lv-button primary" type="submit" disabled={busy || !input.trim()}><Send /> SEND</button></div></form></> : <div className="yard-visitor-note">You can visit the lot. Its conversation stays private to its owner.</div>}
            {error && <p className="yard-error" role="alert">{error}</p>}
          </div>
        </section>
      </>}
    </div>
  </ProductShell>;
}
