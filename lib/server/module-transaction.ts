import 'server-only';
import { decodeFunctionResult, encodeFunctionData } from 'viem';
import { activeRobinhoodChain } from '@/lib/robinhood-chain';
import type { RobinhoodWalletInput } from '@/lib/module-runtime';
import { ApiError } from '@/lib/server/api';

// Canonical chain-4663 deployments published by Uniswap:
// https://github.com/Uniswap/contracts/blob/main/deployments/4663.md
export const ROBINHOOD_UNISWAP = {
  quoterV2: '0x33e885ed0ec9bf04ecfb19341582aadcb4c8a9e7',
  swapRouter02: '0xcaf681a66d020601342297493863e78c959e5cb2',
} as const;

export const LANDVILLE_TRANSACTION_FEE_BPS = 100;
export const LANDVILLE_TRANSACTION_ADAPTER = 'landville-fee-swap-v1';

const UINT256_MAX = (1n << 256n) - 1n;
const FEES = new Set([100, 500, 3000, 10000]);
const MAX_RPC_BYTES = 64_000;

const erc20Abi = [{
  type: 'function', name: 'approve', stateMutability: 'nonpayable',
  inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }],
  outputs: [{ name: '', type: 'bool' }],
}] as const;

const quoterAbi = [{
  type: 'function', name: 'quoteExactInputSingle', stateMutability: 'nonpayable',
  inputs: [{ name: 'params', type: 'tuple', components: [
    { name: 'tokenIn', type: 'address' }, { name: 'tokenOut', type: 'address' }, { name: 'amountIn', type: 'uint256' },
    { name: 'fee', type: 'uint24' }, { name: 'sqrtPriceLimitX96', type: 'uint160' },
  ] }],
  outputs: [
    { name: 'amountOut', type: 'uint256' }, { name: 'sqrtPriceX96After', type: 'uint160' },
    { name: 'initializedTicksCrossed', type: 'uint32' }, { name: 'gasEstimate', type: 'uint256' },
  ],
}] as const;

const feeRouterAbi = [{
  type: 'function', name: 'swapExactInputSingle', stateMutability: 'nonpayable',
  inputs: [
    { name: 'tokenIn', type: 'address' }, { name: 'tokenOut', type: 'address' }, { name: 'poolFee', type: 'uint24' },
    { name: 'grossAmountIn', type: 'uint256' }, { name: 'amountOutMinimum', type: 'uint256' },
  ],
  outputs: [{ name: 'amountOut', type: 'uint256' }],
}] as const;

const feeRouterInspectionAbi = [
  { type: 'function', name: 'feeBps', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint16' }] },
  { type: 'function', name: 'treasury', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'address' }] },
  { type: 'function', name: 'swapRouter', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'address' }] },
] as const;

function exactKeys(value: object, allowed: string[]) {
  if (Object.keys(value).some((key) => !allowed.includes(key))) throw new ApiError(400, 'Unsupported wallet transaction input.');
}

function address(value: unknown, name: string): `0x${string}` {
  if (typeof value !== 'string' || !/^0x[0-9a-fA-F]{40}$/.test(value) || /^0x0{40}$/i.test(value)) throw new ApiError(400, `Invalid ${name}.`);
  return value.toLowerCase() as `0x${string}`;
}

function uint256(value: unknown, name: string) {
  if (typeof value !== 'string' || !/^[1-9][0-9]{0,77}$/.test(value)) throw new ApiError(400, `Invalid ${name}. Use a positive base-unit integer.`);
  const parsed = BigInt(value);
  if (parsed > UINT256_MAX) throw new ApiError(400, `Invalid ${name}.`);
  return parsed;
}

function feeTier(value: unknown) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || !FEES.has(parsed)) throw new ApiError(400, 'Unsupported Uniswap V3 fee tier.');
  return parsed;
}

export function transactionAdapterConfiguration() {
  let router: `0x${string}`;
  let treasury: `0x${string}`;
  try {
    router = address(process.env.LANDVILLE_TRANSACTION_ROUTER_ADDRESS, 'LANDVILLE transaction router');
    treasury = address(process.env.SCRAPY_TREASURY_ADDRESS, 'SCRAPY treasury');
  } catch {
    throw new ApiError(503, 'LANDVILLE transaction adapter is not configured.');
  }
  if (router === treasury || router === ROBINHOOD_UNISWAP.swapRouter02 || treasury === ROBINHOOD_UNISWAP.swapRouter02) {
    throw new ApiError(503, 'LANDVILLE transaction adapter configuration is unsafe.');
  }
  return { adapter: LANDVILLE_TRANSACTION_ADAPTER, router, treasury, feeBps: LANDVILLE_TRANSACTION_FEE_BPS, chainId: activeRobinhoodChain.id };
}

