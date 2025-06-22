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
}

export interface PriceUpdate {
  token_address: string;
  price_sol: number;
  price_usd?: number;
  price_change: number;
  volume_change: number;
  timestamp: number;
}

export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  pagination?: {
    limit: number;
    hasNext: boolean;
    nextCursor?: string;
  };
}