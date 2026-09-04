import 'server-only';
import { ApiError } from '@/lib/server/api';
import { BUILD_REPOSITORY, githubRead, readJob } from '@/lib/server/builds';
import { readCityModule } from '@/lib/server/city-module';
import { database, rpc } from '@/lib/server/database';

async function vercel<T>(path: string): Promise<T> {
  const token = process.env.LANDVILLE_VERCEL_READ_TOKEN;
  if (!token) throw new ApiError(503, 'Vercel release verification is not configured.');
  const team = process.env.LANDVILLE_VERCEL_TEAM_ID;
  const separator = path.includes('?') ? '&' : '?';
  const response = await fetch(`https://api.vercel.com/${path}${team ? `${separator}teamId=${encodeURIComponent(team)}` : ''}`, {
    headers: { Authorization: `Bearer ${token}` }, cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(12_000),
  });
  if (!response.ok) throw new ApiError(503, 'Vercel could not verify the release.');
  return response.json() as Promise<T>;
}

export async function publishVerifiedBuild(id: string, actor: string) {
  const job = await readJob(id);
  if (job.state === 'RELEASED') {
    const rows = await database(`landville_proposals?select=*&id=eq.${id}&limit=1`);
    return (rows as unknown[])[0];
  }
  if (job.state !== 'REVIEW' || !job.commit_sha || !job.content_hash || !job.pr_number) throw new ApiError(409, 'A completed builder PR is required.');
  const deploymentId = process.env.VERCEL_DEPLOYMENT_ID;
  const deployedSha = process.env.VERCEL_GIT_COMMIT_SHA;
  const projectId = process.env.LANDVILLE_VERCEL_PROJECT_ID;
  if (process.env.VERCEL_ENV !== 'production' || !deploymentId || !deployedSha || !projectId) throw new ApiError(503, 'Verify publication from the production Vercel deployment.');
  const origin = new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost');
  if (origin.protocol !== 'https:') throw new ApiError(503, 'Configure the production HTTPS site URL.');
  const [pr, checks, files, deployment, alias, artifact] = await Promise.all([
    githubRead<{ merged: boolean; merge_commit_sha: string; head: { sha: string; ref: string; repo: { full_name: string } }; base: { ref: string; repo: { full_name: string } } }>(`pulls/${job.pr_number}`),
    githubRead<{ check_runs: Array<{ name: string; status: string; conclusion: string; app: { slug: string } }> }>(`commits/${job.commit_sha}/check-runs?per_page=100`),
    githubRead<Array<{ filename: string; status: string }>>(`pulls/${job.pr_number}/files?per_page=100`),
    vercel<{ id: string; projectId: string; target: string; readyState: string; gitSource?: { sha: string }; meta?: { githubCommitSha?: string } }>(`v13/deployments/${encodeURIComponent(deploymentId)}?withGitRepoInfo=true`),
    vercel<{ deploymentId: string; projectId: string; redirect?: string }>(`v4/aliases/${encodeURIComponent(origin.hostname)}`),
    readCityModule(id),
  ]);
  if (!pr.merged || pr.base.ref !== 'main' || pr.base.repo.full_name.toLowerCase() !== BUILD_REPOSITORY.toLowerCase() || pr.head.repo.full_name.toLowerCase() !== BUILD_REPOSITORY.toLowerCase() || pr.head.sha !== job.commit_sha || pr.head.ref !== job.branch) throw new ApiError(409, 'Merge the reviewed, unchanged builder PR into main first.');
  if (files.length !== 1 || files[0].filename !== `city-modules/${id}.json` || files[0].status !== 'added') throw new ApiError(409, 'The builder PR contains changes outside its module.');
  if (!checks.check_runs.some((check) => check.name === 'City checks' && check.app.slug === 'github-actions' && check.status === 'completed' && check.conclusion === 'success')) throw new ApiError(409, 'The City checks workflow must pass on the exact builder commit.');
  if (deployment.id !== deploymentId || deployment.projectId !== projectId || deployment.target !== 'production' || deployment.readyState !== 'READY' || alias.deploymentId !== deploymentId || alias.projectId !== projectId || alias.redirect ||
    (deployment.gitSource?.sha || deployment.meta?.githubCommitSha) !== deployedSha || pr.merge_commit_sha !== deployedSha || artifact.hash !== job.content_hash) throw new ApiError(409, 'The active production deployment must match this merged PR and module artifact.');
  return rpc('landville_publish_build', { p_id: id, p_actor: actor, p_sha: job.commit_sha, p_hash: artifact.hash, p_release: `${deploymentId}:${deployedSha}` });
}
