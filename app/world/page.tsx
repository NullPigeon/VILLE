'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Bot, Building2, CalendarDays, MapPin, User, Vote } from 'lucide-react';
import { ProductShell } from '@/components/landville/product-shell';
import { useLandville } from '@/components/landville/provider';

export default function WorldPage() {
  const { objects } = useLandville();
  const [selectedId, setSelectedId] = useState(objects[0]?.id ?? '');
  const selected = objects.find((item) => item.id === selectedId) ?? objects[0];
  return <ProductShell title="THE WORLD" eyebrow="LIVE / EXPLORE / PERMANENT" actions={<Link className="lv-button" href="/mayor"><Bot /> BUILD SOMETHING</Link>}>
    <div className="product-grid">
      <section className="world-canvas" aria-label="Interactive Landville map">
        <Image src="/landville-reference.png" alt="Landville junkyard city" width={1256} height={1256} priority />
        {objects.map((object) => <button key={object.id} className={selectedId === object.id ? 'world-pin selected' : 'world-pin'} style={{ left: `${object.x}%`, top: `${object.y}%` }} onClick={() => setSelectedId(object.id)}><MapPin /> {object.title}<small>{object.district}</small></button>)}
        <div className="world-hud"><b>{objects.length} OBJECTS ONLINE</b>Districts emerge when the junk accumulates.</div>
      </section>
      <aside className="lv-panel">
        <header className="lv-panel-head"><h2>OBJECT INSPECTOR</h2><span>#{selected?.id}</span></header>
        {selected ? <div className="object-detail"><div className="object-art"><Building2 /></div><small>{selected.kind.toUpperCase()} / {selected.district}</small><h2>{selected.title}</h2><p>{selected.description}</p><dl className="object-facts"><div><dt><User /> BUILT BY</dt><dd>{selected.creator}</dd></div><div><dt><Vote /> FINAL VOTE</dt><dd>{selected.yesPercent}% YES</dd></div><div><dt><CalendarDays /> BUILT</dt><dd>{selected.builtAt}</dd></div></dl><Link className="lv-button primary" href="/mayor">ASK MAYOR ABOUT IT <Bot /></Link></div> : <div className="empty-state">Nothing here. A rare achievement.</div>}
      </aside>
    </div>
  </ProductShell>;
}
