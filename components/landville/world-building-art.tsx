import type { WorldObjectRecord } from '@/lib/landville-data';

// Each published module keeps its live preview, framed as an actual scrap-built shop.
export function WorldBuildingArt({ kind }: { kind: WorldObjectRecord['kind'] }) {
  const palette = {
    venue: ['#cf9450', '#795039', '#f3cb7b'],
    utility: ['#659d8e', '#36584d', '#b1cf98'],
    art: ['#bb7c8b', '#674b61', '#edba9d'],
    media: ['#8698ba', '#485d72', '#bdc9cc'],
    meme: ['#b3be53', '#64723c', '#e4e989'],
  }[kind];
  return <svg className="world-building-art" viewBox="0 0 220 230" aria-hidden="true" fill="none" stroke="#272b20" strokeWidth="3.5" strokeLinejoin="round">
    <path d="m21 203 177 13 19-17-172-11Z" fill="#302919" opacity=".4" stroke="none" />
    <path d="M20 44 190 41l21-15v168l-20 17-171-5Z" fill={palette[1]} />
    <path d="M20 44 43 23l168 3-21 15Z" fill={palette[0]} />
    <path d="m190 42 21-16v168l-21 17Z" fill={palette[1]} />
    <path d="m25 44 169-1M37 34l157-1" stroke={palette[2]} strokeWidth="3" />
    {[64,89,114,139,164].map(x=><path key={x} d={`m${x} 25-15 14`} stroke="#343a2755" strokeWidth="2" />)}
    <path d="M18 191h176v17H18Z" fill={palette[0]} />
    <path d="m29 193-10 12m33-12-10 12m111-12-10 12m33-12-10 12" stroke="#3b3a25" strokeWidth="7" />
    <path d="M66 197h83v12H66Z" fill="#626548" /><path d="M62 210h91v9H62Z" fill="#99936a" />
    <path d="M31 51v130M181 51v130" stroke={palette[2]} strokeWidth="3" />
    {kind === 'utility' ? <><path d="M51 23V-1h35v24" fill={palette[1]} /><path d="M56 4h25M56 11h25" stroke={palette[2]} /><path d="M145 22V-8m-15 5h29M137 7h17" /><circle cx="145" cy="-8" r="4" fill="#d4ed6b" /></>
      : kind === 'media' ? <><path d="M66 26V-7m-19-9Q45 11 90 8Z" fill={palette[2]} /><path d="m63-5 23-21" /><circle cx="86" cy="-26" r="4" fill="#d4ed6b" /></>
      : <><path d="M57 24v-13l108-4v17" fill={palette[1]} /><path d="m65 16 92-3" stroke={palette[2]} /><path d="M37 24V-3h9v27" fill="#555443" /></>}
    <path d="m199 64 7-5v51l-7 7Z" fill={palette[0]} /><path d="m200 73 4-3m-4 16 4-3m-4 16 4-3" stroke={palette[2]} strokeWidth="2" />
    {[27,185].map(x=><g key={x} fill="#f2dab0" strokeWidth="1.5"><circle cx={x} cy="48" r="2.2" /><circle cx={x} cy="197" r="2.2" /></g>)}
  </svg>;
}
