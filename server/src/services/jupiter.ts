import axios, { AxiosInstance } from 'axios';
import { config } from '../config/index.js';
import { Token } from '../models/token.js';
import { APIError, retryWithBackoff, createRetryInterceptor } from '../utils/errorHandler.js';

export class JupiterService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: config.apis.jupiter.baseUrl,
      timeout: config.apis.jupiter.timeout,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'MemeTokenAggregator/1.0'
      }
    });

    // Add retry interceptor
    createRetryInterceptor(this.client, 3);
  }

  async getTokenPrices(tokenAddresses: string[]): Promise<Map<string, number>> {
    if (tokenAddresses.length === 0) return new Map();

    // Jupiter API has a limit on the number of tokens per request
    const batchSize = 100;
    const batches = [];
    
    for (let i = 0; i < tokenAddresses.length; i += batchSize) {
      batches.push(tokenAddresses.slice(i, i + batchSize));
    }

    const allPrices = new Map<string, number>();

    for (const batch of batches) {
      try {
        const batchPrices = await this.fetchPriceBatch(batch);
        batchPrices.forEach((price, address) => {
          allPrices.set(address, price);
        });
      } catch (error) {
        console.error(`Failed to fetch prices for batch:`, error);
        // Continue with other batches even if one fails
      }
    }

    return allPrices;
  }

  private async fetchPriceBatch(tokenAddresses: string[]): Promise<Map<string, number>> {
    return retryWithBackoff(async () => {
      try {
        const ids = tokenAddresses.join(',');
        const response = await this.client.get(`/v4/price`, {
          params: { ids },
        });

        const prices = new Map<string, number>();
        
        if (response.data && response.data.data) {
          Object.entries(response.data.data).forEach(([address, data]: [string, any]) => {
            if (data && data.price && !isNaN(parseFloat(data.price))) {
              prices.set(address, parseFloat(data.price));
            }
          });
        }

        console.log(`Jupiter returned prices for ${prices.size}/${tokenAddresses.length} tokens`);
        return prices;
      } catch (error: any) {
        if (error.response?.status === 429) {
          throw new APIError('Jupiter rate limit exceeded', 429, 'jupiter');
        }
        if (error.response?.status === 503) {
          throw new APIError('Jupiter service unavailable', 503, 'jupiter');
        }
        throw new APIError(`Jupiter API error: ${error.message}`, error.response?.status || 500, 'jupiter');
      }
    }, 3, 1000, 30000);
  }

  async enrichTokensWithPrices(tokens: Token[]): Promise<Token[]> {
    if (tokens.length === 0) return tokens;

    try {
      const tokenAddresses = tokens.map(t => t.token_address);
      const prices = await this.getTokenPrices(tokenAddresses);
      const solPrice = 100; // Approximate SOL price

      const enrichedTokens = tokens.map(token => {
        const jupiterPrice = prices.get(token.token_address);
        if (jupiterPrice && jupiterPrice > 0) {
          return {
            ...token,
            price_usd: jupiterPrice,
            price_sol: jupiterPrice / solPrice,
            source: [...new Set([...token.source, 'jupiter'])] // Avoid duplicates
          };
        }
        return token;
      });

      const enrichedCount = enrichedTokens.filter(token => 
        token.source.includes('jupiter')
      ).length;

      console.log(`Jupiter enriched ${enrichedCount}/${tokens.length} tokens with prices`);
      return enrichedTokens;
    } catch (error) {
      console.error('Failed to enrich tokens with Jupiter prices:', error);
      return tokens; // Return original tokens if Jupiter fails
    }
  }
}