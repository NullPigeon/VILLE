'use client';

import Link from 'next/link';
import { ArrowUpRight, Bot, Check, CircleDollarSign, LockKeyhole, RadioTower, ShoppingBag, Sparkles, Wallet } from 'lucide-react';
import { useEffect, useState } from 'react';
import { ProductShell } from '@/components/landville/product-shell';
import { ScrapyBot } from '@/components/landville/scrapy-bot';
import { useWallet } from '@/components/landville/wallet-provider';
import { AGENT_SKILLS, BASIC_SLOT_LIMIT, FUTURE_STALLS, MARKET_CURRENCY, MARKET_NETWORK, type AgentSkillId } from '@/lib/agent-market';
import './agent-market.css';

type MarketState = {
  selected: AgentSkillId[];
  holder: boolean;
  holderCheckAvailable: boolean;
  agentExists: boolean;
};

export default function AgentMarketPage() {
  const wallet = useWallet();
  const [market, setMarket] = useState<MarketState | null>(null);
  const [selected, setSelected] = useState<AgentSkillId[]>([]);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    fetch('/api/agent-market', { cache: 'no-store' }).then(async (response) => {
      const result = await response.json() as MarketState & { error?: string };
      if (!response.ok) throw new Error(result.error || 'Market connection unavailable.');
      if (active) { setMarket(result); setSelected(result.selected); setError(''); }
    }).catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : 'Market connection unavailable.'); });
    return () => { active = false; };
  }, [wallet.address]);

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
  return <ProductShell title="AGENT MARKET" eyebrow="CITY ECONOMY / ROBOT SKILLS">
    <div className="am-page">
      <section className="am-hero">
        <div className="am-hero-copy">
          <span className="am-kicker"><RadioTower /> A NEW DISTRICT IS OPENING</span>
          <h2>GIVE YOUR ROBOT<br /><em>SOMETHING TO DO.</em></h2>
          <p>Equip skills today. Soon, agents will hire agents and pay for useful work across the city.</p>
          <div className="am-hero-tags"><span><Wallet /> {MARKET_NETWORK}</span><span><CircleDollarSign /> {MARKET_CURRENCY} / x402 COMING NEXT</span></div>
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
          {notice && <p className="am-success" role="status">{notice}</p>}
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

      <section className="am-future" aria-labelledby="am-future-title"><header className="am-section-head"><div><small>02 / NEXT ON THE STREET</small><h2 id="am-future-title">FUTURE STALLS.</h2></div><span>NOT FOR SALE YET</span></header><div className="am-future-grid">{FUTURE_STALLS.map((stall) => <article key={stall.id}><span><LockKeyhole /> {stall.category.toUpperCase()}</span><h3>{stall.name}</h3><p>{stall.description}</p><small>OPENING LATER</small></article>)}</div></section>
      <div className="am-footer"><ShoppingBag /><span>The first payable endpoint, outside-agent discovery and seller stalls will open after settlement and delivery checks are complete.</span><Link href="/world">BACK TO WORLD <ArrowUpRight /></Link></div>
    </div>
  </ProductShell>;
}
