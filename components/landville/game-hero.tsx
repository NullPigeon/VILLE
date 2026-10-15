import type { HeroSkin } from '@/lib/world-presence';
import { PaintedSprite } from './painted-sprite';
export { HERO_SKINS } from '@/lib/world-presence';
export type { HeroSkin } from '@/lib/world-presence';

export const HERO_SKIN_LABELS: Record<HeroSkin, string> = {
  SCAVENGER: 'Scrap Scout', ROADRUNNER: 'Roadrunner', SIGNAL: 'Signal Rider',
};

export function GameHero({ skin = 'SCAVENGER', className = '' }: { skin?: HeroSkin; className?: string }) {
  const column = { SCAVENGER: 0, ROADRUNNER: 1, SIGNAL: 2 }[skin];
  return <PaintedSprite className={`game-hero ${className}`} src="/world-art/citizens.png"
    sheet={[1536, 1024]} crop={[column * 512, 0, 512, 1024]} label={`${HERO_SKIN_LABELS[skin]} city hero`} />;
}
