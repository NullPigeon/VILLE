const TITLE_PATTERN = /(?:^|\n)PROPOSAL TITLE:\s*([^\r\n]{4,80})(?:\r?\n|$)/i;
const REQUIRED_PLAN_FIELDS = ['PURPOSE', 'FUNCTIONS', 'PLACEMENT', 'VISUAL'] as const;
export const WORLD_FEATURE_KINDS = ['SIGNAL_MAST', 'NEON_SIGN', 'SOLAR_RIG', 'GARDEN'] as const;
export type WorldFeatureKind = typeof WORLD_FEATURE_KINDS[number];

export function worldFeatureKindFromBrief(brief: string): WorldFeatureKind | null {
  const match = brief.match(/(?:^|\n)WORLD CHANGE:\s*(SIGNAL_MAST|NEON_SIGN|SOLAR_RIG|GARDEN)\s*(?:\n|$)/i);
  const kind = match?.[1]?.toUpperCase();
  return WORLD_FEATURE_KINDS.find((item) => item === kind) || null;
}

export function scrapyProposalDraft(request: string, reply: string) {
  const match = reply.match(TITLE_PATTERN);
  if (!match) return null;
  const title = match[1].trim();
  if (title.length < 4 || title.length > 80) return null;
  const plan = reply.replace(match[0], '\n').trim();
  if (plan.length < 120 || REQUIRED_PLAN_FIELDS.some((field) => !new RegExp(`(?:^|\\n)${field}:\\s*\\S`, 'i').test(plan))) return null;
  return { title, summary: `${request.trim()}\n\nSCRAPY'S PLAN:\n${plan}`, worldFeatureKind: worldFeatureKindFromBrief(plan) };
}
