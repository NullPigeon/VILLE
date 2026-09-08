export const MODULE_CAPABILITY_REQUEST = 'landville:capability-request' as const;
export const MODULE_CAPABILITY_RESPONSE = 'landville:capability-response' as const;

export type MarketDataInput = {
  operation: 'search' | 'pair' | 'tokenPairs' | 'tokens';
  query?: string;
  chainId?: string;
  address?: string;
};

export type RobinhoodChainInput = {
  operation: 'blockNumber' | 'nativeBalance' | 'bytecode' | 'ethCall';
  address?: string;
  to?: string;
  data?: string;
};

export type ModuleStorageInput =
  | { operation: 'private.get' | 'private.delete' | 'counter.get' | 'counter.increment'; collection: string }
  | { operation: 'private.set' | 'shared.create'; collection: string; data: Record<string, unknown> }
  | { operation: 'shared.list'; collection: string; limit?: number }
  | { operation: 'shared.update'; collection: string; id: string; data: Record<string, unknown> }
  | { operation: 'shared.delete'; collection: string; id: string };

export type ModuleCapabilityRequest = {
  type: typeof MODULE_CAPABILITY_REQUEST;
  requestId: string;
  capability: 'market.dexscreener' | 'chain.robinhood' | 'module.storage';
  input: MarketDataInput | RobinhoodChainInput | ModuleStorageInput;
};

export function parseModuleCapabilityRequest(value: unknown): ModuleCapabilityRequest | null {
  const request = value as ModuleCapabilityRequest;
  if (!request || request.type !== MODULE_CAPABILITY_REQUEST ||
    typeof request.requestId !== 'string' || !/^[A-Za-z0-9_-]{1,64}$/.test(request.requestId) || !request.input) return null;
  if (request.capability === 'market.dexscreener' && !['search', 'pair', 'tokenPairs', 'tokens'].includes(request.input.operation)) return null;
  if (request.capability === 'chain.robinhood' && !['blockNumber', 'nativeBalance', 'bytecode', 'ethCall'].includes(request.input.operation)) return null;
  if (request.capability === 'module.storage' && !['private.get', 'private.set', 'private.delete', 'shared.list', 'shared.create', 'shared.update', 'shared.delete', 'counter.get', 'counter.increment'].includes(request.input.operation)) return null;
  if (!['market.dexscreener', 'chain.robinhood', 'module.storage'].includes(request.capability)) return null;
  return request;
}

export const MODULE_RUNTIME_GUIDE = {
  version: 1,
  capabilities: {
    'market.dexscreener': {
      description: 'Read current public DEX Screener market data through the LANDVILLE host. Never invent prices while this capability is loading or unavailable.',
      request: { type: MODULE_CAPABILITY_REQUEST, requestId: 'unique-id', capability: 'market.dexscreener', input: { operation: 'search | pair | tokenPairs | tokens', query: 'required for search', chainId: 'required otherwise', address: 'pair/token address required otherwise' } },
      response: { type: MODULE_CAPABILITY_RESPONSE, requestId: 'same-id', ok: 'boolean', data: 'JSON when ok', error: 'string when not ok' },
      transport: 'Send the request with window.parent.postMessage(request, "*") and listen for the matching response message. Render loading, empty and error states. Treat every returned string as text, never HTML.',
    },
    'chain.robinhood': {
      description: 'Read Robinhood mainnet (chain 4663) through LANDVILLE. This capability is strictly read-only and cannot connect wallets, sign messages, submit transactions or write contract state.',
      request: { type: MODULE_CAPABILITY_REQUEST, requestId: 'unique-id', capability: 'chain.robinhood', input: { operation: 'blockNumber | nativeBalance | bytecode | ethCall', address: 'required for nativeBalance/bytecode', to: 'contract required for ethCall', data: '0x-prefixed ABI calldata required for ethCall' } },
      response: { type: MODULE_CAPABILITY_RESPONSE, requestId: 'same-id', ok: 'boolean', data: '{ source, chainId, fetchedAt, result } when ok', error: 'string when not ok' },
      transport: 'Use the same parent postMessage bridge. Values are raw JSON-RPC hex so decode them honestly, label units explicitly and always render loading, empty and failure states. Never present a read as a completed trade or transaction.',
    },
    'module.storage': {
      description: 'Persistent LANDVILLE storage. Declare every collection in the artifact storage array. private stores one JSON object per signed-in citizen; shared stores public records whose author alone may edit/delete them; counter is a global non-negative integer that any signed-in citizen may increment by exactly one.',
      declarations: { shape: '{ name: lowercase-slug, mode: private | shared | counter, description: concise purpose }', maximum: 8 },
      request: { type: MODULE_CAPABILITY_REQUEST, requestId: 'unique-id', capability: 'module.storage', input: { operation: 'private.get | private.set | private.delete | shared.list | shared.create | shared.update | shared.delete | counter.get | counter.increment', collection: 'declared collection name', data: 'plain JSON object for set/create/update', id: 'server-issued shared record id for update/delete', limit: '1-50 for shared.list' } },
      response: { type: MODULE_CAPABILITY_RESPONSE, requestId: 'same-id', ok: 'boolean', data: 'operation-specific JSON when ok', error: 'string when not ok' },
      transport: 'Use the same parent postMessage bridge. Render pending, signed-out, empty and failure states. Never put secrets or wallet keys in storage. Shared records return a public author label, never a wallet address. Writes persist only after an ok response.',
    },
  },
} as const;
