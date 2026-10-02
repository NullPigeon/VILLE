'use client';

import Link from 'next/link';
import { ArrowUpRight, Building2, Heart, Pickaxe, Sparkles, Trophy } from 'lucide-react';
import { ProductShell } from '@/components/landville/product-shell';
import { CityMiner, useCityPoints } from '@/components/landville/city-miner';
import { formatCityPoints, liveFarmPoints, type CityScore } from '@/lib/city-points';
import './useful-citizens.css';

const tiers = [
  ['250,000 – 2,499,999', '1'],
  ['2,500,000 – 9,999,999', '2'],
  ['10,000,000 – 19,999,999', '4'],
  ['20,000,000+', '8'],
];

function CitizenRow({ citizen, live }: { citizen: CityScore; live: number }) {
  return <Link className={`uc-row ${citizen.rank <= 3 ? 'uc-top-row' : ''}`} href={`/citizens/${citizen.wallet}`}>
    <b className="uc-rank">{String(citizen.rank).padStart(2, '0')}</b>
    <div className="uc-citizen"><strong>{citizen.username ? `@${citizen.username}` : `CITIZEN #${citizen.citizenNumber}`}</strong><span>#{citizen.citizenNumber} · BUILDS {citizen.buildPoints / 250} · LIKES {citizen.likePoints / 3}</span></div>
    <div className="uc-score"><strong>{formatCityPoints(live)}</strong><small>PTS</small></div>
    <ArrowUpRight size={16} />
  </Link>;
}

export default function UsefulCitizensPage() {
  const city = useCityPoints();
  const { state, now, livePoints, error } = city;
  const season = state?.seasonStart ? new Date(`${state.seasonStart}T00:00:00Z`).toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' }) : 'CURRENT SEASON';
  return <ProductShell title="USEFUL CITIZENS" eyebrow="CITY POINTS / THE BUILD SEASON">
    <div className="uc-page">
      <section className="uc-hero">
        <div className="uc-sun" aria-hidden="true" /><div className="uc-skyline" aria-hidden="true" />
        <div className="uc-hero-copy"><span className="uc-kicker"><i /> CITY BUILD HACKATHON · SEASON 01</span><h2>BUILD THE CITY.<br /><em>LEAVE A MARK.</em></h2><p>Scrapy builds with the citizens. Bring a useful idea, get it approved, put a real object in World, and earn the city&apos;s recognition when people use it.</p><div className="uc-hero-links"><Link href="/chat">PITCH TO SCRAPY <ArrowUpRight size={16} /></Link><Link href="/world">EXPLORE WORLD <ArrowUpRight size={16} /></Link></div></div>
        <div className="uc-stamp"><Trophy size={27} /><strong>USEFUL<br />CITIZENS</strong><small>YOUR WORK BUILDS THE WORLD</small></div>
      </section>

      <div className="uc-season"><span><i /> LIVE SEASON / {season.toUpperCase()}</span><span>POINTS RESET {state?.resetsAt ? new Date(state.resetsAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short', timeZone: 'UTC' }).toUpperCase() : 'MONTHLY'} · 00:00 UTC</span></div>
      <div className="uc-layout"><div className="uc-main">
        <section className="uc-board" aria-label="Useful Citizens leaderboard"><header><div><small>THE PEOPLE MOVING LANDVILLE FORWARD</small><h2>USEFUL CITIZENS</h2></div><span>TOP 50 / {season.toUpperCase()}</span></header>
          {state?.board.length ? <div className="uc-rows">{state.board.map((citizen) => <CitizenRow key={citizen.wallet} citizen={citizen} live={state.me?.wallet === citizen.wallet ? livePoints : citizen.points} />)}</div> : <div className="uc-empty"><Trophy size={38} /><h3>THE BOARD IS OPEN.</h3><p>The first check-in, approved idea, and new building will put citizens here.</p></div>}
          {error && <p className="uc-error" role="alert">{error}</p>}
          {state?.me && state.me.rank > 50 && <div className="uc-your-rank"><small>YOUR PLACE</small><CitizenRow citizen={state.me} live={livePoints} /></div>}
        </section>
        <section className="uc-rules"><header><small>THE SCORING MANIFESTO</small><h2>MAKE SOMETHING MATTER.</h2></header><div className="uc-rule-grid">
          <article><Sparkles /><small>01 / SHOW UP</small><strong>+2 PTS</strong><p>Daily citizen check-in. One per UTC day.</p></article>
          <article><Pickaxe /><small>02 / RUN YOUR MINER</small><strong>+1 TO +8 / DAY</strong><p>Create an agent, link a wallet, hold at least 250,000 SCRAPY, and check in. Points accumulate each second until midnight.</p></article>
          <article><Building2 /><small>03 / SHAPE THE CITY</small><strong>+50 / +250</strong><p>50 for an approved proposal. 250 when its new building is published in World.</p></article>
          <article><Heart /><small>04 / EARN RESPECT</small><strong>+3 / LIKE</strong><p>Each like your building receives counts. Maximum 20 scoring likes per citizen per month.</p></article>
        </div></section>
      </div><aside className="uc-side"><CityMiner city={city} /><section className="uc-tier-card"><small>SCRAPY / VERIFIED AT CHECK-IN</small><h3>MINER SPEED</h3><div className="uc-tier-head"><span>YOUR HOLD</span><span>POINTS / 24H</span></div>{tiers.map(([range, rate]) => <div className="uc-tier" key={range}><span>{range} SCRAPY</span><strong>+{rate}</strong></div>)}<p>Rates lock for that UTC day when you check in. A later check-in starts a new session; missed days earn nothing.</p></section><section className="uc-prize-card"><span>MONTHLY / CITY BUILD HACKATHON</span><h3>PRIZES FOR THE LEADERS.</h3><p>Monthly rewards are planned for verified contributors. Prize pool and eligibility rules will be published before the first payout.</p><small>City Points are leaderboard scores, not tokens or a claim on the treasury.</small></section></aside></div>
      {state?.farm && <span className="uc-live-caption" aria-live="off">YOUR MINER: +{formatCityPoints(liveFarmPoints(state.farm, now))} PTS SINCE TODAY&apos;S CHECK-IN</span>}
    </div>
  </ProductShell>;
}
