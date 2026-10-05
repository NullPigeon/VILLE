import type { WorldObjectRecord } from './landville-data';

export const WORLD_DISTRICTS = [
  {
    id: 'dump',
    proposalLabel: 'THE DUMP',
    number: '01',
    name: 'The Dump',
    description:
      'Experiments, strange machines, and good ideas rescued from the scrap heap.',
    x: 27,
    y: 27,
    color: '#eea566',
  },
  {
    id: 'token',
    proposalLabel: 'TOKEN ALLEY',
    number: '02',
    name: 'Token Alley',
    description:
      'The token district. Citizen-built tools and experiences with reviewed platform capabilities.',
    x: 73,
    y: 27,
    color: '#83d6c0',
  },
  {
    id: 'market',
    proposalLabel: 'MARKET',
    number: '03',
    name: 'Market',
    description:
      'A street of citizen creations. Open a place and see what its maker brought to the city.',
    x: 73,
    y: 73,
    color: '#c7ff00',
  },
  {
    id: 'meme',
    proposalLabel: 'MEME PIT',
    number: '04',
    name: 'Meme Pit',
    description:
      'Art, jokes, and wonderfully strange ideas. This city takes its nonsense seriously.',
    x: 27,
    y: 73,
    color: '#cf91d9',
  },
  {
    id: 'townwide',
    proposalLabel: 'TOWNWIDE',
    number: '05',
    name: 'Townwide',
    description:
      'The shared heart of LANDVILLE. City-wide creations live along the central streets.',
    x: 50,
    y: 50,
    color: '#d8c28b',
  },
] as const;

export type WorldDistrictId = (typeof WORLD_DISTRICTS)[number]['id'];

export function objectDistrict(
  object: Pick<WorldObjectRecord, 'district' | 'kind'>,
): WorldDistrictId {
  const name = object.district.toLowerCase();
  if (name.includes('townwide')) return 'townwide';
  if (name.includes('token') || name.includes('civic')) return 'token';
  if (name.includes('meme')) return 'meme';
  if (name.includes('dump') || name.includes('scrap')) return 'dump';
  if (name.includes('market')) return 'market';
  if (object.kind === 'utility') return 'token';
  if (object.kind === 'meme') return 'meme';
  if (['art', 'media'].includes(object.kind)) return 'market';
  return 'dump';
}
