'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bot, Building2, CircleDollarSign, Crown, Home, Menu, Shield, User, Vote, X } from 'lucide-react';
import { useState } from 'react';

const nav = [
  { href: '/world', label: 'WORLD', icon: Building2 },
  { href: '/proposals', label: 'PROPOSALS', icon: Vote },
  { href: '/mayor', label: 'MAYOR', icon: Bot },
  { href: '/treasury', label: 'TREASURY', icon: CircleDollarSign },
  { href: '/citizens/jiyu1337', label: 'CITIZEN', icon: User },
];

export function ProductShell({ title, eyebrow, actions, children }: { title: string; eyebrow: string; actions?: React.ReactNode; children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  return <div className="product-root">
    <aside className={open ? 'product-rail rail-open' : 'product-rail'}>
      <div className="rail-brand"><Link href="/">LANDVILLE</Link><button onClick={() => setOpen(false)} aria-label="Close navigation"><X /></button></div>
      <nav>{nav.map(({ href, label, icon: Icon }) => <Link key={href} href={href} className={pathname.startsWith(href) ? 'active' : ''} onClick={() => setOpen(false)}><Icon /> <span>{label}</span></Link>)}</nav>
      <div className="rail-bottom"><Link href="/admin"><Shield /> ADMIN DEMO</Link><small><i /> ROBINHOOD TESTNET<br />ADAPTER READY</small></div>
    </aside>
    <div className="product-main">
      <header className="product-topbar"><button className="product-menu" onClick={() => setOpen(true)} aria-label="Open navigation"><Menu /></button><Link href="/" className="product-home"><Home /> LANDVILLE</Link><div className="citizen-chip"><span><Crown /></span><div><b>@jiyu1337</b><small>ARCHITECT · ONLINE</small></div></div></header>
      <main className="product-content"><div className="product-heading"><div><p><i /> {eyebrow}</p><h1>{title}</h1></div>{actions}</div>{children}</main>
      <nav className="mobile-dock">{nav.slice(0,5).map(({ href, label, icon: Icon }) => <Link key={href} href={href} className={pathname.startsWith(href) ? 'active' : ''}><Icon /><span>{label}</span></Link>)}</nav>
    </div>
  </div>;
}
