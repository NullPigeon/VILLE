// Model output is a recommendation, never authority to select arbitrary records.
export function validateMissionChoice(
  value: unknown,
  jobs: readonly { id: string; client_wallet: string }[],
  stalls: readonly { id: string }[],
  owner: string,
) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid mission plan.');
  const pick = value as Record<string, unknown>;
  if (typeof pick.reason !== 'string' || !pick.reason.trim()) throw new Error('Invalid mission reason.');
  const reason = pick.reason.trim().slice(0, 300);
  if (pick.jobId === 'NONE' && pick.stallId === 'NONE') return { job: null, stall: null, reason };
  const job = jobs.find((item) => item.id === pick.jobId);
  const stall = stalls.find((item) => item.id === pick.stallId);
  if (!job || !stall || job.client_wallet === owner) throw new Error('Unavailable mission pair.');
  return { job, stall, reason };
}
