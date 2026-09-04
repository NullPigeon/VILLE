import 'server-only';
import { timingSafeEqual } from 'node:crypto';
import type { NextRequest } from 'next/server';
import { ApiError, isAdmin, requireWallet } from '@/lib/server/api';
import { assertCitizen, database } from '@/lib/server/database';
import type { BuildJob } from '@/lib/build-contract';

export const BUILD_REPOSITORY = 'NullPigeon/VILLE';
export function requireWorker(request: NextRequest) {
  const secret = process.env.LANDVILLE_WORKER_SECRET || '';
  if (secret.length < 32) throw new ApiError(503, 'Build worker is not configured.');
  const supplied = request.headers.get('authorization') || '';
  const expected = `Bearer ${secret}`;
  const actualBytes = Buffer.from(supplied);
  const expectedBytes = Buffer.from(expected);
  if (actualBytes.length !== expectedBytes.length || !timingSafeEqual(actualBytes, expectedBytes)) throw new ApiError(401, 'Worker authorization required.');
}
export function workerActor() {
  const wallet = process.env.LANDVILLE_BUILD_ACTOR?.toLowerCase() || '';
  if (!/^0x[0-9a-f]{40}$/.test(wallet) || !isAdmin(wallet)) throw new ApiError(503, 'Configure an authorized build operator wallet.');
  return wallet;
}
export async function requireBuildAdmin(request: NextRequest) {
  const actor = requireWallet(request);
  if (!isAdmin(actor)) throw new ApiError(403, 'Build administrator access required.');
  await assertCitizen(actor);
  return actor;
}
export async function readJob(id: string) {
  const jobs = await database<BuildJob[]>(`landville_build_jobs?select=*&proposal_id=eq.${id}&limit=1`);
  if (!jobs[0]) throw new ApiError(404, 'No reviewed build job exists for this proposal.');
  return jobs[0];
}
export async function githubRead<T>(path: string): Promise<T> {
  const key = process.env.LANDVILLE_GITHUB_READ_TOKEN;
  if (!key) throw new ApiError(503, 'GitHub release verification is not configured.');
  const response = await fetch(`https://api.github.com/repos/${BUILD_REPOSITORY}/${path}`, {
    headers: { Authorization: `Bearer ${key}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' },
    cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new ApiError(503, 'GitHub verification is temporarily unavailable.');
  return response.json() as Promise<T>;
}
