import type { CityProfession } from '@/lib/personal-agent';

export type AgentServiceStarter = {
  id: string;
  profession: CityProfession;
  title: string;
  description: string;
  instructions: string;
  preferredKinds: readonly ('model' | 'long-form' | 'research-brief')[];
};

// Starters prepare editable text-service recipes. They do not perform city actions or buy tools.
export const AGENT_SERVICE_STARTERS: readonly AgentServiceStarter[] = [
  { id: 'building-brief', profession: 'BUILDER', title: 'Building Brief',
    description: 'Turn a rough place idea into a clear brief with a purpose, layout and useful interaction.',
    instructions: 'Read the buyer\'s idea. Return a concise building brief with: purpose, intended citizens, three spatial zones, one useful interaction, accessibility, maintenance needs and two open questions. Do not say the building was submitted or built.',
    preferredKinds: ['long-form', 'model'] },
  { id: 'repair-plan', profession: 'MECHANIC', title: 'Repair Plan',
    description: 'Turn a reported problem into a practical inspection and repair checklist.',
    instructions: 'Use only the symptoms supplied by the buyer. Separate observations from likely causes. Return a prioritized inspection checklist, materials or people needed, and a safe first step. Flag missing information. Do not claim to have inspected or repaired anything.',
    preferredKinds: ['model', 'long-form'] },
  { id: 'research-plan', profession: 'RESEARCHER', title: 'Research Plan',
    description: 'Shape a question into a research plan with source criteria and checks.',
    instructions: 'Turn the buyer\'s question into a focused research plan. Include search terms, credible source types, claims to verify, and a concise output outline. If live sources are unavailable to this service, do not invent citations or imply that a web search was performed.',
    preferredKinds: ['research-brief', 'model'] },
  { id: 'listing-copy', profession: 'TRADER', title: 'Market Listing Copy',
    description: 'Write a clear service listing with its input, output, limits and price explanation.',
    instructions: 'From the buyer\'s notes, draft a service title, one-sentence value proposition, required buyer input, expected deliverable, scope limits, and three FAQs. Avoid promises of profit, guaranteed results or services the seller cannot provide.',
    preferredKinds: ['model', 'long-form'] },
  { id: 'newcomer-route', profession: 'GUIDE', title: 'Newcomer Route',
    description: 'Create a short, friendly path through the city for a new citizen.',
    instructions: 'Use the buyer\'s goal and known LANDVILLE features to write a simple sequence of next steps. Explain where to find the World, yard, Market and job board when relevant. Do not claim to register, purchase, vote or submit on the buyer\'s behalf.',
    preferredKinds: ['model', 'long-form'] },
  { id: 'creative-brief', profession: 'ARTIST', title: 'Creative Brief',
    description: 'Turn an idea into an art direction brief for a place, event or campaign.',
    instructions: 'Produce an original brief with audience, mood, color direction, key visual elements, suggested copy and three concrete deliverables. Describe visual concepts in text. Do not claim that an image or audio file has been generated.',
    preferredKinds: ['long-form', 'model'] },
  { id: 'handoff-plan', profession: 'COURIER', title: 'Project Handoff',
    description: 'Organize a request into owners, steps, dependencies and a handoff checklist.',
    instructions: 'Convert the buyer\'s request into a coordination plan with responsibilities, sequence, dependencies, completion criteria and questions for the next owner. Do not claim to send messages, reserve resources or complete a delivery.',
    preferredKinds: ['model', 'long-form'] },
  { id: 'power-plan', profession: 'POWER_KEEPER', title: 'Power Needs Plan',
    description: 'Map an imagined building’s power needs, dependencies and failure points.',
    instructions: 'Create a conceptual infrastructure plan from the buyer\'s building description. List likely demand, possible supply, dependencies, failure modes and measurements needed before any real estimate. Do not present fictional energy quantities as live city balances.',
    preferredKinds: ['long-form', 'model'] },
];

export function starterForProfession(profession: CityProfession) {
  return AGENT_SERVICE_STARTERS.find((starter) => starter.profession === profession);
}
