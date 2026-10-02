export type CityScore = {
  wallet: string;
  username: string | null;
  citizenNumber: number;
  rank: number;
  points: number;
  checkInPoints: number;
  ideaPoints: number;
  farmPoints: number;
  buildPoints: number;
  likePoints: number;
};

export type CityFarm = {
  activeToday: true;
  startedAt: string;
  endsAt: string;
  ratePerDay: 1 | 2 | 4 | 8;
  tokenBalance: string;
  blockNumber: number;
};

export type CityPointsState = {
  board: CityScore[];
  me: CityScore | null;
  farm: CityFarm | null;
  hasAgent: boolean;
  checkedInToday: boolean;
  asOf: string;
  seasonStart: string;
  resetsAt: string;
  launchedAt: string;
  verificationUnavailable?: boolean;
};

export function liveFarmPoints(farm: CityFarm | null, now: number) {
  if (!farm) return 0;
  const start = Date.parse(farm.startedAt);
  const end = Date.parse(farm.endsAt);
  return Math.max(0, Math.min(now, end) - start) / 86_400_000 * farm.ratePerDay;
}

export function formatCityPoints(value: number) {
  return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 });
}
