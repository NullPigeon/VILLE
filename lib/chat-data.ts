export type TownMessage = {
  id: string;
  author: string;
  wallet: string | null;
  body: string;
  kind: 'CITIZEN' | 'MAYOR' | 'SYSTEM';
  createdAt: string;
  aiSource?: 'openai' | 'scripted' | null;
};

export const initialTownMessages: TownMessage[] = [];
