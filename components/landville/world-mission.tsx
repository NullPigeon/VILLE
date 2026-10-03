'use client';
import Link from 'next/link';
import { ArrowRight, Check, Flag, Trophy } from 'lucide-react';
import { openCityChat } from '@/components/landville/mayor-presence';

export function WorldMission({ explored, discovered, hasPlaces, hasYard, profileHref, onExplore, onDiscover }: {
  explored: boolean; discovered: boolean; hasPlaces: boolean; hasYard: boolean;
  profileHref: string; onExplore: () => void; onDiscover: () => void;
}) {
  const steps = [explored, discovered, hasYard];
  const complete = steps.every(Boolean);
  return <div className="city-world-mission">
    <header>{complete ? <Trophy /> : <Flag />}<span>{complete ? 'YOU BELONG HERE' : 'FIRST JOB: SETTLE IN'}</span><b>{steps.filter(Boolean).length}/3</b></header>
    <ol aria-label="Your first city mission">
      {['Visit a district', 'Discover a building', 'Create your robot & yard'].map((label, index) =>
        <li key={label} className={steps[index] ? 'done' : ''}><span>{steps[index] ? <Check /> : index + 1}</span>{label}</li>)}
    </ol>
    {!explored ? <button onClick={onExplore}>Pick your first stop <ArrowRight /></button>
      : !discovered && hasPlaces ? <button onClick={onDiscover}>Show me a building <ArrowRight /></button>
      : !hasYard ? <Link href={profileHref}>Make yourself at home <ArrowRight /></Link>
      : <button onClick={() => openCityChat({ room: 'BUILD' })}>Bring your own idea <ArrowRight /></button>}
    <small>Exploration saved on this device.</small>
  </div>;
}
