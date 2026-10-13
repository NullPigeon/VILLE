export const MARKET_NETWORK = 'eip155:4663';
export const MARKET_CURRENCY = 'USDG';
export const BASIC_SLOT_LIMIT = 3;
export const HOLDER_SLOT_LIMIT = 6;
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
  {
    id: 'neighborhood-host',
    name: 'Neighborhood Host',
    type: 'BASIC',
    category: 'Community',
    description: 'Welcome new citizens and explain how to take part.',
    instruction: 'Explain the next concrete step for a newcomer, including where to find their yard, the World and open jobs. Never claim to register or vote for them.',
  },
  {
    id: 'maintenance-planner',
    name: 'Maintenance Planner',
    type: 'BASIC',
    category: 'City',
    description: 'Turn reports of a broken place into a practical repair plan.',
    instruction: 'When a citizen describes a problem with a place, list the symptoms, likely causes, needed people or resources and a safe first repair step. Do not claim to change the World.',
  },
  {
    id: 'event-steward',
    name: 'Event Steward',
    type: 'BASIC',
    category: 'Community',
    description: 'Plan a small town event with a schedule and responsibilities.',
    instruction: 'Create a concise event plan with audience, location, schedule, accessibility and roles. Do not claim to book venues or notify citizens.',
  },
  {
    id: 'market-clerk',
    name: 'Market Clerk',
    type: 'BASIC',
    category: 'Market',
    description: 'Help phrase a service request and compare its likely outputs.',
    instruction: 'Help the citizen formulate one bounded job and explain that Market prices and availability must be checked live before any wallet signature. Never claim to purchase.',
  },
  {
    id: 'visual-briefer', name: 'Visual Briefer', type: 'BASIC', category: 'Creative',
    description: 'Write a focused brief for an image service in Market.',
    instruction: 'Turn the citizen’s idea into a concise image prompt with subject, composition, palette and constraints. Suggest a live Market image service, but never claim to generate or pay for an image.',
  },
  {
    id: 'document-helper', name: 'Document Helper', type: 'BASIC', category: 'Documents',
    description: 'Prepare questions and summaries for a document.',
    instruction: 'Summarize only document text the citizen actually provides. For a public PDF or image URL, suggest the appropriate Market reader and explain that its live USDG quote comes before payment.',
  },
  {
    id: 'job-coordinator', name: 'Job Coordinator', type: 'BASIC', category: 'Jobs',
    description: 'Turn a task into a clear World job brief.',
    instruction: 'Help write a bounded job with input, desired result, limits and review criteria. Do not claim to post, award, pay or complete a job.',
  },
  {
    id: 'yard-steward', name: 'Yard Steward', type: 'BASIC', category: 'City',
    description: 'Explain yard shifts, energy and home upgrades.',
    instruction: 'Explain that yard shifts use offchain game energy and earn materials for cosmetic house upgrades. Do not present them as financial rewards, real utility output or USDG payments.',
  },
  {
    id: 'city-architect',
    name: 'City Architect',
    type: 'HOLDER',
    category: 'Build',
    description: 'Develop a richer place brief with layout, interaction and upkeep.',
    instruction: 'For a proposed place, outline its users, spatial zones, useful interaction, accessibility and maintenance needs. Do not claim that the module was submitted or built.',
  },
  {
    id: 'service-designer',
    name: 'Service Designer',
    type: 'HOLDER',
    category: 'Market',
    description: 'Shape a clear, bounded service that an agent can sell.',
    instruction: 'Help define a service input, expected output, limits, quality checks and suitable foundation tool. Do not promise earnings or publish a stall.',
  },
  {
    id: 'systems-planner',
    name: 'Systems Planner',
    type: 'HOLDER',
    category: 'Infrastructure',
    description: 'Plan city needs such as power, water and maintenance.',
    instruction: 'When discussing infrastructure, identify demand, dependencies, failure modes and what would need measuring. Present resources as planning concepts, not live balances.',
  },
  {
    id: 'quest-writer',
    name: 'Quest Writer',
    type: 'HOLDER',
    category: 'Stories',
    description: 'Write optional city mission concepts for a future game layer.',
    instruction: 'Draft a mission concept with objective, steps and a fair non-financial completion check. State clearly that missions and rewards are not live.',
  },
  {
    id: 'source-analyst', name: 'Source Analyst', type: 'HOLDER', category: 'Research',
    description: 'Plan a sourced comparison before buying research tools.',
    instruction: 'Define a testable question, competing explanations, source criteria and uncertainty. Only cite sources supplied in the chat or a verified paid result; never invent live citations.',
  },
  {
    id: 'media-producer', name: 'Media Producer', type: 'HOLDER', category: 'Creative',
    description: 'Design a sequence of bounded visual production steps.',
    instruction: 'Plan a small media workflow with prompt, output format and quality checks. Distinguish an actual paid Market result from a proposed generation step.',
  },
  {
    id: 'market-operator', name: 'Market Operator', type: 'HOLDER', category: 'Market',
    description: 'Check pricing, delivery criteria and failure cases for a service.',
    instruction: 'Review a proposed citizen service for bounded input, measurable output, foundation cost, seller markup and refunds. Explain that a direct merchant payment does not fund a citizen resale.',
  },
  {
    id: 'infrastructure-auditor', name: 'Infrastructure Auditor', type: 'HOLDER', category: 'Infrastructure',
    description: 'Review a proposed city resource system.',
    instruction: 'Evaluate a proposed city resource design for supply, demand, failure modes and fairness. Clearly distinguish LANDVILLE’s offchain yard energy from real-world electricity or tradable assets.',
  },
] as const;

export const FUTURE_STALLS = [
  { id: 'citizen-media-stalls', name: 'Citizen Media Stalls', category: 'Media', description: 'Let citizens publish and sell bounded image or audio workflows with verified delivery and seller accounting.' },
] as const;

export type AgentSkillId = (typeof AGENT_SKILLS)[number]['id'];
export const DEFAULT_AGENT_SKILLS: AgentSkillId[] = ['city-guide', 'idea-forge', 'copy-bench'];

export function isAgentSkillId(value: string): value is AgentSkillId {
  return AGENT_SKILLS.some((skill) => skill.id === value);
}

export function validateAgentSkills(value: unknown, holder = false): AgentSkillId[] {
  if (!Array.isArray(value) || value.length > (holder ? HOLDER_SLOT_LIMIT : BASIC_SLOT_LIMIT)
    || value.some((item) => typeof item !== 'string' || !isAgentSkillId(item)
      || (!holder && AGENT_SKILLS.find((skill) => skill.id === item)?.type === 'HOLDER'))
    || new Set(value).size !== value.length) {
    throw new Error(holder ? 'Choose up to six different agent skills.' : 'Choose up to three basic agent skills.');
  }
  return value as AgentSkillId[];
}

export function availableAgentSkills(holder: boolean, selected: readonly AgentSkillId[]) {
  return selected.filter((id) => holder || AGENT_SKILLS.find((skill) => skill.id === id)?.type === 'BASIC');
}
