'use client';

import { x402Client, x402HTTPClient } from '@x402/core/client';
import { PERMIT2_ADDRESS, getPermit2AllowanceReadParams } from '@x402/evm';
import { registerExactEvmScheme } from '@x402/evm/exact/client';
import { createPublicClient, defineChain, encodeFunctionData, erc20Abi, http, isAddress } from 'viem';
import type { MarketTypedData } from '@/components/landville/privy-auth-provider';
import { externalMarketRequest, externalResourceMatches, type ExternalMarketService } from '@/lib/external-market';
import type { MarketCheckoutWallet, MarketReceipt } from '@/lib/market-checkout';
import { activeRobinhoodChain } from '@/lib/robinhood-chain';

const NETWORK = 'eip155:4663';
const USDG = '0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168';
const chain = defineChain({ id: activeRobinhoodChain.id, name: activeRobinhoodChain.name,
  nativeCurrency: activeRobinhoodChain.nativeCurrency, rpcUrls: { default: { http: [activeRobinhoodChain.rpcUrl] } } });
type Quote = ReturnType<x402HTTPClient['getPaymentRequiredResponse']>;
export type ExternalQuote = { serviceId: string; input: string; modelId: string; quote: Quote; quoteToken: string; amountUsd: string; payTo: string };

async function errorMessage(response: Response, fallback: string) {
  const body = await response.json().catch(() => ({})) as { error?: string };
  return new Error(body.error || fallback);
}

export async function quoteExternalService(service: ExternalMarketService, input: string, modelId = ''): Promise<ExternalQuote> {
  const normalized = input.trim();
  externalMarketRequest(service, normalized, modelId);
  const response = await fetch('/api/agent-market/external', { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ serviceId: service.id, input: normalized, ...(service.modelPicker ? { modelId } : {}) }), cache: 'no-store' });
  if (response.status !== 402) throw await errorMessage(response, 'Could not get a merchant quote.');
  const result = await response.json() as { serviceId: string; modelId: string; quote: Quote; quoteToken: string; amountUsd: string; payTo: string };
  const offer = result.quote?.accepts?.[0];
  const upstream = externalMarketRequest(service, normalized, modelId);
  if (result.serviceId !== service.id || result.modelId !== modelId || result.quote?.x402Version !== 2 || result.quote.accepts.length !== 1 ||
    !externalResourceMatches(service.id, result.quote.resource?.url || '', upstream.url) || !offer || offer.scheme !== 'exact' || offer.network !== NETWORK ||
    offer.asset?.toLowerCase() !== USDG.toLowerCase() || !/^\d+$/.test(offer.amount) ||
    BigInt(offer.amount) <= 0n || BigInt(offer.amount) > 2_000_000n || !isAddress(offer.payTo) ||
    result.payTo.toLowerCase() !== offer.payTo.toLowerCase() ||
    result.amountUsd !== (Number(offer.amount) / 1_000_000).toFixed(6) ||
    !/^[0-9]{13}\.[0-9]{1,7}\.0x[0-9a-f]{40}\.[0-9a-f]{64}$/.test(result.quoteToken) ||
    result.quoteToken.split('.')[1] !== offer.amount || result.quoteToken.split('.')[2] !== offer.payTo.toLowerCase()) {
    throw new Error('Merchant quote differs from the selected service or Robinhood USDG. Nothing was signed.');
  }
  const transfer = offer.extra?.assetTransferMethod;
  if (transfer !== undefined && transfer !== 'permit2' && transfer !== 'eip3009') throw new Error('This merchant uses an unsupported payment method.');
  return { ...result, input: normalized };
}

export async function buyExternalService(service: ExternalMarketService, current: ExternalQuote, wallet: MarketCheckoutWallet,
  onStage: (stage: string) => void): Promise<MarketReceipt> {
  if (!isAddress(wallet.linkedWallet)) throw new Error('Connect an EVM wallet first.');
  if (current.serviceId !== service.id) throw new Error('Select the merchant service again.');
  const offer = current.quote.accepts[0];
  const amount = BigInt(offer.amount);
  const publicClient = createPublicClient({ chain, transport: http(activeRobinhoodChain.rpcUrl) });
  const [chainId, balance] = await Promise.all([
    publicClient.getChainId(),
    publicClient.readContract({ address: USDG, abi: erc20Abi, functionName: 'balanceOf', args: [wallet.linkedWallet as `0x${string}`] }),
  ]);
  if (chainId !== 4663) throw new Error('Robinhood Chain RPC is unavailable.');
  if (balance < amount) throw new Error(`You need ${current.amountUsd} USDG in your linked wallet.`);
  if (offer.extra?.assetTransferMethod === 'permit2') {
    const allowance = await publicClient.readContract(getPermit2AllowanceReadParams({ tokenAddress: USDG, ownerAddress: wallet.linkedWallet as `0x${string}` }));
    if (allowance < amount) {
      onStage(`Approve ${current.amountUsd} USDG for this merchant call…`);
      const approval = await wallet.sendModuleTransaction({ from: wallet.linkedWallet, to: USDG,
        data: encodeFunctionData({ abi: erc20Abi, functionName: 'approve', args: [PERMIT2_ADDRESS, amount] }), value: '0x0' });
      const receipt = await publicClient.waitForTransactionReceipt({ hash: approval as `0x${string}`, timeout: 60_000 });
      if (receipt.status !== 'success') throw new Error('USDG approval did not complete.');
    }
  }
  const signer = { address: wallet.linkedWallet as `0x${string}`,
    signTypedData: (message: MarketTypedData) => wallet.signMarketPayment(message) };
  const client = new x402Client();
  client.setSpendControls({ allowedAssets: [{ network: NETWORK, asset: USDG, maxAmountPerPayment: offer.amount }] });
  registerExactEvmScheme(client, { signer, networks: [NETWORK], schemeOptions: { rpcUrl: activeRobinhoodChain.rpcUrl } });
  const httpClient = new x402HTTPClient(client);
  onStage(`Sign ${current.amountUsd} USDG for one ${service.name} call…`);
  const payload = await httpClient.createPaymentPayload(current.quote);
  const signature = httpClient.encodePaymentSignatureHeader(payload)['PAYMENT-SIGNATURE'];
  if (!signature) throw new Error('Could not prepare the merchant payment signature.');
  onStage('Merchant is working. Checking the onchain receipt…');
  const response = await fetch('/api/agent-market/external', { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ serviceId: service.id, input: current.input, ...(service.modelPicker ? { modelId: current.modelId } : {}),
      quoteToken: current.quoteToken, paymentSignature: signature }), cache: 'no-store' });
  if (!response.ok) throw await errorMessage(response, 'Merchant could not complete the call. Check your wallet before retrying.');
  const result = await response.json() as MarketReceipt;
  if (!result.output || !/^0x[0-9a-fA-F]{64}$/.test(result.payment?.transaction || '')) throw new Error('Merchant result has no confirmed payment receipt.');
  return result;
}
