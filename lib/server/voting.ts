import 'server-only';
import { createPublicClient, defineChain, erc20Abi, http } from 'viem';
import { calculateVoteWeight, type VotingPowerSnapshot } from '@/lib/governance';
import { activeRobinhoodChain } from '@/lib/robinhood-chain';
import { ApiError } from '@/lib/server/api';
import { formatTokenAmount, SCRAPY_TOKEN, SCRAPY_TOKEN_ADDRESS_LOWER } from '@/lib/scrapy-token';

export async function readVotingSnapshot(wallet: string): Promise<VotingPowerSnapshot> {
  const tokenAddress = SCRAPY_TOKEN_ADDRESS_LOWER;
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
    if (decimals !== SCRAPY_TOKEN.decimals) throw new ApiError(502, 'SCRAPY token decimals do not match the verified contract.');
    const weight = calculateVoteWeight(balance, decimals);
    if (!Number.isSafeInteger(weight)) throw new ApiError(422, 'Voting weight exceeds the supported range.');
    return {
      wallet, chainId: chain.id, tokenAddress, tokenDecimals: decimals,
      tokenBalance: balance.toString(), tokenBalanceFormatted: formatTokenAmount(balance, decimals),
      weight, blockNumber: blockNumber.toString(), capturedAt: new Date().toISOString(), source: 'chain',
    };
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(502, 'Could not read SCRAPY from mainnet. No vote or build request was recorded.');
  }
}
