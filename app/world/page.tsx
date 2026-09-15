'use client';

import { type CSSProperties, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Bot,
  Building2,
  CalendarDays,
  Heart,
  User,
  Vote,
  X,
} from 'lucide-react';
import { ProductShell } from '@/components/landville/product-shell';
import { useLandville } from '@/components/landville/provider';
import { useWallet } from '@/components/landville/wallet-provider';

type WorldSlot = {
  x: number;
  y: number;
  mobileX: number;
  mobileY: number;
  scale: number;
  tilt: number;
  depth: number;
};

type WorldPlacementStyle = CSSProperties & {
  '--world-x': string;
  '--world-y': string;
  '--world-mobile-x': string;
  '--world-mobile-y': string;
  '--world-scale': string;
  '--world-hover-scale': string;
  '--world-tilt': string;
  '--world-depth': string;
};

const OBJECT_SLOTS: WorldSlot[] = [
  { x: 26, y: 28, mobileX: 25, mobileY: 22, scale: 1.1, tilt: -1.2, depth: 5 },
  { x: 69, y: 25, mobileX: 73, mobileY: 24, scale: 0.96, tilt: 1.1, depth: 4 },
  { x: 34, y: 71, mobileX: 25, mobileY: 53, scale: 1.04, tilt: 0.7, depth: 5 },
  { x: 73, y: 67, mobileX: 73, mobileY: 56, scale: 1.08, tilt: -1.4, depth: 5 },
  { x: 13, y: 52, mobileX: 25, mobileY: 83, scale: 0.92, tilt: 1.4, depth: 4 },
  { x: 88, y: 45, mobileX: 73, mobileY: 84, scale: 0.9, tilt: -0.8, depth: 4 },
  { x: 49, y: 16, mobileX: 25, mobileY: 114, scale: 0.86, tilt: 0.9, depth: 3 },
  { x: 53, y: 84, mobileX: 73, mobileY: 115, scale: 0.9, tilt: -1, depth: 3 },
];

const CITIZEN_SLOTS = [
  { x: 49, y: 59, mobileX: 49, mobileY: 42 },
  { x: 42, y: 46, mobileX: 48, mobileY: 72 },
  { x: 59, y: 48, mobileX: 49, mobileY: 101 },
  { x: 53, y: 74, mobileX: 49, mobileY: 130 },
  { x: 20, y: 63, mobileX: 49, mobileY: 145 },
  { x: 81, y: 56, mobileX: 49, mobileY: 160 },
];

function objectPlacement(index: number): WorldPlacementStyle {
  const slot = OBJECT_SLOTS[index % OBJECT_SLOTS.length];
  const ring = Math.floor(index / OBJECT_SLOTS.length);
  const scale = Math.max(0.72, slot.scale - ring * 0.08);

  return {
    '--world-x': `${slot.x + (ring % 2 === 0 ? ring : -ring)}%`,
    '--world-y': `${slot.y}%`,
    '--world-mobile-x': `${slot.mobileX}%`,
    '--world-mobile-y': `${slot.mobileY}%`,
    '--world-scale': `${scale}`,
    '--world-hover-scale': `${scale + 0.07}`,
    '--world-tilt': `${slot.tilt}deg`,
    '--world-depth': `${slot.depth}`,
  };
}

function citizenPlacement(index: number): CSSProperties & Record<string, string> {
  const slot = CITIZEN_SLOTS[index % CITIZEN_SLOTS.length];
  const row = Math.floor(index / CITIZEN_SLOTS.length);

  return {
    '--citizen-x': `${slot.x}%`,
    '--citizen-y': `${slot.y + row * 4}%`,
    '--citizen-mobile-x': `${slot.mobileX}%`,
    '--citizen-mobile-y': `${slot.mobileY + row * 14}%`,
  };
}

