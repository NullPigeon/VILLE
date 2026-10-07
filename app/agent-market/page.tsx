'use client';

import Link from 'next/link';
import { ArrowRight, ArrowUpRight, Bot, Check, ChevronRight, CircleDollarSign, RadioTower, Search, ShieldCheck, ShoppingBag, Sparkles, Wallet, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { ProductShell } from '@/components/landville/product-shell';
import { ScrapyBot } from '@/components/landville/scrapy-bot';
import { MarketStallWorkshop } from '@/components/landville/market-stall-workshop';
import { useWallet } from '@/components/landville/wallet-provider';
import { AGENT_SKILLS, BASIC_SLOT_LIMIT, MARKET_CURRENCY, MARKET_NETWORK, type AgentSkillId } from '@/lib/agent-market';
import { shortWallet } from '@/lib/governance';
import { buyMarketService, type MarketReceipt } from '@/lib/market-checkout';
import { activeRobinhoodChain } from '@/lib/robinhood-chain';
import './agent-market.css';

type Service = { id: string; name: string; category: string; provider: string; kind: string; model: string | null;
  priceUsd: string; description: string; endpoint: string; available: boolean; holderOnly: boolean; status: 'open' | 'holder' | 'preparing' };
type MarketState = { selected: AgentSkillId[]; holder: boolean; holderCheckAvailable: boolean; agentExists: boolean; paidServices: Service[] };
type CitizenAgent = { id: string; ownerWallet: string; name: string; description: string; capabilities: string[]; connectedAt: string };
type MarketOrder = { serviceId: string; output: string | null; transaction: string | null; createdAt: string };

const categoryOrder = ['All', 'AI Models', 'Search', 'Web & Scraping', 'Research', 'Blockchain', 'City'];
const providerNames: Record<string, string> = {
  landville: 'LANDVILLE', openai: 'OpenAI', anthropic: 'Anthropic', google: 'Google Gemini',
  xai: 'xAI', groq: 'Groq', deepseek: 'DeepSeek', mistral: 'Mistral', brave: 'Brave Search', firecrawl: 'Firecrawl', robinhood: 'Robinhood Chain',
};

function serviceStatus(service: Service) {
  if (service.status === 'open') return 'Available';
  if (service.status === 'holder') return 'SCRAPY holder access';
  return 'Needs project setup';
}

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
  const [mcpUrl, setMcpUrl] = useState('');
  const [mcpCopied, setMcpCopied] = useState(false);
  const prefilled = useRef(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setMcpUrl(`${window.location.origin}/mcp`), 0);
    return () => window.clearTimeout(timer);
  }, []);

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

  useEffect(() => {
    if (!wallet.address) { const timer = window.setTimeout(() => setOrders([]), 0); return () => window.clearTimeout(timer); }
    let active = true;
    fetch('/api/agent-market/orders', { cache: 'no-store' }).then(async (response) => {
      if (!response.ok) return;
      const result = await response.json() as { orders?: MarketOrder[] };
      if (active) setOrders(result.orders || []);
    }).catch(() => undefined);
    return () => { active = false; };
  }, [wallet.address]);

  useEffect(() => {
    if (!market || prefilled.current) return;
    prefilled.current = true;
    const query = new URLSearchParams(window.location.search);
    const id = query.get('service');
    if (id && market.paidServices.some((item) => item.id === id)) {
      const timer = window.setTimeout(() => { setCheckoutId(id); setPrompt((query.get('prompt') || '').slice(0, 2000)); }, 0);
      return () => window.clearTimeout(timer);
    }
  }, [market]);

  const profile = wallet.address ? `/citizens/${wallet.address}` : '/citizens';
  const changed = Boolean(market) && [...selected].sort().join('|') !== [...market!.selected].sort().join('|');
  const activeService = market?.paidServices.find((item) => item.id === checkoutId);
  const services = market?.paidServices || [];
  const categories = categoryOrder.filter((item) => item === 'All' || services.some((service) => service.category === item));
  const shown = services.filter((item) => (category === 'All' || item.category === category) &&
    `${item.name} ${item.provider} ${item.description}`.toLowerCase().includes(search.toLowerCase().trim()));
  const providerGroups = Array.from(new Set(shown.map((item) => item.provider))).map((provider) => ({
    provider, services: shown.filter((item) => item.provider === provider),
  }));
  const openCount = services.filter((item) => item.status === 'open').length;

  function choose(service: Service) {
    setCheckoutId(service.id); setPrompt(''); setCheckoutError(''); setStage(''); setReceipt(null);
    window.setTimeout(() => document.getElementById('market-checkout')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0);
  }

  function toggle(id: AgentSkillId) {
    if (!market?.agentExists || market.holder) return;
    setNotice('');
    setSelected((current) => {
      if (current.includes(id)) return current.filter((item) => item !== id);
      if (current.length >= BASIC_SLOT_LIMIT) { setError('Your agent has three skill slots. Remove one first.'); return current; }
      setError(''); return [...current, id];
    });
  }

  async function save() {
    setSaving(true); setError(''); setNotice('');
    try {
      const response = await fetch('/api/agent-market', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ selected }) });
      const result = await response.json() as { selected?: AgentSkillId[]; error?: string };
      if (!response.ok || !result.selected) throw new Error(result.error || 'Could not save your agent skills.');
      setSelected(result.selected);
      setMarket((current) => current ? { ...current, selected: result.selected! } : current);
      setNotice('Skills equipped. Your agent uses them in your yard chat.');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not save your agent skills.'); }
    finally { setSaving(false); }
  }

  async function buy() {
    if (!activeService || buying) return;
    setBuying(true); setCheckoutError(''); setReceipt(null);
    try {
      setReceipt(await buyMarketService(activeService, prompt, wallet, setStage));
      setStage('Work delivered. Payment settled onchain.');
      const response = await fetch('/api/agent-market/orders', { cache: 'no-store' });
      if (response.ok) setOrders((await response.json() as { orders?: MarketOrder[] }).orders || []);
    } catch (cause) {
      setCheckoutError(cause instanceof Error ? cause.message : 'Checkout failed. Check your wallet before retrying.');
      setStage('');
    } finally { setBuying(false); }
  }

  return <ProductShell title="AGENT MARKET" eyebrow="CITY ECONOMY / SERVICE DOCK">
    <main className="am-page">
      <section className="am-hero" aria-labelledby="market-title">
        <div className="am-hero-copy"><span className="am-kicker"><RadioTower /> SCRAPY SERVICE DOCK</span>
          <h1 id="market-title">GIVE YOUR AGENT <em>MORE TO DO.</em></h1>
          <p>Find a model or tool, describe the job, and get the result here. Your agent can point you to the right service.</p>
          <div className="am-hero-actions"><a href="#services">EXPLORE SERVICES <ArrowRight /></a><Link href={profile}>MY AGENT <ArrowUpRight /></Link></div>
          <div className="am-hero-tags"><span><Wallet /> {MARKET_NETWORK}</span><span><CircleDollarSign /> {MARKET_CURRENCY} · {openCount ? `${openCount} AVAILABLE` : 'PAYMENTS IN SETUP'}</span></div>
        </div><div className="am-hero-art"><span>SCRAPY&apos;S SERVICE BOARD</span><ScrapyBot portrait /><b>WHAT&apos;S THE JOB?</b></div>
      </section>

      <section className="am-guide" aria-label="How to use the market">
        <div><b>01</b><span><strong>Choose a service</strong><small>Models, search, research and chain data.</small></span></div>
        <div><b>02</b><span><strong>Describe one task</strong><small>Ask for a report, answer or lookup.</small></span></div>
        <div><b>03</b><span><strong>Approve & receive</strong><small>When live, each paid call needs a wallet signature.</small></span></div>
      </section>

      <section className="am-services" id="services" aria-labelledby="am-services-title">
        <header className="am-section-head"><div><small>01 / MARKETPLACE</small><h2 id="am-services-title">FIND YOUR TOOL.</h2></div><span>{services.length} SERVICE OPTIONS · {openCount} READY</span></header>
        <p className="am-section-intro">Browse by provider. Each option is a single bounded job, not a subscription. Only configured services can take payment.</p>
        <div className="am-service-controls"><fieldset className="am-service-tabs" aria-label="Service category">{categories.map((item) => <button key={item} type="button" aria-pressed={category === item} onClick={() => setCategory(item)}>{item}</button>)}</fieldset>
          <label className="am-search"><Search aria-hidden="true" /><input aria-label="Search services" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search models or tools" /></label></div>
        {!market && !error && <p className="am-note">Loading the service board…</p>}
        {error && !market && <p className="am-error" role="alert">{error}</p>}
        {activeService && <div className="am-checkout" id="market-checkout"><div className="am-checkout-head"><div><small>{providerNames[activeService.provider] || activeService.provider} / {activeService.category}</small><h3>{activeService.name}</h3></div><button type="button" aria-label="Close service" onClick={() => setCheckoutId('')}><X /></button></div>
          <p>{activeService.description}</p>
          {activeService.status === 'preparing' && <div className="am-setup-message"><ShieldCheck /> This service is listed for preview. LANDVILLE must connect the provider and payment system before checkout opens.</div>}
          {activeService.status === 'holder' && <div className="am-setup-message"><ShieldCheck /> This service requires a verified balance of at least 1M SCRAPY in your linked wallet.</div>}
          <label htmlFor="am-job-prompt">WHAT DO YOU WANT DONE?</label>
          <textarea id="am-job-prompt" value={prompt} maxLength={2000} disabled={buying || !activeService.available} onChange={(event) => setPrompt(event.target.value)} placeholder={activeService.id === 'chain-lens' ? 'Paste a 0x wallet address…' : activeService.id === 'page-reader' ? 'Paste one public HTTPS page URL…' : 'Describe a focused task for this service…'} />
          <div className="am-checkout-footer"><div>{activeService.available ? <><strong>{activeService.priceUsd} USDG / CALL</strong><span>Fixed price for this bounded job. Wallet approval and network gas may be required.</span></> : <strong>{serviceStatus(activeService)}</strong>}</div>
            <button type="button" disabled={buying || !activeService.available || !prompt.trim() || !wallet.linkedWallet} onClick={() => void buy()}>{buying ? 'WORKING…' : activeService.available ? 'APPROVE PAYMENT & RUN' : 'CHECKOUT NOT OPEN'}</button></div>
          {activeService.available && !wallet.linkedWallet && <p className="am-checkout-hint">Connect your wallet in <Link href={profile}>your profile <ArrowUpRight /></Link> to use this service.</p>}
          {stage && <p className="am-success" aria-live="polite">{stage}</p>}{checkoutError && <p className="am-error" role="alert">{checkoutError}</p>}
          {receipt && <div className="am-receipt"><small>DELIVERED / {receipt.replayed ? 'SAVED RECEIPT' : 'PAID ONCHAIN'}</small><pre>{receipt.output}</pre><div className="am-receipt-actions"><a href={`${activeRobinhoodChain.explorerUrl}/tx/${receipt.payment.transaction}`} target="_blank" rel="noopener noreferrer">VIEW PAYMENT {receipt.payment.transaction.slice(0, 10)}… <ArrowUpRight /></a>{market?.agentExists && wallet.address && <Link href={`/yard/${wallet.address}?marketTx=${receipt.payment.transaction}`}>DISCUSS WITH MY AGENT <ArrowUpRight /></Link>}</div></div>}
        </div>}
        <div className="am-provider-grid">{providerGroups.map(({ provider, services: options }) => <article className="am-provider" key={provider}>
          <div className="am-provider-head"><div className="am-provider-icon">{providerNames[provider]?.slice(0, 1) || '?'}</div><div><small>{options[0].category}</small><h3>{providerNames[provider] || provider}</h3></div><span>{options.length} {options.length === 1 ? 'service' : 'services'}</span></div>
          <div className="am-provider-list">{options.map((item) => <button type="button" key={item.id} className="am-provider-option" onClick={() => choose(item)}>
            <span><strong>{item.name}</strong><small>{item.description}</small><em className={`am-status am-status-${item.status}`}>{serviceStatus(item)}</em></span><ChevronRight aria-hidden="true" /></button>)}</div>
        </article>)}</div>
        {market && !shown.length && <p className="am-note">No services match that search. Try another category or keyword.</p>}
        <div className="am-market-explain"><Bot /><div><strong>EXTERNAL AGENTS CAN DISCOVER THE MARKET</strong><p>Connect an MCP client to our public service board. It can search tools and read exact routes for configured services. To buy work, the agent calls that service&apos;s x402 endpoint using its own approved payment wallet. Connecting a profile agent never gives it permission to spend yours.</p><div className="am-mcp-connect"><code>{mcpUrl || '/mcp'}</code><button type="button" disabled={!mcpUrl} onClick={() => void navigator.clipboard.writeText(mcpUrl).then(() => setMcpCopied(true))}>{mcpCopied ? 'COPIED' : 'COPY MCP URL'}</button></div></div></div>
      </section>

      <section className="am-skills-section" aria-labelledby="am-skills-title"><header className="am-section-head"><div><small>02 / YOUR AGENT</small><h2 id="am-skills-title">SET ITS STYLE.</h2></div><span>{market?.holder ? 'ALL SKILLS UNLOCKED' : `${selected.length} / ${BASIC_SLOT_LIMIT} EQUIPPED`}</span></header>
        <p className="am-section-intro">These skills shape how your own agent talks in your yard. They are separate from paid models and tools above.</p>
        {!wallet.address && <div className="am-callout"><Bot /><span>Join LANDVILLE to create an agent and choose its skills.</span><Link href={profile}>JOIN THE CITY <ArrowUpRight /></Link></div>}
        {wallet.address && market && !market.agentExists && <div className="am-callout"><Bot /><span>Create your agent first, then choose its skills.</span><Link href={profile}>CREATE MY AGENT <ArrowUpRight /></Link></div>}
        {market?.agentExists && !market.holderCheckAvailable && <p className="am-note">SCRAPY balance check is unavailable. Basic skills still work; holder access updates after the chain check succeeds.</p>}
        {error && market && <p className="am-error" role="alert">{error}</p>}{notice && <p className="am-success" aria-live="polite">{notice}</p>}
        <div className="am-skills">{AGENT_SKILLS.map((skill) => { const equipped = Boolean(market?.holder || selected.includes(skill.id)); return <button type="button" className={`am-skill ${equipped ? 'equipped' : ''}`} key={skill.id} onClick={() => toggle(skill.id)} disabled={!market?.agentExists || market.holder} aria-pressed={equipped}>
          <span className="am-skill-top"><small>{skill.category}</small>{equipped ? <Check /> : <Sparkles />}</span><strong>{skill.name}</strong><span className="am-skill-desc">{skill.description}</span><span className="am-skill-foot">{equipped ? 'EQUIPPED' : 'EQUIP SKILL'} <ArrowUpRight /></span></button>; })}</div>
        {market?.agentExists && !market.holder && <div className="am-save"><p>Three free chat skill slots. Skills never trigger paid calls by themselves.</p><button type="button" onClick={() => void save()} disabled={!changed || saving}>{saving ? 'SAVING…' : 'SAVE SKILLS'} <ArrowUpRight /></button></div>}
        {market?.holder && <p className="am-note"><Check /> Your linked wallet holds at least 1M SCRAPY. All chat skills are active; eligible advanced services still need payment per call.</p>}
        <div className="am-holder-note"><ShieldCheck /><p><strong>1M SCRAPY holder benefit:</strong> every chat skill and access to advanced model listings. This does not include free provider usage or automatic spending.</p><Link href="/docs/scrapy-token">TOKEN DETAILS <ArrowUpRight /></Link></div>
      </section>

      <section className="am-directory" aria-labelledby="am-directory-title"><header className="am-section-head"><div><small>03 / CITIZEN NETWORK</small><h2 id="am-directory-title">AGENTS IN TOWN.</h2></div><Link href={profile}>CONNECT YOUR AGENT <ArrowUpRight /></Link></header>
        {directoryError ? <p className="am-note">{directoryError}</p> : agents.length ? <div className="am-directory-grid">{agents.map((agent) => <article key={agent.id}><div><Bot aria-hidden="true" /><small>CONNECTED AGENT</small></div><h3>{agent.name}</h3><p>{agent.description}</p><div className="am-directory-tags">{agent.capabilities.map((capability) => <span key={capability}>{capability}</span>)}</div><Link href={`/citizens/${agent.ownerWallet}`}>CITIZEN {shortWallet(agent.ownerWallet)} <ArrowUpRight /></Link></article>)}</div> : <div className="am-empty-network"><RadioTower /><p>Connect an external agent to your profile to make it discoverable in town.</p><Link href={profile}>CONNECT AN AGENT <ArrowUpRight /></Link></div>}
        <p className="am-model-note">Connected agents verify profile-key ownership. Their capabilities are self-declared; citizen-to-citizen selling is not open yet.</p>
      </section>

      <MarketStallWorkshop services={services} agentExists={Boolean(market?.agentExists)} holder={Boolean(market?.holder)} />

      {wallet.address && <section className="am-history" aria-labelledby="am-history-title"><header className="am-section-head"><div><small>05 / YOUR WORK</small><h2 id="am-history-title">RECEIPTS.</h2></div><span>LAST 20 SETTLED JOBS</span></header>{orders.length ? <div className="am-history-list">{orders.map((order) => <details key={order.transaction || order.createdAt}><summary><strong>{services.find((item) => item.id === order.serviceId)?.name || order.serviceId}</strong><span>{new Date(order.createdAt).toLocaleDateString()}</span><span>VIEW RESULT + RECEIPT</span></summary><pre>{order.output}</pre>{order.transaction && <div className="am-history-actions"><a href={`${activeRobinhoodChain.explorerUrl}/tx/${order.transaction}`} target="_blank" rel="noopener noreferrer">ONCHAIN PAYMENT <ArrowUpRight /></a>{market?.agentExists && <Link href={`/yard/${wallet.address}?marketTx=${order.transaction}`}>DISCUSS WITH MY AGENT <ArrowUpRight /></Link>}</div>}</details>)}</div> : <p className="am-note">Your completed paid jobs will appear here.</p>}</section>}

      <div className="am-footer"><ShoppingBag /><span>LANDVILLE operates listed services. Citizen payouts and autonomous agent purchases will open after payment and budget controls are ready.</span><Link href="/world">BACK TO WORLD <ArrowUpRight /></Link></div>
    </main>
  </ProductShell>;
}
