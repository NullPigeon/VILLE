'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bot, Building2, CircleDollarSign, Crown, Home, Menu, MessageCircle, User, Vote, Wallet, Wrench, X } from 'lucide-react';
import { useState } from 'react';
import { useWallet } from '@/components/landville/wallet-provider';
import { shortWallet, walletUsername } from '@/lib/governance';
import { activeRobinhoodChain } from '@/lib/robinhood-chain';
import { useLandville } from '@/components/landville/provider';
import { SCRAPY_TOKEN, scrapyAccess } from '@/lib/scrapy-token';

const nav = [
  { href: '/world', label: 'WORLD', icon: Building2 },
  { href: '/proposals', label: 'PROPOSALS', icon: Vote },
  { href: '/chat', label: 'TOWN CHAT', icon: MessageCircle },
  { href: '/mayor', label: 'WORKSHOP', icon: Bot },
  { href: '/treasury', label: 'TREASURY', icon: CircleDollarSign },
  { href: '/citizens', label: 'PROFILE', icon: User },
];

export function ProductShell({ title, eyebrow, actions, children, immersive = false }: { title: string; eyebrow: string; actions?: React.ReactNode; children: React.ReactNode; immersive?: boolean }) {
  const pathname = usePathname();
  const wallet = useWallet();
  const town = useLandville();
  const [open, setOpen] = useState(false);
  const profileHref = '/citizens';
  const mobileNav = nav.filter((item) => item.href !== '/treasury');
  const tokenAccess = wallet.snapshot ? scrapyAccess(wallet.snapshot.tokenBalance, wallet.snapshot.tokenDecimals) : null;
  return <div className="product-root">
    <aside className={open ? 'product-rail rail-open' : 'product-rail'}>
      <div className="rail-brand"><Link href="/">LANDVILLE</Link><button onClick={() => setOpen(false)} aria-label="Close navigation"><X /></button></div>
      <div className="rail-salvage"><Wrench /><span>SALVAGE ACCESS</span><b>LV-01</b></div>
      <nav>{nav.map(({ href, label, icon: Icon }) => <Link key={href} href={href} className={pathname.startsWith(href) ? 'active' : ''} onClick={() => setOpen(false)}><Icon /> <span>{label === 'PROFILE' ? wallet.address ? 'MY PROFILE' : 'CREATE ACCOUNT' : label}</span></Link>)}</nav>
      <div className="rail-wallet">{wallet.address?<Link href={profileHref} onClick={() => setOpen(false)}><span><Crown /></span><div><b>@{walletUsername(wallet.address)}</b><small>{shortWallet(wallet.address)} · ×{wallet.snapshot?.weight ?? '—'} POWER</small></div></Link>:<button onClick={() => wallet.connectWallet().catch(()=>undefined)} disabled={wallet.status==='CONNECTING'}><Wallet /><span>{wallet.status==='CONNECTING'?'CHECK WALLET…':'CONNECT WALLET'}</span></button>}{wallet.error&&<small className="rail-wallet-error">{wallet.error}</small>}</div>
      <Link className="rail-token" href="/treasury" onClick={() => setOpen(false)}><CircleDollarSign /><div><span>{SCRAPY_TOKEN.ticker}</span><b>{wallet.snapshot ? `${wallet.snapshot.tokenBalanceFormatted} SCRAPY` : 'OFFICIAL TOKEN'}</b><small>{wallet.snapshot ? `×${wallet.snapshot.weight} VOTES · ${tokenAccess?.dailyMessageLimit} MSG/DAY` : `${shortWallet(SCRAPY_TOKEN.address)} · MAINNET`}</small></div></Link>
      <div className="rail-scrap-note"><i /> ROBINHOOD MAINNET<br />CIVIC LINE / {activeRobinhoodChain.id}</div>
      <output className="rail-wallet-error">{town.status === 'ready' ? 'SHARED TOWN CONNECTED' : town.status === 'loading' ? 'CONNECTING TO TOWN…' : town.error}</output>
    </aside>
    {open&&<button className="product-rail-scrim" onClick={() => setOpen(false)} aria-label="Close navigation" />}
    <div className="product-main">
      <header className={immersive ? 'product-topbar immersive-bar' : 'product-topbar'}><button className="product-menu" onClick={() => setOpen(true)} aria-label="Open navigation"><Menu /></button>{!immersive&&<Link href="/" className="product-home"><Home /> LANDVILLE</Link>}</header>
      <main className={immersive?'product-content immersive':'product-content'}>{!immersive&&<div className="product-heading"><div><p><i /> {eyebrow}</p><h1>{title}</h1></div>{actions}</div>}{!immersive && town.status === 'unavailable' && <output className="admin-warning">{town.error}</output>}{children}</main>
      {!immersive&&<nav className="mobile-dock">{mobileNav.map(({ href, label, icon: Icon }) => <Link key={href} href={href} className={pathname.startsWith(href) ? 'active' : ''}><Icon /><span>{label}</span></Link>)}</nav>}
    </div>
  </div>;
}
