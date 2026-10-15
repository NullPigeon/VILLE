export const BUILDING_DESIGNS = ['GALLERY', 'SALOON', 'RELAY', 'WORKSHOP', 'BAZAAR'] as const;
export type BuildingDesign = typeof BUILDING_DESIGNS[number];
export type BuildingMaterial = 'RUST' | 'BRASS' | 'OLIVE';
export type BuildingAccent = 'LIME' | 'AMBER' | 'CYAN';

export function buildingDesignFromBrief(brief: string, title: string, kind: string): BuildingDesign {
  const match = brief.match(/(?:^|\n)BUILDING DESIGN:\s*(GALLERY|SALOON|RELAY|WORKSHOP|BAZAAR)\s*(?:\n|$)/i);
  if (match) return match[1].toUpperCase() as BuildingDesign;
  const name = title.toLowerCase();
  if (/forge|repair|machine|garage|workshop/.test(name)) return 'WORKSHOP';
  if (/portrait|gallery|\bart\b|museum/.test(name)) return 'GALLERY';
  if (/club|lounge|cafe|\bbar\b|social/.test(name)) return 'SALOON';
  if (/market|shop|trade|stall/.test(name) || kind === 'meme') return 'BAZAAR';
  if (kind === 'art') return 'GALLERY';
  if (kind === 'venue') return 'SALOON';
  return 'RELAY';
}

export function buildingFinishFromBrief(brief: string): { material: BuildingMaterial; accent: BuildingAccent } {
  const material = brief.match(/(?:^|\n)BUILDING MATERIAL:\s*(RUST|BRASS|OLIVE)\s*(?:\n|$)/i)?.[1]?.toUpperCase() as BuildingMaterial | undefined;
  const accent = brief.match(/(?:^|\n)NEON ACCENT:\s*(LIME|AMBER|CYAN)\s*(?:\n|$)/i)?.[1]?.toUpperCase() as BuildingAccent | undefined;
  return { material: material || 'RUST', accent: accent || 'LIME' };
}
