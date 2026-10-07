'use client';

import Link from 'next/link';
import { ArrowRight, ArrowUpRight, Bot, Check, CircleDollarSign, RadioTower, Search, ShieldCheck, ShoppingBag, Sparkles, Wallet, X } from 'lucide-react';
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

const providerNames: Record<string, string> = {
  landville: 'LANDVILLE', openai: 'OpenAI', anthropic: 'Anthropic', google: 'Google Gemini',
  xai: 'xAI', groq: 'Groq', deepseek: 'DeepSeek', mistral: 'Mistral', brave: 'Brave Search', firecrawl: 'Firecrawl', robinhood: 'Robinhood Chain',
};

function directAlternative(service: Service) {
  const routeId = service.kind === 'model' || service.kind === 'long-form' ? 'model-network' : ({
    'web-scout': 'agent402-search', 'news-radar': 'agent402-news',
    'page-reader': 'agent402-extract', 'research-brief': 'agent402-answer',
  } as Record<string, string>)[service.id];
  return EXTERNAL_MARKET_SERVICES.find((item) => item.id === routeId);
}

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
  const [checkoutId, setCheckoutId] = useState('');
  const [testDraft, setTestDraft] = useState<MarketRecipeTest | null>(null);
  const [prompt, setPrompt] = useState('');
  const [stage, setStage] = useState('');
  const [checkoutError, setCheckoutError] = useState('');
  const [receipt, setReceipt] = useState<MarketReceipt | null>(null);
  const [buying, setBuying] = useState(false);
  const [merchantCategory, setMerchantCategory] = useState('All');
  const [serviceAvailability, setServiceAvailability] = useState<'ready' | 'all' | 'upcoming'>('ready');
  const [merchantSearch, setMerchantSearch] = useState('');
  const [merchantId, setMerchantId] = useState('');
  const [merchantInput, setMerchantInput] = useState('');
  const [merchantModelId, setMerchantModelId] = useState('');
  const [merchantModelSearch, setMerchantModelSearch] = useState('');
  const [merchantModels, setMerchantModels] = useState<(ExternalModel & { source: 'model-network' | 'metered-models' })[]>([]);
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
    void Promise.allSettled((['model-network', 'metered-models'] as const).map(async (source) => {
      const response = await fetch(`/api/agent-market/external?models=${source}`, { cache: 'no-store' });
      const result = await response.json() as { models?: ExternalModel[]; error?: string };
      if (!response.ok) throw new Error(result.error || 'Model catalog unavailable.');
      return (result.models || []).map((model) => ({ ...model, source }));
    })).then((results) => {
      if (!active) return;
      const models = results.flatMap((result) => result.status === 'fulfilled' ? result.value : []);
      setMerchantModels(models);
      setMerchantModelsError(models.length ? '' : 'Model catalogs are temporarily unavailable.');
    });
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
    const direct = EXTERNAL_MARKET_SERVICES.find((item) => item.id === id || item.replacesCityServiceId === id);
    if (direct && direct.id !== 'model-network' && direct.id !== 'metered-models') {
      const timer = window.setTimeout(() => {
        setCheckoutId(''); setMerchantId(direct.id); setMerchantInput((query.get('prompt') || '').slice(0, 2000));
        document.getElementById('merchant-checkout')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 0);
      return () => window.clearTimeout(timer);
    }
    if (id && market.paidServices.some((item) => item.id === id)) {
      const timer = window.setTimeout(() => { setCheckoutId(id); setPrompt((query.get('prompt') || '').slice(0, 2000)); }, 0);
      return () => window.clearTimeout(timer);
    }
  }, [market]);

  const profile = wallet.address ? `/citizens/${wallet.address}` : '/citizens';
  const changed = Boolean(market) && [...selected].sort().join('|') !== [...market!.selected].sort().join('|');
  const activeService = market?.paidServices.find((item) => item.id === checkoutId);
  const services = market?.paidServices || [];
  const replacedCityIds = new Set(EXTERNAL_MARKET_SERVICES.flatMap((item) => item.replacesCityServiceId ? [item.replacesCityServiceId] : []));
  const searchTerm = merchantSearch.toLowerCase().trim();
  const shown = services.filter((item) => !replacedCityIds.has(item.id) &&
    (serviceAvailability === 'all' || (serviceAvailability === 'ready' ? item.setupReady : !item.setupReady)) &&
    (merchantCategory === 'All' || item.category === merchantCategory) &&
    `${item.name} ${item.provider} ${item.description}`.toLowerCase().includes(searchTerm));
  const merchant = EXTERNAL_MARKET_SERVICES.find((item) => item.id === merchantId);
  const activeStall = citizenStalls.find((item) => item.id === stallId);
  const merchantCategories = ['All', ...Array.from(new Set([...EXTERNAL_MARKET_SERVICES.map((item) => item.category), ...services.map((item) => item.category)]))];
  const shownMerchants = EXTERNAL_MARKET_SERVICES.filter((item) => serviceAvailability !== 'upcoming' && item.id !== 'model-network' && item.id !== 'metered-models' &&
    (merchantCategory === 'All' || item.category === merchantCategory) &&
    `${item.name} ${item.category} ${item.description}`.toLowerCase().includes(searchTerm));
  const shownMerchantModels = merchantModels.filter((item) => `${item.name} ${item.id}`.toLowerCase().includes(merchantModelSearch.toLowerCase().trim())).slice(0, 100);

  function chooseMerchant(service: ExternalMarketService) {
    setMerchantId(service.id); setMerchantInput(''); setMerchantModelId(''); setMerchantModelSearch(''); setMerchantModels([]); setMerchantModelsError('');
    setMerchantQuote(null); setMerchantReceipt(null); setMerchantError(''); setMerchantStage('');
    window.setTimeout(() => document.getElementById('merchant-checkout')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0);
  }

  function tryDirectAlternative(service: Service) {
    const alternative = directAlternative(service);
    if (!alternative) return;
    chooseMerchant(alternative);
    setMerchantInput(prompt);
    if (alternative.modelPicker) setMerchantModelSearch(service.provider === 'landville' ? '' : service.provider);
    setCheckoutId('');
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
          <div className="am-hero-tags"><span><Wallet /> {MARKET_NETWORK}</span><span><CircleDollarSign /> {MARKET_CURRENCY} · LIVE X402 QUOTES</span><span>PAY PER USE · NO PLAN</span></div>
        </div><div className="am-hero-art"><span>SCRAPY&apos;S SERVICE BOARD</span><ScrapyBot portrait /><b>WHAT&apos;S THE JOB?</b></div>
      </section>

      <section className="am-guide" aria-label="How to use the market">
        <div><b>01</b><span><strong>Choose a service</strong><small>Models, search, research and chain data.</small></span></div>
        <div><b>02</b><span><strong>Describe one task</strong><small>Ask for a report, answer or lookup.</small></span></div>
        <div><b>03</b><span><strong>Pay for this run</strong><small>See the price before signing. No subscription.</small></span></div>
      </section>

      <section className="am-merchants" id="services" aria-labelledby="am-merchants-title">
        <header className="am-section-head"><div><small>THE MARKET / PAY PER USE</small><h2 id="am-merchants-title">CITY SERVICES.</h2></div><span>{EXTERNAL_MARKET_SERVICES.length - 2 + services.filter((item) => !replacedCityIds.has(item.id)).length} TOOLS &amp; SERVICES</span></header>
        <p className="am-section-intro">Pick the model or tool you want, describe one job, and check its live USDG price. Model and web calls go through an x402 operator that covers the provider bill. LANDVILLE&apos;s composed city jobs open after their own checkout is ready.</p>
        <fieldset className="am-availability" aria-label="Service availability"><button type="button" aria-pressed={serviceAvailability === 'ready'} onClick={() => setServiceAvailability('ready')}>CHECK PRICE &amp; BUY</button><button type="button" aria-pressed={serviceAvailability === 'upcoming'} onClick={() => setServiceAvailability('upcoming')}>OPENING LATER</button><button type="button" aria-pressed={serviceAvailability === 'all'} onClick={() => setServiceAvailability('all')}>SHOW ALL</button></fieldset>
        <div className="am-service-controls"><fieldset className="am-service-tabs am-merchant-tabs" aria-label="Service category">{merchantCategories.map((item) => <button type="button" key={item} aria-pressed={merchantCategory === item} onClick={() => setMerchantCategory(item)}>{item}</button>)}</fieldset><label className="am-search"><Search aria-hidden="true" /><input aria-label="Search all city services" value={merchantSearch} onChange={(event) => setMerchantSearch(event.target.value)} placeholder="Search all services" /></label></div>
        {merchant && <div className="am-checkout am-merchant-checkout" id="merchant-checkout"><div className="am-checkout-head"><div><small>{merchant.provider === 'relay' ? 'MODEL NETWORK' : merchant.provider.toUpperCase()} / {merchant.category}</small><h3>{merchant.name}</h3></div><button type="button" aria-label="Close merchant" onClick={() => setMerchantId('')}><X /></button></div>
          <p>{merchant.description}</p>
          {merchant.fixedModelId && <p className="am-model-note">Selected model: <strong>{merchant.fixedModelId}</strong>. Price comes from the live x402 quote.</p>}
          {merchant.modelPicker && <div className="am-merchant-models"><label htmlFor="am-model-search">1 / FIND A MODEL</label>
            <input id="am-model-search" className="am-merchant-input" value={merchantModelSearch} onChange={(event) => setMerchantModelSearch(event.target.value)} placeholder="Search OpenAI, Claude, Gemini, DeepSeek…" />
            <select aria-label="Choose a model" className="am-merchant-input" value={merchantModelId ? `${merchantId}:${merchantModelId}` : ''} disabled={!merchantModels.length || merchantBusy} onChange={(event) => { const selectedModel = merchantModels.find((item) => `${item.source}:${item.id}` === event.target.value); if (!selectedModel) return; setMerchantId(selectedModel.source); setMerchantModelId(selectedModel.id); setMerchantQuote(null); setMerchantReceipt(null); }}>
              <option value="">Choose a model</option>{merchantModelId && !shownMerchantModels.some((item) => item.id === merchantModelId && item.source === merchantId) && <option value={`${merchantId}:${merchantModelId}`}>{merchantModelId}</option>}
              {shownMerchantModels.map((item) => <option value={`${item.source}:${item.id}`} key={`${item.source}:${item.id}`} disabled={item.holderOnly && !market?.holder}>{item.name} · {item.provider}{item.holderOnly ? ' · 1M+ SCRAPY' : ''} · {item.source === 'model-network' ? 'network A' : 'network B'}</option>)}
            </select>
            <small>{merchantModelsError || (merchantModels.length ? `${merchantModels.length} model routes. Advanced models need 1M+ SCRAPY; every request still needs a live USDG quote.` : 'Loading model catalog…')}</small>
          </div>}
          {merchant.input !== 'none' && <><label htmlFor="am-merchant-input">{merchant.input === 'prompt' ? 'WHAT SHOULD THE MODEL DO?' : merchant.input === 'query' ? 'TOPIC OR QUESTION' : merchant.input === 'url' ? 'PUBLIC PAGE URL' : merchant.input === 'symbol' ? 'STOCK SYMBOL' : merchant.input === 'domain' ? 'PUBLIC DOMAIN' : 'PUBLIC WALLET ADDRESS'}</label>
            {merchant.input === 'prompt' ? <textarea id="am-merchant-input" value={merchantInput} maxLength={merchant.modelPicker || merchant.fixedModelId ? 4000 : 1000} disabled={merchantBusy} onChange={(event) => { setMerchantInput(event.target.value); setMerchantQuote(null); setMerchantReceipt(null); }} placeholder={merchant.placeholder} /> : <input id="am-merchant-input" className="am-merchant-input" value={merchantInput} maxLength={1000} disabled={merchantBusy} onChange={(event) => { setMerchantInput(event.target.value); setMerchantQuote(null); setMerchantReceipt(null); }} placeholder={merchant.placeholder} />}</>}
          <div className="am-checkout-footer"><div>{merchantQuote ? <><strong>{merchantQuote.amountUsd} USDG / CALL</strong><span>Paid to the outside service operator at the quoted address. No LANDVILLE fee. Wallet gas or token approval may apply.</span></> : <><strong>LIVE PRICE BEFORE PAYMENT</strong><span>Checkout opens only when the operator quotes USDG on Robinhood Chain.{merchant.fixedModelId ? ` This model call allows up to ${merchant.maxOutputTokens?.toLocaleString() || '2,000'} output tokens.` : ''}</span></>}</div>
            {merchantQuote ? <button type="button" disabled={merchantBusy || !wallet.linkedWallet} onClick={() => void payMerchant()}>{merchantBusy ? 'WORKING…' : 'APPROVE & RUN'}</button> : <button type="button" disabled={merchantBusy || (merchant.input !== 'none' && !merchantInput.trim()) || (merchant.modelPicker && !merchantModelId) || !wallet.address} onClick={() => void getMerchantQuote()}>{merchantBusy ? 'CHECKING…' : 'CHECK LIVE PRICE'}</button>}</div>
          {!wallet.address && <p className="am-checkout-hint">Join LANDVILLE to request a quote.</p>}
          {wallet.address && !wallet.linkedWallet && <p className="am-checkout-hint">Link a wallet in <Link href={profile}>your profile <ArrowUpRight /></Link> to pay.</p>}
          {merchant.docs && <a className="am-merchant-docs" href={merchant.docs} target="_blank" rel="noopener noreferrer">MERCHANT DETAILS <ArrowUpRight /></a>}
          {merchantStage && <p className="am-success" aria-live="polite">{merchantStage}</p>}{merchantError && <p className="am-error" role="alert">{merchantError}</p>}
          {merchantReceipt && <div className="am-receipt"><small>DELIVERED / PAID ONCHAIN</small><pre>{merchantReceipt.output}</pre><div className="am-receipt-actions"><a href={`${activeRobinhoodChain.explorerUrl}/tx/${merchantReceipt.payment.transaction}`} target="_blank" rel="noopener noreferrer">VIEW PAYMENT <ArrowUpRight /></a>{market?.agentExists && wallet.address && <Link href={`/yard/${wallet.address}?marketTx=${merchantReceipt.payment.transaction}`}>DISCUSS WITH MY AGENT <ArrowUpRight /></Link>}</div></div>}
        </div>}
        <div className="am-merchant-grid">{shownMerchants.map((item) => <button key={item.id} type="button" className="am-merchant-card" onClick={() => chooseMerchant(item)}><span className="am-merchant-card-top"><b>CHECK LIVE PRICE</b><small>{item.category}</small></span><strong>{item.name}</strong><span>{item.description}</span><span className="am-merchant-access">{item.holderOnly ? '1M+ SCRAPY · ' : ''}USDG PRICE BEFORE SIGNING</span><em>CHOOSE SERVICE <ArrowUpRight /></em></button>)}
          {shown.map((item) => <button key={item.id} type="button" className={`am-merchant-card${item.setupReady ? '' : ' am-merchant-card-pending'}`} onClick={() => choose(item)}><span className="am-merchant-card-top"><b>LANDVILLE JOB</b><small>{item.category}</small></span><strong>{item.name}</strong><span>{item.description}</span><span className="am-merchant-access">{item.holderOnly ? '1M+ SCRAPY · ' : ''}{item.setupReady ? `${item.priceUsd} USDG / RUN` : directAlternative(item) ? 'CITY SETUP PENDING · DIRECT OPTION AVAILABLE' : 'OPENS AFTER CITY SETUP'}</span><em>{item.setupReady ? 'CHOOSE SERVICE' : 'SEE HOW IT WORKS'} <ArrowUpRight /></em></button>)}
        </div>
        {!shownMerchants.length && !shown.length && <p className="am-note">No services found. Try a different name or category.</p>}
        <div className="am-services" id="city-services">
        {error && <p className="am-error" role="alert">LANDVILLE services are temporarily unavailable: {error}</p>}
        {activeService && <div className="am-checkout" id="market-checkout"><div className="am-checkout-head"><div><small>{providerNames[activeService.provider] || activeService.provider} / {activeService.category}</small><h3>{testDraft ? `TEST ${testDraft.title}` : activeService.name}</h3></div><button type="button" aria-label="Close service" onClick={() => { setCheckoutId(''); setTestDraft(null); }}><X /></button></div>
          <p>{activeService.description}</p>
          {testDraft && <div className="am-recipe-test-note"><Bot /> Your saved recipe guides this private test. Write a customer job below. Nothing is published for sale.</div>}
          <div className="am-checkout-access"><span className={activeService.holderOnly ? 'am-access-pill am-access-pill-holder' : 'am-access-pill'}>{activeService.holderOnly ? '1M+ SCRAPY TO USE' : 'OPEN TO ALL'}</span><span>PAY PER RUN · NO SUBSCRIPTION</span></div>
          {!activeService.setupReady && <div className="am-setup-message"><ShieldCheck /> Checkout is not live yet. LANDVILLE must connect this provider and the payment system.</div>}
          {directAlternative(activeService) && <div className="am-direct-option"><span>{activeService.kind === 'model' ? 'The outside catalogue may offer this model or a similar one. Its availability and USDG price are checked live.' : activeService.kind === 'long-form' ? 'Try a direct AI model now. Direct calls are capped at 2,000 output tokens, so this is shorter than Longform Desk.' : activeService.id === 'research-brief' ? 'Try a short cited web answer now. A full Research Brief remains a separate LANDVILLE job.' : 'A direct x402 tool can handle a similar request now. Its price comes from the operator.'}</span><button type="button" onClick={() => tryDirectAlternative(activeService)}>TRY DIRECT X402 <ArrowUpRight /></button></div>}
          {activeService.holderOnly && !market?.holder && <div className="am-setup-message"><ShieldCheck /> Your linked wallet needs at least 1M verified SCRAPY to run this model.</div>}
          <label htmlFor="am-job-prompt">{testDraft ? 'GIVE YOUR RECIPE A TEST JOB' : 'WHAT DO YOU WANT DONE?'}</label>
          <textarea id="am-job-prompt" value={prompt} maxLength={testDraft ? 600 : 2000} disabled={buying || !activeService.available} onChange={(event) => setPrompt(event.target.value)} placeholder={testDraft ? 'For example: Turn this rough idea into a one-page pitch for new citizens…' : activeService.id === 'chain-lens' ? 'Paste a 0x wallet address…' : activeService.id === 'page-reader' ? 'Paste one public HTTPS page URL…' : 'Describe a focused task for this service…'} />
          <div className="am-checkout-footer"><div><strong>{activeService.setupReady ? `${activeService.priceUsd} USDG / RUN` : 'CHECKOUT OPENS AFTER SETUP'}</strong><span>{activeService.setupReady ? 'Fixed price for this bounded job. You pay only when you approve a run; network gas may apply.' : 'LANDVILLE must connect and test this service before taking payment.'}</span>{!activeService.available && <em className={`am-status am-status-${activeService.status}`}>{serviceStatus(activeService)}</em>}</div>
            <button type="button" disabled={buying || !activeService.available || !prompt.trim() || !wallet.linkedWallet} onClick={() => void buy()}>{buying ? 'WORKING…' : activeService.available ? 'APPROVE PAYMENT & RUN' : 'CHECKOUT NOT OPEN'}</button></div>
          {activeService.available && !wallet.linkedWallet && <p className="am-checkout-hint">Connect your wallet in <Link href={profile}>your profile <ArrowUpRight /></Link> to use this service.</p>}
          {stage && <p className="am-success" aria-live="polite">{stage}</p>}{checkoutError && <p className="am-error" role="alert">{checkoutError}</p>}
          {receipt && <div className="am-receipt"><small>DELIVERED / {receipt.replayed ? 'SAVED RECEIPT' : 'PAID ONCHAIN'}</small><pre>{receipt.output}</pre><div className="am-receipt-actions"><a href={`${activeRobinhoodChain.explorerUrl}/tx/${receipt.payment.transaction}`} target="_blank" rel="noopener noreferrer">VIEW PAYMENT {receipt.payment.transaction.slice(0, 10)}… <ArrowUpRight /></a>{market?.agentExists && wallet.address && <Link href={`/yard/${wallet.address}?marketTx=${receipt.payment.transaction}`}>DISCUSS WITH MY AGENT <ArrowUpRight /></Link>}</div></div>}
        </div>}
        </div>
        <div className="am-market-explain"><Bot /><div><strong>AGENTS CAN USE THE SAME MARKET</strong><p>Connect an agent through MCP to find services. For paid calls the agent needs its own payment wallet and owner-set spending limits.</p><div className="am-mcp-connect"><code>{mcpUrl || '/mcp'}</code><button type="button" disabled={!mcpUrl} onClick={() => void navigator.clipboard.writeText(mcpUrl).then(() => setMcpCopied(true))}>{mcpCopied ? 'COPIED' : 'COPY MCP URL'}</button></div></div></div>
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
        <div className="am-holder-note"><ShieldCheck /><p><strong>1M SCRAPY holder benefit:</strong> advanced models, every chat skill, more citizen service recipes, and eligible advanced LANDVILLE jobs when configured. Every model call still costs its quoted USDG price.</p><Link href="/docs/scrapy-token">TOKEN DETAILS <ArrowUpRight /></Link></div>
      </section>

      <section className="am-directory" aria-labelledby="am-directory-title"><header className="am-section-head"><div><small>05 / CITIZEN NETWORK</small><h2 id="am-directory-title">AGENTS IN TOWN.</h2></div><Link href={profile}>CONNECT YOUR AGENT <ArrowUpRight /></Link></header>
        {directoryError ? <p className="am-note">{directoryError}</p> : agents.length ? <div className="am-directory-grid">{agents.map((agent) => <article key={agent.id}><div><Bot aria-hidden="true" /><small>CONNECTED AGENT</small></div><h3>{agent.name}</h3><p>{agent.description}</p><div className="am-directory-tags">{agent.capabilities.map((capability) => <span key={capability}>{capability}</span>)}</div><Link href={`/citizens/${agent.ownerWallet}`}>CITIZEN {shortWallet(agent.ownerWallet)} <ArrowUpRight /></Link></article>)}</div> : <div className="am-empty-network"><RadioTower /><p>Connect an external agent to your profile to make it discoverable in town.</p><Link href={profile}>CONNECT AN AGENT <ArrowUpRight /></Link></div>}
        <p className="am-model-note">Connected agents verify profile-key ownership. Their capabilities are self-declared; public citizen services appear when sellers publish and payouts are enabled.</p>
      </section>

      <MarketStallWorkshop services={services} agentExists={Boolean(market?.agentExists)} holder={Boolean(market?.holder)} onTest={testRecipe} onPublishChange={() => setStallRevision((value) => value + 1)} />
      <MarketAgentBudgets signedIn={Boolean(wallet.address)} />

      {wallet.address && <section className="am-history" aria-labelledby="am-history-title"><header className="am-section-head"><div><small>08 / YOUR WORK</small><h2 id="am-history-title">RECEIPTS.</h2></div><span>LAST 20 SETTLED JOBS</span></header>{orders.length ? <div className="am-history-list">{orders.map((order) => <details key={order.transaction || order.createdAt}><summary><strong>{services.find((item) => item.id === order.serviceId)?.name || EXTERNAL_MARKET_SERVICES.find((item) => `external:${item.id}` === order.serviceId)?.name || citizenStalls.find((item) => `stall:${item.id}` === order.serviceId)?.title || order.serviceId}</strong><span>{new Date(order.createdAt).toLocaleDateString()}</span><span>VIEW RESULT + RECEIPT</span></summary><pre>{order.output}</pre>{order.transaction && <div className="am-history-actions"><a href={`${activeRobinhoodChain.explorerUrl}/tx/${order.transaction}`} target="_blank" rel="noopener noreferrer">ONCHAIN PAYMENT <ArrowUpRight /></a>{market?.agentExists && <Link href={`/yard/${wallet.address}?marketTx=${order.transaction}`}>DISCUSS WITH MY AGENT <ArrowUpRight /></Link>}</div>}</details>)}</div> : <p className="am-note">Your completed paid jobs will appear here.</p>}</section>}

      <div className="am-footer"><ShoppingBag /><span>Citizen sales and wallet payouts open when the production treasury is configured. Connected agents can buy within owner-set LANDVILLE limits using their own wallets.</span><Link href="/world">BACK TO WORLD <ArrowUpRight /></Link></div>
    </main>
  </ProductShell>;
}
