import type { AgentHouse } from '@/lib/personal-agent';
import { PaintedSprite } from './painted-sprite';

export function AgentHouseArt({ style, className = '' }: { style: AgentHouse; className?: string }) {
  const crop = { SCRAP_SHACK: [0, 340, 520, 650], RELAY_GARAGE: [520, 160, 590, 830], LOOKOUT_TOWER: [1110, 0, 426, 1000] } as const;
  return <PaintedSprite className={`agent-house-art ${className}`} src="/world-art/homes.png"
    sheet={[1536, 1024]} crop={crop[style]}
    label={{ SCRAP_SHACK: 'Scrap Shack', RELAY_GARAGE: 'Relay Garage', LOOKOUT_TOWER: 'Lookout Tower' }[style]} />;
}
