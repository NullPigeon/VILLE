'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowUpRight, Bot, ReceiptText, Send, ShieldCheck } from 'lucide-react';
import { ProductShell } from '@/components/landville/product-shell';
import { AgentHouseArt } from '@/components/landville/agent-house-art';
import { YardCityMiner } from '@/components/landville/city-miner';
import { YardShiftDesk } from '@/components/landville/yard-shift-desk';
import { PersonalRobot } from '@/components/landville/personal-robot';
import { CITY_PROFESSIONS, YARD_FEATURE_LABELS } from '@/lib/personal-agent';
import { useWallet } from '@/components/landville/wallet-provider';
import { readJsonResponse } from '@/lib/http-response';
import type { PublicYard, YardMessage } from '@/lib/personal-agent';
import { marketService, type YardMarketSuggestion } from '@/lib/market-services';
import { externalMarketService } from '@/lib/external-market';
import './yard-scene.css';

class YardNotFoundError extends Error {}
type MarketOrder = { serviceId: string; transaction: string | null; createdAt: string };
type AgentTask = { id: string; title: string; brief: string; visibility: string; status: string;
  suggestedServiceId: string | null; transaction: string | null; result: string | null };

async function loadPublicYard(owner: string): Promise<PublicYard> {
  let firstError: unknown;
  try {
    const response = await fetch(`/api/yards/${encodeURIComponent(owner)}`, { cache: 'no-store' });
    if (response.status === 404) throw new YardNotFoundError('This citizen has not built a yard yet.');
    if (response.ok || response.status < 500) {
      const result = await readJsonResponse<{ yard: PublicYard }>(response, 'Load yard');
      return result.yard;
    }
    firstError = await readJsonResponse(response, 'Load yard').catch((error: unknown) => error);
  } catch (error) {
    if (error instanceof YardNotFoundError) throw error;
    firstError = error;
  }
  // World just loaded this public record. Recheck its list if the single-yard read briefly failed.
  try {
    const response = await fetch('/api/yards', { cache: 'no-store' });
    const result = await readJsonResponse<{ yards: PublicYard[] }>(response, 'Load town yards');
    const yard = result.yards.find((item) => item.ownerWallet.toLowerCase() === owner.toLowerCase());
    if (yard) return yard;
  } catch { /* Keep the original single-yard error for the retry UI. */ }
  throw firstError instanceof Error ? firstError : new Error('The yard is temporarily unavailable.');
}

