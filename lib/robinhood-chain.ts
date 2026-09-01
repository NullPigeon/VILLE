export type RobinhoodNetwork = 'mainnet' | 'testnet';

export const robinhoodChain = {
  mainnet: {
    id: 4663,
    hexId: '0x1237',
    name: 'Robinhood Chain',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrl: process.env.NEXT_PUBLIC_ROBINHOOD_MAINNET_RPC_URL || 'https://rpc.mainnet.chain.robinhood.com',
    explorerUrl: 'https://robinhoodchain.blockscout.com',
  },
  testnet: {
    id: 46630,
    hexId: '0xb626',
    name: 'Robinhood Chain Testnet',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrl: process.env.NEXT_PUBLIC_ROBINHOOD_TESTNET_RPC_URL || 'https://rpc.testnet.chain.robinhood.com',
    explorerUrl: 'https://explorer.testnet.chain.robinhood.com',
  },
} as const;

type EthereumProvider = {
  request(args: { method: string; params?: unknown[] }): Promise<unknown>;
};

export async function addRobinhoodNetwork(network: RobinhoodNetwork = 'testnet') {
  const provider = (window as typeof window & { ethereum?: EthereumProvider }).ethereum;
  if (!provider) throw new Error('NO_WALLET');
  const config = robinhoodChain[network];
  try {
    await provider.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: config.hexId }] });
  } catch (error) {
    const code = (error as { code?: number }).code;
    if (code !== 4902) throw error;
    await provider.request({
      method: 'wallet_addEthereumChain',
      params: [{ chainId: config.hexId, chainName: config.name, nativeCurrency: config.nativeCurrency, rpcUrls: [config.rpcUrl], blockExplorerUrls: [config.explorerUrl] }],
    });
  }
}
