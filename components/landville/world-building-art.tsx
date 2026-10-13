import { useId } from 'react';
import type { WorldObjectRecord } from '@/lib/landville-data';

// Each published module keeps its live preview, framed as an actual scrap-built shop.
export function WorldBuildingArt({ kind }: { kind: WorldObjectRecord['kind'] }) {
  const inkId = useId().replace(/:/g, '');
  const palette = {
    venue: ['#cf9450', '#795039', '#f3cb7b'],
    utility: ['#659d8e', '#36584d', '#b1cf98'],
    art: ['#bb7c8b', '#674b61', '#edba9d'],
    media: ['#8698ba', '#485d72', '#bdc9cc'],
    meme: ['#b3be53', '#64723c', '#e4e989'],
  }[kind];
  return <svg className="world-building-art" viewBox="0 0 220 230" aria-hidden="true" fill="none" stroke="#171b14" strokeWidth="4" strokeLinejoin="round">
    <defs>
      <pattern id={`${inkId}-metal`} width="18" height="19" patternUnits="userSpaceOnUse" patternTransform="rotate(-18)">
        <path d="M1 2l9 1M4 6l13 1M0 12l7 1M10 15l6 1" stroke="#172017" strokeWidth="1.5" opacity=".42" />
        <path d="M12 4l3 1M2 16l3 1" stroke={palette[2]} strokeWidth="1" opacity=".55" />
      </pattern>
      <clipPath id={`${inkId}-walls`}><path d="M20 44 190 41v170l-170-5Z" /></clipPath>
    </defs>
    <path d="m12 206 188 15 20-22-179-14Z" fill="#1a1a12" opacity=".54" stroke="none" />
    <path d="M20 44 190 41l21-15v168l-20 17-171-5Z" fill={palette[1]} strokeWidth="5" />
    <path d="M20 44 43 23l168 3-21 15Z" fill={palette[0]} strokeWidth="5" />
    <path d="M21 47 189 44v164l-167-5Z" fill={`url(#${inkId}-metal)`} stroke="none" />
    <path d="m190 42 21-16v168l-21 17Z" fill="#1b251c" opacity=".5" stroke="none" />
    <path d="m195 47 11-10v151l-11 11Z" fill={palette[0]} opacity=".68" stroke="none" />
    <path d="m25 47 163-3m-151-9 157-2" stroke={palette[2]} strokeWidth="3" />
    <path d="M29 49 29 183 M184 47l-1 130" stroke="#101710" strokeWidth="7" />
    <path d="M36 50 36 174 M176 50l-1 131" stroke={palette[2]} strokeWidth="2.5" />
    <g clipPath={`url(#${inkId}-walls)`} stroke="#101810" strokeLinecap="round">
      <path d="m19 72 20-10m-18 23 15-7m150 23 23-12m-23 20 17-8M17 142l21-10m148 23 22-12M22 189l18-11m146 7 16-9" strokeWidth="3" />
      <path d="m44 59 7-4m80 7 13-4m-96 81 15-5m83 34 10-4m-89 14 9-4" strokeWidth="1.7" />
    </g>
    {[64, 89, 114, 139, 164].map((x) => <path key={x} d={`m${x} 25-15 14`} stroke="#293020" strokeWidth={x % 2 ? 2 : 3} opacity=".75" />)}
    <path d="M18 191h176v17H18Z" fill={palette[0]} strokeWidth="5" />
    <path d="m28 193-9 12m34-11-11 12m111-12-11 12m34-11-9 12" stroke="#1b2119" strokeWidth="7" />
    <path d="M66 197h83v12H66Z" fill="#626548" /><path d="M62 210h91v9H62Z" fill="#99936a" />
    <path d="m25 196 19-2m21 0 26-1m44 0 18 1m17-1 20 2" stroke={palette[2]} strokeWidth="2" />
    {kind === 'utility' ? <><path d="M51 23V-1h35v24" fill={palette[1]} /><path d="M56 4h25M56 11h25" stroke={palette[2]} /><path d="M145 22V-8m-15 5h29M137 7h17" /><circle cx="145" cy="-8" r="4" fill="#d4ed6b" /></>
      : kind === 'media' ? <><path d="M66 26V-7m-19-9Q45 11 90 8Z" fill={palette[2]} /><path d="m63-5 23-21" /><circle cx="86" cy="-26" r="4" fill="#d4ed6b" /></>
      : <><path d="M57 24v-13l108-4v17" fill={palette[1]} /><path d="m65 16 92-3" stroke={palette[2]} /><path d="M37 24V-3h9v27" fill="#555443" /></>}
    <path d="m199 64 7-5v51l-7 7Z" fill={palette[0]} /><path d="m200 73 4-3m-4 16 4-3m-4 16 4-3" stroke={palette[2]} strokeWidth="2" />
    {[27,185].map(x=><g key={x} fill="#f2dab0" strokeWidth="1.5"><circle cx={x} cy="48" r="2.2" /><circle cx={x} cy="197" r="2.2" /></g>)}
  </svg>;
}
