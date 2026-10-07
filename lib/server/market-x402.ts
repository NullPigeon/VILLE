import 'server-only';
import { x402Facilitator } from '@x402/core/facilitator';
import { x402HTTPResourceServer, type FacilitatorClient, type RoutesConfig } from '@x402/core/http';
import { x402ResourceServer } from '@x402/core/server';
import { toFacilitatorEvmSigner } from '@x402/evm';
import { registerExactEvmScheme as registerFacilitatorScheme } from '@x402/evm/exact/facilitator';
import { registerExactEvmScheme as registerServerScheme } from '@x402/evm/exact/server';
import { createPublicClient, createWalletClient, defineChain, erc20Abi, http, isAddress, parseUnits } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { activeRobinhoodChain } from '@/lib/robinhood-chain';
import { MARKET_SERVICES } from '@/lib/market-services';

const NETWORK = 'eip155:4663';
const USDG = '0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168';
const chain = defineChain({ id: activeRobinhoodChain.id, name: activeRobinhoodChain.name,
  nativeCurrency: activeRobinhoodChain.nativeCurrency, rpcUrls: { default: { http: [activeRobinhoodChain.rpcUrl] } } });

export function marketPaymentsConfigured() {
  return process.env.LANDVILLE_X402_ENABLED === 'true' &&
    Boolean(process.env.LANDVILLE_X402_RELAYER_PRIVATE_KEY && process.env.LANDVILLE_X402_PAYOUT_ADDRESS);
}

let serverPromise: Promise<x402HTTPResourceServer> | undefined;
const stallServers = new Map<string, Promise<x402HTTPResourceServer>>();

export function getMarketPaymentServer() {
  serverPromise ??= createMarketPaymentServer().catch((error) => { serverPromise = undefined; throw error; });
  return serverPromise;
}

export function getStallPaymentServer(id: string, revision: string, description: string, priceUsd: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id) || !/^\d+(\.\d{1,6})?$/.test(priceUsd) ||
    parseUnits(priceUsd, 6) <= 0n || parseUnits(priceUsd, 6) > 2_000_000n) throw new Error('INVALID_STALL_PAYMENT');
  const key = `${id}:${revision}:${priceUsd}`;
  let pending = stallServers.get(key);
  if (!pending) {
    const payout = process.env.LANDVILLE_X402_PAYOUT_ADDRESS?.trim() || '';
    const routes: RoutesConfig = { [`POST /api/agent-market/stalls/${id}/buy`]: {
      accepts: { scheme: 'exact', network: NETWORK, payTo: payout,
        price: { asset: USDG, amount: parseUnits(priceUsd, 6).toString(), extra: { assetTransferMethod: 'permit2' } },
        maxTimeoutSeconds: 60 },
      description, mimeType: 'application/json', serviceName: 'Citizen service' } };
    pending = createMarketPaymentServer(routes).catch((error) => { stallServers.delete(key); throw error; });
    if (stallServers.size >= 100) stallServers.delete(stallServers.keys().next().value!);
    stallServers.set(key, pending);
  }
  return pending;
}

async function createMarketPaymentServer(customRoutes?: RoutesConfig) {
  if (!marketPaymentsConfigured()) throw new Error('MARKET_PAYMENTS_NOT_CONFIGURED');
  const rawKey = process.env.LANDVILLE_X402_RELAYER_PRIVATE_KEY!.trim();
  const payout = process.env.LANDVILLE_X402_PAYOUT_ADDRESS!.trim();
  if (!/^0x[a-fA-F0-9]{64}$/.test(rawKey) || !isAddress(payout)) throw new Error('MARKET_PAYMENT_CONFIG_INVALID');
  const account = privateKeyToAccount(rawKey as `0x${string}`);
  const publicClient = createPublicClient({ chain, transport: http(activeRobinhoodChain.rpcUrl) });
  const walletClient = createWalletClient({ chain, account, transport: http(activeRobinhoodChain.rpcUrl) });
  const [chainId, decimals] = await Promise.all([
    publicClient.getChainId(),
    publicClient.readContract({ address: USDG, abi: erc20Abi, functionName: 'decimals' }),
  ]);
  if (chainId !== 4663 || decimals !== 6) throw new Error('MARKET_PAYMENT_CHAIN_OR_ASSET_MISMATCH');
  const signer = toFacilitatorEvmSigner({
    address: account.address,
    readContract: (args) => publicClient.readContract(args as Parameters<typeof publicClient.readContract>[0]),
    verifyTypedData: (args) => publicClient.verifyTypedData(args as Parameters<typeof publicClient.verifyTypedData>[0]),
    writeContract: (args) => walletClient.writeContract({ ...args, account, chain } as Parameters<typeof walletClient.writeContract>[0]),
    sendTransaction: (args) => walletClient.sendTransaction({ ...args, account, chain }),
    waitForTransactionReceipt: async (args) => {
      const receipt = await publicClient.waitForTransactionReceipt({ hash: args.hash, timeout: args.timeout });
      return { status: receipt.status, logs: receipt.logs };
    },
    getCode: async (args) => publicClient.getCode(args),
  }, { confirmationTimeoutMs: 20_000 });
  const facilitator = new x402Facilitator();
  registerFacilitatorScheme(facilitator, { signer, networks: NETWORK });
  const facilitatorClient: FacilitatorClient = {
    getSupported: async () => {
      const supported = facilitator.getSupported();
      return { ...supported, kinds: supported.kinds.map((kind) => ({ ...kind, network: kind.network as `${string}:${string}` })) };
    },
    verify: (payload, requirements) => facilitator.verify(payload, requirements),
    settle: (payload, requirements) => facilitator.settle(payload, requirements),
  };
  const resource = new x402ResourceServer(facilitatorClient);
  registerServerScheme(resource, { networks: [NETWORK] });
  const routes: RoutesConfig = customRoutes || Object.fromEntries(MARKET_SERVICES.map((service) => [
    `POST /api/agent-market/call/${service.id}`,
    { accepts: { scheme: 'exact', network: NETWORK, payTo: payout,
      price: { asset: USDG, amount: parseUnits(service.priceUsd, decimals).toString(), extra: { assetTransferMethod: 'permit2' } },
      maxTimeoutSeconds: 60 },
      description: service.description, mimeType: 'application/json', serviceName: service.name },
  ]));
  const httpServer = new x402HTTPResourceServer(resource, routes);
  await httpServer.initialize();
  return httpServer;
}

export function paidServiceEndpoint(id: string) {
  return `/api/agent-market/call/${id}`;
}
