export type TownMessage = {
  id: string;
  author: string;
  wallet: string | null;
  body: string;
  kind: 'CITIZEN' | 'MAYOR' | 'SYSTEM';
  createdAt: string;
};

export const initialTownMessages: TownMessage[] = [
  { id: 'chat-1', author: '@system', wallet: null, body: 'Town Chat opened. Liability remains unclear.', kind: 'SYSTEM', createdAt: '2026-09-01T15:30:00.000Z' },
  { id: 'chat-2', author: '@neonmoth', wallet: '0x0000000000000000000000000000000000001820', body: 'Who put the moon proposal back on the board?', kind: 'CITIZEN', createdAt: '2026-09-01T15:31:00.000Z' },
  { id: 'chat-3', author: '@scrapy', wallet: null, body: 'Democracy did. I merely failed to stop it.', kind: 'MAYOR', createdAt: '2026-09-01T15:31:08.000Z' },
];
