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

export type ModuleImageInput = {
  operation: 'generate';
  brief: string;
};

export type WorldCitizenInput = {
  operation: 'status' | 'publish' | 'unpublish';
  imageIndex?: 0 | 1 | 2;
};

export type RobinhoodWalletInput =
  | { operation: 'uniswap.quoteExactInputSingle'; tokenIn: string; tokenOut: string; fee: 100 | 500 | 3000 | 10000; amountIn: string }
  | { operation: 'uniswap.approveExact'; token: string; amount: string }
  | { operation: 'uniswap.swapExactInputSingle'; tokenIn: string; tokenOut: string; fee: 100 | 500 | 3000 | 10000; amountIn: string; slippageBps: number };

export type ModuleCapabilityRequest = {
  type: typeof MODULE_CAPABILITY_REQUEST;
  requestId: string;
  capability: 'market.dexscreener' | 'chain.robinhood' | 'module.storage' | 'module.image.generate' | 'world.citizen.publish' | 'wallet.robinhood';
  input: MarketDataInput | RobinhoodChainInput | ModuleStorageInput | ModuleImageInput | WorldCitizenInput | RobinhoodWalletInput;
};

export function parseModuleCapabilityRequest(value: unknown): ModuleCapabilityRequest | null {
  const request = value as ModuleCapabilityRequest;
  if (!request || request.type !== MODULE_CAPABILITY_REQUEST ||
    typeof request.requestId !== 'string' || !/^[A-Za-z0-9_-]{1,64}$/.test(request.requestId) || !request.input) return null;
  if (request.capability === 'market.dexscreener' && !['search', 'pair', 'tokenPairs', 'tokens'].includes(request.input.operation)) return null;
  if (request.capability === 'chain.robinhood' && !['blockNumber', 'nativeBalance', 'bytecode', 'ethCall'].includes(request.input.operation)) return null;
  if (request.capability === 'module.storage' && !['private.get', 'private.set', 'private.delete', 'shared.list', 'shared.create', 'shared.update', 'shared.delete', 'counter.get', 'counter.increment'].includes(request.input.operation)) return null;
  if (request.capability === 'module.image.generate' && request.input.operation !== 'generate') return null;
  if (request.capability === 'world.citizen.publish' && !['status', 'publish', 'unpublish'].includes(request.input.operation)) return null;
  if (request.capability === 'wallet.robinhood' && !['uniswap.quoteExactInputSingle', 'uniswap.approveExact', 'uniswap.swapExactInputSingle'].includes(request.input.operation)) return null;
  if (!['market.dexscreener', 'chain.robinhood', 'module.storage', 'module.image.generate', 'world.citizen.publish', 'wallet.robinhood'].includes(request.capability)) return null;
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
    'module.image.generate': {
      description: 'Generate one original raster image, or one reviewed set of three choices, for the signed-in citizen through LANDVILLE\'s server-side OpenAI connection. This is for proposals whose core product needs a fresh citizen-specific visual, not for ordinary decoration. The reviewed artifact must declare a narrow purpose, visual direction and maximum image count. LANDVILLE never reveals the provider key.',
      quota: 'One successful generation batch per citizen, per module, per UTC week. A reviewed batch contains either one image or three choices. Reopening the module returns the saved batch without another paid generation.',
      declarations: { shape: '{ purpose: exact product reason, visualDirection: proposal-specific LANDVILLE art direction, maxImages: 1 | 3 }', maximum: 1 },
      request: { type: MODULE_CAPABILITY_REQUEST, requestId: 'unique-id', capability: 'module.image.generate', input: { operation: 'generate', brief: 'citizen choices or subject description, 1-1,000 characters' } },
      response: { type: MODULE_CAPABILITY_RESPONSE, requestId: 'same-id', ok: 'boolean', data: '{ images: [{ index, imageUrl, mimeType }], imageUrl: first image for compatibility, generatedAt, cached } when ok', error: 'string when not ok' },
      transport: 'Use the same parent postMessage bridge. Show a deliberate generate control, a potentially long pending state, every returned choice, the weekly quota/cached state and a useful failure state. Treat the brief as plain user data. Never ask for secrets, wallet keys, URLs or hidden prompts.',
    },
    'world.citizen.publish': {
      description: 'After this module generates a citizen character, let the signed-in citizen explicitly publish that saved image as their public World resident. LANDVILLE owns the confirmation dialog and always uses the caller\'s own current generated image and username. One public resident per citizen; a later approved portrait replaces it.',
      requirement: 'May be declared only together with module.image.generate when turning the generated character into a World resident is part of the approved product.',
      request: { type: MODULE_CAPABILITY_REQUEST, requestId: 'unique-id', capability: 'world.citizen.publish', input: { operation: 'status | publish | unpublish', imageIndex: 'required for publish; 0, 1 or 2 from the generated images array' } },
      response: { type: MODULE_CAPABILITY_RESPONSE, requestId: 'same-id', ok: 'boolean', data: '{ published, publishedAt, selectedImageIndex }', error: 'string when not ok' },
      transport: 'Use the parent postMessage bridge. Offer PUBLISH MY CITIZEN TO WORLD only after the citizen selects a returned image, send its imageIndex, explain that the selected image and username become public, and offer REMOVE FROM WORLD when published. The LANDVILLE host asks for confirmation; never fake or bypass it.',
    },
    'wallet.robinhood': {
      description: 'Adapter-based, reviewed, user-signed Robinhood Mainnet transactions. LANDVILLE validates typed inputs, creates calldata on the server and asks the citizen\'s linked wallet to confirm. Generated modules never receive a provider, signature, private key or generic contract-call permission. The first installed adapter is a direct Uniswap V3 ERC-20 swap with an immutable 1% input-token fee sent atomically to the LANDVILLE treasury.',
      limits: 'The installed adapter supports single-pool ERC-20 to ERC-20 exact-input swaps only. Supported pool fee tiers are 100, 500, 3000 and 10000; slippage must be 1-500 basis points. The citizen approves the exact gross input amount to the reviewed LANDVILLE router. The router sends 1% of that input token to its immutable treasury and swaps 99%; native ETH, multi-hop routes, arbitrary contracts/transfers and automatic transactions remain unsupported. Staking, minting, purchases and other actions require their own reviewed adapters before Scrapy may promise them.',
      declarations: { shape: '{ purpose: exact product reason, actions: subset of uniswap.quoteExactInputSingle | uniswap.approveExact | uniswap.swapExactInputSingle }', maximum: 1 },
      request: { type: MODULE_CAPABILITY_REQUEST, requestId: 'unique-id', capability: 'wallet.robinhood', input: { operation: 'uniswap.quoteExactInputSingle | uniswap.approveExact | uniswap.swapExactInputSingle', tokenIn: 'ERC-20 address for quote/swap', tokenOut: 'ERC-20 address for quote/swap', token: 'ERC-20 address for approval', fee: '100 | 500 | 3000 | 10000', amountIn: 'gross input as a base-unit integer string, minimum 100', amount: 'positive base-unit integer string for exact approval', slippageBps: '1-500 for swap' } },
      response: { type: MODULE_CAPABILITY_RESPONSE, requestId: 'same-id', ok: 'boolean', data: 'fee-aware quote data, or { transactionHash, explorerUrl, action, adapter, amountOutMinimum, platformFee } after wallet confirmation', error: 'string when rejected, unavailable or failed' },
      transport: 'Use the parent postMessage bridge. Quote before requesting approval or swap. Explain token addresses, gross input, the 1% input-token treasury fee, net swapped input, pool fee and slippage in the module UI. LANDVILLE shows a second trusted confirmation and the wallet shows the final transaction. Never claim success before a transactionHash response.',
    },
  },
} as const;
