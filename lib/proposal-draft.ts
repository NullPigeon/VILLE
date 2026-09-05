const TITLE_PATTERN = /(?:^|\n)PROPOSAL TITLE:\s*([^\r\n]{4,80})(?:\r?\n|$)/i;

export function scrapyProposalDraft(request: string, reply: string) {
  const match = reply.match(TITLE_PATTERN);
  if (!match) return null;
  const title = match[1].trim();
  if (title.length < 4 || title.length > 80) return null;
  const plan = reply.replace(match[0], '\n').trim();
  if (!plan) return null;
  return { title, summary: `${request.trim()}\n\nSCRAPY'S PLAN:\n${plan}` };
}
