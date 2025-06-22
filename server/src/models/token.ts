export interface Token {
  token_address: string;
  token_name: string;
  token_ticker: string;
  price_sol: number;
  price_usd?: number;
  market_cap_sol: number;
  market_cap_usd?: number;
  volume_sol: number;
  volume_usd?: number;
  liquidity_sol: number;
  liquidity_usd?: number;
  transaction_count: number;
  price_1hr_change: number;
  price_24hr_change?: number;
  price_7d_change?: number;
  protocol: string;
  dex?: string;
  pair_address?: string;
  last_updated: number;
  source: string[];
}

export interface TokenResponse {
  tokens: Token[];
  total: number;
  hasNext: boolean;
  nextCursor?: string;
}

export interface FilterParams {
  timeframe?: '1h' | '24h' | '7d';
  sortBy?: 'volume' | 'price_change' | 'market_cap' | 'liquidity';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  cursor?: string;
  minVolume?: number;
  minMarketCap?: number;
  minLiquidity?: number;
  minPriceChange?: number;
  maxPriceChange?: number;
  protocol?: string;
  source?: string;
}

export interface PriceUpdate {
  token_address: string;
  price_sol: number;
  price_usd?: number;
  price_change: number;
  volume_change: number;
  timestamp: number;
}

export interface VolumeSpike {
  token_address: string;
  token_name: string;
  token_ticker: string;
  current_volume: number;
  previous_volume: number;
  spike_percentage: number;
  timestamp: number;
}

export interface PriceChangeEvent {
  token_address: string;
  token_name: string;
  token_ticker: string;
  current_price: number;
  previous_price: number;
  change_percentage: number;
  timestamp: number;
}

export interface TokenStats {
  totalTokens: number;
  totalVolume: number;
  totalMarketCap: number;
  averagePrice: number;
  topGainers: Token[];
  topLosers: Token[];
  protocolDistribution: Record<string, number>;
}