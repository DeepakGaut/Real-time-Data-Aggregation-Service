import axios, { AxiosInstance } from 'axios';
import { config } from '../config/index.js';
import { Token } from '../models/token.js';
import { APIError, retryWithBackoff, createRetryInterceptor } from '../utils/errorHandler.js';

export class GeckoTerminalService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: config.apis.geckoTerminal.baseUrl,
      timeout: config.apis.geckoTerminal.timeout,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'MemeTokenAggregator/1.0'
      }
    });

    // Add retry interceptor
    createRetryInterceptor(this.client, 3);
  }

  async getTokens(page: number = 1, limit: number = 20): Promise<Token[]> {
    return retryWithBackoff(async () => {
      try {
        const response = await this.client.get(`/api/v2/networks/solana/tokens`, {
          params: {
            page,
            limit: Math.min(limit, 100) // GeckoTerminal has a max limit
          },
        });

        if (!response.data || !response.data.data) {
          console.warn('GeckoTerminal returned no data');
          return [];
        }

        const tokens = response.data.data
          .map((tokenData: any) => this.transformTokenData(tokenData))
          .filter((token: Token) => token.volume_sol > 0 && token.token_address);

        console.log(`GeckoTerminal returned ${tokens.length} valid tokens`);
        return tokens;
      } catch (error: any) {
        if (error.response?.status === 429) {
          throw new APIError('GeckoTerminal rate limit exceeded', 429, 'geckoterminal');
        }
        if (error.response?.status === 503) {
          throw new APIError('GeckoTerminal service unavailable', 503, 'geckoterminal');
        }
        throw new APIError(`GeckoTerminal API error: ${error.message}`, error.response?.status || 500, 'geckoterminal');
      }
    }, 3, 1500, 30000);
  }

  async getTokenByAddress(tokenAddress: string): Promise<Token | null> {
    return retryWithBackoff(async () => {
      try {
        const response = await this.client.get(`/api/v2/networks/solana/tokens/${tokenAddress}`, {
        });

        if (!response.data || !response.data.data) {
          return null;
        }

        return this.transformTokenData(response.data.data);
      } catch (error: any) {
        if (error.response?.status === 404) {
          return null;
        }
        if (error.response?.status === 429) {
          throw new APIError('GeckoTerminal rate limit exceeded', 429, 'geckoterminal');
        }
        throw new APIError(`GeckoTerminal API error: ${error.message}`, error.response?.status || 500, 'geckoterminal');
      }
    }, 3, 1500, 30000);
  }

  private transformTokenData(data: any): Token {
    const attributes = data.attributes || {};
    const solPrice = 100; // Approximate SOL price in USD

    // Safely parse numeric values
    const parseFloat_ = (value: any, defaultValue: number = 0): number => {
      const parsed = parseFloat(value || '0');
      return isNaN(parsed) ? defaultValue : parsed;
    };

    return {
      token_address: data.id || attributes.address || '',
      token_name: attributes.name || 'Unknown',
      token_ticker: attributes.symbol || 'UNKNOWN',
      price_sol: parseFloat_(attributes.price_usd) / solPrice,
      price_usd: parseFloat_(attributes.price_usd),
      market_cap_sol: parseFloat_(attributes.market_cap_usd) / solPrice,
      market_cap_usd: parseFloat_(attributes.market_cap_usd),
      volume_sol: parseFloat_(attributes.volume_usd?.h24) / solPrice,
      volume_usd: parseFloat_(attributes.volume_usd?.h24),
      liquidity_sol: 0, // GeckoTerminal doesn't provide liquidity data
      liquidity_usd: 0,
      transaction_count: 0, // GeckoTerminal doesn't provide transaction count
      price_1hr_change: parseFloat_(attributes.price_change_percentage?.h1),
      price_24hr_change: parseFloat_(attributes.price_change_percentage?.h24),
      price_7d_change: parseFloat_(attributes.price_change_percentage?.h7d),
      protocol: 'GeckoTerminal',
      last_updated: Date.now(),
      source: ['geckoterminal']
    };
  }
}