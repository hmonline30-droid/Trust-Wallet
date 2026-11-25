export type BottomNavTab = 'home' | 'trending' | 'swap' | 'earn';
export type HomeSubTab = 'tokens' | 'watchlist' | 'approvals';

export type NetworkId =
  | 'all'
  | 'bsc'
  | 'ethereum'
  | 'solana'
  | 'tron'
  | 'arbitrum'
  | 'base'
  | 'bitcoin'
  | 'robinhood'
  | 'arc'
  | 'aeternity'
  | 'algorand'
  | 'aptos'
  | 'avalanche'
  | 'bitcoincash'
  | 'cardano'
  | 'kava'
  | 'litecoin'
  | 'optimism'
  | 'polkadot'
  | 'polygon'
  | 'xrp'
  | 'xlm'
  | 'sui'
  | 'ton'
  | 'viacoin'
  | 'zcash'
  | 'zilliqa';

export interface NetworkInfo {
  id: Exclude<NetworkId, 'all'>;
  name: string;
  shortName: string;
  symbol: string;
  color: string;
  addressPrefix: string;
  section?: 'popular' | 'az';
}

export interface TokenAsset {
  id: string;
  symbol: string;
  name: string;
  network: Exclude<NetworkId, 'all'>;
  priceUsd: number;
  change24h: number;
  category: 'Layer 1' | 'DeFi' | 'Stablecoin' | 'Wallet' | 'AI';
  marketCap: string;
  volume24h: string;
  sparkline: number[];
  enabledByDefault: boolean;
}

export interface WalletAccount {
  id: string;
  seedGroup: string;
  name: string;
  addresses: Record<Exclude<NetworkId, 'all'>, string>;
  balances: Record<string, number>;
  enabledTokenIds: string[];
}

export interface WalletTransaction {
  id: string;
  accountId?: string;
  type: 'receive' | 'deposit' | 'buy' | 'swap' | 'stake' | 'send';
  tokenId?: string;
  asset?: string;
  amount?: number;
  title: string;
  subtitle: string;
  amountText: string;
  usdText: string;
  timestamp: string;
  network: Exclude<NetworkId, 'all'>;
  status: 'Confirmed' | 'Pending';
  txHash?: string;
  counterparty?: string;
  feeText?: string;
  confirmations?: number;
  confirmationsRequired?: number;
}

export interface TokenApproval {
  id: string;
  spenderName: string;
  spenderAddress: string;
  tokenSymbol: string;
  network: Exclude<NetworkId, 'all'>;
  allowance: string;
  risk: 'Low' | 'Medium';
  grantedAt: string;
}

export interface ConnectedDapp {
  id: string;
  name: string;
  origin: string;
  network: Exclude<NetworkId, 'all'>;
  connected: boolean;
}

export interface EarnVault {
  id: string;
  symbol: string;
  name: string;
  network: Exclude<NetworkId, 'all'>;
  apy: number;
  lockDays: number;
  minStake: number;
  validator: string;
}

export type ActiveModal =
  | null
  | 'accounts'
  | 'dapps'
  | 'search'
  | 'history'
  | 'settings'
  | 'receive'
  | 'send'
  | 'binance'
  | 'buy'
  | 'networks'
  | 'manage'
  | 'token_detail';
