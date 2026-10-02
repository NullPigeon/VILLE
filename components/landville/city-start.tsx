'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight, Bot, Map, Sparkles } from 'lucide-react';
import { ScrapyBot } from '@/components/landville/scrapy-bot';
import { useWallet } from '@/components/landville/wallet-provider';

export function CityStart() {
  const [idea, setIdea] = useState('');
  const router = useRouter();
  return <div className="city-start"><div className="city-start-mayor"><ScrapyBot /><div><small>SCRAPY / YOUR MAYOR</small><p>“Bring an idea.<br />I brought the welding torch.”</p></div></div>
    <form onSubmit={(event) => { event.preventDefault(); router.push(`/chat?${new URLSearchParams({ room: 'BUILD', ...(idea.trim() ? { idea: idea.trim() } : {}) })}`); }}><label htmlFor="first-city-idea">What would you build here?</label><div><input id="first-city-idea" placeholder="A game, a weird machine, a useful place…" maxLength={300} value={idea} onChange={(event) => setIdea(event.target.value)} /><button type="submit" aria-label="Discuss your idea with Scrapy"><ArrowRight /></button></div></form>
    <div className="city-start-actions"><Link href="/chat?room=BUILD"><Sparkles />Build with Scrapy</Link><Link href="/world"><Map />Explore first</Link></div>
  </div>;
}

export function CitizenNextSteps() {
  const wallet = useWallet();
  return <section className="city-next-steps" aria-label="Your next steps"><ScrapyBot portrait /><div><small>MAKE YOURSELF AT HOME</small><h2>{wallet.address ? 'Your city starts here.' : 'A place for you. And your robot.'}</h2><nav><Link href={wallet.address ? `/citizens/${wallet.address}#your-agent` : '/citizens'}><Bot />Create your robot</Link><Link href="/chat?room=BUILD">Build something <ArrowRight /></Link><Link href="/world">Explore World <ArrowRight /></Link></nav></div></section>;
}