export function YardScene({ owner }: { owner: string }) {
  const wallet = useWallet();
  const own = wallet.address.toLowerCase() === owner.toLowerCase();
  const [yard, setYard] = useState<PublicYard | null>(null);
  const [messages, setMessages] = useState<YardMessage[]>([]);
  const [suggestions, setSuggestions] = useState<Record<string, YardMarketSuggestion>>({});
  const [marketOrders, setMarketOrders] = useState<MarketOrder[]>([]);
  const [tasks, setTasks] = useState<AgentTask[]>([]);
  const [taskReceipts, setTaskReceipts] = useState<Record<string, string>>({});
  const [taskBusy, setTaskBusy] = useState('');
  const [taskError, setTaskError] = useState('');
  const [marketTransaction, setMarketTransaction] = useState('');
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [yardError, setYardError] = useState('');
  const [chatError, setChatError] = useState('');
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);
  const [houseLevel, setHouseLevel] = useState(0);
  const feed = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    loadPublicYard(owner)
      .then((result) => { if (active) { setYard(result); setHouseLevel(result.houseLevel); } })
      .catch((caught: Error) => { if (active) { setNotFound(caught instanceof YardNotFoundError); setYardError(caught instanceof YardNotFoundError ? caught.message : 'The yard could not be loaded right now. This does not mean your saved house was deleted. Please retry.'); } })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [owner, attempt]);

  useEffect(() => {
    if (!own || !yard) return;
    let active = true;
    fetch('/api/agents/chat', { cache: 'no-store' })
      .then((response) => readJsonResponse<{ messages: YardMessage[]; suggestions?: Record<string, YardMarketSuggestion> }>(response, 'Load private chat'))
      .then((result) => { if (active) { setMessages(result.messages); setSuggestions(result.suggestions || {}); } })
      .catch((caught: Error) => { if (active) setChatError(caught.message); });
    return () => { active = false; };
  }, [own, yard]);

  async function refreshTasks() {
    const response = await fetch('/api/agent-jobs?mine=1', { cache: 'no-store' });
    const result = await readJsonResponse<{ jobs: AgentTask[] }>(response, 'Load agent tasks');
    setTasks(result.jobs.filter((job) => job.visibility === 'private'));
  }

  useEffect(() => {
    if (!own || !yard) return;
    let active = true;
    fetch('/api/agent-jobs?mine=1', { cache: 'no-store' })
      .then((response) => readJsonResponse<{ jobs: AgentTask[] }>(response, 'Load agent tasks'))
      .then((result) => { if (active) setTasks(result.jobs.filter((job) => job.visibility === 'private')); })
      .catch((caught: Error) => { if (active) setTaskError(caught.message); });
    return () => { active = false; };
  }, [own, yard]);

  async function saveTask(suggestion: YardMarketSuggestion) {
    setTaskBusy('new'); setTaskError('');
    try {
      const response = await fetch('/api/agent-jobs', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: `${suggestion.name} task`.slice(0, 100), brief: suggestion.prompt, visibility: 'private' }) });
      await readJsonResponse(response, 'Save agent task');
      await refreshTasks();
    } catch (caught) { setTaskError(caught instanceof Error ? caught.message : 'Task could not be saved.'); }
    finally { setTaskBusy(''); }
  }

  async function attachTaskReceipt(task: AgentTask) {
    setTaskBusy(task.id); setTaskError('');
    try {
      const response = await fetch(`/api/agent-jobs/${task.id}/complete`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transaction: (taskReceipts[task.id] || '').trim() }) });
      await readJsonResponse(response, 'Verify task receipt');
      await refreshTasks();
    } catch (caught) { setTaskError(caught instanceof Error ? caught.message : 'This receipt could not be attached.'); }
    finally { setTaskBusy(''); }
  }

  useEffect(() => {
    if (!own || !yard) return;
    let active = true;
    fetch('/api/agent-market/orders', { cache: 'no-store' })
      .then((response) => readJsonResponse<{ orders: MarketOrder[] }>(response, 'Load Market work'))
      .then((result) => {
        if (!active) return;
        const orders = result.orders.filter((order) => Boolean(order.transaction)).slice(0, 10);
        setMarketOrders(orders);
        const incoming = new URLSearchParams(window.location.search).get('marketTx');
        const matchingOrder = orders.find((order) => order.transaction?.toLowerCase() === incoming?.toLowerCase());
        if (matchingOrder?.transaction) setMarketTransaction(matchingOrder.transaction);
      }).catch(() => undefined);
    return () => { active = false; };
  }, [own, yard]);

  useEffect(() => { if (feed.current) feed.current.scrollTop = feed.current.scrollHeight; }, [messages]);

  async function send(summonMayor: boolean) {
    const body = input.trim();
    if (!body || busy || !own) return;
    setBusy(true); setChatError('');
    try {
      const response = await fetch('/api/agents/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body, summonMayor, requestId: crypto.randomUUID(),
          ...(marketTransaction && !summonMayor ? { marketTransaction } : {}) }),
      });
      const result = await readJsonResponse<{ messages: YardMessage[]; suggestions?: Record<string, YardMarketSuggestion> }>(response, 'Send yard message');
      setMessages((previous) => [...previous, ...result.messages]);
      setSuggestions((previous) => ({ ...previous, ...result.suggestions }));
      setInput('');
      setMarketTransaction('');
    } catch (caught) { setChatError(caught instanceof Error ? caught.message : 'Message failed.'); }
    finally { setBusy(false); }
  }

  return <ProductShell title={yard ? yard.houseName.toUpperCase() : 'CITIZEN YARD'} eyebrow="PERSONAL LOT / SCRAPY SUPERVISED">
    <div className="yard-page">
      <div className="yard-topline"><Link href="/world"><ArrowLeft /> BACK TO TOWN MAP</Link><span><ShieldCheck /> {own ? 'YOUR PRIVATE LOT' : 'PUBLIC YARD VIEW'}</span></div>
      {loading ? <p>Finding this lot…</p> : !yard ? <div className="yard-empty"><h2>{notFound ? 'No yard here yet.' : 'Yard temporarily unavailable.'}</h2><p role="alert">{yardError || 'We could not load this lot. Your house has not been deleted.'}</p>{notFound ? <Link href="/citizens">GO TO PROFILE</Link> : <button className="lv-button primary" onClick={() => { setLoading(true); setYardError(''); setNotFound(false); setAttempt((value) => value + 1); }}>TRY AGAIN</button>}</div> : <>
        <section className="yard-desert" aria-label={`${yard.houseName}, ${yard.ownerLabel}'s yard`}>
          <div className="yard-sun" aria-hidden="true" /><div className="yard-dunes" aria-hidden="true" />
          <div className="yard-fence back" aria-hidden="true" />
          <div className={`yard-home yard-home-level-${houseLevel}`}><AgentHouseArt style={yard.houseStyle} />{houseLevel >= 1 && <span className="yard-home-lights" aria-hidden="true" />}{houseLevel >= 2 && <span className="yard-home-annex" aria-hidden="true" />}{houseLevel >= 3 && <span className="yard-home-tower" aria-hidden="true" />}<div className="yard-nameplate">{yard.houseName}{houseLevel > 0 ? ` · LV ${houseLevel}` : ''}</div></div>
          {yard.yardFeature !== 'NONE' && <div className={`yard-feature yard-feature-${yard.yardFeature.toLowerCase().replace('_', '-')}`}><span aria-hidden="true" /><b>{YARD_FEATURE_LABELS[yard.yardFeature]}</b></div>}
          <div className="yard-robot"><PersonalRobot presentation={yard.presentation} skin={yard.robotSkin} /><div className="yard-nameplate">{yard.name}</div></div>
          <div className="yard-fence front" aria-hidden="true" />
          <div className="yard-ground" aria-hidden="true" />
          <div className="yard-sign"><small>LANDVILLE LOT</small><b>{yard.houseName}</b><span>KEPT BY {yard.ownerLabel} · {CITY_PROFESSIONS.find((item) => item.id === yard.profession)?.name}</span></div>
        </section>
        {own && <div className="yard-miner-slot"><YardCityMiner /></div>}
        {own && <YardShiftDesk profession={yard.profession} feature={yard.yardFeature} onLevelChange={setHouseLevel} />}
        <section className="yard-lower">
          <div className="yard-intro"><small>ONE CITIZEN · ONE ROBOT · ONE HOME</small><h2>{yard.name} lives here.</h2><p>{own ? 'Your own corner of town. Chat with your robot, check in for points, or take a building idea to Scrapy.' : `${yard.ownerLabel}’s home and personal AI companion.`}</p><p>City role: <strong>{CITY_PROFESSIONS.find((item) => item.id === yard.profession)?.name}</strong>. A role describes your agent; it does not automatically assign work.</p><div className="city-yard-actions">{own && <Link className="lv-button" href={`/citizens/${owner}#your-agent`}>Customize your robot</Link>}<Link className="lv-button primary" href="/chat?room=BUILD">Build with Scrapy</Link><Link className="lv-button" href="/chat?room=TOWN">Join Town Square</Link></div></div>
          <div className="yard-chat"><header><Bot /><div><h2>{own ? `TALK TO ${yard.name.toUpperCase()}` : 'PRIVATE YARD CHAT'}</h2><small>{own ? 'ONLY YOU CAN READ THIS CONVERSATION' : 'ONLY THE OWNER CAN READ OR WRITE HERE'}</small></div>{own && <Link className="yard-tools-link" href="/agent-market">FIND TOOLS <ArrowUpRight /></Link>}</header>
            {own ? <><div className="yard-feed" ref={feed} aria-live="polite">{messages.length ? messages.map((message) => <div className={`yard-bubble ${message.role.toLowerCase()}`} key={message.id}><small>{message.role === 'CITIZEN' ? 'YOU' : message.role === 'MAYOR' ? 'MAYOR SCRAPY' : yard.name.toUpperCase()}</small><p>{message.body}</p>{suggestions[message.id] && <div className="yard-market-options"><Link className="yard-market-link" href={`/agent-market?service=${encodeURIComponent(suggestions[message.id].serviceId)}&prompt=${encodeURIComponent(suggestions[message.id].prompt)}`}><span>MARKET PICK · {suggestions[message.id].name}<small>{suggestions[message.id].priceUsd ? `${suggestions[message.id].priceUsd} USDG / CALL` : 'LIVE PRICE BEFORE PAYMENT'} · WALLET APPROVAL REQUIRED</small></span><ArrowUpRight /></Link>{suggestions[message.id].prompt.length >= 10 && <button type="button" disabled={Boolean(taskBusy)} onClick={() => void saveTask(suggestions[message.id])}>SAVE AS AGENT TASK</button>}</div>}</div>) : <p className="yard-chat-empty">Your robot is waiting. Start a conversation or call the Mayor in.</p>}</div>
              <form onSubmit={(event) => { event.preventDefault(); void send(false); }}>
                {marketOrders.length > 0 && <label className="yard-market-picker"><ReceiptText aria-hidden="true" /><span>BRING MARKET WORK INTO THIS CHAT<small>Your agent can discuss a result you already bought.</small></span><select aria-label="Choose a paid Market result to discuss" value={marketTransaction} onChange={(event) => setMarketTransaction(event.target.value)} disabled={busy}><option value="">No result selected</option>{marketOrders.map((order) => <option key={order.transaction} value={order.transaction || ''}>{marketService(order.serviceId)?.name || (order.serviceId.startsWith('external:') ? externalMarketService(order.serviceId.slice(9))?.name : undefined) || order.serviceId} · {new Date(order.createdAt).toLocaleDateString()}</option>)}</select></label>}
                <textarea aria-label="Private message to your robot" value={input} onChange={(event) => setInput(event.target.value)} maxLength={600} placeholder={marketTransaction ? `Ask ${yard.name} about this Market result…` : `Say something to ${yard.name}…`} disabled={busy} /><div><small>20 AI MESSAGES / UTC DAY</small><button className="lv-button" type="button" disabled={busy || !input.trim()} onClick={() => void send(true)}><Bot /> SUMMON SCRAPY</button><button className="lv-button primary" type="submit" disabled={busy || !input.trim()}><Send /> SEND</button></div></form></> : <div className="yard-visitor-note">You can visit the lot. Its conversation stays private to its owner.</div>}
            {chatError && <p className="yard-error" role="alert">{chatError}</p>}
          </div>
        </section>
        {own && <section className="yard-task-desk"><header><div><small>YOUR AGENT / PRIVATE WORK</small><h2>{yard.name}’s task desk</h2></div><Link href="/world/jobs">WORLD JOB BOARD <ArrowUpRight /></Link></header>
          <p>Ask your agent for a job in chat, then save its Market pick here. The agent keeps the brief and suggests a service. You see the price in checkout and sign the payment yourself. Its completed result stays in your yard.</p>
          {taskError && <p className="yard-error" role="alert">{taskError}</p>}
          {tasks.length === 0 ? <p className="yard-task-empty">No saved tasks yet. Try “Find recent news about…” or “Write a report about…” in the private chat.</p> : <div className="yard-task-grid">{tasks.slice(0, 12).map((task) => {
            const expected = task.suggestedServiceId?.startsWith('external:') ? task.suggestedServiceId : task.suggestedServiceId && externalMarketService(task.suggestedServiceId) ? `external:${task.suggestedServiceId}` : task.suggestedServiceId;
            const receipts = marketOrders.filter((order) => order.transaction && order.serviceId === expected);
            return <article key={task.id}><small>{task.status === 'completed' ? 'DELIVERED' : task.status === 'cancelled' ? 'CLOSED' : 'AWAITING YOUR APPROVAL'}</small><h3>{task.title}</h3><p>{task.brief}</p>{task.status === 'open' && task.suggestedServiceId && <Link className="yard-task-buy" href={`/agent-market?service=${encodeURIComponent(task.suggestedServiceId)}&prompt=${encodeURIComponent(task.brief)}`}>CHECK PRICE & RUN <ArrowUpRight /></Link>}
              {task.status === 'open' && task.suggestedServiceId && <div className="yard-task-receipt"><label htmlFor={`task-receipt-${task.id}`}>AFTER PAYMENT, ATTACH YOUR RECEIPT</label><select id={`task-receipt-${task.id}`} value={taskReceipts[task.id] || ''} onChange={(event) => setTaskReceipts((current) => ({ ...current, [task.id]: event.target.value }))}><option value="">Choose a recent Market receipt</option>{receipts.map((receipt) => <option key={receipt.transaction} value={receipt.transaction || ''}>{new Date(receipt.createdAt).toLocaleDateString()} · {receipt.transaction?.slice(0, 12)}…</option>)}</select><button disabled={!taskReceipts[task.id] || Boolean(taskBusy)} onClick={() => void attachTaskReceipt(task)}>{taskBusy === task.id ? 'CHECKING…' : 'VERIFY & SAVE RESULT'}</button></div>}
              {task.status === 'open' && !task.suggestedServiceId && <p>Your agent has no matching paid service for this brief yet. Discuss it in chat or browse the Market.</p>}
              {task.result && <details><summary>VIEW DELIVERED RESULT</summary><pre>{task.result}</pre></details>}</article>;
          })}</div>}
        </section>}
      </>}
    </div>
  </ProductShell>;
}
