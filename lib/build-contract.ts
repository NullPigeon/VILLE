// Shared, credential-free contract. Generated code is data, never a server import.
export type BuildSpec = { version: 1; runtime: 'sandbox-html'; goal: string; acceptance: string[]; constraints: string };
export type BuildJob = {
  proposal_id: string; state: 'READY' | 'RUNNING' | 'REVIEW' | 'FAILED' | 'RELEASED';
  spec: BuildSpec; attempt: number; revision: number; lease_id: string | null; lease_until: string | null;
  branch: string | null; commit_sha: string | null; content_hash: string | null;
  pr_number: number | null; error: string | null; updated_at: string;
};
export type ModuleStorageMode = 'private' | 'shared' | 'counter';
export type ModuleStorageDeclaration = { name: string; mode: ModuleStorageMode; description: string };
export type CityModule = {
  version: 1; proposalId: string; title: string; html: string; acceptance: string[];
  capabilities?: { storage: ModuleStorageDeclaration[] };
};

export const MAX_MODULE_HTML_LENGTH = 7_500_000;
export const MAX_MODULE_ARTIFACT_LENGTH = MAX_MODULE_HTML_LENGTH + 10_000;

export function validProposalId(id: unknown): id is string { return typeof id === 'string' && /^LV-[1-9][0-9]{0,15}$/.test(id); }
export function artifactPathFor(id: string, revision: number) {
  if (!validProposalId(id) || !Number.isInteger(revision) || revision < 1 || revision > 99) throw new Error('Invalid city module revision.');
  return `city-modules/${id}${revision === 1 ? '' : `-r${revision}`}.json`;
}
export function validateSpec(value: unknown): BuildSpec {
  const spec = value as BuildSpec;
  if (!spec || spec.version !== 1 || spec.runtime !== 'sandbox-html' || typeof spec.goal !== 'string' || spec.goal.trim().length < 10 || spec.goal.length > 2000 ||
    typeof spec.constraints !== 'string' || spec.constraints.length > 2000 || !Array.isArray(spec.acceptance) || spec.acceptance.length < 1 || spec.acceptance.length > 10 ||
    spec.acceptance.some((item) => typeof item !== 'string' || item.trim().length < 5 || item.length > 300)) throw new Error('Supply a goal and 1–10 concrete acceptance checks.');
  return { version: 1, runtime: 'sandbox-html', goal: spec.goal.trim(), acceptance: spec.acceptance.map((item) => item.trim()), constraints: spec.constraints.trim() };
}
export function validateStorageDeclarations(value: unknown): ModuleStorageDeclaration[] {
  if (!Array.isArray(value) || value.length > 8) throw new Error('Invalid city module capabilities.');
  const names = new Set<string>();
  return value.map((valueItem) => {
    const declaration = valueItem as ModuleStorageDeclaration;
    if (!declaration || typeof declaration !== 'object' || Object.keys(declaration).some((key) => !['name', 'mode', 'description'].includes(key)) ||
      typeof declaration.name !== 'string' || !/^[a-z][a-z0-9_-]{0,31}$/.test(declaration.name) || names.has(declaration.name) ||
      !['private', 'shared', 'counter'].includes(declaration.mode) || typeof declaration.description !== 'string' ||
      declaration.description.trim().length < 5 || declaration.description.length > 160) throw new Error('Invalid city module storage declaration.');
    names.add(declaration.name);
    return { name: declaration.name, mode: declaration.mode, description: declaration.description.trim() };
  });
}
function validateDeclaredStorageUsage(html: string, storage: ModuleStorageDeclaration[]) {
  if (!/capability\s*:\s*(['"])module\.storage\1/.test(html)) return;
  if (!storage.length) throw new Error('Module storage is used but not declared.');
  const usages = new Map<string, ModuleStorageMode>();
  const patterns = [
    /operation\s*:\s*(['"])(private|shared|counter)\.[a-z]+\1[^{}]{0,180}?collection\s*:\s*(['"])([a-z][a-z0-9_-]{0,31})\3/g,
    /collection\s*:\s*(['"])([a-z][a-z0-9_-]{0,31})\1[^{}]{0,180}?operation\s*:\s*(['"])(private|shared|counter)\.[a-z]+\3/g,
  ];
  for (const match of html.matchAll(patterns[0])) usages.set(match[4], match[2] as ModuleStorageMode);
  for (const match of html.matchAll(patterns[1])) usages.set(match[2], match[4] as ModuleStorageMode);
  if (!usages.size) throw new Error('Module storage calls must use literal operations and collections.');
  for (const [name, mode] of usages) {
    if (!storage.some((item) => item.name === name && item.mode === mode)) throw new Error(`Module storage collection ${name} is not declared with mode ${mode}.`);
  }
}
export function validateModule(value: unknown, id: string): CityModule {
  const artifactModule = value as CityModule;
  if (!validProposalId(id) || !artifactModule || artifactModule.version !== 1 || artifactModule.proposalId !== id || typeof artifactModule.title !== 'string' || artifactModule.title.length < 4 || artifactModule.title.length > 80 ||
    typeof artifactModule.html !== 'string' || artifactModule.html.length < 100 || artifactModule.html.length > MAX_MODULE_HTML_LENGTH || !/<html[\s>]/i.test(artifactModule.html) || !/<\/html\s*>/i.test(artifactModule.html) ||
    !Array.isArray(artifactModule.acceptance) || artifactModule.acceptance.length < 1 || artifactModule.acceptance.length > 10 || artifactModule.acceptance.some((item) => typeof item !== 'string' || item.length > 300)) throw new Error('Invalid city module artifact.');
  // This check is hygiene, not the security boundary. The HTTP CSP + opaque iframe are.
  if (/<(?:iframe|object|embed|base|form)\b/i.test(artifactModule.html) || /http-equiv\s*=\s*["']?refresh/i.test(artifactModule.html)) throw new Error('Unsupported module capability.');
  let capabilities: CityModule['capabilities'];
  if (artifactModule.capabilities !== undefined) {
    const storage = artifactModule.capabilities?.storage;
    if (!artifactModule.capabilities || Object.keys(artifactModule.capabilities).some((key) => key !== 'storage')) throw new Error('Invalid city module capabilities.');
    capabilities = { storage: validateStorageDeclarations(storage) };
  }
  validateDeclaredStorageUsage(artifactModule.html, capabilities?.storage || []);
  return { version: 1, proposalId: id, title: artifactModule.title, html: artifactModule.html, acceptance: artifactModule.acceptance, ...(capabilities ? { capabilities } : {}) };
}
export const MODULE_CSP = "sandbox allow-scripts; default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; connect-src 'none'; form-action 'none'; base-uri 'none'; frame-ancestors 'self'";
