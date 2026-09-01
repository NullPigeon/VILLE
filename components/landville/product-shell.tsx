'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bot, Building2, CircleDollarSign, Crown, Home, Menu, MessageCircle, Shield, User, Vote, Wallet, X } from 'lucide-react';
import { useState } from 'react';
import { useWallet } from '@/components/landville/wallet-provider';
import { shortWallet, walletUsername } from '@/lib/governance';

const nav = [
  { href: '/world', label: 'WORLD', icon: Building2 },
  { href: '/proposals', label: 'PROPOSALS', icon: Vote },
  { href: '/chat', label: 'CHAT', icon: MessageCircle },
  { href: '/mayor', label: 'MAYOR', icon: Bot },
  { href: '/treasury', label: 'TREASURY', icon: CircleDollarSign },
  { href: '/citizens/jiyu1337', label: 'CITIZEN', icon: User },
];

export function ProductShell({ title, eyebrow, actions, children }: { title: string; eyebrow: string; actions?: React.ReactNode; children: React.ReactNode }) {
  const pathname = usePathname();
  const wallet = useWallet();
  const [open, setOpen] = useState(false);
  const profileHref = wallet.address ? `/citizens/${wallet.address}` : '/citizens/jiyu1337';
  const mobileNav = nav.filter((item) => ['WORLD', 'PROPOSALS', 'CHAT', 'MAYOR', 'CITIZEN'].includes(item.label));
  return <div className="product-root">
    <aside className={open ? 'product-rail rail-open' : 'product-rail'}>
      <div className="rail-brand"><Link href="/">LANDVILLE</Link><button onClick={() => setOpen(false)} aria-label="Close navigation"><X /></button></div>
      <nav>{nav.map(({ href, label, icon: Icon }) => <Link key={href} href={label === 'CITIZEN' ? profileHref : href} className={pathname.startsWith(href) ? 'active' : ''} onClick={() => setOpen(false)}><Icon /> <span>{label}</span></Link>)}</nav>
      <div className="rail-bottom"><Link href="/admin"><Shield /> ADMIN DEMO</Link><small><i /> ROBINHOOD TESTNET<br />ADAPTER READY</small></div>
    </aside>
    <div className="product-main">
      <header className="product-topbar"><button className="product-menu" onClick={() => setOpen(true)} aria-label="Open navigation"><Menu /></button><Link href="/" className="product-home"><Home /> LANDVILLE</Link>{wallet.address?<Link href={profileHref} className="citizen-chip"><span><Crown /></span><div><b>@{walletUsername(wallet.address)}</b><small>{shortWallet(wallet.address)} · ×{wallet.snapshot?.weight ?? '—'} POWER</small></div></Link>:<button className="wallet-connect" onClick={() => wallet.connectWallet().catch(()=>undefined)} disabled={wallet.status==='CONNECTING'}><Wallet /> {wallet.status==='CONNECTING'?'CHECK WALLET…':'CONNECT WALLET'}</button>}</header>
      <main className="product-content"><div className="product-heading"><div><p><i /> {eyebrow}</p><h1>{title}</h1></div>{actions}</div>{wallet.error&&<div className="wallet-error">WALLET: {wallet.error}</div>}{children}</main>
      <nav className="mobile-dock">{mobileNav.map(({ href, label, icon: Icon }) => <Link key={href} href={label === 'CITIZEN' ? profileHref : href} className={pathname.startsWith(href) ? 'active' : ''}><Icon /><span>{label}</span></Link>)}</nav>
    </div>
  </div>;
}
