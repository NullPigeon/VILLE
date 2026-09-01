import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowUpRight, Hammer, Vote } from 'lucide-react';
import { ProductShell } from '@/components/landville/product-shell';
import { citizen, initialWorldObjects } from '@/lib/landville-data';

export async function generateMetadata({ params }: { params: Promise<{ username: string }> }): Promise<Metadata> {
  const { username } = await params;
  return { title: `@${username} — Citizen of LANDVILLE`, description: `${username} builds things in LANDVILLE.` };
}

export default async function CitizenPage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const profile = username.toLowerCase() === citizen.username ? citizen : { ...citizen, username, title: 'CITIZEN', wallet: '0x0000...LAND', stats: { built: 2, proposals: 4, passed: 1, votes: 11 } };
  const built = initialWorldObjects.filter((_, index) => username === citizen.username ? index < 3 : index < 1);
  return <ProductShell title="CITIZEN FILE" eyebrow="JUNKYARD PASSPORT / PUBLIC RECORD">
    <section className="lv-panel profile-header"><div className="passport-avatar"><Image src="/scrapy-sheet.png" alt="Citizen avatar" width={1536} height={1024} /></div><div className="profile-identity"><small>RESIDENT ID · LV-{username.slice(0,4).toUpperCase()}</small><h2>@{profile.username}</h2><p>{profile.wallet} · JOINED {profile.joined}<br />{profile.tokenBalance} PUBLIC HOLDINGS</p></div><div className="profile-stamp">{profile.title}</div></section>
    <section className="profile-stats"><article><strong>{profile.stats.built}</strong><small>THINGS BUILT</small></article><article><strong>{profile.stats.proposals}</strong><small>PROPOSALS</small></article><article><strong>{profile.stats.passed}</strong><small>PASSED</small></article><article><strong>{profile.stats.votes}</strong><small>VOTES</small></article></section>
    <div className="product-grid"><section className="lv-panel"><header className="lv-panel-head"><h2><Hammer /> BUILT BY @{profile.username}</h2><span>{built.length} VISIBLE</span></header><div className="asset-list">{built.map((object)=><article className="asset-row" key={object.id}><div className="asset-symbol"><Hammer /></div><div><b>{object.title}</b><small>{object.district} · BUILT {object.builtAt}</small></div><strong>{object.yesPercent}% YES<small>FINAL VOTE</small></strong></article>)}</div><div style={{padding:16}}><Link className="lv-button" href="/world">FIND IT IN THE WORLD <ArrowUpRight /></Link></div></section><aside className="lv-panel"><header className="lv-panel-head"><h2><Vote /> RECENT ACTIVITY</h2><span>PUBLIC</span></header><ul className="activity-list"><li><i />Voted YES on BAN BEIGE<span>3H</span></li><li><i />Proposal TOKEN SWAP passed<span>1D</span></li><li><i />Built LANDVILLE RADIO<span>4D</span></li><li><i />Mayor replied to an idea<span>5D</span></li></ul></aside></div>
  </ProductShell>;
}
