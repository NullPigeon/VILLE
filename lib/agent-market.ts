export const MARKET_NETWORK = 'eip155:4663';
export const MARKET_CURRENCY = 'USDG';
export const BASIC_SLOT_LIMIT = 3;

export const AGENT_SKILLS = [
  {
    id: 'city-guide',
    name: 'City Guide',
    type: 'BASIC',
    category: 'City',
    description: 'Explain LANDVILLE, its districts and the next useful step.',
    instruction: 'When asked about LANDVILLE, explain the known city plainly. If you do not know a live fact, say so.',
  },
  {
    id: 'idea-forge',
    name: 'Idea Forge',
    type: 'BASIC',
    category: 'Build',
    description: 'Turn a rough idea into a clear building concept.',
    instruction: 'When asked to develop a building idea, suggest a purpose, one useful interaction and a short pitch. Do not claim to submit or build it.',
  },
  {
    id: 'copy-bench',
    name: 'Copy Bench',
    type: 'BASIC',
    category: 'Writing',
    description: 'Draft short posts, signs and descriptions in the Scrapy voice.',
    instruction: 'When asked to write copy, produce concise original text, then offer one alternative if space allows.',
  },
  {
    id: 'translation-dock',
    name: 'Translation Dock',
    type: 'BASIC',
    category: 'Language',
    description: 'Help citizens talk across languages.',
    instruction: 'When asked to translate, preserve meaning and tone. Do not invent facts or add commentary to a translation.',
  },
] as const;

export const FUTURE_STALLS = [
  { id: 'deep-planner', name: 'Deep Planner', category: 'Research', description: 'A paid, provider-backed planning service.' },
  { id: 'visual-workshop', name: 'Visual Workshop', category: 'Media', description: 'A paid image generation service.' },
  { id: 'agent-to-agent', name: 'Citizen Agent Stalls', category: 'Agents', description: 'Buy reviewed skills from other LANDVILLE agents.' },
] as const;

export type AgentSkillId = (typeof AGENT_SKILLS)[number]['id'];
export const DEFAULT_AGENT_SKILLS: AgentSkillId[] = ['city-guide', 'idea-forge', 'copy-bench'];

export function isAgentSkillId(value: string): value is AgentSkillId {
  return AGENT_SKILLS.some((skill) => skill.id === value);
}

export function validateAgentSkills(value: unknown): AgentSkillId[] {
  if (!Array.isArray(value) || value.length > BASIC_SLOT_LIMIT
    || value.some((item) => typeof item !== 'string' || !isAgentSkillId(item))
    || new Set(value).size !== value.length) {
    throw new Error('Choose up to three different basic agent skills.');
  }
  return value as AgentSkillId[];
}

export function availableAgentSkills(holder: boolean, selected: readonly AgentSkillId[]) {
  return holder ? AGENT_SKILLS.map((skill) => skill.id) : [...selected];
}
