export const MODULE_CAPABILITY_REQUEST = 'landville:capability-request' as const;
export const MODULE_CAPABILITY_RESPONSE = 'landville:capability-response' as const;

export type MarketDataInput = {
  operation: 'search' | 'pair' | 'tokenPairs' | 'tokens';
  query?: string;
  chainId?: string;
  address?: string;
};

export type ModuleCapabilityRequest = {
  type: typeof MODULE_CAPABILITY_REQUEST;
  requestId: string;
  capability: 'market.dexscreener';
  input: MarketDataInput;
};

export function parseModuleCapabilityRequest(value: unknown): ModuleCapabilityRequest | null {
  const request = value as ModuleCapabilityRequest;
  if (!request || request.type !== MODULE_CAPABILITY_REQUEST || request.capability !== 'market.dexscreener' ||
    typeof request.requestId !== 'string' || !/^[A-Za-z0-9_-]{1,64}$/.test(request.requestId) ||
    !request.input || !['search', 'pair', 'tokenPairs', 'tokens'].includes(request.input.operation)) return null;
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
  },
} as const;
