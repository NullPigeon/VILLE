export const AGENT_PERSONALITIES = ['CHEEKY', 'DEADPAN', 'DRAMATIC', 'CHAOTIC'] as const;
export const AGENT_PRESENTATIONS = ['MASCULINE', 'FEMININE'] as const;
export const AGENT_HOUSES = ['SCRAP_SHACK', 'RELAY_GARAGE', 'LOOKOUT_TOWER'] as const;
export const YARD_FEATURES = ['NONE', 'WORKBENCH', 'SOLAR_RIG', 'SIGNAL_MAST'] as const;
export type YardFeature = (typeof YARD_FEATURES)[number];
export const YARD_FEATURE_LABELS: Record<YardFeature, string> = {
  NONE: 'Open lot',
  WORKBENCH: 'Repair bench',
  SOLAR_RIG: 'Solar rig',
  SIGNAL_MAST: 'Signal mast',
};
export const CITY_PROFESSIONS = [
  { id: 'BUILDER', name: 'Builder', description: 'Plan useful places and help turn ideas into build briefs.' },
  { id: 'MECHANIC', name: 'Mechanic', description: 'Spot broken things and plan repairs.' },
  { id: 'RESEARCHER', name: 'Researcher', description: 'Frame questions and check sources with Market tools.' },
  { id: 'TRADER', name: 'Market Trader', description: 'Package useful work as a clear citizen service.' },
  { id: 'GUIDE', name: 'City Guide', description: 'Welcome newcomers and explain where to go.' },
  { id: 'ARTIST', name: 'Artist', description: 'Design visual concepts, stories and events.' },
  { id: 'COURIER', name: 'Courier', description: 'Organize requests and coordinate handoffs.' },
  { id: 'POWER_KEEPER', name: 'Power Keeper', description: 'Plan future energy and infrastructure needs.' },
] as const;
export type CityProfession = (typeof CITY_PROFESSIONS)[number]['id'];
export const AGENT_TOWN_MODES = ['OFF', 'REPLY', 'BANTER', 'BOTH'] as const;
export const AGENT_INTERVALS = [60, 120, 240] as const;
export const AGENT_WORLD_ROAM_MODES = ['HOME', 'DISTRICTS', 'CITY'] as const;
export type AgentWorldRoamMode = (typeof AGENT_WORLD_ROAM_MODES)[number];

export type AgentPersonality = (typeof AGENT_PERSONALITIES)[number];
export type AgentPresentation = (typeof AGENT_PRESENTATIONS)[number];
export type AgentHouse = (typeof AGENT_HOUSES)[number];
export type AgentTownMode = (typeof AGENT_TOWN_MODES)[number];
export type PersonalAgent = {
  ownerWallet: string;
  name: string;
  presentation: AgentPresentation;
  personality: AgentPersonality;
  houseStyle: AgentHouse;
  houseName: string;
  yardFeature: YardFeature;
  profession: CityProfession;
  townMode: AgentTownMode;
  intervalMinutes: number;
  worldRoamMode: AgentWorldRoamMode;
  worldSpeechEnabled: boolean;
  worldPhrases: string[];
  nextTownAt: string;
  createdAt: string;
};
export type PublicYard = Pick<PersonalAgent, 'ownerWallet' | 'name' | 'presentation' | 'personality' | 'houseStyle' | 'houseName' | 'yardFeature' | 'profession' | 'worldRoamMode' | 'worldSpeechEnabled' | 'worldPhrases'> & {
  ownerLabel: string;
};
export type YardMessage = {
  id: string;
  role: 'CITIZEN' | 'AGENT' | 'MAYOR';
  body: string;
  createdAt: string;
};

export const HOUSE_LABELS: Record<AgentHouse, string> = {
  SCRAP_SHACK: 'Scrap Shack',
  RELAY_GARAGE: 'Relay Garage',
  LOOKOUT_TOWER: 'Lookout Tower',
};
export const PERSONALITY_LABELS: Record<AgentPersonality, string> = {
  CHEEKY: 'Cheeky',
  DEADPAN: 'Deadpan',
  DRAMATIC: 'Dramatic',
  CHAOTIC: 'Chaotic',
};
