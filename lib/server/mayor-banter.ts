import 'server-only';
import { rpc } from '@/lib/server/database';

const quips = [
  'Town inspection complete. The sand is still here. Excellent attendance, sand.',
  'I tightened one bolt and three buildings stopped rattling. This is why I charge by the mystery.',
  'Someone asked for a city with character. We have rust, questionable wiring, and you lot. Overachieving.',
  'The planning department is one robot and a dented clipboard. Please form an imaginative queue.',
  'Our public transport is currently walking with ambition.',
  'I proposed a town budget. The calculator made a noise I did not teach it.',
  'A little reminder from your mayor: measure twice, weld once, blame the wind sparingly.',
  'The good thing about building in a desert: nobody can complain that we ruined the lawn.',
  'Found a spare bolt. If your house suddenly feels lighter, please contact the mayor.',
  'I asked the wind for a building permit. It submitted sand. Again.',
  'City maintenance tip: if it squeaks, it has opinions. If it stops squeaking, check the battery.',
  'The town is small enough that I can still personally disappoint every pothole.',
];

export async function postMayorBanter() {
  if (process.env.LANDVILLE_MAYOR_BANTER_ENABLED === 'false') return false;
  const index = Math.floor(Date.now() / (8 * 60 * 60 * 1000)) % quips.length;
  return rpc<boolean>('landville_post_mayor_banter', { p_body: quips[index] });
}
