'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ArrowUpRight, Hammer, LogOut, Vote, Wallet } from 'lucide-react';
import { ProductShell } from '@/components/landville/product-shell';
import { useLandville } from '@/components/landville/provider';
import { useWallet } from '@/components/landville/wallet-provider';
import { citizen } from '@/lib/landville-data';
import { shortWallet, walletUsername } from '@/lib/governance';

export function CitizenProfile({ identity }: { identity: string }) {
  const { objects, proposals, voted } = useLandville();
  const wallet = useWallet();
  const requestedWallet = identity.startsWith('0x') ? identity.toLowerCase() : '';
  const isOwnWallet = Boolean(requestedWallet && wallet.address === requestedWallet);
  const username = requestedWallet ? walletUsername(requestedWallet) : identity.toLowerCase();
  const creator = `@${username}`;
  const built = objects.filter((object) => object.creator.toLowerCase() === creator.toLowerCase());
  const authored = proposals.filter((proposal) => proposal.creator.toLowerCase() === creator.toLowerCase());
  const passed = authored.filter((proposal) => ['PASSED', 'BUILDING', 'BUILT'].includes(proposal.status));
  const ownReceipts = isOwnWallet ? Object.values(voted).filter((receipt) => receipt.wallet === wallet.address) : [];
  const fallback = !requestedWallet && username === citizen.username;
  const title = built.length >= 7 ? 'ARCHITECT' : built.length >= 3 ? 'BUILDER' : built.length ? 'SCAVENGER' : 'CITIZEN';

  const stats = {
    built: fallback ? citizen.stats.built : built.length,
    proposals: fallback ? citizen.stats.proposals : authored.length,
    passed: fallback ? citizen.stats.passed : passed.length,
    votes: fallback ? citizen.stats.votes : ownReceipts.reduce((sum, receipt) => sum + receipt.weight, 0),
  };

  return <ProductShell title="CITIZEN FILE" eyebrow="WALLET IDENTITY / PUBLIC RECORD" actions={isOwnWallet?<button className="lv-button" onClick={()=>wallet.disconnectWallet()}><LogOut /> SIGN OUT</button>:undefined}>
    <section className="lv-panel profile-header"><div className="passport-avatar"><Image src="/scrapy-sheet.png" alt="Citizen avatar" width={1536} height={1024} /></div><div className="profile-identity"><small>RESIDENT ID · LV-{username.slice(0,6).toUpperCase()}</small><h2>@{username}</h2><p>{requestedWallet ? shortWallet(requestedWallet) : citizen.wallet} · JOINED {fallback ? citizen.joined : 'SEP 2026'}<br />{isOwnWallet ? `${wallet.snapshot?.tokenBalanceFormatted || '—'} LAND · ×${wallet.snapshot?.weight ?? '—'} CURRENT POWER` : fallback ? `${citizen.tokenBalance} PUBLIC HOLDINGS` : 'HOLDINGS CHECKED ONLY DURING ACTIONS'}</p></div><div className="profile-stamp">{fallback ? citizen.title : title}</div></section>
    {!requestedWallet&&<div className="admin-warning">LEGACY DEMO PROFILE. Connect a wallet to create your own citizen file.</div>}
    {requestedWallet&&!isOwnWallet&&<div className="admin-warning" style={{borderColor:'#59682d',color:'var(--acid)'}}>PUBLIC WALLET PROFILE · PRIVATE SESSION DATA HIDDEN.</div>}
    {!wallet.address&&<button className="lv-button primary profile-connect" onClick={()=>wallet.connectWallet().catch(()=>undefined)}><Wallet /> CONNECT MY CITIZEN FILE</button>}
    <section className="profile-stats"><article><strong>{stats.built}</strong><small>THINGS BUILT</small></article><article><strong>{stats.proposals}</strong><small>PROPOSALS</small></article><article><strong>{stats.passed}</strong><small>PASSED</small></article><article><strong>{stats.votes}</strong><small>VOTE POWER USED</small></article></section>
    <div className="product-grid"><section className="lv-panel"><header className="lv-panel-head"><h2><Hammer /> BUILT BY @{username}</h2><span>{built.length} VISIBLE</span></header><div className="asset-list">{built.length?built.map((object)=><article className="asset-row" key={object.id}><div className="asset-symbol"><Hammer /></div><div><b>{object.title}</b><small>{object.district} · BUILT {object.builtAt}</small></div><strong>{object.yesPercent}% YES<small>FINAL POWER</small></strong></article>):<div className="empty-state">Nothing built yet. The town remains vulnerable.</div>}</div><div style={{padding:16}}><Link className="lv-button" href="/world">FIND IT IN THE WORLD <ArrowUpRight /></Link></div></section><aside className="lv-panel"><header className="lv-panel-head"><h2><Vote /> PUBLIC ACTIVITY</h2><span>WALLET-LINKED</span></header><ul className="activity-list">{authored.slice(0,4).map((proposal)=><li key={proposal.id}><i />Proposed {proposal.title}<span>{proposal.status}</span></li>)}{ownReceipts.slice(0,4).map((receipt,index)=><li key={`${receipt.blockNumber}-${index}`}><i />Voted {receipt.choice} with ×{receipt.weight}<span>#{receipt.blockNumber}</span></li>)}{!authored.length&&!ownReceipts.length&&<li><i />No wallet-linked activity yet.<span>—</span></li>}</ul></aside></div>
  </ProductShell>;
}
