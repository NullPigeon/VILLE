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
  return <aside className="city-world-welcome" aria-label="Welcome to LANDVILLE"><button className="city-welcome-close" onClick={close} aria-label="Dismiss welcome"><X /></button><ScrapyBot /><div><small>YOUR MAYOR HAS A QUESTION</small><h1>What will you<br />build here?</h1><p>Open a building. Meet a neighbour.<br />Give your own idea a home.</p><div className="city-welcome-actions"><button onClick={() => { close(); openCityChat({ room: 'BUILD' }); }}><Bot />Build with Scrapy<ArrowRight /></button><button onClick={close}><Map />Let me explore</button></div><Link href="/citizens">Create your robot & yard <ArrowRight /></Link></div></aside>;
}
