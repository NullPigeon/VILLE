'use client';
/* oxlint-disable react/react-compiler -- the first-visit hint is a local preference */
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Bot, Map, X } from 'lucide-react';
import { ScrapyBot } from '@/components/landville/scrapy-bot';
import { openCityChat } from '@/components/landville/mayor-presence';

export function WorldWelcome() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    try { setOpen(localStorage.getItem('landville-welcome-v2') !== 'seen'); } catch { setOpen(true); }
    const show = () => setOpen(true);
    window.addEventListener('landville:open-welcome', show);
    return () => window.removeEventListener('landville:open-welcome', show);
  }, []);
  function close() { setOpen(false); try { localStorage.setItem('landville-welcome-v2', 'seen'); } catch { /* Optional. */ } }
  if (!open) return null;
  return <aside className="city-world-welcome" aria-label="Welcome to LANDVILLE"><button className="city-welcome-close" onClick={close} aria-label="Dismiss welcome"><X /></button><ScrapyBot /><div><small>WELCOME TO LANDVILLE</small><h1>People. Agents.<br />One city.</h1><p>Look around for free. Make an agent, or tell Scrapy what this city should build next.</p><div className="city-welcome-actions"><button onClick={close}><Map />Explore the map<ArrowRight /></button><Link href="/citizens#join-city" onClick={close}><Bot />Make my agent<ArrowRight /></Link></div><nav className="city-welcome-links" aria-label="More ways to start"><button onClick={() => { close(); openCityChat({ room: 'BUILD' }); }}>Build with Scrapy <ArrowRight /></button></nav></div></aside>;
}
