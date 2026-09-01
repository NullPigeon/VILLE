'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Bot,
  Building2,
  CalendarDays,
  List,
  MapPin,
  PanelRightOpen,
  User,
  Vote,
  X,
} from 'lucide-react';
import { ProductShell } from '@/components/landville/product-shell';
import { useLandville } from '@/components/landville/provider';

export default function WorldPage() {
  const { objects } = useLandville();
  const [selectedId, setSelectedId] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const selected = objects.find((item) => item.id === selectedId);

  function inspectObject(id: string) {
    setSelectedId(id);
    setDrawerOpen(true);
  }

  return (
    <ProductShell
      title="THE WORLD"
      eyebrow="EMPTY LAND / BUILT BY CITIZENS"
      actions={<Link className="lv-button" href="/mayor"><Bot /> BUILD SOMETHING</Link>}
    >
      <section className="world-canvas world-stage" aria-label="Interactive LANDVILLE desert world">
        <Image
          className="world-desert"
          src="/world-desert.png"
          alt="Empty rust-colored desert waiting for LANDVILLE"
          width={1536}
          height={1024}
          priority
        />

        <div className="world-atmosphere" />
        <div className="world-stage-status">
          <i /> LIVE TERRITORY
          <small>{objects.length} BUILT OBJECTS · THE REST IS EMPTY</small>
        </div>

        <button
          className="world-drawer-trigger"
          onClick={() => setDrawerOpen(true)}
          aria-expanded={drawerOpen}
          aria-controls="world-object-drawer"
        >
          <PanelRightOpen /> OBJECTS <b>{objects.length}</b>
        </button>

        {objects.map((object, index) => (
          <button
            key={object.id}
            className={selectedId === object.id ? 'world-beacon selected' : 'world-beacon'}
            style={{ left: `${object.x}%`, top: `${object.y}%` }}
            onClick={() => inspectObject(object.id)}
            aria-label={`Inspect ${object.title}`}
          >
            <span>{String(index + 1).padStart(2, '0')}</span>
            <i />
            <small>{object.title}</small>
          </button>
        ))}

        <div className="world-empty-note">
          <strong>MOSTLY NOTHING.</strong>
          <span>For now.</span>
        </div>

        {drawerOpen && <button className="world-drawer-scrim" onClick={() => setDrawerOpen(false)} aria-label="Close object menu" />}
        <aside id="world-object-drawer" className={drawerOpen ? 'world-drawer open' : 'world-drawer'} aria-hidden={!drawerOpen}>
          <header className="world-drawer-head">
            <div><small>LANDVILLE WORLD INDEX</small><h2>{selected ? 'OBJECT FILE' : 'BUILT OBJECTS'}</h2></div>
            <button onClick={() => setDrawerOpen(false)} aria-label="Close object menu"><X /></button>
          </header>

          <div className="world-object-list" aria-label="Built objects">
            <span><List /> SELECT A THING</span>
            {objects.map((object, index) => (
              <button key={object.id} className={selectedId === object.id ? 'active' : ''} onClick={() => setSelectedId(object.id)}>
                <b>{String(index + 1).padStart(2, '0')}</b>
                <span>{object.title}<small>{object.district}</small></span>
                <MapPin />
              </button>
            ))}
          </div>

          {selected ? (
            <div className="object-detail world-object-detail">
              <div className="object-art"><Building2 /></div>
              <small>{selected.kind.toUpperCase()} / {selected.district}</small>
              <h2>{selected.title}</h2>
              <p>{selected.description}</p>
              <dl className="object-facts">
                <div><dt><User /> BUILT BY</dt><dd>{selected.creator}</dd></div>
                <div><dt><Vote /> FINAL POWER</dt><dd>{selected.yesPercent}% YES</dd></div>
                <div><dt><CalendarDays /> BUILT</dt><dd>{selected.builtAt}</dd></div>
              </dl>
              <Link className="lv-button primary" href="/mayor">ASK MAYOR ABOUT IT <Bot /></Link>
            </div>
          ) : (
            <div className="world-drawer-empty">
              <MapPin />
              <p>Pick a beacon. Inspect the citizen responsible.</p>
            </div>
          )}
        </aside>
      </section>
    </ProductShell>
  );
}
