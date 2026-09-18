import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowDown,
  ArrowUpRight,
  BookOpen,
  Heart,
  MessageCircle,
  Vote,
  Wrench,
} from 'lucide-react';
import { HomeCityMap } from '@/components/landville/home-city-map';
import { CopyText } from '@/components/landville/copy-text';
import { townDestinations } from '@/lib/field-guide';
import { SCRAPY_TOKEN } from '@/lib/scrapy-token';
import './home.css';

export const metadata: Metadata = {
  title: 'LANDVILLE — A town built by you & Scrapy',
  description:
    'Explore a digital town built by its citizens. Share an idea, vote on what comes next, and let Scrapy, the AI mayor, build it with the community.',
  alternates: { canonical: '/' },
};

export default function HomePage() {
  return (
    <div className="lv-home">
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
          <Link className="lv-header-join" href="/citizens">
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
              A SMALL TOWN.
              <br />
              <em>BUILT BY YOU.</em>
            </h1>
          </div>
          <div className="lv-intro-copy">
            <p>
              LANDVILLE is a digital town built by its citizens with{' '}
              <strong>Scrapy, an AI mayor.</strong> Share an idea. Citizens
              vote. Scrapy builds the approved module.
            </p>
            <div className="lv-actions">
              <Link className="lv-button" href="/world">
                EXPLORE THE WORLD <ArrowUpRight size={18} />
              </Link>
              <a className="lv-text-link" href="#first-quest">
                NEW HERE? START HERE <ArrowDown size={15} />
              </a>
            </div>
          </div>
        </section>
        <HomeCityMap destinations={townDestinations} />
        <section
          className="lv-quests"
          id="first-quest"
          aria-labelledby="quest-title"
        >
          <div className="lv-section-heading">
            <div>
              <p className="lv-eyebrow">TUTORIAL / NO CODE REQUIRED</p>
              <h2 id="quest-title">Your first quest.</h2>
            </div>
            <p>
              You don’t need tokens to look around.
              <br />
              Create an account when you’re ready to take part.
            </p>
          </div>
          <div className="lv-quest-grid">
            <Link href="/world">
              <span className="lv-step">01 / LOOK AROUND</span>
              <h3>Find your corner.</h3>
              <p>
                Explore buildings in World. Sign in when you want to try a
                community-made game, tool or experience.
              </p>
              <span className="lv-quest-action">
                ENTER WORLD <ArrowUpRight size={17} />
              </span>
            </Link>
            <Link href="/citizens">
              <span className="lv-step">02 / GET YOUR CITIZEN FILE</span>
              <h3>Make yourself at home.</h3>
              <p>
                Sign in with email or a supported wallet. Set up your profile
                and join the town.
              </p>
              <span className="lv-quest-action">
                CREATE AN ACCOUNT <ArrowUpRight size={17} />
              </span>
            </Link>
            <Link href="/chat">
              <span className="lv-step">03 / BRING AN IDEA</span>
              <h3>Tell the mayor.</h3>
              <p>
                Describe what you want to build in Town Chat. Choose ASK SCRAPY,
                then review the plan.
              </p>
              <span className="lv-quest-action">
                TALK TO SCRAPY <ArrowUpRight size={17} />
              </span>
            </Link>
          </div>
        </section>
        <section className="lv-build-section" aria-labelledby="build-title">
          <div className="lv-build-copy">
            <p className="lv-eyebrow">AN AI BUILDER. A HUMAN COMMUNITY.</p>
            <h2 id="build-title">
              Not just a conversation.
              <br />A place you can use.
            </h2>
            <p>
              A module is a working part of LANDVILLE: a game, gallery,
              community space or useful tool. Scrapy turns approved ideas into
              code, with checks and human review before anything joins the city.
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
              Every citizen starts with voting power and five weekly likes. Each
              full 250K SCRAPY adds one vote of power and one weekly like.
              Holding also unlocks a higher chat allowance. Treasury
              participation is currently under reconstruction.
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
          {townDestinations.map((destination) => (
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
