export const HERO_SKINS = ['SCAVENGER', 'ROADRUNNER', 'SIGNAL'] as const;
export type HeroSkin = (typeof HERO_SKINS)[number];
export type WorldHeroSkin = HeroSkin | 'MODULE';

export const ROBOT_SKINS = ['RUST', 'MINT', 'EMBER', 'COBALT', 'VIOLET', 'COPPER', 'NEON', 'SAND', 'GRAFFITI', 'FOREST'] as const;
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
  // Spread residents across districts while keeping a stable location per citizen.
  const radius = 3000 + (citizenNumber % 5) * 370;
  return {
    x: Math.round(5000 + Math.cos(angle) * radius),
    y: Math.round(5000 + Math.sin(angle) * radius * 0.9),
  };
}
