export const HERO_SKINS = ['SCAVENGER', 'ROADRUNNER', 'SIGNAL'] as const;
export type HeroSkin = (typeof HERO_SKINS)[number];
export type WorldHeroSkin = HeroSkin | 'MODULE';

export const ROBOT_SKINS = ['RUST', 'MINT', 'EMBER'] as const;
export type RobotSkin = (typeof ROBOT_SKINS)[number];

export type WorldResident = {
  wallet: string;
  citizenNumber: number;
  username: string | null;
  avatar: string;
};

export type WorldPresence = {
  wallet: string;
  x: number;
  y: number;
  heroSkin: WorldHeroSkin;
  robotSkin: RobotSkin;
  updatedAt: string;
};

export function residentSpawn(citizenNumber: number) {
  const angle = citizenNumber * 2.399963229728653;
  const radius = 2100 + (citizenNumber % 5) * 300;
  return {
    x: Math.round(5000 + Math.cos(angle) * radius),
    y: Math.round(5000 + Math.sin(angle) * radius * 0.75),
  };
}
