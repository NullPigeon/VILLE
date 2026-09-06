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

export type ModuleCapabilityRequest = {
  type: typeof MODULE_CAPABILITY_REQUEST;
  requestId: string;
  capability: 'market.dexscreener' | 'chain.robinhood';
  input: MarketDataInput | RobinhoodChainInput;
};

export function parseModuleCapabilityRequest(value: unknown): ModuleCapabilityRequest | null {
  const request = value as ModuleCapabilityRequest;
  if (!request || request.type !== MODULE_CAPABILITY_REQUEST ||
    typeof request.requestId !== 'string' || !/^[A-Za-z0-9_-]{1,64}$/.test(request.requestId) || !request.input) return null;
  if (request.capability === 'market.dexscreener' && !['search', 'pair', 'tokenPairs', 'tokens'].includes(request.input.operation)) return null;
  if (request.capability === 'chain.robinhood' && !['blockNumber', 'nativeBalance', 'bytecode', 'ethCall'].includes(request.input.operation)) return null;
  if (!['market.dexscreener', 'chain.robinhood'].includes(request.capability)) return null;
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
  },
} as const;
