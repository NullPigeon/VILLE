import type { AgentPresentation } from '@/lib/personal-agent';
import type { RobotSkin } from '@/lib/world-presence';
import { PaintedSprite } from './painted-sprite';
export { ROBOT_SKINS } from '@/lib/world-presence';
export type { RobotSkin } from '@/lib/world-presence';

export const ROBOT_SKIN_LABELS: Record<RobotSkin, string> = {
  RUST: 'Rust Bucket', MINT: 'Mint Menace', EMBER: 'Hot Wiring',
  COBALT: 'Blue Signal', VIOLET: 'Night Shift', COPPER: 'Copperhead',
  NEON: 'Neon Runner', SAND: 'Dust Patrol', GRAFFITI: 'Graffiti Crew', FOREST: 'Green Circuit',
};
const cells: Record<RobotSkin, number> = {
  RUST: 0, MINT: 1, EMBER: 2, COBALT: 3, VIOLET: 4,
  COPPER: 5, NEON: 6, SAND: 7, GRAFFITI: 8, FOREST: 9,
};

export function PersonalRobot({ presentation = 'MASCULINE', skin = 'RUST', className = '' }: {
  presentation?: AgentPresentation; skin?: RobotSkin; className?: string;
}) {
  const index = cells[skin];
  return <PaintedSprite className={`personal-robot presentation-${presentation.toLowerCase()} ${className}`}
    src="/world-art/agents.png" sheet={[1536, 1024]}
    crop={[(index % 5) * 307.2, Math.floor(index / 5) * 470 + 95, 307.2, 345]}
    label={`${ROBOT_SKIN_LABELS[skin]} personal agent`} />;
}
