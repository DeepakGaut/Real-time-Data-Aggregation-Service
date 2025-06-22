import axios, { AxiosInstance } from 'axios';
import { config } from '../config/index.js';
import { Token } from '../models/token.js';
import { rateLimiter } from '../utils/rateLimiter.js';
import { APIError, retryWithBackoff, createRetryInterceptor } from '../utils/errorHandler.js';

export class DexScreenerService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: config.apis.dexScreener.baseUrl,
      timeout: config.apis.dexScreener.timeout,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'MemeTokenAggregator/1.0'
      }
    });

    // Add retry interceptor with exponential backoff
    createRetryInterceptor(this.client, 3);
  }

  async searchTokens(query: string = 'solana'): Promise<Token[]> {
    const canProceed = await rateLimiter.checkLimit(
      'dexscreener', 
      config.apis.dexScreener.rateLimit, 
      60000 // 1 minute window
    );
    
    if (!canProceed) {
      throw new APIError('DexScreener rate limit exceeded', 429, 'dexscreener');
    }

    return retryWithBackoff(async () => {
      try {
        const response = await this.client.get(`/latest/dex/search`, {
          params: { q: query },
          retry: { count: 0, maxRetries: 3 }
        });

        if (!response.data || !response.data.pairs) {
          console.warn('DexScreener returned no pairs data');
          return [];
        }

        const tokens = response.data.pairs
          .filter((pair: any) => {
            return pair.chainId === 'solana' && 
                   pair.baseToken && 
                   pair.baseToken.address &&
                   parseFloat(pair.volume?.h24 || '0') > 0;
          })
          .map((pair: any) => this.transformPairToToken(pair))
          .filter((token: Token) => token.volume_sol > 0);

        console.log(`DexScreener returned ${tokens.length} valid tokens`);
        return tokens;
      } catch (error: any) {
        if (error.response?.status === 429) {
          throw new APIError('DexScreener rate limit exceeded', 429, 'dexscreener');
        }
        if (error.response?.status === 503) {
          throw new APIError('DexScreener service unavailable', 503, 'dexscreener');
        }
        throw new APIError(`DexScreener API error: ${error.message}`, error.response?.status || 500, 'dexscreener');
      }
    }, 3, 2000, 30000); // 3 retries, 2s base delay, 30s max delay
  }

  async getTokenByAddress(tokenAddress: string): Promise<Token | null> {
    const canProceed = await rateLimiter.checkLimit(
      'dexscreener', 
      config.apis.dexScreener.rateLimit,
      60000
    );
    
    if (!canProceed) {
      throw new APIError('DexScreener rate limit exceeded', 429, 'dexscreener');
    }

    return retryWithBackoff(async () => {
      try {
        const response = await this.client.get(`/latest/dex/tokens/${tokenAddress}`, {
          retry: { count: 0, maxRetries: 3 }
        });

        if (!response.data || !response.data.pairs || response.data.pairs.length === 0) {
          return null;
        }

        // Get the pair with highest liquidity for most accurate data
        const bestPair = response.data.pairs.reduce((best: any, current: any) => {
          const currentLiquidity = parseFloat(current.liquidity?.usd || '0');
          const bestLiquidity = parseFloat(best.liquidity?.usd || '0');
          return currentLiquidity > bestLiquidity ? current : best;
        });

        return this.transformPairToToken(bestPair);
      } catch (error: any) {
        if (error.response?.status === 404) {
          return null;
        }
        if (error.response?.status === 429) {
          throw new APIError('DexScreener rate limit exceeded', 429, 'dexscreener');
        }
        throw new APIError(`DexScreener API error: ${error.message}`, error.response?.status || 500, 'dexscreener');
      }
    }, 3, 2000, 30000);
  }

  private transformPairToToken(pair: any): Token {
    const baseToken = pair.baseToken;
    const priceUsd = parseFloat(pair.priceUsd || '0');
    const solPrice = 100; // Approximate SOL price in USD for conversion

    // Safely parse numeric values
    const parseFloat_ = (value: any, defaultValue: number = 0): number => {
      const parsed = parseFloat(value || '0');
      return isNaN(parsed) ? defaultValue : parsed;
    };

    const parseInt_ = (value: any, defaultValue: number = 0): number => {
      const parsed = parseInt(value || '0');
      return isNaN(parsed) ? defaultValue : parsed;
    };

    return {
      token_address: baseToken.address,
      token_name: baseToken.name || 'Unknown',
      token_ticker: baseToken.symbol || 'UNKNOWN',
      price_sol: priceUsd / solPrice,
      price_usd: priceUsd,
      market_cap_sol: parseFloat_(pair.marketCap) / solPrice,
      market_cap_usd: parseFloat_(pair.marketCap),
      volume_sol: parseFloat_(pair.volume?.h24) / solPrice,
      volume_usd: parseFloat_(pair.volume?.h24),
      liquidity_sol: parseFloat_(pair.liquidity?.usd) / solPrice,
      liquidity_usd: parseFloat_(pair.liquidity?.usd),
      transaction_count: parseInt_(pair.txns?.h24?.buys) + parseInt_(pair.txns?.h24?.sells),
      price_1hr_change: parseFloat_(pair.priceChange?.h1),
      price_24hr_change: parseFloat_(pair.priceChange?.h24),
      price_7d_change: parseFloat_(pair.priceChange?.h7d),
      protocol: pair.dexId || 'Unknown',
      dex: pair.dexId,
      pair_address: pair.pairAddress,
      last_updated: Date.now(),
      source: ['dexscreener']
    };
  }
}