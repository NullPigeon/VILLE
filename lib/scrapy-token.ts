export const SCRAPY_TOKEN = {
  address: '0xf7CdBd39720Ea583ec56e3a9ff57E805e93e7BBe' as `0x${string}`,
  symbol: 'SCRAPY',
  ticker: '$SCRAPY',
  onchainName: 'LANDVILLE',
  decimals: 18,
  chainId: 4663,
  tokensPerVote: 250_000,
  minimumBuildRequest: 250_000,
} as const;

export const SCRAPY_TOKEN_ADDRESS_LOWER = SCRAPY_TOKEN.address.toLowerCase() as `0x${string}`;

export function scrapyTokenExplorerUrl(explorerUrl: string) {
  return `${explorerUrl.replace(/\/$/, '')}/address/${SCRAPY_TOKEN.address}`;
}

export function formatTokenAmount(rawBalance: bigint | string, decimals: number = SCRAPY_TOKEN.decimals, maximumFractionDigits = 2) {
  const raw = typeof rawBalance === 'bigint' ? rawBalance : BigInt(rawBalance);
  const padded = raw.toString().padStart(decimals + 1, '0');
  const whole = padded.slice(0, -decimals) || '0';
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  if (!maximumFractionDigits) return grouped;
  const fraction = padded.slice(-decimals).slice(0, maximumFractionDigits).replace(/0+$/, '');
  return fraction ? `${grouped}.${fraction}` : grouped;
}

export function scrapyAccess(rawBalance: bigint | string, decimals: number = SCRAPY_TOKEN.decimals) {
  const raw = typeof rawBalance === 'bigint' ? rawBalance : BigInt(rawBalance);
  const tokenUnit = 10n ** BigInt(decimals);
  const buildMinimum = BigInt(SCRAPY_TOKEN.minimumBuildRequest) * tokenUnit;
  return {
    holder: raw > 0n,
    buildEligible: raw >= buildMinimum,
    dailyMessageLimit: raw > 0n ? 50 : 10,
  } as const;
}

export type ScrapyTokenStatus = {
  address: typeof SCRAPY_TOKEN.address;
  symbol: typeof SCRAPY_TOKEN.symbol;
  name: string;
  decimals: number;
  chainId: number;
  totalSupply: string;
  totalSupplyFormatted: string;
  blockNumber: string;
  verifiedAt: string;
};
