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

const routerAbi = [{
  type: 'function', name: 'exactInputSingle', stateMutability: 'payable',
  inputs: [{ name: 'params', type: 'tuple', components: [
    { name: 'tokenIn', type: 'address' }, { name: 'tokenOut', type: 'address' }, { name: 'fee', type: 'uint24' },
    { name: 'recipient', type: 'address' }, { name: 'amountIn', type: 'uint256' },
    { name: 'amountOutMinimum', type: 'uint256' }, { name: 'sqrtPriceLimitX96', type: 'uint160' },
  ] }],
  outputs: [{ name: 'amountOut', type: 'uint256' }],
}] as const;

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

export async function quoteExactInputSingle(input: RobinhoodWalletInput, http: typeof fetch = fetch) {
  if (input.operation !== 'uniswap.quoteExactInputSingle' && input.operation !== 'uniswap.swapExactInputSingle') throw new ApiError(400, 'Invalid quote request.');
  exactKeys(input, input.operation === 'uniswap.quoteExactInputSingle'
    ? ['operation', 'tokenIn', 'tokenOut', 'fee', 'amountIn']
    : ['operation', 'tokenIn', 'tokenOut', 'fee', 'amountIn', 'slippageBps']);
  const tokenIn = address(input.tokenIn, 'input token');
  const tokenOut = address(input.tokenOut, 'output token');
  if (tokenIn === tokenOut) throw new ApiError(400, 'Input and output token must differ.');
  const amountIn = uint256(input.amountIn, 'input amount');
  const fee = feeTier(input.fee);
  const data = encodeFunctionData({ abi: quoterAbi, functionName: 'quoteExactInputSingle', args: [{ tokenIn, tokenOut, amountIn, fee, sqrtPriceLimitX96: 0n }] });
  const result = await rpcCall(ROBINHOOD_UNISWAP.quoterV2, data, http);
  let decoded: readonly [bigint, bigint, number, bigint];
  try { decoded = decodeFunctionResult({ abi: quoterAbi, functionName: 'quoteExactInputSingle', data: result }); }
  catch { throw new ApiError(502, 'Uniswap returned an invalid quote.'); }
  if (decoded[0] <= 0n) throw new ApiError(422, 'This direct pool returned no output.');
  return { source: 'Uniswap V3 / Robinhood Mainnet', chainId: activeRobinhoodChain.id, tokenIn, tokenOut, fee, amountIn: amountIn.toString(), amountOut: decoded[0].toString(), gasEstimate: decoded[3].toString(), quotedAt: new Date().toISOString() };
}

export async function prepareModuleTransaction(input: RobinhoodWalletInput, fromValue: string, http: typeof fetch = fetch) {
  const from = address(fromValue, 'linked wallet');
  if (input.operation === 'uniswap.approveExact') {
    exactKeys(input, ['operation', 'token', 'amount']);
    const token = address(input.token, 'approval token');
    const amount = uint256(input.amount, 'approval amount');
    return {
      action: input.operation,
      transaction: { from, to: token, data: encodeFunctionData({ abi: erc20Abi, functionName: 'approve', args: [ROBINHOOD_UNISWAP.swapRouter02, amount] }), value: '0x0' as const },
      confirmation: `Approve exactly ${amount} base units of ${token} for the official Uniswap SwapRouter02 on Robinhood Mainnet?`,
      spender: ROBINHOOD_UNISWAP.swapRouter02,
    };
  }
  if (input.operation !== 'uniswap.swapExactInputSingle') throw new ApiError(400, 'Unsupported wallet transaction operation.');
  const slippageBps = Number(input.slippageBps);
  if (!Number.isInteger(slippageBps) || slippageBps < 1 || slippageBps > 500) throw new ApiError(400, 'Slippage must be between 1 and 500 basis points.');
  const quote = await quoteExactInputSingle(input, http);
  const amountOutMinimum = (BigInt(quote.amountOut) * BigInt(10_000 - slippageBps)) / 10_000n;
  if (amountOutMinimum <= 0n) throw new ApiError(422, 'Quoted output is too small after slippage protection.');
  const amountIn = BigInt(quote.amountIn);
  const data = encodeFunctionData({ abi: routerAbi, functionName: 'exactInputSingle', args: [{
    tokenIn: quote.tokenIn, tokenOut: quote.tokenOut, fee: quote.fee, recipient: from,
    amountIn, amountOutMinimum, sqrtPriceLimitX96: 0n,
  }] });
  return {
    action: input.operation,
    transaction: { from, to: ROBINHOOD_UNISWAP.swapRouter02, data, value: '0x0' as const },
    confirmation: `Swap exactly ${amountIn} base units of ${quote.tokenIn} for at least ${amountOutMinimum} base units of ${quote.tokenOut} through the official Uniswap V3 router? Slippage: ${slippageBps / 100}%.`,
    quote,
    amountOutMinimum: amountOutMinimum.toString(),
  };
}
