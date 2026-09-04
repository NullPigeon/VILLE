'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Bot,
  Building2,
  CalendarDays,
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
      immersive
    >
      <section className="world-canvas world-stage world-blank-canvas" aria-label="Interactive empty LANDVILLE world">
        {objects.map((object) => (
          <button
            key={object.id}
            className={selectedId === object.id ? 'world-beacon selected' : 'world-beacon'}
            style={{ left: `${object.x}%`, top: `${object.y}%` }}
            onClick={() => inspectObject(object.id)}
            aria-label={`Inspect ${object.title}`}
          >
            <Building2 />
            <small>{object.title}</small>
          </button>
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
            <Link className="lv-button primary" href="/chat">ASK MAYOR ABOUT IT <Bot /></Link>
            {selected.modulePath && <Link className="lv-button primary" href={selected.modulePath}>OPEN {selected.title}</Link>}
          </div>
        </aside>}
      </section>
    </ProductShell>
  );
}
