import Image from 'next/image';
import { useState } from 'react';
import type { WorldObjectRecord } from '@/lib/landville-data';
import { buildingDesignFromBrief } from '@/lib/building-design';
import { PaintedSprite } from './painted-sprite';

// Existing buildings use painted exteriors; approved AI artwork takes priority.
const crops = {
  GALLERY: [0, 0, 485, 525], SALOON: [485, 0, 580, 525], RELAY: [1065, 0, 471, 525],
  WORKSHOP: [0, 525, 545, 499], BAZAAR: [545, 525, 540, 499],
} as const;

export function WorldBuildingArt({ kind, seed = '', title = '', description = '', approved = false }: {
  kind: WorldObjectRecord['kind']; seed?: string; title?: string; description?: string; approved?: boolean;
}) {
  const [failedSeed, setFailedSeed] = useState<string | null>(null);
  const design = buildingDesignFromBrief(description, title, kind);
  if (approved && failedSeed !== seed && /^LV-[0-9]+$/.test(seed)) return <Image unoptimized width={300} height={300}
    className="world-building-art generated-building-art" src={`/api/world/buildings/${seed}/image`}
    alt="" draggable={false} onError={() => setFailedSeed(seed)} />;
  return <PaintedSprite className={`world-building-art design-${design.toLowerCase()}`}
    src="/world-art/buildings.png" sheet={[1536, 1024]} crop={crops[design]} />;
}
