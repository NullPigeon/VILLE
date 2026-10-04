import { WORLD_DISTRICTS } from './world-districts';
import type { AgentPersonality, AgentWorldRoamMode } from './personal-agent';

const DEFAULT_LINES: Record<AgentPersonality, string[]> = {
  CHEEKY: ['Scrapy calls this a shortcut.', 'Lost a bolt. Found a city.', 'Officially on a very important stroll.'],
  DEADPAN: ['Still operational. Mostly.', 'This street has excellent dust.', 'Patrol status: mildly interesting.'],
  DRAMATIC: ['Behold! The legendary sidewalk!', 'My destiny awaits beyond that corner.', 'The sand remembers my wheel.'],
  CHAOTIC: ['Wrong turn. Better story.', 'I was following a suspicious sandwich.', 'This is absolutely the route I planned.'],
};

type AgentWorldMotion = {
  wallet: string;
  home: { x: number; y: number };
  mapWidth: number;
  mapHeight: number;
  cityHeight: number;
  roamMode: AgentWorldRoamMode;
  personality: AgentPersonality;
  speechEnabled: boolean;
  phrases: string[];
  now: number;
};

export function agentWorldMotion(agent: AgentWorldMotion) {
  const { home, mapWidth, mapHeight, cityHeight } = agent;
  if (!agent.now) return { x: home.x, y: home.y, speech: '' };
  let hash = 17;
  for (const char of agent.wallet.toLowerCase()) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  const center = { x: mapWidth * .5, y: cityHeight * .5 };
  const districts = WORLD_DISTRICTS.filter((district) => district.id !== 'townwide')
    .map((district) => ({ x: mapWidth * district.x / 100, y: cityHeight * district.y / 100 }));
  const nearby = [...districts].sort((a, b) =>
    Math.hypot(a.x - home.x, a.y - home.y) - Math.hypot(b.x - home.x, b.y - home.y));
  const route = agent.roamMode === 'HOME'
    ? [home, { x: home.x + 110, y: home.y + 35 }, { x: home.x + 75, y: home.y - 95 }, { x: home.x - 80, y: home.y - 50 }]
    : agent.roamMode === 'DISTRICTS'
      ? [home, nearby[0], center, nearby[1], center]
      : [home, center, ...districts.slice(hash % districts.length), ...districts.slice(0, hash % districts.length), center];
  const legMs = agent.roamMode === 'HOME' ? 22000 : 38000;
  const phase = (agent.now + hash * 997) % (legMs * route.length);
  const leg = Math.floor(phase / legMs);
  const rawProgress = (phase % legMs) / legMs;
  const progress = Math.max(0, Math.min(1, (rawProgress - .12) / .82));
  const from = route[leg];
  const to = route[(leg + 1) % route.length];
  const x = Math.max(65, Math.min(mapWidth - 65, from.x + (to.x - from.x) * progress));
  const y = Math.max(100, Math.min(mapHeight - 55, from.y + (to.y - from.y) * progress));
  const lines = agent.phrases.length ? agent.phrases : DEFAULT_LINES[agent.personality];
  const speechCycle = Math.floor((agent.now + hash * 173) / 88000);
  const speechWindow = (agent.now + hash * 173) % 88000 < 7800;
  return { x, y, speech: agent.speechEnabled && speechWindow ? lines[speechCycle % lines.length] : '' };
}
