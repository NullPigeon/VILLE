'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowUpRight, BookOpen, Bot, Building2, CircleDollarSign, HelpCircle, Menu, MessageCircle, Pause, Play, Trophy, User, Vote, Wrench, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useWallet } from '@/components/landville/wallet-provider';
import { useLandville } from '@/components/landville/provider';
import { citizenLabel } from '@/lib/citizen-identity';
import { ScrapyBot } from '@/components/landville/scrapy-bot';
import { openCityChat } from '@/components/landville/mayor-presence';

const nav = [
  { href: '/world', label: 'World', icon: Building2 },
  { href: '/chat', label: 'Build & Talk', icon: MessageCircle },
  { href: '/proposals', label: 'Proposals', icon: Vote },
  { href: '/useful-citizens', label: 'Useful Citizens', icon: Trophy },
  { href: '/citizens', label: 'My profile', icon: User },
  { href: '/docs', label: 'Field Guide', icon: BookOpen },
];

function MotionToggle() {
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    let preference: string | null = null;
    try { preference = localStorage.getItem('landville-motion'); } catch { /* Use system preference. */ }
    const stop = preference ? preference === 'paused' : window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    // oxlint-disable-next-line react/react-compiler -- hydrate the device motion preference
    setPaused(stop);
    document.documentElement.dataset.cityMotion = stop ? 'paused' : 'playing';
  }, []);
  return <button className="city-icon-button" aria-label={paused ? 'Play animations' : 'Pause animations'} title={paused ? 'Play animations' : 'Pause animations'} onClick={() => {
    const next = !paused; setPaused(next); document.documentElement.dataset.cityMotion = next ? 'paused' : 'playing';
    try { localStorage.setItem('landville-motion', next ? 'paused' : 'playing'); } catch { /* Optional. */ }
  }}>{paused ? <Play /> : <Pause />}</button>;
}

export function ProductShell({ title, eyebrow, actions, children, immersive = false }: { title: string; eyebrow: string; actions?: React.ReactNode; children: React.ReactNode; immersive?: boolean }) {
  const pathname = usePathname();
  const wallet = useWallet();
  const town = useLandville();
  const [open, setOpen] = useState(false);
  const profileHref = wallet.address ? `/citizens/${wallet.address}` : '/citizens';
  const mobileNav = nav.filter((item) => ['/world','/chat','/proposals','/citizens'].includes(item.href));
  const current = nav.find((item) => pathname.startsWith(item.href));
  return <div className={`product-root city-product${immersive ? ' city-immersive' : ''}`}>
    <a className="city-skip" href="#city-content">Skip to content</a>
    <aside className={open ? 'product-rail rail-open' : 'product-rail'} aria-label="City navigation">
      <div className="rail-brand"><Link href="/"><span>LV</span>LANDVILLE</Link><button onClick={() => setOpen(false)} aria-label="Close navigation"><X /></button></div>
      <span className="city-rail-label">YOUR LITTLE CORNER OF CHAOS</span>
      <nav>{nav.map(({ href, label, icon: Icon }) => <Link key={href} href={href === '/citizens' ? profileHref : href} className={pathname.startsWith(href) ? 'active' : ''} aria-current={pathname.startsWith(href) ? 'page' : undefined} onClick={() => setOpen(false)}><Icon /><span>{href === '/citizens' && !wallet.address ? 'Join the city' : label}</span></Link>)}{town.isAdmin && <Link href="/admin" onClick={() => setOpen(false)}><Wrench /><span>Build control</span></Link>}</nav>
      <Link className="city-rail-mayor" href="/chat?room=BUILD"><ScrapyBot /><span>Got a weird idea?<b>Let’s build it. <ArrowUpRight /></b></span></Link>
      <Link className="city-rail-account" href={profileHref}><User /><span><b>{wallet.address ? citizenLabel(wallet.profile) : 'Make yourself at home'}</b><small>{wallet.address ? 'Your profile & robot' : 'Email or wallet · free to join'}</small></span><ArrowUpRight /></Link>
      <Link className="city-rail-token" href="/docs/scrapy-token"><CircleDollarSign /><span>{wallet.snapshot ? `${wallet.snapshot.tokenBalanceFormatted} SCRAPY` : 'About SCRAPY'}</span></Link>
      <output className={`rail-town-status ${town.status}`}><i />{town.status === 'ready' ? 'City connected' : town.status === 'loading' ? 'Connecting…' : 'Connection unavailable'}</output>
    </aside>
    {open && <button className="product-rail-scrim" onClick={() => setOpen(false)} aria-label="Close navigation" />}
    <div className="product-main">
      <header className={`product-topbar${immersive ? ' immersive-bar' : ''}`}><button className="product-menu" onClick={() => setOpen(true)} aria-label="Open navigation"><Menu /></button><Link href="/" className="city-top-brand">LANDVILLE<span> / {current?.label || 'City'}</span></Link><div className="city-top-actions"><MotionToggle />{immersive && <button className="city-icon-button" aria-label="How to explore LANDVILLE" title="How to play" onClick={() => window.dispatchEvent(new Event('landville:open-welcome'))}><HelpCircle /></button>}{immersive ? <button className="city-build-cta" onClick={() => openCityChat({ room: 'BUILD' })}><Bot /><span>Build with Scrapy</span><ArrowUpRight /></button> : <Link className="city-build-cta" href="/chat?room=BUILD"><Bot /><span>Build with Scrapy</span><ArrowUpRight /></Link>}</div></header>
      <main id="city-content" className={immersive ? 'product-content immersive' : 'product-content'}>{!immersive && <div className="product-heading"><div><p><i />{eyebrow}</p><h1>{title}</h1></div>{actions}</div>}{!immersive && town.status === 'unavailable' && <output className="admin-warning">{town.error}</output>}{children}</main>
      <nav className="mobile-dock" aria-label="Quick navigation">{mobileNav.map(({ href, label, icon: Icon }) => <Link key={href} href={href === '/citizens' ? profileHref : href} className={pathname.startsWith(href) ? 'active' : ''} aria-current={pathname.startsWith(href) ? 'page' : undefined}><Icon /><span>{label}</span></Link>)}</nav>
    </div>
  </div>;
}
