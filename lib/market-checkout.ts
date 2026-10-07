'use client';

import { x402Client } from '@x402/core/client';
import { x402HTTPClient } from '@x402/core/client';
import { PERMIT2_ADDRESS, getPermit2AllowanceReadParams } from '@x402/evm';
import { registerExactEvmScheme } from '@x402/evm/exact/client';
import { createPublicClient, defineChain, encodeFunctionData, erc20Abi, http, isAddress, parseUnits } from 'viem';
import type { MarketTypedData } from '@/components/landville/privy-auth-provider';
import { activeRobinhoodChain } from '@/lib/robinhood-chain';

const NETWORK = 'eip155:4663';
const USDG = '0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168';
const chain = defineChain({ id: activeRobinhoodChain.id, name: activeRobinhoodChain.name,
  nativeCurrency: activeRobinhoodChain.nativeCurrency, rpcUrls: { default: { http: [activeRobinhoodChain.rpcUrl] } } });

export type MarketCheckoutService = { id: string; name: string; endpoint: string; priceUsd: string };
export type MarketCheckoutWallet = {
  linkedWallet: string;
  sendModuleTransaction(transaction: { from: string; to: string; data: string; value: string }): Promise<string>;
  signMarketPayment(message: MarketTypedData): Promise<`0x${string}`>;
};
export type MarketReceipt = { service: string; output: string; payment: { transaction: string; network: string; payer: string }; replayed?: boolean };
export type MarketRecipeTest = { id: string; title: string; updatedAt: string };

async function responseError(response: Response, fallback: string) {
  const body = await response.json().catch(() => ({})) as { error?: string };
  return new Error(body.error || fallback);
}

export async function buyMarketService(service: MarketCheckoutService, prompt: string, wallet: MarketCheckoutWallet,
  onStage: (stage: string) => void, recipe?: MarketRecipeTest): Promise<MarketReceipt> {
  if (!wallet.linkedWallet || !isAddress(wallet.linkedWallet)) throw new Error('Link an EVM wallet to buy city work.');
  if (!prompt.trim() || prompt.length > (recipe ? 600 : 2000)) throw new Error(recipe ? 'Write a test job of 1–600 characters.' : 'Write a request of 1–2000 characters.');
  if (recipe && (!/^[0-9a-f-]{36}$/i.test(recipe.id) || !Number.isFinite(Date.parse(recipe.updatedAt)))) throw new Error('Refresh your saved service recipe.');
  if (service.endpoint !== `/api/agent-market/call/${service.id}` &&
    !(service.endpoint === `/api/agent-market/stalls/${service.id}/buy` && /^[0-9a-f-]{36}$/i.test(service.id))) {
    throw new Error('Service endpoint mismatch.');
  }
  const expectedAmount = parseUnits(service.priceUsd, 6).toString();
  if (BigInt(expectedAmount) <= 0n || BigInt(expectedAmount) > 2_000_000n) throw new Error('Service price is outside the city checkout limit.');
  const requestBody = JSON.stringify({ prompt: prompt.trim(), ...(recipe ? { draftId: recipe.id, draftRevision: recipe.updatedAt } : {}) });
  onStage('Checking the exact price…');
  const quoteResponse = await fetch(service.endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: requestBody, cache: 'no-store' });
  if (quoteResponse.status !== 402) throw await responseError(quoteResponse, 'Could not get a payment quote.');
  const quoteBody = await quoteResponse.json();
  const signer = {
    address: wallet.linkedWallet as `0x${string}`,
    signTypedData: (message: MarketTypedData) => wallet.signMarketPayment(message),
  };
  const client = new x402Client();
  client.setSpendControls({ allowedAssets: [{ network: NETWORK, asset: USDG, maxAmountPerPayment: expectedAmount }] });
  registerExactEvmScheme(client, { signer, networks: [NETWORK], schemeOptions: { rpcUrl: activeRobinhoodChain.rpcUrl } });
  const httpClient = new x402HTTPClient(client);
  const quote = httpClient.getPaymentRequiredResponse((name) => quoteResponse.headers.get(name), quoteBody);
  const offer = quote.accepts[0];
  const resourceUrl = new URL(quote.resource.url, window.location.origin);
  if (quote.x402Version !== 2 || quote.accepts.length !== 1 || !offer || offer.scheme !== 'exact' ||
      offer.network !== NETWORK || offer.asset.toLowerCase() !== USDG.toLowerCase() || offer.amount !== expectedAmount ||
      offer.extra.assetTransferMethod !== 'permit2' || !isAddress(offer.payTo) ||
      resourceUrl.origin !== window.location.origin || resourceUrl.pathname !== service.endpoint) {
    throw new Error('The payment request differs from the listed price or network. Nothing was signed.');
  }
  const publicClient = createPublicClient({ chain, transport: http(activeRobinhoodChain.rpcUrl) });
  const [chainId, balance, allowance] = await Promise.all([
    publicClient.getChainId(),
    publicClient.readContract({ address: USDG, abi: erc20Abi, functionName: 'balanceOf', args: [wallet.linkedWallet as `0x${string}`] }),
    publicClient.readContract(getPermit2AllowanceReadParams({ tokenAddress: USDG, ownerAddress: wallet.linkedWallet as `0x${string}` })),
  ]);
  if (chainId !== 4663) throw new Error('Robinhood Chain RPC is unavailable.');
  if (balance < BigInt(expectedAmount)) throw new Error(`You need ${service.priceUsd} USDG in your linked wallet.`);
  if (allowance < BigInt(expectedAmount)) {
    onStage(`Approve ${service.priceUsd} USDG for this call…`);
    const approval = await wallet.sendModuleTransaction({ from: wallet.linkedWallet, to: USDG,
      data: encodeFunctionData({ abi: erc20Abi, functionName: 'approve', args: [PERMIT2_ADDRESS, BigInt(expectedAmount)] }), value: '0x0' });
    const receipt = await publicClient.waitForTransactionReceipt({ hash: approval as `0x${string}`, timeout: 60_000 });
    if (receipt.status !== 'success') throw new Error('USDG approval did not complete.');
  }
  onStage(`Sign the ${service.priceUsd} USDG payment…`);
  const paymentPayload = await httpClient.createPaymentPayload(quote);
  const signatureHeaders = httpClient.encodePaymentSignatureHeader(paymentPayload);
  onStage('Your job is running. Checking settlement…');
  const paidResponse = await fetch(service.endpoint, { method: 'POST',
    headers: { 'Content-Type': 'application/json', ...signatureHeaders }, body: requestBody, cache: 'no-store' });
  if (!paidResponse.ok) throw await responseError(paidResponse, 'The job did not complete. Check your wallet before retrying.');
  const result = await paidResponse.json() as MarketReceipt;
  if (!result.output || !/^0x[0-9a-fA-F]{64}$/.test(result.payment?.transaction || '')) throw new Error('Payment response is incomplete. Check your wallet before retrying.');
  return result;
}
