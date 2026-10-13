import type { AgentPresentation } from '@/lib/personal-agent';
import type { RobotSkin } from '@/lib/world-presence';

export { ROBOT_SKINS } from '@/lib/world-presence';
export type { RobotSkin } from '@/lib/world-presence';

export const ROBOT_SKIN_LABELS: Record<RobotSkin, string> = {
  RUST: 'Rust Bucket', MINT: 'Mint Menace', EMBER: 'Hot Wiring',
  COBALT: 'Blue Signal', VIOLET: 'Night Shift', COPPER: 'Copperhead',
  NEON: 'Neon Runner', SAND: 'Dust Patrol', GRAFFITI: 'Graffiti Crew', FOREST: 'Green Circuit',
};

export function PersonalRobot({ presentation = 'MASCULINE', skin = 'RUST', className = '' }: {
  presentation?: AgentPresentation; skin?: RobotSkin; className?: string;
}) {
  const palette: Record<RobotSkin, { glow: string; shell: string }> = {
    RUST: { glow: '#c7ff00', shell: '#3b3d30' },
    MINT: { glow: '#9df9dc', shell: '#42685d' },
    EMBER: { glow: '#ffb35a', shell: '#9b5136' },
    COBALT: { glow: '#8fcfff', shell: '#315779' },
    VIOLET: { glow: '#e0a6ff', shell: '#544063' },
    COPPER: { glow: '#ffdc81', shell: '#865735' },
    NEON: { glow: '#e2ff4b', shell: '#794ca4' },
    SAND: { glow: '#fff0a9', shell: '#b79560' },
    GRAFFITI: { glow: '#ff78b7', shell: '#4b8c83' },
    FOREST: { glow: '#a6f2a2', shell: '#385a3d' },
  };
  const { glow, shell } = palette[skin];
  return (
    <svg className={`personal-robot ${className}`} viewBox="0 0 180 250" fill="none"
      xmlns="http://www.w3.org/2000/svg" aria-label="Boxy LANDVILLE robot on one wheel">
      <ellipse cx="91" cy="236" rx="45" ry="9" fill="#070907" opacity=".55" />
      <path d="M87 41V20M87 20L100 12" stroke="#9B855D" strokeWidth="6" strokeLinecap="square" />
      <circle cx="101" cy="11" r="7" fill={glow} className="personal-robot-antenna" />
      <path d="M31 65L19 75V133L34 143L45 131V77L31 65ZM148 65L161 77V132L147 143L136 131V76L148 65Z"
        fill="#302F28" stroke="#9A8359" strokeWidth="4" />
      <path d="M19 128L9 151L21 159L40 137M160 128L171 151L159 159L140 137"
        stroke="#B49A6E" strokeWidth="8" strokeLinecap="square" />
      <path d="M40 48L141 44L153 142L135 166L47 169L28 146L40 48Z"
        fill={shell} stroke="#211f19" strokeWidth="7" strokeLinejoin="round" />
      <path d="M42 51 139 47 147 139 133 159 48 163 33 143Z" stroke="#D5B881" strokeWidth="2" />
      <path d="m37 99 13 7m-11 2 12 6m-9 4 9 5m-8 3 12 7m85-35-11 8m13 2-13 9m12 1-11 9m9 1-12 10" stroke="#131b15" strokeWidth="2" strokeLinecap="round" opacity=".6" />
      <path d="m54 151 11-2m51-4 12-6m-50 14 9-1" stroke="#f2d49a" strokeWidth="1.5" opacity=".7" />
      <path d="M39 61L140 57L145 91L34 96L39 61Z" fill="#111A14" stroke="#A38653" strokeWidth="4" />
      <path d="M47 72H66L75 82L65 87H45M133 70H113L104 81L115 86H135"
        fill={presentation === 'FEMININE' ? '#FFCF7D' : glow} className="personal-robot-eyes" />
      <path d="M67 80 73 84m39-4-5 4" stroke="#142c1b" strokeWidth="3" />
      <path d="m51 111 10 7 10-5m36 0 10 6 11-7" stroke="#20231d" strokeWidth="4" />
      <path d="M80 116h22l-4 8H84Z" fill="#171c18" stroke={glow} strokeWidth="2" />
      <path d="M63 112H116M69 125H110M78 139H100" stroke="#8E805E" strokeWidth="5" />
      <path d="M33 99L48 102M134 101L148 97M46 157L55 173H127L137 155"
        stroke={glow} strokeWidth="4" />
      <path d="M70 174L78 193H106L114 173" fill="#9C6C3F" stroke="#D7B485" strokeWidth="5" />
      <circle cx="92" cy="217" r="25" fill="#1A1B17" stroke="#A7946B" strokeWidth="7" />
      <circle cx="92" cy="217" r="10" fill={glow} />
      <path d="M36 43L45 27L65 32M146 41L136 26L116 32"
        stroke="#A58658" strokeWidth="6" strokeLinecap="square" />
      <path d="M44 45L134 40" stroke={glow} strokeWidth="3" />
      <rect x="54" y="102" width="14" height="7" fill="#C46D3A" />
      <rect x="115" y="132" width="15" height="7" fill="#C46D3A" />
      <path d="M34 49 20 52 15 66l10 4 10-8m113-14 15 7 3 15-11 2-10-10" fill="#80724d" stroke="#26251e" strokeWidth="4" />
      <path d="m42 173 16 8m77-12-18 11" stroke="#26251e" strokeWidth="5" />
      <path d="M69 150h42" stroke="#201f19" strokeWidth="4" />
      <path d="M78 151h7m8 0h7" stroke={glow} strokeWidth="3" />
      {skin === 'RUST' && <path d="M142 69h16l8 22-16 4" fill="#916746" stroke="#26251e" strokeWidth="4" />}
      {skin === 'MINT' && <path d="m45 38-17-9 6-13 22 9" fill="#b1dfbc" stroke="#26251e" strokeWidth="4" />}
      {skin === 'EMBER' && <path d="M58 34 76 20l26 4 18 13" stroke="#ffb35a" strokeWidth="7" strokeLinecap="square" />}
      {skin === 'COBALT' && <path d="M45 40h88m-74-9h60" stroke="#8fcfff" strokeWidth="5" strokeLinecap="square" />}
      {skin === 'VIOLET' && <path d="m39 39 20-13 28 8 28-13 20 12" stroke="#e0a6ff" strokeWidth="5" strokeLinecap="square" />}
      {skin === 'COPPER' && <path d="M48 35 61 23l25 8 30-9 17 13" stroke="#ffdc81" strokeWidth="5" strokeLinecap="square" />}
      {skin === 'NEON' && <path d="M45 43 66 23 84 37 105 18 137 42M49 151l15-17 14 10 18-15 23 18" stroke="#e2ff4b" strokeWidth="5" strokeLinecap="square" />}
      {skin === 'SAND' && <path d="M35 52h109M39 130l22 9 22-4 24 8 31-16M54 35l21-15 31 14 25-13" stroke="#6b4b2c" strokeWidth="5" strokeLinecap="square" />}
      {skin === 'GRAFFITI' && <path d="M43 52 61 28l16 18 21-22 33 17M45 143l31-18 16 18 39-29M60 157l14-9m31-18 23-13" stroke="#ff78b7" strokeWidth="5" strokeLinecap="square" />}
      {skin === 'FOREST' && <path d="M41 45 56 24l13 17 19-24 17 24 23-17 11 19M53 146l13-19 16 16 15-20 22 18" stroke="#b3da77" strokeWidth="5" strokeLinecap="square" />}
    </svg>
  );
}
