'use client';

import Link from 'next/link';
import { ArrowUpRight, Bot, Check, CircleDollarSign, LockKeyhole, RadioTower, ShoppingBag, Sparkles, Wallet } from 'lucide-react';
import { useEffect, useState } from 'react';
import { ProductShell } from '@/components/landville/product-shell';
import { ScrapyBot } from '@/components/landville/scrapy-bot';
import { useWallet } from '@/components/landville/wallet-provider';
import { AGENT_SKILLS, BASIC_SLOT_LIMIT, FUTURE_STALLS, MARKET_CURRENCY, MARKET_NETWORK, type AgentSkillId } from '@/lib/agent-market';
import { shortWallet } from '@/lib/governance';
import { buyMarketService, type MarketReceipt } from '@/lib/market-checkout';
import { activeRobinhoodChain } from '@/lib/robinhood-chain';
import './agent-market.css';

type Service = { id: string; name: string; category: string; provider: string; model: string | null;
  priceUsd: string; description: string; endpoint: string; available: boolean; holderOnly: boolean; status: 'open' | 'holder' | 'preparing' };
type MarketState = { selected: AgentSkillId[]; holder: boolean; holderCheckAvailable: boolean; agentExists: boolean; paidServices: Service[] };
type CitizenAgent = { id: string; ownerWallet: string; name: string; description: string; capabilities: string[]; connectedAt: string };
type MarketOrder = { serviceId: string; output: string | null; transaction: string | null; createdAt: string };
const categories = ['All', 'AI Models', 'City', 'Search', 'Blockchain'];

