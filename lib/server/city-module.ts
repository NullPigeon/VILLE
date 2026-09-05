import 'server-only';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { artifactPathFor, validateModule, validProposalId } from '@/lib/build-contract';
import { ApiError } from '@/lib/server/api';

export async function readCityModule(id: string, artifactPath = artifactPathFor(id, 1)) {
  if (!validProposalId(id)) throw new ApiError(400, 'Invalid module ID.');
  const validPaths = Array.from({ length: 99 }, (_, index) => artifactPathFor(id, index + 1));
  if (!validPaths.includes(artifactPath)) throw new ApiError(400, 'Invalid module revision path.');
  const filename = artifactPath.slice('city-modules/'.length);
  let raw: string;
  try { raw = await readFile(join(process.cwd(), 'city-modules', filename), 'utf8'); }
  catch { throw new ApiError(404, 'This module is not present in this deployment.'); }
  try {
    const artifactModule = validateModule(JSON.parse(raw), id);
    return { module: artifactModule, hash: createHash('sha256').update(raw).digest('hex') };
  } catch { throw new ApiError(503, 'The deployed module artifact is invalid.'); }
}
