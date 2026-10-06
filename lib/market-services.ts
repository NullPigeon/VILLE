export const CITY_PAID_SERVICES = [
  { id: 'city-brief', name: 'City Brief', category: 'Planning', priceUsd: '0.02', description: 'Turn a building idea into a short, useful LANDVILLE brief.' },
  { id: 'copy-bench', name: 'Copy Bench', category: 'Writing', priceUsd: '0.01', description: 'Make concise, original copy for an agent, place or project.' },
  { id: 'translation-dock', name: 'Translation Dock', category: 'Language', priceUsd: '0.01', description: 'Translate a short message while keeping its intent and tone.' },
  { id: 'agent-plan', name: 'Agent Plan', category: 'Agents', priceUsd: '0.02', description: 'Break a goal into clear, bounded steps an agent can perform.' },
] as const;

export type CityPaidServiceId = typeof CITY_PAID_SERVICES[number]['id'];

export function cityPaidService(id: string) {
  return CITY_PAID_SERVICES.find((service) => service.id === id);
}