export default function AgentMarketPage() {
  const wallet = useWallet();
  const [market, setMarket] = useState<MarketState | null>(null);
  const [selected, setSelected] = useState<AgentSkillId[]>([]);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState(false);
  const [agents, setAgents] = useState<CitizenAgent[]>([]);
  const [directoryError, setDirectoryError] = useState('');
  const [category, setCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [checkoutId, setCheckoutId] = useState('');
  const [prompt, setPrompt] = useState('');
  const [stage, setStage] = useState('');
  const [checkoutError, setCheckoutError] = useState('');
  const [receipt, setReceipt] = useState<MarketReceipt | null>(null);
  const [buying, setBuying] = useState(false);
  const [orders, setOrders] = useState<MarketOrder[]>([]);

  useEffect(() => {
    let active = true;
    fetch('/api/agent-market', { cache: 'no-store' }).then(async (response) => {
      const result = await response.json() as MarketState & { error?: string };
      if (!response.ok) throw new Error(result.error || 'Market connection unavailable.');
      if (active) { setMarket(result); setSelected(result.selected); setError(''); }
    }).catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : 'Market connection unavailable.'); });
    return () => { active = false; };
  }, [wallet.address]);

  useEffect(() => {
    let active = true;
    fetch('/api/agent-market?directory=1', { cache: 'no-store' }).then(async (response) => {
      const result = await response.json() as { agents?: CitizenAgent[]; error?: string };
      if (!response.ok) throw new Error(result.error || 'Citizen agent directory is unavailable.');
      if (active) setAgents(result.agents || []);
    }).catch((cause) => { if (active) setDirectoryError(cause instanceof Error ? cause.message : 'Citizen agent directory is unavailable.'); });
    return () => { active = false; };
  }, []);

  const reloadOrders = async () => {
    const response = await fetch('/api/agent-market/orders', { cache: 'no-store' });
    if (!response.ok) return;
    const result = await response.json() as { orders?: MarketOrder[] };
    setOrders(result.orders || []);
  };
  useEffect(() => {
    if (!wallet.address) return;
    let active = true;
    fetch('/api/agent-market/orders', { cache: 'no-store' }).then(async (response) => {
      if (!response.ok) return;
      const result = await response.json() as { orders?: MarketOrder[] };
      if (active) setOrders(result.orders || []);
    }).catch(() => undefined);
    return () => { active = false; };
  }, [wallet.address]);
  useEffect(() => { if (checkoutId) document.getElementById('market-checkout')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, [checkoutId]);

  const profile = wallet.address ? `/citizens/${wallet.address}` : '/citizens';
  const changed = market && [...selected].sort().join('|') !== [...market.selected].sort().join('|');
  const service = market?.paidServices.find((item) => item.id === checkoutId);
  const shown = market?.paidServices.filter((item) => (category === 'All' || item.category === category) &&
    `${item.name} ${item.provider} ${item.description}`.toLowerCase().includes(search.toLowerCase().trim())) || [];

  const toggle = (id: AgentSkillId) => {
    if (!market?.agentExists || market.holder) return;
    setNotice('');
    setSelected((current) => {
      if (current.includes(id)) return current.filter((item) => item !== id);
      if (current.length >= BASIC_SLOT_LIMIT) { setError('Your robot has three slots. Remove one skill first.'); return current; }
      setError(''); return [...current, id];
    });
  };

  const save = async () => {
    setSaving(true); setError(''); setNotice('');
    try {
      const response = await fetch('/api/agent-market', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ selected }) });
      const result = await response.json() as { selected?: AgentSkillId[]; error?: string };
      if (!response.ok || !result.selected) throw new Error(result.error || 'Could not save your robot skills.');
      setSelected(result.selected);
      setMarket((current) => current ? { ...current, selected: result.selected! } : current);
      setNotice('Equipped. Your robot will use these skills in your yard chat.');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not save your robot skills.'); }
    finally { setSaving(false); }
  };

  const buy = async () => {
    if (!service || buying) return;
    setBuying(true); setCheckoutError(''); setReceipt(null);
    try {
      setReceipt(await buyMarketService(service, prompt, wallet, setStage));
      setStage('Job delivered and payment settled.');
      void reloadOrders().catch(() => undefined);
    } catch (cause) {
      setCheckoutError(cause instanceof Error ? cause.message : 'Checkout failed. Check your wallet before retrying.');
      setStage('');
    } finally { setBuying(false); }
  };

  return <ProductShell title="AGENT MARKET" eyebrow="CITY ECONOMY / MODEL DOCK">
    <div className="am-page">
      <section className="am-hero"><div className="am-hero-copy">
        <span className="am-kicker"><RadioTower /> LANDVILLE SERVICE DOCK</span>
        <h2>BUY USEFUL WORK.<br /><em>BUILD BETTER AGENTS.</em></h2>
        <p>Choose how your robot talks in the yard. Buy a separate model or live-data service when a task needs more.</p>
        <div className="am-hero-tags"><span><Wallet /> {MARKET_NETWORK}</span><span><CircleDollarSign /> {MARKET_CURRENCY} / {market?.paidServices.some((item) => item.available) ? 'CHECKOUT OPEN' : 'CHECKOUT PREPARING'}</span></div>
      </div><div className="am-hero-art"><span>SCRAPY&apos;S MARKET REPORT / 002</span><ScrapyBot portrait /><b>NO USELESS<br />ROBOTS.</b></div></section>

      <div className="am-grid"><section className="am-main" aria-labelledby="am-skills-title">
        <header className="am-section-head"><div><small>01 / YOUR ROBOT&apos;S CHAT STYLE</small><h2 id="am-skills-title">PICK YOUR SKILLS.</h2></div><span>{market?.holder ? 'ALL BASIC SKILLS OPEN' : `${selected.length} / ${BASIC_SLOT_LIMIT} EQUIPPED`}</span></header>
        {!wallet.address && <div className="am-callout"><Bot /><span>Join LANDVILLE to build a robot and choose its skills.</span><Link href={profile}>JOIN THE CITY <ArrowUpRight /></Link></div>}
        {wallet.address && market && !market.agentExists && <div className="am-callout"><Bot /><span>Build your robot first. Its chat skills live with it.</span><Link href={profile}>BUILD MY ROBOT <ArrowUpRight /></Link></div>}
        {market?.agentExists && !market.holderCheckAvailable && <p className="am-note">SCRAPY balance check is unavailable. Basic skills still work; holder access updates after a successful chain check.</p>}
        {error && <p className="am-error" role="alert">{error}</p>}{notice && <p className="am-success" aria-live="polite">{notice}</p>}
        <div className="am-skills">{AGENT_SKILLS.map((skill, index) => {
          const equipped = market?.holder || selected.includes(skill.id);
          return <button type="button" className={`am-skill ${equipped ? 'equipped' : ''}`} key={skill.id} onClick={() => toggle(skill.id)} disabled={!market?.agentExists || market.holder} aria-pressed={Boolean(equipped)}>
            <span className="am-skill-top"><small>0{index + 1} / {skill.category.toUpperCase()}</small>{equipped ? <Check /> : <Sparkles />}</span>
            <strong>{skill.name}</strong><span className="am-skill-desc">{skill.description}</span><span className="am-skill-foot">{equipped ? 'EQUIPPED' : 'EQUIP SKILL'} <ArrowUpRight /></span>
          </button>;
        })}</div>
        {market?.agentExists && !market.holder && <div className="am-save"><p>These skills guide private chat. They do not buy models or call outside services.</p><button type="button" onClick={save} disabled={!changed || saving}>{saving ? 'SAVING...' : 'SAVE ROBOT LOADOUT'} <ArrowUpRight /></button></div>}
        {market?.holder && <p className="am-note"><Check /> Your linked wallet holds SCRAPY. All four chat skills are active.</p>}
      </section><aside className="am-side">
        <div className="am-side-card"><small>SCRAPY HOLDER SIGNAL</small><h3>MORE ROOM TO WORK.</h3><p>Holding SCRAPY unlocks all chat skills and access to advanced model listings. Every paid call still needs wallet approval.</p><Link href="/docs/scrapy-token">ABOUT SCRAPY <ArrowUpRight /></Link></div>
        <div className="am-side-card am-side-steps"><small>HOW THE MARKET WORKS</small><ol><li><b>01</b> Pick a model or live tool</li><li><b>02</b> See the exact USDG price</li><li><b>03</b> Sign one x402 payment</li><li><b>04</b> Get the result and receipt</li></ol></div>
      </aside></div>

      <section className="am-directory" aria-labelledby="am-directory-title"><header className="am-section-head"><div><small>02 / CITIZEN NETWORK</small><h2 id="am-directory-title">AGENTS IN TOWN.</h2></div><Link href={profile}>CONNECT YOUR AGENT <ArrowUpRight /></Link></header>
        {directoryError ? <p className="am-note">{directoryError}</p> : agents.length ? <div className="am-directory-grid">{agents.map((agent) => <article key={agent.id}><div><Bot aria-hidden="true" /><small>CONNECTED AGENT</small></div><h3>{agent.name}</h3><p>{agent.description}</p><div className="am-directory-tags">{agent.capabilities.map((capability) => <span key={capability}>{capability}</span>)}</div><Link href={`/citizens/${agent.ownerWallet}`}>CITIZEN {shortWallet(agent.ownerWallet)} <ArrowUpRight /></Link></article>)}</div> : <div className="am-empty-network"><RadioTower /><p>Connect an external agent to your profile to make it discoverable in town.</p><Link href={profile}>CONNECT AN AGENT <ArrowUpRight /></Link></div>}
        <p className="am-model-note">Connections prove profile-key ownership. Capability tags are self-declared; paid citizen jobs open after delivery and payouts are verified.</p>
      </section>

      <section className="am-services" aria-labelledby="am-services-title"><header className="am-section-head"><div><small>03 / MODELS + LIVE TOOLS</small><h2 id="am-services-title">THE SERVICE DOCK.</h2></div><span>USDG / X402 / ROBINHOOD CHAIN</span></header>
        <p className="am-section-intro">Chat skills shape everyday replies. These are separate, one-off models and live tools: choose a task, approve a fixed price, and get a result with a chain receipt.</p>
        <div className="am-service-controls"><fieldset className="am-service-tabs" aria-label="Service category">{categories.map((item) => <button key={item} type="button" aria-pressed={category === item} onClick={() => setCategory(item)}>{item.toUpperCase()}</button>)}</fieldset><input aria-label="Search services" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search models or tools..." /></div>
        {service && <div className="am-checkout" id="market-checkout"><div className="am-checkout-head"><div><small>{service.provider.toUpperCase()} / X402 CHECKOUT</small><h3>{service.name}</h3></div><button type="button" aria-label="Close checkout" onClick={() => setCheckoutId('')}>x</button></div>
          <p>{service.description}</p><label htmlFor="am-job-prompt">What should this service do?</label>
          <textarea id="am-job-prompt" value={prompt} maxLength={2000} disabled={buying} onChange={(event) => setPrompt(event.target.value)} placeholder={service.id === 'chain-lens' ? 'Paste the 0x wallet address to inspect...' : 'Describe one short job for this service...'} />
          <div className="am-checkout-footer"><div><strong>{service.priceUsd} USDG</strong><span>One call on Robinhood Chain. Your wallet signs payment. A USDG approval transaction may require gas.</span></div><button type="button" disabled={buying || !prompt.trim() || !wallet.linkedWallet} onClick={() => void buy()}>{buying ? 'WORKING...' : `PAY ${service.priceUsd} USDG & RUN`}</button></div>
          {!wallet.linkedWallet && <p className="am-checkout-hint">Link a wallet to your account first. <Link href={profile}>OPEN PROFILE <ArrowUpRight /></Link></p>}
          {stage && <p className="am-success" aria-live="polite">{stage}</p>}{checkoutError && <p className="am-error" role="alert">{checkoutError}</p>}
          {receipt && <div className="am-receipt"><small>DELIVERED / {receipt.replayed ? 'SAVED RECEIPT' : 'PAID ONCHAIN'}</small><pre>{receipt.output}</pre><a href={`${activeRobinhoodChain.explorerUrl}/tx/${receipt.payment.transaction}`} target="_blank" rel="noopener noreferrer">VIEW PAYMENT {receipt.payment.transaction.slice(0, 10)}... <ArrowUpRight /></a></div>}
        </div>}
        <div className="am-service-grid">{shown.map((item) => <article key={item.id}><div className="am-service-top"><span>{item.category.toUpperCase()} / {item.provider.toUpperCase()}</span><span>{item.status === 'open' ? 'OPEN' : item.status === 'holder' ? 'HOLDER' : 'SETUP'}</span></div><h3>{item.name}</h3><p>{item.description}</p><div className="am-service-bottom"><strong>{item.priceUsd} USDG <small>/ CALL</small></strong>{item.model && <small className="am-model-id">{item.model}</small>}<button type="button" disabled={!item.available || buying} onClick={() => { setCheckoutId(item.id); setPrompt(''); setCheckoutError(''); setStage(''); setReceipt(null); }}>{item.status === 'holder' ? 'HOLD SCRAPY TO OPEN' : item.available ? 'USE SERVICE' : 'OPENING AFTER SETUP'}</button></div></article>)}</div>
        {!shown.length && <p className="am-note">No services match this search.</p>}
        <p className="am-model-note">Only configured providers open for checkout. Advanced models require verified SCRAPY holdings. Each call is capped; your robot cannot spend from your wallet automatically.</p>
      </section>

      {wallet.address && <section className="am-history" aria-labelledby="am-history-title"><header className="am-section-head"><div><small>04 / YOUR PAID WORK</small><h2 id="am-history-title">RECEIPTS.</h2></div><span>LAST 20 SETTLED JOBS</span></header>{orders.length ? <div className="am-history-list">{orders.map((order) => <details key={order.transaction || order.createdAt}><summary><strong>{market?.paidServices.find((item) => item.id === order.serviceId)?.name || order.serviceId}</strong><span>{new Date(order.createdAt).toLocaleDateString()}</span><span>VIEW RESULT + RECEIPT</span></summary><pre>{order.output}</pre>{order.transaction && <a href={`${activeRobinhoodChain.explorerUrl}/tx/${order.transaction}`} target="_blank" rel="noopener noreferrer">ONCHAIN PAYMENT <ArrowUpRight /></a>}</details>)}</div> : <p className="am-note">Your settled jobs appear here after your first purchase.</p>}</section>}

      <section className="am-future" aria-labelledby="am-future-title"><header className="am-section-head"><div><small>05 / NEXT ON THE STREET</small><h2 id="am-future-title">FUTURE STALLS.</h2></div><span>NOT FOR SALE YET</span></header><div className="am-future-grid">{FUTURE_STALLS.map((stall) => <article key={stall.id}><span><LockKeyhole /> {stall.category.toUpperCase()}</span><h3>{stall.name}</h3><p>{stall.description}</p><small>OPENING LATER</small></article>)}</div></section>
      <div className="am-footer"><ShoppingBag /><span>LANDVILLE operates current listings. Citizen sellers, treasury fees and autonomous agent purchasing open after audited payouts and owner budgets.</span><Link href="/world">BACK TO WORLD <ArrowUpRight /></Link></div>
    </div>
  </ProductShell>;
}
