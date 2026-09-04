export type TownMessage = {
  id: string;
  author: string;
  wallet: string | null;
  body: string;
  kind: 'CITIZEN' | 'MAYOR' | 'SYSTEM';
  createdAt: string;
  aiSource?: 'openai' | 'scripted' | null;
  citizenNumber?: number | null;
  avatar?: string;
  askScrapy?: boolean;
};

export const initialTownMessages: TownMessage[] = [];
