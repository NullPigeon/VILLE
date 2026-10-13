import type { CityProfession, YardFeature } from '@/lib/personal-agent';

export const YARD_ACTIONS = [
  { id: 'SURVEY', name: 'Survey a place', detail: 'Map what a new place needs.', roles: ['BUILDER', 'RESEARCHER'] },
  { id: 'REPAIR', name: 'Plan a repair', detail: 'Check upkeep and power needs.', roles: ['MECHANIC', 'POWER_KEEPER'] },
  { id: 'WELCOME', name: 'Welcome a visitor', detail: 'Prepare a route through town.', roles: ['GUIDE', 'COURIER'] },
  { id: 'CREATE', name: 'Sketch a sign', detail: 'Make a concept for a public place.', roles: ['ARTIST'] },
  { id: 'TRADE_PLAN', name: 'Plan a service', detail: 'Package a useful job for Market.', roles: ['TRADER'] },
  { id: 'GARDEN', name: 'Plan a garden', detail: 'Map a shared green corner.', roles: ['GARDENER'] },
  { id: 'ARCHIVE', name: 'File a city story', detail: 'Organize a local record.', roles: ['ARCHIVIST'] },
  { id: 'SAFETY', name: 'Check a place', detail: 'Flag access and safety gaps.', roles: ['SAFETY_STEWARD'] },
  { id: 'EVENT', name: 'Plan a gathering', detail: 'Outline a town event.', roles: ['EVENT_HOST'] },
] as const;

export type YardAction = (typeof YARD_ACTIONS)[number]['id'];
export type YardResourceRow = { owner_wallet: string; energy: number; materials: number; house_level: number; energy_at: string };
export type YardShift = { request_id: string; action: YardAction | 'UPGRADE'; energy_spent: number; materials_delta: number; created_at: string };
export type YardEconomy = { energy: number; capacity: 12; materials: number; houseLevel: number; dailyShifts: number;
  nextEnergyAt: string | null; upgradeCost: number | null; shifts: YardShift[] };

export function yardUpgradeCost(level: number) { return level >= 3 ? null : 6 * (level + 1); }

export function yardEnergy(row: YardResourceRow, feature: YardFeature, now = Date.now()) {
  const interval = (feature === 'SOLAR_RIG' ? 1 : 2) * 3_600_000;
  if (row.energy >= 12) return { energy: 12, nextEnergyAt: null };
  const anchor = new Date(row.energy_at).getTime();
  const elapsed = Math.max(0, now - anchor);
  const recovered = Math.min(12 - row.energy, Math.floor(elapsed / interval));
  const energy = row.energy + recovered;
  return { energy, nextEnergyAt: energy === 12 ? null : new Date(anchor + (recovered + 1) * interval).toISOString() };
}

export function yardMaterialGain(action: YardAction, profession: CityProfession) {
  return YARD_ACTIONS.find((item) => item.id === action)?.roles.some((role) => role === profession) ? 2 : 1;
}
