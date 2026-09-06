import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import vm from 'node:vm';
import { artifactPathFor, MAX_MODULE_ARTIFACT_LENGTH, validateModule } from '../lib/build-contract.ts';

// Parse script syntax without executing it. Functional acceptance is human review.
for (const file of await readdir('city-modules')) {
  if (!file.endsWith('.json')) continue;
  const match = /^(LV-[1-9][0-9]{0,15})(?:-r([2-9][0-9]?))?\.json$/.exec(file);
  if (!match) throw new Error(`Invalid city module filename: ${file}`);
  const id = match[1];
  const revision = match[2] ? Number(match[2]) : 1;
  if (`city-modules/${file}` !== artifactPathFor(id, revision)) throw new Error(`Invalid city module revision path: ${file}`);
  const raw = await readFile(join('city-modules', file), 'utf8');
  if (raw.length > MAX_MODULE_ARTIFACT_LENGTH) throw new Error(`Oversized module ${id}`);
  const artifactModule = validateModule(JSON.parse(raw), id);
  for (const match of artifactModule.html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)) {
    if (/\bsrc\s*=|\btype\s*=/i.test(match[1])) throw new Error(`Only classic inline scripts are supported: ${id}`);
    new vm.Script(match[2], { filename: `${id}.inline.js` });
  }
}
console.log('City module contracts and inline script syntax passed.');
