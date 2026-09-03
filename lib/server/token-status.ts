import 'server-only';
import { createPublicClient, defineChain, erc20Abi, http } from 'viem';
import { activeRobinhoodChain } from '@/lib/robinhood-chain';
import { formatTokenAmount, SCRAPY_TOKEN, SCRAPY_TOKEN_ADDRESS_LOWER, type ScrapyTokenStatus } from '@/lib/scrapy-token';
import { ApiError } from '@/lib/server/api';

export async function readScrapyTokenStatus(): Promise<ScrapyTokenStatus> {
  const chain = defineChain({
    id: activeRobinhoodChain.id,
    name: activeRobinhoodChain.name,
    nativeCurrency: activeRobinhoodChain.nativeCurrency,
    rpcUrls: { default: { http: [process.env.ROBINHOOD_MAINNET_RPC_URL || activeRobinhoodChain.rpcUrl] } },
  });
  try {
    const client = createPublicClient({ chain, transport: http(undefined, { timeout: 10_000, retryCount: 1 }) });
    if (await client.getChainId() !== SCRAPY_TOKEN.chainId) throw new ApiError(503, 'Token RPC must connect to Robinhood mainnet (4663).');
    const blockNumber = await client.getBlockNumber({ cacheTime: 0 });
    const [symbol, name, decimals, totalSupply] = await Promise.all([
      client.readContract({ address: SCRAPY_TOKEN_ADDRESS_LOWER, abi: erc20Abi, functionName: 'symbol', blockNumber }),
      client.readContract({ address: SCRAPY_TOKEN_ADDRESS_LOWER, abi: erc20Abi, functionName: 'name', blockNumber }),
      client.readContract({ address: SCRAPY_TOKEN_ADDRESS_LOWER, abi: erc20Abi, functionName: 'decimals', blockNumber }),
      client.readContract({ address: SCRAPY_TOKEN_ADDRESS_LOWER, abi: erc20Abi, functionName: 'totalSupply', blockNumber }),
    ]);
    if (symbol !== SCRAPY_TOKEN.symbol || name !== SCRAPY_TOKEN.onchainName || decimals !== SCRAPY_TOKEN.decimals) {
      throw new ApiError(502, 'The configured contract does not match the official SCRAPY token metadata.');
    }
    return {
      address: SCRAPY_TOKEN.address,
      symbol,
      name,
      decimals,
      chainId: chain.id,
      totalSupply: totalSupply.toString(),
      totalSupplyFormatted: formatTokenAmount(totalSupply, decimals, 0),
      blockNumber: blockNumber.toString(),
      verifiedAt: new Date().toISOString(),
    };
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(502, 'Could not verify the SCRAPY contract on Robinhood mainnet.');
  }
}
