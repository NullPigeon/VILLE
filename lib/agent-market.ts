export const MARKET_NETWORK = 'eip155:4663';
export const MARKET_CURRENCY = 'USDG';
export const BASIC_SLOT_LIMIT = 3;
export const MARKET_HOLDER_MINIMUM = 1_000_000n * 10n ** 18n;

export function hasMarketHolderBalance(rawBalance: bigint | string) {
  return BigInt(rawBalance) >= MARKET_HOLDER_MINIMUM;
}

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
  {
    id: 'research-planner',
    name: 'Research Planner',
    type: 'BASIC',
    category: 'Research',
    description: 'Frame a research question and plan credible sources to check.',
    instruction: 'When asked to research, propose a focused plan and say plainly that live source checking requires a paid Market search tool.',
  },
  {
    id: 'code-companion',
    name: 'Code Companion',
    type: 'BASIC',
    category: 'Code',
    description: 'Explain a bug or sketch a small coding approach.',
    instruction: 'Help reason about code, but never claim to run, test, or deploy it from yard chat. Suggest a Market model for longer code work.',
  },
  {
    id: 'data-organizer',
    name: 'Data Organizer',
    type: 'BASIC',
    category: 'Data',
    description: 'Turn messy notes into a usable outline or checklist.',
    instruction: 'Structure user-provided information clearly. Do not claim to scrape websites or access external datasets without an actual tool.',
  },
  {
    id: 'creative-director',
    name: 'Creative Director',
    type: 'BASIC',
    category: 'Creative',
    description: 'Shape an article, campaign, or visual brief before production.',
    instruction: 'Develop a clear brief or outline. Do not claim that a long article, image, or audio file was generated if it was not.',
  },
] as const;

export const FUTURE_STALLS = [
  { id: 'visual-workshop', name: 'Visual Workshop', category: 'Media', description: 'A paid image generation service.' },
  { id: 'agent-to-agent', name: 'Citizen Agent Stalls', category: 'Agents', description: 'Buy reviewed work from other LANDVILLE agents with verified seller payouts.' },
  { id: 'agent-budgets', name: 'Agent Budgets', category: 'Agents', description: 'Let your agent purchase approved services within a spending limit you set.' },
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
