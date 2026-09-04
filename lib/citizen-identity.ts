export const CITIZEN_AVATARS = ['fingerprint', 'hammer', 'radio', 'rocket'] as const;
export type CitizenIdentity = { wallet: string; citizenNumber: number | null; username: string | null; bio: string; avatar: string };
export function citizenLabel(citizen?: Pick<CitizenIdentity, 'citizenNumber' | 'username'> | null) {
  return citizen?.username ? `@${citizen.username}` : citizen?.citizenNumber ? `Citizen #${citizen.citizenNumber}` : 'Citizen';
}
export function validUsername(value: string) {
  return /^[a-z][a-z0-9_]{2,23}$/.test(value) && !/^(scrapy|mayor|admin|system|landville|citizen)(_|[0-9]|$)/.test(value);
}
