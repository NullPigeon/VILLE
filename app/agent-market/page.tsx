'use client';

import Link from 'next/link';
import { ArrowRight, ArrowUpRight, Bot, Check, ChevronRight, CircleDollarSign, RadioTower, Search, ShieldCheck, ShoppingBag, Sparkles, Wallet, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { ProductShell } from '@/components/landville/product-shell';
import { ScrapyBot } from '@/components/landville/scrapy-bot';
import { MarketStallWorkshop, type MarketStallDraft } from '@/components/landville/market-stall-workshop';
import { MarketAgentBudgets } from '@/components/landville/market-agent-budgets';
import { useWallet } from '@/components/landville/wallet-provider';
import { AGENT_SKILLS, BASIC_SLOT_LIMIT, MARKET_CURRENCY, MARKET_NETWORK, type AgentSkillId } from '@/lib/agent-market';
import { shortWallet } from '@/lib/governance';
import { buyMarketService, type MarketReceipt, type MarketRecipeTest } from '@/lib/market-checkout';
import { EXTERNAL_MARKET_SERVICES, type ExternalMarketService, type ExternalModel } from '@/lib/external-market';
import { buyExternalService, quoteExternalService, type ExternalQuote } from '@/lib/external-checkout';
import { activeRobinhoodChain } from '@/lib/robinhood-chain';
import './agent-market.css';

type Service = { id: string; name: string; category: string; provider: string; kind: string; model: string | null;
  priceUsd: string; description: string; endpoint: string; available: boolean; setupReady: boolean; holderOnly: boolean; status: 'open' | 'holder' | 'preparing' };
type MarketState = { selected: AgentSkillId[]; holder: boolean; holderCheckAvailable: boolean; agentExists: boolean; paidServices: Service[] };
type CitizenAgent = { id: string; ownerWallet: string; name: string; description: string; capabilities: string[]; connectedAt: string };
type MarketOrder = { serviceId: string; output: string | null; transaction: string | null; createdAt: string };
type CitizenStall = { id: string; seller: string; title: string; description: string; baseName: string;
  category: string; priceUsd: string; endpoint: string };

const categoryOrder = ['All', 'AI Models', 'Search', 'Web & Scraping', 'Research', 'Market Data', 'Blockchain', 'City'];
const providerNames: Record<string, string> = {
  landville: 'LANDVILLE', openai: 'OpenAI', anthropic: 'Anthropic', google: 'Google Gemini',
  xai: 'xAI', groq: 'Groq', deepseek: 'DeepSeek', mistral: 'Mistral', brave: 'Brave Search', firecrawl: 'Firecrawl', robinhood: 'Robinhood Chain',
};

function serviceStatus(service: Service) {
  if (service.status === 'open') return 'Ready to run';
  if (service.status === 'holder') return 'Hold 1M SCRAPY to run';
  return 'Checkout not live yet';
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
  const [testDraft, setTestDraft] = useState<MarketRecipeTest | null>(null);
  const [prompt, setPrompt] = useState('');
  const [stage, setStage] = useState('');
  const [checkoutError, setCheckoutError] = useState('');
  const [receipt, setReceipt] = useState<MarketReceipt | null>(null);
  const [buying, setBuying] = useState(false);
  const [merchantCategory, setMerchantCategory] = useState('All');
  const [merchantId, setMerchantId] = useState('');
  const [merchantInput, setMerchantInput] = useState('');
  const [merchantModelId, setMerchantModelId] = useState('');
  const [merchantModelSearch, setMerchantModelSearch] = useState('');
  const [merchantModels, setMerchantModels] = useState<ExternalModel[]>([]);
  const [merchantModelsError, setMerchantModelsError] = useState('');
  const [merchantQuote, setMerchantQuote] = useState<ExternalQuote | null>(null);
  const [merchantReceipt, setMerchantReceipt] = useState<MarketReceipt | null>(null);
  const [merchantError, setMerchantError] = useState('');
  const [merchantStage, setMerchantStage] = useState('');
  const [merchantBusy, setMerchantBusy] = useState(false);
  const [citizenStalls, setCitizenStalls] = useState<CitizenStall[]>([]);
  const [stallRevision, setStallRevision] = useState(0);
  const [stallId, setStallId] = useState('');
  const [stallPrompt, setStallPrompt] = useState('');
  const [stallBusy, setStallBusy] = useState(false);
  const [stallStage, setStallStage] = useState('');
  const [stallError, setStallError] = useState('');
  const [stallReceipt, setStallReceipt] = useState<MarketReceipt | null>(null);
  const [orders, setOrders] = useState<MarketOrder[]>([]);
  const [mcpUrl, setMcpUrl] = useState('');
  const [mcpCopied, setMcpCopied] = useState(false);
  const prefilled = useRef(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setMcpUrl(`${window.location.origin}/mcp`), 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (merchantId !== 'model-network' && merchantId !== 'metered-models') return;
    let active = true;
    fetch(`/api/agent-market/external?models=${merchantId}`, { cache: 'no-store' }).then(async (response) => {
      const result = await response.json() as { models?: ExternalModel[]; error?: string };
      if (!response.ok) throw new Error(result.error || 'Model catalog unavailable.');
      if (active) { setMerchantModels(result.models || []); setMerchantModelsError(''); }
    }).catch((cause) => { if (active) setMerchantModelsError(cause instanceof Error ? cause.message : 'Model catalog unavailable.'); });
    return () => { active = false; };
  }, [merchantId]);

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
    let active = true;
    fetch('/api/agent-market/stalls?public=1', { cache: 'no-store' }).then(async (response) => {
      if (!response.ok) return;
      const result = await response.json() as { stalls?: CitizenStall[] };
      if (active) setCitizenStalls(result.stalls || []);
    }).catch(() => undefined);
    return () => { active = false; };
  }, [stallRevision]);

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
  const holderCount = services.filter((item) => item.holderOnly).length;
  const merchant = EXTERNAL_MARKET_SERVICES.find((item) => item.id === merchantId);
  const activeStall = citizenStalls.find((item) => item.id === stallId);
  const merchantCategories = ['All', ...Array.from(new Set(EXTERNAL_MARKET_SERVICES.map((item) => item.category)))];
  const shownMerchants = EXTERNAL_MARKET_SERVICES.filter((item) => merchantCategory === 'All' || item.category === merchantCategory);
  const shownMerchantModels = merchantModels.filter((item) => `${item.name} ${item.id}`.toLowerCase().includes(merchantModelSearch.toLowerCase().trim())).slice(0, 100);

  function chooseMerchant(service: ExternalMarketService) {
    setMerchantId(service.id); setMerchantInput(''); setMerchantModelId(''); setMerchantModelSearch(''); setMerchantModels([]); setMerchantModelsError('');
    setMerchantQuote(null); setMerchantReceipt(null); setMerchantError(''); setMerchantStage('');
    window.setTimeout(() => document.getElementById('merchant-checkout')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0);
  }

  async function getMerchantQuote() {
    if (!merchant || merchantBusy) return;
    setMerchantBusy(true); setMerchantError(''); setMerchantReceipt(null); setMerchantStage('Asking the merchant for its current price…');
    try { setMerchantQuote(await quoteExternalService(merchant, merchantInput, merchantModelId)); setMerchantStage('Price ready. Review it before signing.'); }
    catch (cause) { setMerchantQuote(null); setMerchantStage(''); setMerchantError(cause instanceof Error ? cause.message : 'Merchant quote unavailable.'); }
    finally { setMerchantBusy(false); }
  }

  async function payMerchant() {
    if (!merchant || !merchantQuote || merchantBusy) return;
    setMerchantBusy(true); setMerchantError(''); setMerchantReceipt(null);
    try {
      setMerchantReceipt(await buyExternalService(merchant, merchantQuote, wallet, setMerchantStage));
      setMerchantStage('Delivered. Merchant payment settled onchain.');
      const response = await fetch('/api/agent-market/orders', { cache: 'no-store' });
      if (response.ok) setOrders((await response.json() as { orders?: MarketOrder[] }).orders || []);
    } catch (cause) { setMerchantStage(''); setMerchantError(cause instanceof Error ? cause.message : 'Merchant call failed. Check your wallet before retrying.'); }
    finally { setMerchantBusy(false); }
  }

  async function buyCitizenStall() {
    if (!activeStall || stallBusy) return;
    setStallBusy(true); setStallError(''); setStallReceipt(null);
    try {
      setStallReceipt(await buyMarketService({ id: activeStall.id, name: activeStall.title,
        endpoint: activeStall.endpoint, priceUsd: activeStall.priceUsd }, stallPrompt, wallet, setStallStage));
      setStallStage('Delivered. The seller earned their share.');
      const response = await fetch('/api/agent-market/orders', { cache: 'no-store' });
      if (response.ok) setOrders((await response.json() as { orders?: MarketOrder[] }).orders || []);
    } catch (cause) { setStallStage(''); setStallError(cause instanceof Error ? cause.message : 'Citizen service did not complete.'); }
    finally { setStallBusy(false); }
  }

  function choose(service: Service) {
    setCheckoutId(service.id); setTestDraft(null); setPrompt(''); setCheckoutError(''); setStage(''); setReceipt(null);
    window.setTimeout(() => document.getElementById('market-checkout')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0);
  }

  function testRecipe(draft: MarketStallDraft) {
    setCheckoutId(draft.baseServiceId); setTestDraft({ id: draft.id, title: draft.title, updatedAt: draft.updatedAt });
    setPrompt(''); setCheckoutError(''); setStage(''); setReceipt(null);
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
      setReceipt(await buyMarketService(activeService, prompt, wallet, setStage, testDraft || undefined));
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
          <p>Find a model or tool, describe the job, and get the result here. Pay per use: one price for each run, with no subscription.</p>
          <div className="am-hero-actions"><a href="#services">EXPLORE SERVICES <ArrowRight /></a><Link href={profile}>MY AGENT <ArrowUpRight /></Link></div>
          <div className="am-hero-tags"><span><Wallet /> {MARKET_NETWORK}</span><span><CircleDollarSign /> {MARKET_CURRENCY} · {openCount ? `${openCount} AVAILABLE` : 'PAYMENTS IN SETUP'}</span><span>PAY PER USE · NO PLAN</span></div>
        </div><div className="am-hero-art"><span>SCRAPY&apos;S SERVICE BOARD</span><ScrapyBot portrait /><b>WHAT&apos;S THE JOB?</b></div>
      </section>

      <section className="am-guide" aria-label="How to use the market">
        <div><b>01</b><span><strong>Choose a service</strong><small>Models, search, research and chain data.</small></span></div>
        <div><b>02</b><span><strong>Describe one task</strong><small>Ask for a report, answer or lookup.</small></span></div>
        <div><b>03</b><span><strong>Pay for this run</strong><small>See the price before signing. No subscription.</small></span></div>
      </section>

      <section className="am-services" id="services" aria-labelledby="am-services-title">
        <header className="am-section-head"><div><small>01 / MARKETPLACE</small><h2 id="am-services-title">FIND YOUR TOOL.</h2></div><span>{services.length} SERVICE OPTIONS · {openCount} READY</span></header>
        <p className="am-section-intro">Pay only when you run a job. The listed LANDVILLE price covers one bounded run, not unlimited model access or a subscription. Your wallet sees the amount before approval.</p>
        <div className="am-access-key" aria-label="Market access rules">
          <span><b>OPEN TO ALL</b> {services.length - holderCount} tools need no SCRAPY balance</span>
          <span><b>1M+ SCRAPY</b> {holderCount} advanced models need a verified linked wallet</span>
          <small>Both groups pay per run. A token balance unlocks access; it does not pay for the model.</small>
        </div>
        {market && !market.holderCheckAvailable && <p className="am-note">SCRAPY balance verification is temporarily unavailable. Holder-only checkout will open after the chain check succeeds.</p>}
        <div className="am-service-controls"><fieldset className="am-service-tabs" aria-label="Service category">{categories.map((item) => <button key={item} type="button" aria-pressed={category === item} onClick={() => setCategory(item)}>{item}</button>)}</fieldset>
          <label className="am-search"><Search aria-hidden="true" /><input aria-label="Search services" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search models or tools" /></label></div>
        {!market && !error && <p className="am-note">Loading the service board…</p>}
        {error && !market && <p className="am-error" role="alert">{error}</p>}
        {activeService && <div className="am-checkout" id="market-checkout"><div className="am-checkout-head"><div><small>{providerNames[activeService.provider] || activeService.provider} / {activeService.category}</small><h3>{testDraft ? `TEST ${testDraft.title}` : activeService.name}</h3></div><button type="button" aria-label="Close service" onClick={() => { setCheckoutId(''); setTestDraft(null); }}><X /></button></div>
          <p>{activeService.description}</p>
          {testDraft && <div className="am-recipe-test-note"><Bot /> Your saved recipe guides this private test. Write a customer job below. Nothing is published for sale.</div>}
          <div className="am-checkout-access"><span className={activeService.holderOnly ? 'am-access-pill am-access-pill-holder' : 'am-access-pill'}>{activeService.holderOnly ? '1M+ SCRAPY TO USE' : 'OPEN TO ALL'}</span><span>PAY PER RUN · NO SUBSCRIPTION</span></div>
          {!activeService.setupReady && <div className="am-setup-message"><ShieldCheck /> Checkout is not live yet. LANDVILLE must connect this provider and the payment system.</div>}
          {activeService.holderOnly && !market?.holder && <div className="am-setup-message"><ShieldCheck /> Your linked wallet needs at least 1M verified SCRAPY to run this model.</div>}
          <label htmlFor="am-job-prompt">{testDraft ? 'GIVE YOUR RECIPE A TEST JOB' : 'WHAT DO YOU WANT DONE?'}</label>
          <textarea id="am-job-prompt" value={prompt} maxLength={testDraft ? 600 : 2000} disabled={buying || !activeService.available} onChange={(event) => setPrompt(event.target.value)} placeholder={testDraft ? 'For example: Turn this rough idea into a one-page pitch for new citizens…' : activeService.id === 'chain-lens' ? 'Paste a 0x wallet address…' : activeService.id === 'page-reader' ? 'Paste one public HTTPS page URL…' : 'Describe a focused task for this service…'} />
          <div className="am-checkout-footer"><div><strong>{activeService.priceUsd} USDG / RUN</strong><span>{activeService.setupReady ? 'Fixed price for this bounded job. You pay only when you approve a run; network gas may apply.' : 'Listed price for one bounded job. Payment opens after setup.'}</span>{!activeService.available && <em className={`am-status am-status-${activeService.status}`}>{serviceStatus(activeService)}</em>}</div>
            <button type="button" disabled={buying || !activeService.available || !prompt.trim() || !wallet.linkedWallet} onClick={() => void buy()}>{buying ? 'WORKING…' : activeService.available ? 'APPROVE PAYMENT & RUN' : 'CHECKOUT NOT OPEN'}</button></div>
          {activeService.available && !wallet.linkedWallet && <p className="am-checkout-hint">Connect your wallet in <Link href={profile}>your profile <ArrowUpRight /></Link> to use this service.</p>}
          {stage && <p className="am-success" aria-live="polite">{stage}</p>}{checkoutError && <p className="am-error" role="alert">{checkoutError}</p>}
          {receipt && <div className="am-receipt"><small>DELIVERED / {receipt.replayed ? 'SAVED RECEIPT' : 'PAID ONCHAIN'}</small><pre>{receipt.output}</pre><div className="am-receipt-actions"><a href={`${activeRobinhoodChain.explorerUrl}/tx/${receipt.payment.transaction}`} target="_blank" rel="noopener noreferrer">VIEW PAYMENT {receipt.payment.transaction.slice(0, 10)}… <ArrowUpRight /></a>{market?.agentExists && wallet.address && <Link href={`/yard/${wallet.address}?marketTx=${receipt.payment.transaction}`}>DISCUSS WITH MY AGENT <ArrowUpRight /></Link>}</div></div>}
        </div>}
        <div className="am-provider-grid">{providerGroups.map(({ provider, services: options }) => <article className="am-provider" key={provider}>
          <div className="am-provider-head"><div className="am-provider-icon">{providerNames[provider]?.slice(0, 1) || '?'}</div><div><small>{options[0].category}</small><h3>{providerNames[provider] || provider}</h3></div><span>{options.length} {options.length === 1 ? 'service' : 'services'}</span></div>
          <div className="am-provider-list">{options.map((item) => <button type="button" key={item.id} className="am-provider-option" onClick={() => choose(item)} aria-label={`${item.name}. ${item.holderOnly ? 'Requires 1 million SCRAPY' : 'Open to all'}. ${item.priceUsd} USDG per run. ${item.setupReady ? 'Checkout ready' : 'Checkout not live yet'}.`}>
            <span className="am-option-copy"><span className="am-option-title"><strong>{item.name}</strong><span className={item.holderOnly ? 'am-access-pill am-access-pill-holder' : 'am-access-pill'}>{item.holderOnly ? '1M+ SCRAPY' : 'OPEN TO ALL'}</span></span><small>{item.description}</small><span className="am-option-foot"><em className={`am-status am-status-${item.status}`}>{serviceStatus(item)}</em><span className="am-option-price">{item.priceUsd} USDG <small>/ RUN</small></span></span></span><ChevronRight aria-hidden="true" /></button>)}</div>
        </article>)}</div>
        {market && !shown.length && <p className="am-note">No services match that search. Try another category or keyword.</p>}
        <div className="am-market-explain"><Bot /><div><strong>EXTERNAL AGENTS CAN DISCOVER THE MARKET</strong><p>Connect an MCP client to search tools and read routes. For paid work it calls the x402 endpoint with its own payment wallet. A connected agent of a verified SCRAPY holder can use holder listings with its profile key, but that key never spends the owner&apos;s wallet.</p><div className="am-mcp-connect"><code>{mcpUrl || '/mcp'}</code><button type="button" disabled={!mcpUrl} onClick={() => void navigator.clipboard.writeText(mcpUrl).then(() => setMcpCopied(true))}>{mcpCopied ? 'COPIED' : 'COPY MCP URL'}</button></div></div></div>
      </section>

      <section className="am-merchants" aria-labelledby="am-merchants-title">
        <header className="am-section-head"><div><small>02 / DIRECT X402 MERCHANTS</small><h2 id="am-merchants-title">OUTSIDE THE CITY. ON YOUR TEAM.</h2></div><span>{EXTERNAL_MARKET_SERVICES.length} CURATED TOOLS</span></header>
        <p className="am-section-intro">Open to all. Choose a model or tool, see its live price, then pay the outside seller in USDG. One call at a time. No subscription. Availability can change.</p>
        <fieldset className="am-service-tabs am-merchant-tabs" aria-label="Merchant category">{merchantCategories.map((item) => <button type="button" key={item} aria-pressed={merchantCategory === item} onClick={() => setMerchantCategory(item)}>{item}</button>)}</fieldset>
        {merchant && <div className="am-checkout am-merchant-checkout" id="merchant-checkout"><div className="am-checkout-head"><div><small>{merchant.provider === 'relay' ? 'MODEL NETWORK' : merchant.provider.toUpperCase()} / {merchant.category}</small><h3>{merchant.name}</h3></div><button type="button" aria-label="Close merchant" onClick={() => setMerchantId('')}><X /></button></div>
          <p>{merchant.description}</p>
          {merchant.modelPicker && <div className="am-merchant-models"><label htmlFor="am-model-search">1 / FIND A MODEL</label>
            <input id="am-model-search" className="am-merchant-input" value={merchantModelSearch} onChange={(event) => setMerchantModelSearch(event.target.value)} placeholder="Search OpenAI, Claude, Gemini, DeepSeek…" />
            <select aria-label="Choose a model" className="am-merchant-input" value={merchantModelId} disabled={!merchantModels.length || merchantBusy} onChange={(event) => { setMerchantModelId(event.target.value); setMerchantQuote(null); setMerchantReceipt(null); }}>
              <option value="">Choose a model</option>{merchantModelId && !shownMerchantModels.some((item) => item.id === merchantModelId) && <option value={merchantModelId}>{merchantModelId}</option>}
              {shownMerchantModels.map((item) => <option value={item.id} key={item.id}>{item.name} · {item.provider}</option>)}
            </select>
            <small>{merchantModelsError || (merchantModels.length ? `${merchantModels.length} models in the live catalog. Availability is confirmed when you check the price.` : 'Loading model catalog…')}</small>
          </div>}
          {merchant.input !== 'none' && <><label htmlFor="am-merchant-input">{merchant.input === 'prompt' ? 'WHAT SHOULD THE MODEL DO?' : merchant.input === 'query' ? 'WHAT SHOULD WE SEARCH FOR?' : merchant.input === 'url' ? 'PAGE URL' : merchant.input === 'symbol' ? 'STOCK SYMBOL' : 'PUBLIC WALLET ADDRESS'}</label>
            {merchant.input === 'prompt' ? <textarea id="am-merchant-input" value={merchantInput} maxLength={merchant.modelPicker ? 4000 : 1000} disabled={merchantBusy} onChange={(event) => { setMerchantInput(event.target.value); setMerchantQuote(null); setMerchantReceipt(null); }} placeholder={merchant.placeholder} /> : <input id="am-merchant-input" className="am-merchant-input" value={merchantInput} maxLength={1000} disabled={merchantBusy} onChange={(event) => { setMerchantInput(event.target.value); setMerchantQuote(null); setMerchantReceipt(null); }} placeholder={merchant.placeholder} />}</>}
          <div className="am-checkout-footer"><div>{merchantQuote ? <><strong>{merchantQuote.amountUsd} USDG / CALL</strong><span>Paid to the outside service operator at the quoted address. No LANDVILLE fee. Wallet gas or token approval may apply.</span></> : <><strong>LIVE PRICE BEFORE PAYMENT</strong><span>Checkout opens only when the seller quotes USDG on Robinhood Chain. Model calls have an output limit of 2,000 tokens.</span></>}</div>
            {merchantQuote ? <button type="button" disabled={merchantBusy || !wallet.linkedWallet} onClick={() => void payMerchant()}>{merchantBusy ? 'WORKING…' : 'APPROVE & RUN'}</button> : <button type="button" disabled={merchantBusy || (merchant.input !== 'none' && !merchantInput.trim()) || (merchant.modelPicker && !merchantModelId) || !wallet.address} onClick={() => void getMerchantQuote()}>{merchantBusy ? 'CHECKING…' : 'CHECK LIVE PRICE'}</button>}</div>
          {!wallet.address && <p className="am-checkout-hint">Join LANDVILLE to request a quote.</p>}
          {wallet.address && !wallet.linkedWallet && <p className="am-checkout-hint">Link a wallet in <Link href={profile}>your profile <ArrowUpRight /></Link> to pay.</p>}
          {merchant.docs && <a className="am-merchant-docs" href={merchant.docs} target="_blank" rel="noopener noreferrer">MERCHANT DETAILS <ArrowUpRight /></a>}
          {merchantStage && <p className="am-success" aria-live="polite">{merchantStage}</p>}{merchantError && <p className="am-error" role="alert">{merchantError}</p>}
          {merchantReceipt && <div className="am-receipt"><small>DELIVERED / PAID ONCHAIN</small><pre>{merchantReceipt.output}</pre><div className="am-receipt-actions"><a href={`${activeRobinhoodChain.explorerUrl}/tx/${merchantReceipt.payment.transaction}`} target="_blank" rel="noopener noreferrer">VIEW PAYMENT <ArrowUpRight /></a>{market?.agentExists && wallet.address && <Link href={`/yard/${wallet.address}?marketTx=${merchantReceipt.payment.transaction}`}>DISCUSS WITH MY AGENT <ArrowUpRight /></Link>}</div></div>}
        </div>}
        <div className="am-merchant-grid">{shownMerchants.map((item) => <button key={item.id} type="button" className="am-merchant-card" onClick={() => chooseMerchant(item)}><span className="am-merchant-card-top"><b>{item.provider === 'relay' ? 'MODEL NETWORK' : item.provider.toUpperCase()}</b><small>{item.category}</small></span><strong>{item.name}</strong><span>{item.description}</span><span className="am-merchant-access">OPEN TO ALL · PAY MERCHANT DIRECT</span><em>CHECK LIVE PRICE <ArrowUpRight /></em></button>)}</div>
      </section>

      <section className="am-citizen-market" aria-labelledby="am-citizen-title">
        <header className="am-section-head"><div><small>03 / CITIZEN SERVICES</small><h2 id="am-citizen-title">THE CITY WORKS FOR YOU.</h2></div><span>{citizenStalls.length} LIVE STALLS</span></header>
        <p className="am-section-intro">Anyone can buy a published citizen job, even when its seller uses a holder-only foundation model. The seller must keep their SCRAPY eligibility. The price includes the foundation service and a seller markup; 90% of that markup goes to the seller and 10% to the city treasury.</p>
        {activeStall && <div className="am-checkout" id="citizen-checkout"><div className="am-checkout-head"><div><small>{activeStall.baseName} / CITIZEN {shortWallet(activeStall.seller)}</small><h3>{activeStall.title}</h3></div><button type="button" aria-label="Close citizen service" onClick={() => setStallId('')}><X /></button></div><p>{activeStall.description}</p>
          <label htmlFor="am-stall-job">WHAT JOB SHOULD THIS AGENT DO?</label><textarea id="am-stall-job" value={stallPrompt} maxLength={2000} disabled={stallBusy} onChange={(event) => setStallPrompt(event.target.value)} placeholder="Describe the result you want…" />
          <div className="am-checkout-footer"><div><strong>{activeStall.priceUsd} USDG / CALL</strong><span>One bounded job. You review the wallet signature before paying.</span></div><button type="button" disabled={stallBusy || !stallPrompt.trim() || !wallet.linkedWallet || activeStall.seller === wallet.address} onClick={() => void buyCitizenStall()}>{stallBusy ? 'WORKING…' : 'APPROVE & RUN'}</button></div>
          {activeStall.seller === wallet.address && <p className="am-note">Your own stall is available to other citizens. Use its private test to try it yourself.</p>}
          {stallStage && <p className="am-success" aria-live="polite">{stallStage}</p>}{stallError && <p className="am-error" role="alert">{stallError}</p>}
          {stallReceipt && <div className="am-receipt"><small>DELIVERED / PAID ONCHAIN</small><pre>{stallReceipt.output}</pre><div className="am-receipt-actions"><a href={`${activeRobinhoodChain.explorerUrl}/tx/${stallReceipt.payment.transaction}`} target="_blank" rel="noopener noreferrer">VIEW PAYMENT <ArrowUpRight /></a>{market?.agentExists && wallet.address && <Link href={`/yard/${wallet.address}?marketTx=${stallReceipt.payment.transaction}`}>DISCUSS WITH MY AGENT <ArrowUpRight /></Link>}</div></div>}
        </div>}
        {citizenStalls.length ? <div className="am-citizen-grid">{citizenStalls.map((stall) => <button type="button" key={stall.id} onClick={() => { setStallId(stall.id); setStallPrompt(''); setStallStage(''); setStallError(''); setStallReceipt(null); window.setTimeout(() => document.getElementById('citizen-checkout')?.scrollIntoView({ behavior: 'smooth' }), 0); }}><small>{stall.category} · CITIZEN {shortWallet(stall.seller)}</small><strong>{stall.title}</strong><span>{stall.description}</span><span className="am-access-pill">OPEN TO ALL</span><em>{stall.priceUsd} USDG / JOB <ArrowUpRight /></em></button>)}</div> : <div className="am-empty-network"><Bot /><p>The first citizen stalls will appear here after sellers publish their tested services and city payouts open.</p></div>}
      </section>

      <section className="am-skills-section" aria-labelledby="am-skills-title"><header className="am-section-head"><div><small>04 / YOUR AGENT</small><h2 id="am-skills-title">SET ITS STYLE.</h2></div><span>{market?.agentExists ? market.holder ? 'ALL SKILLS UNLOCKED' : `${selected.length} / ${BASIC_SLOT_LIMIT} EQUIPPED` : 'CREATE AN AGENT TO EQUIP SKILLS'}</span></header>
        <p className="am-section-intro">These skills shape how your own agent talks in your yard. They are separate from paid models and tools above.</p>
        {!wallet.address && <div className="am-callout"><Bot /><span>Join LANDVILLE to create an agent and choose its skills.</span><Link href={profile}>JOIN THE CITY <ArrowUpRight /></Link></div>}
        {wallet.address && market && !market.agentExists && <div className="am-callout"><Bot /><span>Create your agent first, then choose its skills.</span><Link href={profile}>CREATE MY AGENT <ArrowUpRight /></Link></div>}
        {market?.agentExists && !market.holderCheckAvailable && <p className="am-note">SCRAPY balance check is unavailable. Basic skills still work; holder access updates after the chain check succeeds.</p>}
        {error && market && <p className="am-error" role="alert">{error}</p>}{notice && <p className="am-success" aria-live="polite">{notice}</p>}
        <div className="am-skills">{AGENT_SKILLS.map((skill) => { const equipped = Boolean(market?.agentExists && (market.holder || selected.includes(skill.id))); return <button type="button" className={`am-skill ${equipped ? 'equipped' : ''}`} key={skill.id} onClick={() => toggle(skill.id)} disabled={!market?.agentExists || market.holder} aria-pressed={equipped}>
          <span className="am-skill-top"><small>{skill.category}</small>{equipped ? <Check /> : <Sparkles />}</span><strong>{skill.name}</strong><span className="am-skill-desc">{skill.description}</span><span className="am-skill-foot">{equipped ? 'EQUIPPED' : 'EQUIP SKILL'} <ArrowUpRight /></span></button>; })}</div>
        {market?.agentExists && !market.holder && <div className="am-save"><p>Three free chat skill slots. Skills never trigger paid calls by themselves.</p><button type="button" onClick={() => void save()} disabled={!changed || saving}>{saving ? 'SAVING…' : 'SAVE SKILLS'} <ArrowUpRight /></button></div>}
        {market?.agentExists && market.holder && <p className="am-note"><Check /> Your linked wallet holds at least 1M SCRAPY. All chat skills are active; eligible advanced services still need payment per call.</p>}
        <div className="am-holder-note"><ShieldCheck /><p><strong>1M SCRAPY holder benefit:</strong> every chat skill and access to advanced model listings. This does not include free provider usage or automatic spending.</p><Link href="/docs/scrapy-token">TOKEN DETAILS <ArrowUpRight /></Link></div>
      </section>

      <section className="am-directory" aria-labelledby="am-directory-title"><header className="am-section-head"><div><small>05 / CITIZEN NETWORK</small><h2 id="am-directory-title">AGENTS IN TOWN.</h2></div><Link href={profile}>CONNECT YOUR AGENT <ArrowUpRight /></Link></header>
        {directoryError ? <p className="am-note">{directoryError}</p> : agents.length ? <div className="am-directory-grid">{agents.map((agent) => <article key={agent.id}><div><Bot aria-hidden="true" /><small>CONNECTED AGENT</small></div><h3>{agent.name}</h3><p>{agent.description}</p><div className="am-directory-tags">{agent.capabilities.map((capability) => <span key={capability}>{capability}</span>)}</div><Link href={`/citizens/${agent.ownerWallet}`}>CITIZEN {shortWallet(agent.ownerWallet)} <ArrowUpRight /></Link></article>)}</div> : <div className="am-empty-network"><RadioTower /><p>Connect an external agent to your profile to make it discoverable in town.</p><Link href={profile}>CONNECT AN AGENT <ArrowUpRight /></Link></div>}
        <p className="am-model-note">Connected agents verify profile-key ownership. Their capabilities are self-declared; citizen-to-citizen selling is not open yet.</p>
      </section>

      <MarketStallWorkshop services={services} agentExists={Boolean(market?.agentExists)} holder={Boolean(market?.holder)} onTest={testRecipe} onPublishChange={() => setStallRevision((value) => value + 1)} />
      <MarketAgentBudgets signedIn={Boolean(wallet.address)} />

      {wallet.address && <section className="am-history" aria-labelledby="am-history-title"><header className="am-section-head"><div><small>08 / YOUR WORK</small><h2 id="am-history-title">RECEIPTS.</h2></div><span>LAST 20 SETTLED JOBS</span></header>{orders.length ? <div className="am-history-list">{orders.map((order) => <details key={order.transaction || order.createdAt}><summary><strong>{services.find((item) => item.id === order.serviceId)?.name || EXTERNAL_MARKET_SERVICES.find((item) => `external:${item.id}` === order.serviceId)?.name || citizenStalls.find((item) => `stall:${item.id}` === order.serviceId)?.title || order.serviceId}</strong><span>{new Date(order.createdAt).toLocaleDateString()}</span><span>VIEW RESULT + RECEIPT</span></summary><pre>{order.output}</pre>{order.transaction && <div className="am-history-actions"><a href={`${activeRobinhoodChain.explorerUrl}/tx/${order.transaction}`} target="_blank" rel="noopener noreferrer">ONCHAIN PAYMENT <ArrowUpRight /></a>{market?.agentExists && <Link href={`/yard/${wallet.address}?marketTx=${order.transaction}`}>DISCUSS WITH MY AGENT <ArrowUpRight /></Link>}</div>}</details>)}</div> : <p className="am-note">Your completed paid jobs will appear here.</p>}</section>}

      <div className="am-footer"><ShoppingBag /><span>Citizen sales and wallet payouts open when the production treasury is configured. Connected agents can buy within owner-set LANDVILLE limits using their own wallets.</span><Link href="/world">BACK TO WORLD <ArrowUpRight /></Link></div>
    </main>
  </ProductShell>;
}
