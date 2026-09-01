export type ProposalStatus = 'LIVE' | 'PASSED' | 'BUILDING' | 'BUILT' | 'REJECTED';
export type VoteChoice = 'YES' | 'NO';

export type WorldObjectRecord = {
  id: string;
  title: string;
  district: string;
  creator: string;
  description: string;
  yesPercent: number;
  builtAt: string;
  kind: 'venue' | 'utility' | 'art' | 'media' | 'meme';
  x: number;
  y: number;
};

export type ProposalRecord = {
  id: string;
  title: string;
  summary: string;
  category: string;
  creator: string;
  yes: number;
  no: number;
  status: ProposalStatus;
  closesIn: string;
  district: string;
  createdAt: string;
};

export const initialWorldObjects: WorldObjectRecord[] = [
  { id: 'frog-casino', title: 'GIANT FROG CASINO', district: 'TOKEN ALLEY', creator: '@degen69', description: 'A casino shaped like a frog. Its tongue is, regrettably, the entrance.', yesPercent: 73, builtAt: '2026-08-29', kind: 'venue', x: 20, y: 43 },
  { id: 'meme-museum', title: 'MEME MUSEUM', district: 'THE DUMP', creator: '@pixelgraver', description: 'Permanent storage for temporary internet culture. Climate control remains theoretical.', yesPercent: 61, builtAt: '2026-08-26', kind: 'art', x: 72, y: 58 },
  { id: 'landville-radio', title: 'LANDVILLE RADIO', district: 'MARKET', creator: '@radio_rat', description: 'Pirate broadcasts, town notices, and one song nobody can identify.', yesPercent: 88, builtAt: '2026-08-23', kind: 'media', x: 52, y: 20 },
  { id: 'giant-frog', title: 'GIANT FROG', district: 'MEME PIT', creator: '@bogbuilder', description: 'It does nothing. This was the strongest argument in its favor.', yesPercent: 84, builtAt: '2026-08-18', kind: 'meme', x: 40, y: 67 },
];

export const initialProposals: ProposalRecord[] = [
  { id: 'LV-184', title: 'PUT A MOON OVER THE DUMP', summary: 'A suspiciously large artificial moon that changes expression when proposals fail.', category: 'ART', creator: '@voidprinter', yes: 1284, no: 716, status: 'LIVE', closesIn: '17H LEFT', district: 'THE DUMP', createdAt: '2026-09-01' },
  { id: 'LV-183', title: 'TOKEN SWAP — BUT PHYSICAL', summary: 'A rusted street machine where citizens crank a lever and watch rates flicker across a CRT.', category: 'UTILITY', creator: '@degen69', yes: 1710, no: 690, status: 'LIVE', closesIn: '1D LEFT', district: 'TOKEN ALLEY', createdAt: '2026-08-31' },
  { id: 'LV-182', title: 'BAN BEIGE', summary: 'A town ordinance with no enforcement mechanism and overwhelming public support.', category: 'OTHER', creator: '@neonmoth', yes: 2300, no: 200, status: 'PASSED', closesIn: 'ENDED', district: 'TOWNWIDE', createdAt: '2026-08-30' },
  { id: 'LV-181', title: 'LANDFILL WEATHER STATION', summary: 'Measures rain, rust velocity, and general civic dread.', category: 'UTILITY', creator: '@cloudrat', yes: 986, no: 534, status: 'BUILDING', closesIn: 'ENDED', district: 'THE DUMP', createdAt: '2026-08-28' },
];

export const citizen = {
  username: 'jiyu1337',
  title: 'ARCHITECT',
  wallet: '0x4663...1337',
  joined: 'AUG 2026',
  tokenBalance: '1,250 $LAND',
  stats: { built: 7, proposals: 12, passed: 5, votes: 23 },
};

export const treasuryAssets = [
  { symbol: 'ETH', name: 'Ethereum', amount: '184.32', value: '$812,420.34', share: 65 },
  { symbol: 'USDC', name: 'USD Coin', amount: '311,250', value: '$311,250.00', share: 25 },
  { symbol: 'LAND', name: 'Landville', amount: '1,940,000', value: '$126,750.35', share: 10 },
];
