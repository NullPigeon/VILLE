import { createHash } from 'node:crypto';

function hash(value: string) { return createHash('sha256').update(value).digest('hex'); }

// These formats are the exact request keys written by the three Market checkouts.
export function jobPromptHash(serviceId: string, brief: string, modelId: string | null = null) {
  if (serviceId.startsWith('stall:')) return hash(JSON.stringify([serviceId.slice(6), brief]));
  if (serviceId.startsWith('external:')) {
    const id = serviceId.slice(9);
    return hash(JSON.stringify(modelId ? [id, brief, modelId] : [id, brief]));
  }
  return hash(brief);
}

export function receiptMatchesJob(order: { service_id: string; prompt_hash: string },
  expectedService: string, brief: string, modelId: string | null = null) {
  return order.service_id === expectedService && order.prompt_hash === jobPromptHash(expectedService, brief, modelId);
}
