'use client';
/* oxlint-disable react/react-compiler -- the global chat launcher listens for explicit map actions */
import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { ArrowUpRight, Bot, Users, X } from 'lucide-react';
import type { ChatSeed } from '@/components/landville/city-chat-room';
import { ScrapyBot } from '@/components/landville/scrapy-bot';
import type { ChatRoom } from '@/lib/chat-data';
import dynamic from 'next/dynamic';
const CityChatRoom = dynamic(() => import('@/components/landville/city-chat-room').then((module) => module.CityChatRoom));

export function openCityChat(seed: ChatSeed = {}) {
  window.dispatchEvent(new CustomEvent('landville:open-chat', { detail: seed }));
}

export function MayorPresence() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [room, setRoom] = useState<ChatRoom>('BUILD');
  const [seed, setSeed] = useState<ChatSeed>();
  const closeButton = useRef<HTMLButtonElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const show = (event: Event) => {
      const value = (event as CustomEvent<ChatSeed>).detail || {};
      returnFocus.current = document.activeElement as HTMLElement | null;
      setSeed(value); setRoom(value.room || 'BUILD'); setOpen(true);
    };
    window.addEventListener('landville:open-chat', show);
    return () => window.removeEventListener('landville:open-chat', show);
  }, []);
  useEffect(() => { setOpen(false); }, [pathname]);
  useEffect(() => {
    if (!open) return;
    closeButton.current?.focus();
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') { setOpen(false); (returnFocus.current || trigger.current)?.focus(); } };
    window.addEventListener('keydown', escape);
    return () => window.removeEventListener('keydown', escape);
  }, [open]);

  if (pathname === '/chat') return null;
  return <div className={`city-chat-launcher${pathname === '/world' ? ' on-world' : ''}${open ? ' is-open' : ''}`}>
    {open && <dialog open className="city-chat-dock" aria-label="City chat"><div className="city-dock-toolbar"><nav aria-label="Chat room"><button aria-pressed={room === 'BUILD'} onClick={() => setRoom('BUILD')}><Bot />Scrapy</button><button aria-pressed={room === 'TOWN'} onClick={() => setRoom('TOWN')}><Users />Town</button></nav><Link href={`/chat?${new URLSearchParams({ room, ...(seed?.district ? { district: seed.district } : {}) })}`} aria-label="Open full chat"><ArrowUpRight /></Link><button ref={closeButton} onClick={() => { setOpen(false); (returnFocus.current || trigger.current)?.focus(); }} aria-label="Close city chat"><X /></button></div><CityChatRoom key={room} room={room} compact seed={seed} onSeedConsumed={() => setSeed(undefined)} /></dialog>}
    <button ref={trigger} className="city-scrapy-trigger" aria-label={open ? 'Close city chat' : 'Talk to Scrapy'} aria-expanded={open} onClick={() => { returnFocus.current = trigger.current; setOpen((value) => !value); }}><ScrapyBot portrait /><span>{open ? 'See you around.' : 'Need a hand?'}<b>{open ? 'Close chat' : 'Talk to Scrapy'}</b></span>{open ? <X /> : <ArrowUpRight />}</button>
  </div>;
}
