export const LINKED_AGENT_LIMIT = 5;
export const LINKED_AGENT_CAPABILITIES = ['research', 'writing', 'design', 'code', 'data', 'city-guide'] as const;
export type LinkedAgentCapability = typeof LINKED_AGENT_CAPABILITIES[number];

export type LinkedAgent = {
  id: string;
  name: string;
  description: string;
  capabilities: LinkedAgentCapability[];
  connectedAt: string | null;
  createdAt: string;
};

export function validateLinkedAgent(input: Record<string, unknown>) {
  const name = typeof input.name === 'string' ? input.name.trim().replace(/\s+/g, ' ') : '';
  const description = typeof input.description === 'string' ? input.description.trim().replace(/\s+/g, ' ') : '';
  if (!/^[\p{L}\p{N} _-]{2,32}$/u.test(name)) throw new Error('Name must be 2–32 letters, numbers or spaces.');
  if (description.length < 10 || description.length > 240 || /[<>\r\n]/.test(description)) throw new Error('Describe your agent in 10–240 characters.');
  if (/^(scrapy|mayor|system|admin)(\b|\s|$)/i.test(name)) throw new Error('Choose a name that does not impersonate a town official.');
  return { name, description };
}

export function validateAgentCapabilities(value: unknown): LinkedAgentCapability[] {
  if (!Array.isArray(value) || value.length > 5 || new Set(value).size !== value.length
    || value.some((item) => typeof item !== 'string' || !LINKED_AGENT_CAPABILITIES.includes(item as LinkedAgentCapability))) {
    throw new Error('Choose up to five supported agent capabilities.');
  }
  return value as LinkedAgentCapability[];
}
