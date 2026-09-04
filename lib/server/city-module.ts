import 'server-only';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { validateModule, validProposalId } from '@/lib/build-contract';
import { ApiError } from '@/lib/server/api';

export async function readCityModule(id: string) {
  if (!validProposalId(id)) throw new ApiError(400, 'Invalid module ID.');
  let raw: string;
  try { raw = await readFile(join(process.cwd(), 'city-modules', `${id}.json`), 'utf8'); }
  catch { throw new ApiError(404, 'This module is not present in this deployment.'); }
  try {
    const artifactModule = validateModule(JSON.parse(raw), id);
    return { module: artifactModule, hash: createHash('sha256').update(raw).digest('hex') };
  } catch { throw new ApiError(503, 'The deployed module artifact is invalid.'); }
}