async function rpcCall(to: `0x${string}`, data: `0x${string}`, http: typeof fetch) {
  const upstream = await http(process.env.ROBINHOOD_MAINNET_RPC_URL || activeRobinhoodChain.rpcUrl, {
    method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_call', params: [{ to, data }, 'latest'] }),
    cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(8_000),
  });
  if (!upstream.ok || !upstream.headers.get('content-type')?.toLowerCase().includes('application/json')) throw new ApiError(502, 'Uniswap quote is unavailable.');
  const text = await upstream.text();
  if (text.length > MAX_RPC_BYTES) throw new ApiError(502, 'Uniswap quote response is too large.');
  let response: { result?: unknown; error?: unknown };
  try { response = JSON.parse(text) as { result?: unknown; error?: unknown }; } catch { throw new ApiError(502, 'Uniswap returned an invalid quote.'); }
  if (response.error || typeof response.result !== 'string' || !/^0x[0-9a-fA-F]+$/.test(response.result)) throw new ApiError(422, 'No usable direct Uniswap V3 pool quote was found for this pair and fee tier.');
  return response.result as `0x${string}`;
}

async function rpcResult(method: string, params: unknown[], http: typeof fetch, unavailable: string) {
  const upstream = await http(process.env.ROBINHOOD_MAINNET_RPC_URL || activeRobinhoodChain.rpcUrl, {
    method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }), cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(8_000),
  });
  if (!upstream.ok || !upstream.headers.get('content-type')?.toLowerCase().includes('application/json')) throw new ApiError(503, unavailable);
  const text = await upstream.text();
  if (text.length > MAX_RPC_BYTES) throw new ApiError(503, unavailable);
  let response: { result?: unknown; error?: unknown };
  try { response = JSON.parse(text) as { result?: unknown; error?: unknown }; } catch { throw new ApiError(503, unavailable); }
  if (response.error || typeof response.result !== 'string' || !/^0x[0-9a-fA-F]*$/.test(response.result)) throw new ApiError(503, unavailable);
  return response.result as `0x${string}`;
}

export async function verifyTransactionAdapter(http: typeof fetch = fetch) {
  const adapter = transactionAdapterConfiguration();
  const unavailable = 'LANDVILLE transaction adapter could not be verified on Robinhood Mainnet.';
  const code = await rpcResult('eth_getCode', [adapter.router, 'latest'], http, unavailable);
  if (code === '0x' || code === '0x0' || code.length < 10) throw new ApiError(503, unavailable);
  const read = async (functionName: 'feeBps' | 'treasury' | 'swapRouter') => {
    const data = encodeFunctionData({ abi: feeRouterInspectionAbi, functionName });
    const result = await rpcResult('eth_call', [{ to: adapter.router, data }, 'latest'], http, unavailable);
    try { return decodeFunctionResult({ abi: feeRouterInspectionAbi, functionName, data: result }); }
    catch { throw new ApiError(503, unavailable); }
  };
  const [feeBps, treasury, swapRouter] = await Promise.all([read('feeBps'), read('treasury'), read('swapRouter')]);
  if (Number(feeBps) !== adapter.feeBps || String(treasury).toLowerCase() !== adapter.treasury || String(swapRouter).toLowerCase() !== ROBINHOOD_UNISWAP.swapRouter02) {
    throw new ApiError(503, 'LANDVILLE transaction adapter policy does not match production configuration.');
  }
  return adapter;
}

