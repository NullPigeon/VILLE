'use client';
import Link from 'next/link';
import { ArrowUpRight, Check, Hammer, Lightbulb, MapPin, Vote } from 'lucide-react';
import { useLandville } from '@/components/landville/provider';
import { useWallet } from '@/components/landville/wallet-provider';
import type { ProposalRecord } from '@/lib/landville-data';

const steps = [{ label: 'Your idea', icon: Lightbulb }, { label: 'Town votes', icon: Vote }, { label: 'Build & review', icon: Hammer }, { label: 'Open in World', icon: MapPin }];

export function BuildJourney({ proposal }: { proposal?: ProposalRecord }) {
  const current = !proposal ? 0 : proposal.status === 'BUILT' ? 3 : ['PASSED','BUILDING'].includes(proposal.status) ? 2 : 1;
  return <ol className="city-build-journey" aria-label={proposal ? `Build progress for ${proposal.title}` : 'How your idea becomes a building'}>
    {steps.map(({ label, icon: Icon }, index) => <li key={label} className={index < current ? 'complete' : index === current ? 'current' : ''} aria-current={index === current ? 'step' : undefined}>
      <span>{index < current ? <Check /> : <Icon />}</span><b>{label}</b>
    </li>)}
  </ol>;
}

export function MyBuilds() {
  const { proposals, objects, status } = useLandville();
  const wallet = useWallet();
  const own = proposals.filter((proposal) => wallet.address && proposal.creatorWallet?.toLowerCase() === wallet.address.toLowerCase())
    .sort((a, b) => Number(['LIVE','PASSED','BUILDING'].includes(b.status)) - Number(['LIVE','PASSED','BUILDING'].includes(a.status)) || Date.parse(b.createdAt) - Date.parse(a.createdAt)).slice(0, 3);
  if (!wallet.address || !own.length || status !== 'ready') return null;
  return <section className="city-my-builds" aria-label="Your build progress"><header><h2>Your builds.</h2><Link href="/proposals">All proposals <ArrowUpRight /></Link></header>
    <div>{own.map((proposal) => {
      const object = objects.find((item) => item.id === proposal.id);
      const label = proposal.status === 'LIVE' ? 'Voting open' : proposal.status === 'PASSED' ? 'Approved · in queue' : proposal.status === 'BUILDING' ? 'Building & review' : proposal.status === 'BUILT' ? 'Ready to visit' : 'Not approved';
      return <article key={proposal.id}><div className="city-build-card-heading"><span><small>{proposal.id} / {proposal.district}</small><h3>{proposal.title}</h3></span><span className={`status-tag ${proposal.status}`}>{label}</span></div>
        {proposal.status !== 'REJECTED' && <BuildJourney proposal={proposal} />}
        <Link className="lv-button" href={object?.modulePath || `/proposals#${proposal.id}`}>{object?.modulePath ? 'Visit your building' : 'View progress & votes'}<ArrowUpRight /></Link>
      </article>;
    })}</div>
  </section>;
}
