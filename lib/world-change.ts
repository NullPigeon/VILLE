import { WORLD_DISTRICTS } from '@/lib/world-districts';
export { WORLD_FEATURE_KINDS, worldFeatureKindFromBrief } from '@/lib/proposal-draft';
export type { WorldFeatureKind } from '@/lib/proposal-draft';
import type { WorldFeatureKind } from '@/lib/proposal-draft';

export type WorldFeatureRecord = {
  proposalId: string;
  title: string;
  district: string;
  kind: WorldFeatureKind;
  x: number;
  y: number;
  publishedAt: string;
};

export function worldFeaturePlacement(proposalId: string, districtLabel: string) {
  const district = WORLD_DISTRICTS.find((item) => item.proposalLabel === districtLabel) || WORLD_DISTRICTS[4];
  const sequence = Number(proposalId.replace(/^LV-/, '')) || 1;
  const angle = sequence * 2.399963229728653;
  const ring = 5.5 + (sequence % 3) * 2;
  return {
    x: Math.round(Math.max(8, Math.min(92, district.x + Math.cos(angle) * ring)) * 100) / 100,
    y: Math.round(Math.max(8, Math.min(92, district.y + Math.sin(angle) * ring)) * 100) / 100,
  };
}
