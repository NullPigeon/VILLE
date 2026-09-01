import { createPublicClient, erc20Abi, formatUnits, http, isAddress } from 'viem';
import { defineChain } from 'viem';
import { NextRequest, NextResponse } from 'next/server';
import { calculateVoteWeight } from '@/lib/governance';
import { readWalletSession, SESSION_COOKIE } from '@/lib/wallet-session';

const robinhoodTestnet = defineChain({
  id: 46630,
  name: 'Robinhood Chain Testnet',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: {
      http: [
        process.env.ROBINHOOD_TESTNET_RPC_URL ||
          process.env.NEXT_PUBLIC_ROBINHOOD_TESTNET_RPC_URL ||
          'https://rpc.testnet.chain.robinhood.com',
      ],
    },
  },
});

export async function GET(request: NextRequest) {
  const session = readWalletSession(request.cookies.get(SESSION_COOKIE)?.value);
  if (!session) return NextResponse.json({ error: 'Connect and sign your wallet first.' }, { status: 401 });

  const tokenAddress = process.env.LAND_TOKEN_ADDRESS || '';

  if (!isAddress(tokenAddress)) {
    return NextResponse.json({ error: 'LAND token contract is not configured.' }, { status: 503 });
  }

  try {
    const client = createPublicClient({ chain: robinhoodTestnet, transport: http() });
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
    return NextResponse.json({ error: 'Could not read LAND balance from Robinhood Chain.' }, { status: 502 });
  }
}
