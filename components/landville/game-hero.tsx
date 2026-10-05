import type { HeroSkin } from '@/lib/world-presence';
export { HERO_SKINS } from '@/lib/world-presence';
export type { HeroSkin } from '@/lib/world-presence';

export const HERO_SKIN_LABELS: Record<HeroSkin, string> = {
  SCAVENGER: 'Scrap Scout',
  ROADRUNNER: 'Roadrunner',
  SIGNAL: 'Signal Rider',
};

const palettes = {
  SCAVENGER: { coat: '#b77042', shade: '#64412e', trim: '#d5b880', hood: '#5c6e43', glow: '#d1f06e' },
  ROADRUNNER: { coat: '#c6a565', shade: '#6e5335', trim: '#f0d9a1', hood: '#3d5051', glow: '#93e8df' },
  SIGNAL: { coat: '#597f70', shade: '#2c4f4a', trim: '#b6d3ad', hood: '#283b33', glow: '#cefb59' },
} as const;

export function GameHero({ skin = 'SCAVENGER', className = '' }: { skin?: HeroSkin; className?: string }) {
  const ink = '#21251b';
  const p = palettes[skin];
  return <svg className={`game-hero ${className}`} viewBox="0 0 92 136" fill="none" aria-label={`${HERO_SKIN_LABELS[skin]} city hero`}>
    <ellipse cx="46" cy="128" rx="30" ry="6" fill="#292d1c" opacity=".32" />
    <g className="game-hero-legs">
      <path d="M31 91 29 119 39 121 46 101 52 121 62 119 60 90Z" fill={p.shade} stroke={ink} strokeWidth="4" strokeLinejoin="round" />
      <path d="M28 115 39 116 40 125 23 126 22 121ZM51 116 62 115 70 121 68 126 51 125Z" fill="#383a30" stroke={ink} strokeWidth="3" strokeLinejoin="round" />
      <path d="m33 106 7 2m12 0 7-2" stroke={p.trim} strokeWidth="3" />
    </g>
    <g className="game-hero-body">
      <path d="m28 51-11 9 5 34 12 4 12-9 13 9 12-5 5-32-13-10Z" fill={p.coat} stroke={ink} strokeWidth="4" strokeLinejoin="round" />
      <path d="m26 56 20 13 20-13-7 30-13 11-13-11Z" fill={p.shade} stroke={ink} strokeWidth="3" />
      <path d="M42 65h8v28h-8z" fill={p.trim} />
      <path d="M31 88h30l-2 9H33Z" fill="#3e4231" stroke={ink} strokeWidth="3" />
      <rect x="42" y="88" width="10" height="8" rx="1" fill={p.glow} stroke={ink} strokeWidth="2" />
      <path d="m20 61-8 25 7 7 11-24m43-8 8 25-7 7-11-24" fill={p.coat} stroke={ink} strokeWidth="4" strokeLinejoin="round" />
      <path d="m11 84-2 14 12 3 5-12m58-5 1 14-13 3-5-12" fill="#806d4e" stroke={ink} strokeWidth="3" />
      <path d="m16 87 8 3m44 0 8-3" stroke={p.glow} strokeWidth="3" />
    </g>
    <g className="game-hero-head">
      <path d="M25 32q-2-21 20-25 24 0 25 23l-6 22-18 10-18-10Z" fill={p.hood} stroke={ink} strokeWidth="4" strokeLinejoin="round" />
      <path d="M30 33q3-13 16-14 14 0 18 14l-2 16-17 7-15-7Z" fill="#a77955" stroke={ink} strokeWidth="3" />
      <path d="M29 31 22 27l8-13 13-7 22 6 7 16-10 2-4-9-16-3-10 6Z" fill={p.hood} stroke={ink} strokeWidth="3" />
      <path d="M31 33h31l-3 13H34Z" fill="#263c32" stroke={ink} strokeWidth="3" />
      <path d="m36 38 9 2 4-2 9 1" stroke={p.glow} strokeWidth="4" strokeLinecap="square" />
      <path d="m36 50 9 6 12-6" stroke={ink} strokeWidth="3" strokeLinecap="round" />
      <path d="M24 30 15 36l5 10 9-3M68 29l9 6-5 11-8-3" fill={p.trim} stroke={ink} strokeWidth="3" />
      <path d="m32 13 10-5 20 4" stroke={p.glow} strokeWidth="3" strokeLinecap="round" />
    </g>
    {skin === 'SCAVENGER' && <g><path d="m68 56 13-10 6 22-13 7" fill="#81704f" stroke={ink} strokeWidth="3" /><path d="m75 52 7 11" stroke={p.glow} strokeWidth="3" /></g>}
    {skin === 'ROADRUNNER' && <g><path d="m24 17-10-8 8 18m45-10 11-8-7 20" fill={p.trim} stroke={ink} strokeWidth="3" /><path d="m7 69 8-4m-9 13 7-2" stroke={p.glow} strokeWidth="3" /></g>}
    {skin === 'SIGNAL' && <g><path d="M46 7V1m0 0 8 4" stroke={ink} strokeWidth="3" /><circle cx="54" cy="5" r="3" fill={p.glow} stroke={ink} strokeWidth="2" /><path d="m16 57 9-4m53 0 9 5" stroke={p.glow} strokeWidth="3" /></g>}
  </svg>;
}
