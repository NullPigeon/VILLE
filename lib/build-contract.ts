// Shared, credential-free contract. Generated code is data, never a server import.
export type BuildSpec = { version: 1; runtime: 'sandbox-html'; goal: string; acceptance: string[]; constraints: string };
export type BuildJob = {
  proposal_id: string; state: 'READY' | 'RUNNING' | 'REVIEW' | 'FAILED' | 'RELEASED';
  spec: BuildSpec; attempt: number; lease_id: string | null; lease_until: string | null;
  branch: string | null; commit_sha: string | null; content_hash: string | null;
  pr_number: number | null; error: string | null; updated_at: string;
};
export type CityModule = { version: 1; proposalId: string; title: string; html: string; acceptance: string[] };

export function validProposalId(id: unknown): id is string { return typeof id === 'string' && /^LV-[1-9][0-9]{0,15}$/.test(id); }
export function validateSpec(value: unknown): BuildSpec {
  const spec = value as BuildSpec;
  if (!spec || spec.version !== 1 || spec.runtime !== 'sandbox-html' || typeof spec.goal !== 'string' || spec.goal.trim().length < 10 || spec.goal.length > 2000 ||
    typeof spec.constraints !== 'string' || spec.constraints.length > 2000 || !Array.isArray(spec.acceptance) || spec.acceptance.length < 1 || spec.acceptance.length > 10 ||
    spec.acceptance.some((item) => typeof item !== 'string' || item.trim().length < 5 || item.length > 300)) throw new Error('Supply a goal and 1–10 concrete acceptance checks.');
  return { version: 1, runtime: 'sandbox-html', goal: spec.goal.trim(), acceptance: spec.acceptance.map((item) => item.trim()), constraints: spec.constraints.trim() };
}
export function validateModule(value: unknown, id: string): CityModule {
  const artifactModule = value as CityModule;
  if (!validProposalId(id) || !artifactModule || artifactModule.version !== 1 || artifactModule.proposalId !== id || typeof artifactModule.title !== 'string' || artifactModule.title.length < 4 || artifactModule.title.length > 80 ||
    typeof artifactModule.html !== 'string' || artifactModule.html.length < 100 || artifactModule.html.length > 100_000 || !/<html[\s>]/i.test(artifactModule.html) || !/<\/html\s*>/i.test(artifactModule.html) ||
    !Array.isArray(artifactModule.acceptance) || artifactModule.acceptance.length < 1 || artifactModule.acceptance.length > 10 || artifactModule.acceptance.some((item) => typeof item !== 'string' || item.length > 300)) throw new Error('Invalid city module artifact.');
  // This check is hygiene, not the security boundary. The HTTP CSP + opaque iframe are.
  if (/<(?:iframe|object|embed|base|form)\b/i.test(artifactModule.html) || /http-equiv\s*=\s*["']?refresh/i.test(artifactModule.html)) throw new Error('Unsupported module capability.');
  return { version: 1, proposalId: id, title: artifactModule.title, html: artifactModule.html, acceptance: artifactModule.acceptance };
}
export const MODULE_CSP = "sandbox allow-scripts; default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; connect-src 'none'; form-action 'none'; base-uri 'none'; frame-ancestors 'self'";