export default function WorldPage() {
  const { objects, citizens, likeBudget, likeModule } = useLandville();
  const wallet = useWallet();
  const [selectedId, setSelectedId] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [likeBusy, setLikeBusy] = useState(false);
  const [likeError, setLikeError] = useState('');
  const selected = objects.find((item) => item.id === selectedId);
  const selectedIsOwn = Boolean(selected?.creatorWallet && selected.creatorWallet.toLowerCase() === wallet.address.toLowerCase());

  function inspectObject(id: string) {
    setSelectedId(id);
    setLikeError('');
    setDrawerOpen(true);
  }

  async function submitLike() {
    if (!selected || likeBusy) return;
    setLikeBusy(true);
    setLikeError('');
    try { await likeModule(selected.id); }
    catch (caught) { setLikeError(caught instanceof Error ? caught.message : 'The like could not be recorded.'); }
    finally { setLikeBusy(false); }
  }

  return (
    <ProductShell
      title="THE WORLD"
      eyebrow="LIVING CITY / BUILT BY CITIZENS"
      immersive
    >
      <section className="world-canvas world-stage world-blank-canvas" aria-label="Interactive LANDVILLE city map">
        <div className="world-like-meter" aria-label="Weekly module likes">
          <Heart />
          {wallet.address
            ? <><b>{likeBudget.remaining} / {likeBudget.allowance}</b><small>LIKES LEFT THIS WEEK</small></>
            : <><b>5 + SCRAPY</b><small>SIGN IN TO LIKE MODULES</small></>}
        </div>
        <svg className="world-road-map" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <g className="world-road-beds">
            <path d="M 2 51 C 20 45 34 49 50 50 S 79 56 98 44" />
            <path d="M 50 1 C 47 20 55 34 50 50 S 45 78 54 99" />
            <path d="M 8 7 C 25 25 37 40 50 50 S 73 70 93 93" />
            <path d="M 92 7 C 76 24 62 40 50 50 S 29 72 8 92" />
          </g>
          <g className="world-road-marks">
            <path d="M 2 51 C 20 45 34 49 50 50 S 79 56 98 44" />
            <path d="M 50 1 C 47 20 55 34 50 50 S 45 78 54 99" />
            <path d="M 8 7 C 25 25 37 40 50 50 S 73 70 93 93" />
            <path d="M 92 7 C 76 24 62 40 50 50 S 29 72 8 92" />
          </g>
        </svg>

        <div className="world-plaza" aria-hidden="true">
          <span>SCRAPY SQUARE</span>
          <small>CIVIC CORE // BUILD OUTWARD</small>
        </div>

        <span className="world-district-tag founders" aria-hidden="true">FOUNDERS ROW / 01</span>
        <span className="world-district-tag civic" aria-hidden="true">CIVIC YARD / 02</span>
        <span className="world-district-tag dump" aria-hidden="true">THE DUMP / 03</span>
        <span className="world-district-tag market" aria-hidden="true">NIGHT MARKET / 04</span>

        <div className="world-vacant-lot vacant-west" aria-hidden="true"><b>+</b><small>VACANT LOT 05</small></div>
        <div className="world-vacant-lot vacant-east" aria-hidden="true"><b>+</b><small>VACANT LOT 06</small></div>

        {objects.map((object, index) => (
          <article
            key={object.id}
            className={selectedId === object.id ? 'world-object-card selected' : 'world-object-card'}
            style={objectPlacement(index)}
          >
            <div className="world-object-preview" aria-hidden="true">
              <Building2 />
              <iframe title={`${object.title} static preview`} src={`/api/modules/${encodeURIComponent(object.id)}/preview`} sandbox="" loading="lazy" referrerPolicy="no-referrer" tabIndex={-1} />
            </div>
            <div className="world-object-label">
              <strong>{object.title}</strong><small>{object.creator}</small>
              <span className={object.likedByViewer ? 'world-object-likes liked' : 'world-object-likes'}><Heart /> {object.likes}</span>
            </div>
            <button onClick={() => inspectObject(object.id)} aria-label={`Inspect ${object.title}`} />
          </article>
        ))}

        {citizens.map((citizen, index) => (
          <Link
            key={citizen.wallet}
            className="world-citizen-card"
            style={citizenPlacement(index)}
            href={`/citizens/${citizen.wallet}`}
            aria-label={`Open ${citizen.creator} citizen profile`}
          >
            {/* Public image endpoint streams bytes; town state carries no base64 artwork. */}
            <Image src={citizen.imagePath} alt={`${citizen.creator} LANDVILLE resident`} width={88} height={108} unoptimized />
            <small>{citizen.creator}</small>
          </Link>
        ))}

        {drawerOpen && <button className="world-drawer-scrim" onClick={() => setDrawerOpen(false)} aria-label="Close object menu" />}
        {selected && <aside id="world-object-drawer" className={drawerOpen ? 'world-drawer open' : 'world-drawer'} aria-hidden={!drawerOpen}>
          <header className="world-drawer-head">
            <div><small>BUILT OBJECT</small><h2>{selected.title}</h2></div>
            <button onClick={() => setDrawerOpen(false)} aria-label="Close object menu"><X /></button>
          </header>

          <div className="object-detail world-object-detail">
            <div className="object-art"><Building2 /></div>
            <small>{selected.kind.toUpperCase()} / {selected.district}</small>
            <p>{selected.description}</p>
            <dl className="object-facts">
              <div><dt><User /> BUILT BY</dt><dd>{selected.creator}</dd></div>
              <div><dt><Vote /> FINAL POWER</dt><dd>{selected.yesPercent}% YES</dd></div>
              <div><dt><CalendarDays /> BUILT</dt><dd>{selected.builtAt}</dd></div>
            </dl>
            <section className="world-like-control" aria-label="Module likes">
              <div><Heart className={selected.likedByViewer ? 'liked' : ''} /><span><b>{selected.likes} LIKES</b><small>{likeBudget.remaining} OF {likeBudget.allowance} LEFT THIS UTC WEEK</small></span></div>
              <p>Every citizen gets 5 weekly likes, plus 1 for each complete 250K SCRAPY. Likes do not accumulate.</p>
              <button
                className="lv-button primary"
                onClick={() => void submitLike()}
                disabled={!wallet.address || selectedIsOwn || selected.likedByViewer || likeBudget.remaining < 1 || likeBusy}
              >
                <Heart /> {likeBusy ? 'STAMPING...' : selectedIsOwn ? 'YOUR OWN MODULE' : selected.likedByViewer ? 'LIKED' : likeBudget.remaining < 1 ? 'NO LIKES LEFT' : 'LIKE THIS MODULE'}
              </button>
              {likeError && <span className="world-like-error">{likeError}</span>}
            </section>
            <Link className="lv-button primary" href="/chat">ASK MAYOR ABOUT IT <Bot /></Link>
            {selected.modulePath && <Link className="lv-button primary" href={selected.modulePath}>OPEN {selected.title}</Link>}
          </div>
        </aside>}
      </section>
    </ProductShell>
  );
}
