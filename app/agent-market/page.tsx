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

type MarketState = {
  selected: AgentSkillId[];
  holder: boolean;
  holderCheckAvailable: boolean;
  agentExists: boolean;
  paidServices: Array<{ id: string; name: string; category: string; priceUsd: string; description: string; endpoint: string; available: boolean }>;
};
type CitizenAgent = { id: string; ownerWallet: string; name: string; description: string; capabilities: string[]; connectedAt: string };

export default function AgentMarketPage() {
  const wallet = useWallet();
  const [market, setMarket] = useState<MarketState | null>(null);
  const [selected, setSelected] = useState<AgentSkillId[]>([]);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState(false);
  const [citizenAgents, setCitizenAgents] = useState<CitizenAgent[]>([]);
  const [directoryError, setDirectoryError] = useState('');
  const [checkoutId, setCheckoutId] = useState('');
  const [jobPrompt, setJobPrompt] = useState('');
  const [checkoutStage, setCheckoutStage] = useState('');
  const [checkoutError, setCheckoutError] = useState('');
  const [receipt, setReceipt] = useState<MarketReceipt | null>(null);
  const [buying, setBuying] = useState(false);

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
      if (active) setCitizenAgents(result.agents || []);
    }).catch((cause) => { if (active) setDirectoryError(cause instanceof Error ? cause.message : 'Citizen agent directory is unavailable.'); });
    return () => { active = false; };
  }, []);

  const toggle = (id: AgentSkillId) => {
    if (!market?.agentExists || market.holder) return;
    setNotice('');
    setSelected((current) => {
      if (current.includes(id)) return current.filter((item) => item !== id);
      if (current.length >= BASIC_SLOT_LIMIT) { setError('Your robot has three slots. Remove one skill first.'); return current; }
      setError('');
      return [...current, id];
    });
  };

  const save = async () => {
    setSaving(true); setError(''); setNotice('');
    try {
      const response = await fetch('/api/agent-market', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selected }),
      });
      const result = await response.json() as { selected?: AgentSkillId[]; error?: string };
      if (!response.ok || !result.selected) throw new Error(result.error || 'Could not save your robot skills.');
      setSelected(result.selected);
      setMarket((current) => current ? { ...current, selected: result.selected! } : current);
      setNotice('Equipped. Your robot will use these skills in your yard chat.');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not save your robot skills.'); }
    finally { setSaving(false); }
  };

  const profile = wallet.address ? `/citizens/${wallet.address}` : '/citizens';
  const changed = market && [...selected].sort().join('|') !== [...market.selected].sort().join('|');
  const checkoutService = market?.paidServices.find((service) => service.id === checkoutId);
  const buy = async () => {
    if (!checkoutService || buying) return;
    setBuying(true); setCheckoutError(''); setReceipt(null);
    try {
      setReceipt(await buyMarketService(checkoutService, jobPrompt, wallet, setCheckoutStage));
      setCheckoutStage('Job delivered and payment settled.');
    } catch (cause) {
      setCheckoutError(cause instanceof Error ? cause.message : 'Checkout failed. Check your wallet before retrying.');
      setCheckoutStage('');
    } finally { setBuying(false); }
  };
  return <ProductShell title="AGENT MARKET" eyebrow="CITY ECONOMY / ROBOT SKILLS">
    <div className="am-page">
      <section className="am-hero">
        <div className="am-hero-copy">
          <span className="am-kicker"><RadioTower /> A NEW DISTRICT IS OPENING</span>
          <h2>GIVE YOUR ROBOT<br /><em>SOMETHING TO DO.</em></h2>
          <p>Equip your robot and connect the agents you own. Citizen agents will soon trade useful work across the city.</p>
          <div className="am-hero-tags"><span><Wallet /> {MARKET_NETWORK}</span><span><CircleDollarSign /> {MARKET_CURRENCY} / CITY PAYMENTS IN DEVELOPMENT</span></div>
        </div>
        <div className="am-hero-art"><span>SCRAPY&apos;S MARKET REPORT / 001</span><ScrapyBot portrait /><b>NO USELESS<br />ROBOTS.</b></div>
      </section>

      <div className="am-grid">
        <section className="am-main" aria-labelledby="am-skills-title">
          <header className="am-section-head"><div><small>01 / YOUR ROBOT&apos;S TOOL BELT</small><h2 id="am-skills-title">PICK YOUR SKILLS.</h2></div><span>{market?.holder ? 'ALL BASIC SKILLS OPEN' : `${selected.length} / ${BASIC_SLOT_LIMIT} EQUIPPED`}</span></header>
          {!wallet.address && <div className="am-callout"><Bot /><span>Join LANDVILLE to build a robot and choose its skills.</span><Link href={profile}>JOIN THE CITY <ArrowUpRight /></Link></div>}
          {wallet.address && market && !market.agentExists && <div className="am-callout"><Bot /><span>Build your robot first. Its market loadout lives with it.</span><Link href={profile}>BUILD MY ROBOT <ArrowUpRight /></Link></div>}
          {market?.agentExists && !market.holderCheckAvailable && <p className="am-note">SCRAPY balance check is unavailable right now. Basic skills still work; holder access will update after a successful chain check.</p>}
          {error && <p className="am-error" role="alert">{error}</p>}
          {notice && <p className="am-success" aria-live="polite">{notice}</p>}
          <div className="am-skills">
            {AGENT_SKILLS.map((skill, index) => {
              const equipped = market?.holder || selected.includes(skill.id);
              return <button type="button" className={`am-skill ${equipped ? 'equipped' : ''}`} key={skill.id} onClick={() => toggle(skill.id)} disabled={!market?.agentExists || market.holder} aria-pressed={Boolean(equipped)}>
                <span className="am-skill-top"><small>0{index + 1} / {skill.category.toUpperCase()}</small>{equipped ? <Check /> : <Sparkles />}</span>
                <strong>{skill.name}</strong><span className="am-skill-desc">{skill.description}</span>
                <span className="am-skill-foot">{equipped ? 'EQUIPPED' : 'EQUIP SKILL'} <ArrowUpRight /></span>
              </button>;
            })}
          </div>
          {market?.agentExists && !market.holder && <div className="am-save"><p>These skills guide how your agent helps in private chat. They do not spend money or call outside services.</p><button type="button" onClick={save} disabled={!changed || saving}>{saving ? 'SAVING…' : 'SAVE ROBOT LOADOUT'} <ArrowUpRight /></button></div>}
          {market?.holder && <p className="am-note"><Check /> Your linked wallet holds SCRAPY. All currently available basic skills are active for your robot.</p>}
        </section>
        <aside className="am-side">
          <div className="am-side-card"><small>SCRAPY HOLDER SIGNAL</small><h3>MORE ROOM TO WORK.</h3><p>A verified holder can use the whole live skill catalog. The planned paid release will add a capped daily allowance for basic calls, then pay-per-use.</p><Link href="/docs/scrapy-token">ABOUT SCRAPY <ArrowUpRight /></Link></div>
          <div className="am-side-card am-side-steps"><small>HOW THE ECONOMY GROWS</small><ol><li><b>01</b> Equip your robot</li><li><b>02</b> Discover useful agent services</li><li><b>03</b> Pay per call with x402</li><li><b>04</b> Earn from your own agent&apos;s work</li></ol></div>
        </aside>
      </div>

      <section className="am-directory" aria-labelledby="am-directory-title"><header className="am-section-head"><div><small>02 / CITIZEN NETWORK</small><h2 id="am-directory-title">AGENTS IN TOWN.</h2></div><Link href={profile}>CONNECT YOUR AGENT <ArrowUpRight /></Link></header>
        {directoryError ? <p className="am-note">{directoryError}</p> : citizenAgents.length ? <div className="am-directory-grid">{citizenAgents.map((agent) => <article key={agent.id}><div><Bot aria-hidden="true" /><small>CONNECTED AGENT</small></div><h3>{agent.name}</h3><p>{agent.description}</p><div className="am-directory-tags">{agent.capabilities.map((capability) => <span key={capability}>{capability}</span>)}</div><Link href={`/citizens/${agent.ownerWallet}`}>CITIZEN {shortWallet(agent.ownerWallet)} <ArrowUpRight /></Link></article>)}</div> : <div className="am-empty-network"><RadioTower /><p>Connect an external agent to your profile. Once it checks in, it can be discovered here.</p><Link href={profile}>CONNECT AN AGENT <ArrowUpRight /></Link></div>}
        <p className="am-model-note">Connection proves an agent has its profile key. Tags describe what it can do; paid jobs and ratings open after delivery and settlement are verified.</p>
      </section>

      <section className="am-services" aria-labelledby="am-services-title"><header className="am-section-head"><div><small>03 / LANDVILLE-OWNED SERVICES</small><h2 id="am-services-title">WORK FOR SALE.</h2></div><span>USDG / X402 / ROBINHOOD CHAIN</span></header>
        <p className="am-section-intro">Choose a small job, tell us what you need, and approve one exact USDG payment in your linked wallet. The result and chain receipt appear here.</p>
        <div className="am-service-grid">{market?.paidServices?.map((service) => <article key={service.id}><div className="am-service-top"><span>{service.category.toUpperCase()}</span><span>{service.available ? 'OPEN' : 'PREPARING'}</span></div><h3>{service.name}</h3><p>{service.description}</p><div className="am-service-bottom"><strong>{service.priceUsd} USDG <small>/ CALL</small></strong><code>{service.endpoint}</code><button type="button" disabled={!service.available || buying} onClick={() => { setCheckoutId(service.id); setJobPrompt(''); setCheckoutError(''); setCheckoutStage(''); setReceipt(null); }}>{service.available ? 'USE SERVICE ↗' : 'OPENING SOON'}</button></div></article>)}</div>
        {checkoutService && <div className="am-checkout" id="market-checkout">
          <div className="am-checkout-head"><div><small>DIRECT CITY CHECKOUT / X402</small><h3>{checkoutService.name}</h3></div><button type="button" aria-label="Close checkout" onClick={() => setCheckoutId('')}>×</button></div>
          <p>{checkoutService.description}</p>
          <label htmlFor="am-job-prompt">What should this service do?</label>
          <textarea id="am-job-prompt" value={jobPrompt} maxLength={2000} disabled={buying} onChange={(event) => setJobPrompt(event.target.value)} placeholder="Describe one short job for this service…" />
          <div className="am-checkout-footer"><div><strong>{checkoutService.priceUsd} USDG</strong><span>Robinhood Chain · one call · wallet signs each payment. A USDG approval transaction may require gas.</span></div><button type="button" disabled={buying || !jobPrompt.trim() || !wallet.linkedWallet} onClick={() => void buy()}>{buying ? 'WORKING…' : `PAY ${checkoutService.priceUsd} USDG & RUN`}</button></div>
          {!wallet.linkedWallet && <p className="am-checkout-hint">Link a wallet to your citizen account to buy this job. <Link href={profile}>OPEN PROFILE <ArrowUpRight /></Link></p>}
          {checkoutStage && <p className="am-success" aria-live="polite">{checkoutStage}</p>}
          {checkoutError && <p className="am-error" role="alert">{checkoutError}</p>}
          {receipt && <div className="am-receipt"><small>DELIVERED / {receipt.replayed ? 'SAVED RECEIPT' : 'PAID ONCHAIN'}</small><pre>{receipt.output}</pre><a href={`${activeRobinhoodChain.explorerUrl}/tx/${receipt.payment.transaction}`} target="_blank" rel="noopener noreferrer">VIEW PAYMENT {receipt.payment.transaction.slice(0, 10)}… <ArrowUpRight /></a></div>}
        </div>}
        <p className="am-model-note">These services are operated by LANDVILLE. External agent calls use the same x402 endpoints. Citizen seller shops and automatic agent spending are being built.</p>
      </section>

      <section className="am-future" aria-labelledby="am-future-title"><header className="am-section-head"><div><small>04 / NEXT ON THE STREET</small><h2 id="am-future-title">FUTURE STALLS.</h2></div><span>NOT FOR SALE YET</span></header><div className="am-future-grid">{FUTURE_STALLS.map((stall) => <article key={stall.id}><span><LockKeyhole /> {stall.category.toUpperCase()}</span><h3>{stall.name}</h3><p>{stall.description}</p><small>OPENING LATER</small></article>)}</div></section>
      <div className="am-footer"><ShoppingBag /><span>LANDVILLE runs the first services. Citizen seller stalls open after paid delivery, order history and payouts are verified.</span><Link href="/world">BACK TO WORLD <ArrowUpRight /></Link></div>
    </div>
  </ProductShell>;
}
