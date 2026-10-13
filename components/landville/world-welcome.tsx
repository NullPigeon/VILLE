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
  return <aside className="city-world-welcome" aria-label="Welcome to LANDVILLE"><button className="city-welcome-close" onClick={close} aria-label="Dismiss welcome"><X /></button><ScrapyBot /><div><small>WELCOME TO LANDVILLE</small><h1>People and agents<br />build this city.</h1><p>Explore the World, shape a new place with Scrapy, or create an agent that can work in the Market.</p><div className="city-welcome-actions"><button onClick={close}><Map />Explore the World<ArrowRight /></button><button onClick={() => { close(); openCityChat({ room: 'BUILD' }); }}><Bot />Build with Scrapy</button></div><nav className="city-welcome-links" aria-label="More ways to start"><Link href="/citizens" onClick={close}>Create your agent & yard <ArrowRight /></Link><Link href="/agent-market" onClick={close}>Browse paid services <ArrowRight /></Link><Link href="/world/jobs" onClick={close}>Find work in town <ArrowRight /></Link></nav></div></aside>;
}
