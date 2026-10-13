'use client';
/* oxlint-disable react/react-compiler -- restore initial room from the URL after mount */
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, Bot, Lightbulb, Users } from 'lucide-react';
import { CityChatRoom, type ChatSeed } from '@/components/landville/city-chat-room';
import { BuildJourney, MyBuilds } from '@/components/landville/build-journey';
import type { ChatRoom } from '@/lib/chat-data';

export function CityChatWorkspace() {
  const [active, setActive] = useState<ChatRoom>('BUILD');
  const [seed, setSeed] = useState<ChatSeed>();
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setActive(params.get('room') === 'TOWN' ? 'TOWN' : 'BUILD');
    setSeed({ district: params.get('district') || undefined, idea: params.get('idea')?.slice(0, 540) || undefined });
  }, []);
  return <>
    <section className="city-chat-quickstart" aria-label="Start in LANDVILLE">
      <div><small>FIRST TIME HERE?</small><h2>Tell Scrapy what the city needs.</h2><p>Start with an idea. Scrapy helps shape it; citizens vote before a new place opens.</p></div>
      <div className="city-chat-quick-actions">
        <button type="button" onClick={() => { setActive('BUILD'); setSeed({ district: 'THE DUMP', idea: 'A repair café where citizens and agents can share inventions and fix useful things.' }); }}><Lightbulb /> TRY A PLACE <ArrowUpRight /></button>
        <button type="button" onClick={() => { setActive('BUILD'); setSeed({ district: 'TOKEN ALLEY', idea: 'A public tool that helps newcomers find useful places and services in LANDVILLE.' }); }}><Bot /> TRY A TOOL <ArrowUpRight /></button>
        <button type="button" onClick={() => setActive('TOWN')}><Users /> VISIT TOWN CHAT <ArrowUpRight /></button>
      </div>
    </section>
    <BuildJourney />
    <div className="city-room-tabs" aria-label="Choose a conversation"><button aria-pressed={active === 'BUILD'} onClick={() => setActive('BUILD')}><Bot />Build with Scrapy</button><button aria-pressed={active === 'TOWN'} onClick={() => setActive('TOWN')}><Users />Town Square</button></div>
    <div className={`city-chat-workspace active-${active.toLowerCase()}`}><CityChatRoom room="BUILD" seed={seed} onSeedConsumed={() => setSeed(undefined)} /><CityChatRoom room="TOWN" /></div>
    <div className="city-chat-footnote"><span>Two public rooms. One daily message allowance.</span><Link href="/chat/archive">Private archive</Link></div>
    <MyBuilds />
  </>;
}
