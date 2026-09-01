export type TownMessage = {
  id: string;
  author: string;
  wallet: string | null;
  body: string;
  kind: 'CITIZEN' | 'MAYOR' | 'SYSTEM';
  createdAt: string;
};

export const initialTownMessages: TownMessage[] = [];
