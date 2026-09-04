import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import vm from 'node:vm';
import { validateModule } from '../lib/build-contract.ts';

// Parse script syntax without executing it. Functional acceptance is human review.
for (const file of await readdir('city-modules')) {
  if (!file.endsWith('.json')) continue;
  const id = file.slice(0, -5);
  const raw = await readFile(join('city-modules', file), 'utf8');
  if (raw.length > 150_000) throw new Error(`Oversized module ${id}`);
  const artifactModule = validateModule(JSON.parse(raw), id);
  for (const match of artifactModule.html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)) {
    if (/\bsrc\s*=|\btype\s*=/i.test(match[1])) throw new Error(`Only classic inline scripts are supported: ${id}`);
    new vm.Script(match[2], { filename: `${id}.inline.js` });
  }
}
console.log('City module contracts and inline script syntax passed.');
