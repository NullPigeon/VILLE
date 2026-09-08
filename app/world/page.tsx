'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Bot,
  Building2,
  CalendarDays,
  Grid2X2,
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
        <article className="world-object-card one-scrapy-landmark" style={{ left: '72%', top: '24%' }}>
          <div className="world-object-preview one-scrapy-landmark-preview" aria-hidden="true"><Grid2X2 /><span>PROJECT<br />SIGNAL<br />WALL</span></div>
          <div className="world-object-label"><strong>ONE SCRAPY PAGE</strong><small>@scrapy</small></div>
          <Link href="/one-scrapy" aria-label="Open ONE SCRAPY PAGE" />
        </article>
        {objects.map((object) => (
          <article
            key={object.id}
            className={selectedId === object.id ? 'world-object-card selected' : 'world-object-card'}
            style={{ left: `${object.x}%`, top: `${object.y}%` }}
          >
            <div className="world-object-preview" aria-hidden="true">
              <Building2 />
              <iframe title={`${object.title} static preview`} src={`/api/modules/${encodeURIComponent(object.id)}/preview`} sandbox="" loading="lazy" referrerPolicy="no-referrer" tabIndex={-1} />
            </div>
            <div className="world-object-label"><strong>{object.title}</strong><small>{object.creator}</small></div>
            <button onClick={() => inspectObject(object.id)} aria-label={`Inspect ${object.title}`} />
          </article>
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