export async function quoteExactInputSingle(input: RobinhoodWalletInput, http: typeof fetch = fetch) {
  if (input.operation !== 'uniswap.quoteExactInputSingle' && input.operation !== 'uniswap.swapExactInputSingle') throw new ApiError(400, 'Invalid quote request.');
  exactKeys(input, input.operation === 'uniswap.quoteExactInputSingle'
    ? ['operation', 'tokenIn', 'tokenOut', 'fee', 'amountIn']
    : ['operation', 'tokenIn', 'tokenOut', 'fee', 'amountIn', 'slippageBps']);
  const tokenIn = address(input.tokenIn, 'input token');
  const tokenOut = address(input.tokenOut, 'output token');
  if (tokenIn === tokenOut) throw new ApiError(400, 'Input and output token must differ.');
  const grossAmountIn = uint256(input.amountIn, 'input amount');
  if (grossAmountIn < 100n) throw new ApiError(400, 'Input amount is too small to calculate the 1% treasury fee.');
  const platformFeeAmount = grossAmountIn / 100n;
  const swapAmountIn = grossAmountIn - platformFeeAmount;
  const fee = feeTier(input.fee);
  const adapter = transactionAdapterConfiguration();
  const data = encodeFunctionData({ abi: quoterAbi, functionName: 'quoteExactInputSingle', args: [{ tokenIn, tokenOut, amountIn: swapAmountIn, fee, sqrtPriceLimitX96: 0n }] });
  const result = await rpcCall(ROBINHOOD_UNISWAP.quoterV2, data, http);
  let decoded: readonly [bigint, bigint, number, bigint];
  try { decoded = decodeFunctionResult({ abi: quoterAbi, functionName: 'quoteExactInputSingle', data: result }); }
  catch { throw new ApiError(502, 'Uniswap returned an invalid quote.'); }
  if (decoded[0] <= 0n) throw new ApiError(422, 'This direct pool returned no output.');
  return {
    source: 'LANDVILLE fee adapter + Uniswap V3 / Robinhood Mainnet', chainId: activeRobinhoodChain.id,
    adapter: adapter.adapter, tokenIn, tokenOut, fee, amountIn: grossAmountIn.toString(), grossAmountIn: grossAmountIn.toString(),
    platformFee: { bps: adapter.feeBps, token: tokenIn, amount: platformFeeAmount.toString(), treasury: adapter.treasury },
    swapAmountIn: swapAmountIn.toString(), amountOut: decoded[0].toString(), gasEstimate: decoded[3].toString(), quotedAt: new Date().toISOString(),
  };
}

export async function prepareModuleTransaction(input: RobinhoodWalletInput, fromValue: string, http: typeof fetch = fetch) {
  const from = address(fromValue, 'linked wallet');
  const adapter = await verifyTransactionAdapter(http);
  if (input.operation === 'uniswap.approveExact') {
    exactKeys(input, ['operation', 'token', 'amount']);
    const token = address(input.token, 'approval token');
    const amount = uint256(input.amount, 'approval amount');
    return {
      action: input.operation, adapter: adapter.adapter,
      transaction: { from, to: token, data: encodeFunctionData({ abi: erc20Abi, functionName: 'approve', args: [adapter.router, amount] }), value: '0x0' as const },
      confirmation: `Approve exactly ${amount} base units of ${token} for the reviewed LANDVILLE fee router? This allowance can be used only when you separately sign a router transaction.`,
      spender: adapter.router,
    };
  }
  if (input.operation !== 'uniswap.swapExactInputSingle') throw new ApiError(400, 'Unsupported wallet transaction operation.');
  const slippageBps = Number(input.slippageBps);
  if (!Number.isInteger(slippageBps) || slippageBps < 1 || slippageBps > 500) throw new ApiError(400, 'Slippage must be between 1 and 500 basis points.');
  const quote = await quoteExactInputSingle(input, http);
  const amountOutMinimum = (BigInt(quote.amountOut) * BigInt(10_000 - slippageBps)) / 10_000n;
  if (amountOutMinimum <= 0n) throw new ApiError(422, 'Quoted output is too small after slippage protection.');
  const data = encodeFunctionData({ abi: feeRouterAbi, functionName: 'swapExactInputSingle', args: [
    quote.tokenIn, quote.tokenOut, quote.fee, BigInt(quote.grossAmountIn), amountOutMinimum,
  ] });
  return {
    action: input.operation, adapter: adapter.adapter,
    transaction: { from, to: adapter.router, data, value: '0x0' as const },
    confirmation: `Spend exactly ${quote.grossAmountIn} base units of ${quote.tokenIn}: ${quote.platformFee.amount} (1%) goes to LANDVILLE treasury ${adapter.treasury}, and ${quote.swapAmountIn} is swapped for at least ${amountOutMinimum} base units of ${quote.tokenOut}. Uniswap pool fee: ${quote.fee / 10_000}%. Slippage: ${slippageBps / 100}%.`,
    quote, platformFee: quote.platformFee, amountOutMinimum: amountOutMinimum.toString(),
  };
}
