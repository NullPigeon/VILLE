import { createPublicClient, erc20Abi, formatUnits, http, isAddress } from 'viem';
import { defineChain } from 'viem';
import { NextRequest, NextResponse } from 'next/server';
import { calculateVoteWeight } from '@/lib/governance';
import { readWalletSession, SESSION_COOKIE } from '@/lib/wallet-session';
import { activeRobinhoodChain } from '@/lib/robinhood-chain';

const governanceChain = defineChain({
  id: activeRobinhoodChain.id,
  name: activeRobinhoodChain.name,
  nativeCurrency: activeRobinhoodChain.nativeCurrency,
  rpcUrls: {
    default: {
      http: [
        process.env.ROBINHOOD_MAINNET_RPC_URL || activeRobinhoodChain.rpcUrl,
      ],
    },
  },
});

export async function GET(request: NextRequest) {
  const session = readWalletSession(request.cookies.get(SESSION_COOKIE)?.value);
  if (!session) return NextResponse.json({ error: 'Connect and sign your wallet first.' }, { status: 401 });

  const tokenAddress = process.env.SCRAPY_TOKEN_ADDRESS || '';

  if (!isAddress(tokenAddress)) {
    return NextResponse.json({ error: 'SCRAPY mainnet token contract is not configured.' }, { status: 503 });
  }

  try {
    const client = createPublicClient({ chain: governanceChain, transport: http() });
    if (await client.getChainId() !== activeRobinhoodChain.id) {
      return NextResponse.json({ error: 'Governance RPC must connect to Robinhood mainnet (4663).' }, { status: 503 });
    }
    const blockNumber = await client.getBlockNumber();
    const [rawBalance, decimals] = await Promise.all([
      client.readContract({
        address: tokenAddress,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [session.address as `0x${string}`],
        blockNumber,
      }),
      client.readContract({
        address: tokenAddress,
        abi: erc20Abi,
        functionName: 'decimals',
        blockNumber,
      }),
    ]);

    return NextResponse.json({
      wallet: session.address,
      chainId: activeRobinhoodChain.id,
      tokenBalance: rawBalance.toString(),
      tokenBalanceFormatted: Number(formatUnits(rawBalance, decimals)).toLocaleString('en-US', {
        maximumFractionDigits: 2,
      }),
      weight: calculateVoteWeight(rawBalance, decimals),
      blockNumber: blockNumber.toString(),
      capturedAt: new Date().toISOString(),
      source: 'chain',
    });
  } catch (error) {
    console.error('Governance snapshot failed:', error);
    return NextResponse.json({ error: 'Could not read SCRAPY balance from Robinhood mainnet. Your wallet can still sign in.' }, { status: 502 });
  }
}
