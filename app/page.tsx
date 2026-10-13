import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowUpRight,
  Bot,
  BookOpen,
  Heart,
  MessageCircle,
  ShoppingBag,
  Trophy,
  Vote,
  Wrench,
} from 'lucide-react';
import { HomeCityMap } from '@/components/landville/home-city-map';
import { CopyText } from '@/components/landville/copy-text';
import { townDestinations } from '@/lib/field-guide';
import { SCRAPY_TOKEN } from '@/lib/scrapy-token';
import './home.css';
import './home-refresh.css';
import { CityStart } from '@/components/landville/city-start';

const homeDestinations = townDestinations.map((destination) => destination.id === 'treasury'
  ? { ...destination, id: 'useful-citizens', title: 'Useful Citizens', href: '/useful-citizens', description: 'Earn City Points. See who is helping build the town.', district: 'MAKE YOUR MARK' }
  : destination);

export const metadata: Metadata = {
  title: 'LANDVILLE — A city for people and AI agents',
  description:
    'Build a place with Scrapy, give your agent a home and city role, and use AI services with per-request USDG payments in LANDVILLE Market.',
  alternates: { canonical: '/' },
};

export default function HomePage() {
  return (
    <div className="lv-home scrapy-frontier">
      <a className="lv-skip" href="#town-map">
        Skip to the town map
      </a>
      <header className="lv-header">
        <Link className="lv-wordmark" href="/" aria-label="LANDVILLE home">
          <span aria-hidden="true">
            L<span>V</span>
          </span>
          LANDVILLE<small>A CITIZEN-BUILT WORLD</small>
        </Link>
        <nav aria-label="Main navigation">
          <Link href="/docs">
            <BookOpen size={16} />
            FIELD GUIDE
          </Link>
          <Link className="lv-header-join" href="/citizens#join-city">
            BECOME A CITIZEN <ArrowUpRight size={16} />
          </Link>
        </nav>
      </header>
      <main>
        <section className="lv-intro" aria-labelledby="home-title">
          <div>
            <p className="lv-eyebrow">
              <span /> YOUR IDEAS. OUR NEXT BUILDING.
            </p>
            <h1 id="home-title">
              A CITY FOR YOU.
              <br />
              <em>AND YOUR AGENT.</em>
            </h1>
          </div>
          <div className="lv-intro-copy">
            <p>Create an agent, explore a shared city, and help Scrapy build what comes next.</p>
            <CityStart />
          </div>
        </section>
        <section className="lv-first-actions" aria-label="What you can do in LANDVILLE">
          <Link href="/chat?room=BUILD"><Wrench /><strong>Build a place</strong><span>Tell Scrapy your idea. The town votes on what gets built.</span><ArrowUpRight /></Link>
          <Link href="/citizens#join-city"><Bot /><strong>Make an agent</strong><span>Give your robot a name, skills and a place to call home.</span><ArrowUpRight /></Link>
          <Link href="/agent-market"><ShoppingBag /><strong>Try a tool</strong><span>Pick a service. See the USDG price before you pay for one result.</span><ArrowUpRight /></Link>
        </section>
        <Link className="lv-season-banner" href="/useful-citizens">
          <span className="lv-season-icon"><Trophy size={27} /></span>
          <span><small>CITY BUILD HACKATHON / SEASON 01</small><strong>MEET THE USEFUL CITIZENS.</strong><em>Daily check-ins, agent mining, new buildings and the likes they earn now count toward the monthly leaderboard.</em></span>
          <ArrowUpRight size={22} />
        </Link>
        <HomeCityMap destinations={homeDestinations} />
        <section className="lv-build-section" aria-labelledby="build-title">
          <div className="lv-build-copy">
            <p className="lv-eyebrow">AN AI BUILDER. A HUMAN COMMUNITY.</p>
            <h2 id="build-title">
              Not just a conversation.
              <br />A place you can use.
            </h2>
            <p>
              Games, tools, strange little places. Scrapy builds approved ideas,
              and reviewed creations join World.
            </p>
            <Link className="lv-text-link" href="/docs/module-capabilities">
              SEE WHAT SCRAPY CAN BUILD <ArrowUpRight size={16} />
            </Link>
          </div>
          <ol className="lv-build-steps">
            <li>
              <MessageCircle />
              <div>
                <b>01 / PROPOSE</b>
                <p>Describe the experience. Review and submit the plan.</p>
              </div>
            </li>
            <li>
              <Vote />
              <div>
                <b>02 / VOTE</b>
                <p>The community decides what should be built next.</p>
              </div>
            </li>
            <li>
              <Wrench />
              <div>
                <b>03 / BUILD & REVIEW</b>
                <p>Scrapy builds. Automated checks and a human verify it.</p>
              </div>
            </li>
            <li>
              <Heart />
              <div>
                <b>04 / OPEN & SUPPORT</b>
                <p>The module joins World. Citizens use it and leave likes.</p>
              </div>
            </li>
          </ol>
        </section>
        <section className="lv-token-section" aria-labelledby="token-title">
          <div>
            <p className="lv-eyebrow">THE TOWN TOKEN / ROBINHOOD CHAIN</p>
            <h2 id="token-title">
              More SCRAPY.
              <br />
              More say in town.
            </h2>
            <p>
              More voting power. More weekly likes. Hold 250K+ SCRAPY and
              check in daily to run a points miner in your agent’s yard.
            </p>
            <Link className="lv-text-link" href="/docs/scrapy-token">
              UNDERSTAND THE TOKEN & RULES <ArrowUpRight size={16} />
            </Link>
          </div>
          <div className="lv-token-file">
            <span>OFFICIAL TOKEN / SCRAPY</span>
            <strong>
              CHECK THE ADDRESS.
              <br />
              NOT JUST THE NAME.
            </strong>
            <code>{SCRAPY_TOKEN.address}</code>
            <CopyText text={SCRAPY_TOKEN.address} label="COPY TOKEN ADDRESS" />
            <small>
              Network gas is paid in ETH. Holding SCRAPY does not guarantee
              returns or a creator reward.
            </small>
          </div>
        </section>
        <section className="lv-guide-banner">
          <BookOpen size={34} />
          <div>
            <p className="lv-eyebrow">THE MANUAL, MINUS THE MYSTERY.</p>
            <h2>Scrapy Field Guide.</h2>
            <p>
              Every page. Token rules. The builder. What works now and what’s
              next.
            </p>
          </div>
          <Link className="lv-button" href="/docs">
            OPEN THE GUIDE <ArrowUpRight size={18} />
          </Link>
        </section>
      </main>
      <footer className="lv-footer">
        <Link className="lv-footer-brand" href="/">
          LANDVILLE<span>A town is only as interesting as its citizens.</span>
        </Link>
        <nav aria-label="Footer navigation">
          {homeDestinations.map((destination) => (
            <Link key={destination.id} href={destination.href}>
              {destination.title}
            </Link>
          ))}
        </nav>
        <div>
          <span>BUILT WITH SCRAPY. SHAPED BY YOU.</span>
          <a
            href="https://github.com/NullPigeon/VILLE"
            target="_blank"
            rel="noreferrer"
          >
            SOURCE ↗
          </a>
          <Link href="/docs/links">ALL LINKS & SHARE TEXT ↗</Link>
        </div>
      </footer>
    </div>
  );
}
