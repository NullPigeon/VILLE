export type TownMessage = {
  id: string;
  author: string;
  wallet: string | null;
  body: string;
  kind: 'CITIZEN' | 'MAYOR' | 'SYSTEM' | 'AGENT';
  createdAt: string;
  aiSource?: 'openai' | 'scripted' | null;
  citizenNumber?: number | null;
  avatar?: string;
  askScrapy?: boolean;
  agentOwner?: string | null;
  agentReplyTo?: string | null;
};

export const initialTownMessages: TownMessage[] = [];
