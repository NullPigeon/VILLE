import 'server-only';
import { createPublicClient, defineChain, erc20Abi, formatUnits, http, isAddress } from 'viem';
import { calculateVoteWeight, type VotingPowerSnapshot } from '@/lib/governance';
import { activeRobinhoodChain } from '@/lib/robinhood-chain';
import { ApiError } from '@/lib/server/api';

export async function readVotingSnapshot(wallet: string): Promise<VotingPowerSnapshot> {
  const tokenAddress = (process.env.SCRAPY_TOKEN_ADDRESS || '').toLowerCase();
  if (!isAddress(tokenAddress)) throw new ApiError(503, 'SCRAPY mainnet token contract is not configured.');
  const chain = defineChain({
    id: activeRobinhoodChain.id, name: activeRobinhoodChain.name, nativeCurrency: activeRobinhoodChain.nativeCurrency,
    rpcUrls: { default: { http: [process.env.ROBINHOOD_MAINNET_RPC_URL || activeRobinhoodChain.rpcUrl] } },
  });
  try {
    const client = createPublicClient({ chain, transport: http(undefined, { timeout: 10_000, retryCount: 1 }) });
    if (await client.getChainId() !== activeRobinhoodChain.id) throw new ApiError(503, 'Governance RPC must connect to Robinhood mainnet (4663).');
    const blockNumber = await client.getBlockNumber({ cacheTime: 0 });
    const [balance, decimals] = await Promise.all([
      client.readContract({ address: tokenAddress, abi: erc20Abi, functionName: 'balanceOf', args: [wallet as `0x${string}`], blockNumber }),
      client.readContract({ address: tokenAddress, abi: erc20Abi, functionName: 'decimals', blockNumber }),
    ]);
    const weight = calculateVoteWeight(balance, decimals);
    if (!Number.isSafeInteger(weight)) throw new ApiError(422, 'Voting weight exceeds the supported range.');
    return {
      wallet, chainId: chain.id, tokenAddress, tokenDecimals: decimals,
      tokenBalance: balance.toString(), tokenBalanceFormatted: Number(formatUnits(balance, decimals)).toLocaleString('en-US', { maximumFractionDigits: 2 }),
      weight, blockNumber: blockNumber.toString(), capturedAt: new Date().toISOString(), source: 'chain',
    };
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(502, 'Could not read SCRAPY from mainnet. No vote or build request was recorded.');
  }
}
