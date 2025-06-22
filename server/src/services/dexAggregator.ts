import { DexScreenerService } from './dexScreener.js';
import { JupiterService } from './jupiter.js';
import { GeckoTerminalService } from './geckoTerminal.js';
import { cacheService } from './cache.js';
import { Token, TokenResponse, FilterParams } from '../models/token.js';
import { APIError } from '../utils/errorHandler.js';

export class DexAggregatorService {
  private dexScreener: DexScreenerService;
  private jupiter: JupiterService;
  private geckoTerminal: GeckoTerminalService;

  constructor() {
    this.dexScreener = new DexScreenerService();
    this.jupiter = new JupiterService();
    this.geckoTerminal = new GeckoTerminalService();
  }

  async getTokens(filters: FilterParams = {}): Promise<TokenResponse> {
    const cacheKey = cacheService.generateCacheKey('tokens', filters);
    
    // Try to get from cache first
    const cachedResult = await cacheService.getTokens(cacheKey);
    if (cachedResult) {
      return cachedResult;
    }

    try {
      // Fetch from all sources in parallel
      const [dexScreenerTokens, geckoTokens] = await Promise.allSettled([
        this.dexScreener.searchTokens('solana'),
        this.geckoTerminal.getTokens(1, 50)
      ]);

      let allTokens: Token[] = [];

      // Add successful results
      if (dexScreenerTokens.status === 'fulfilled') {
        allTokens.push(...dexScreenerTokens.value);
      } else {
        console.error('DexScreener failed:', dexScreenerTokens.reason);
      }

      if (geckoTokens.status === 'fulfilled') {
        allTokens.push(...geckoTokens.value);
      } else {
        console.error('GeckoTerminal failed:', geckoTokens.reason);
      }

      // Merge duplicate tokens using intelligent logic
      const mergedTokens = this.mergeTokensIntelligently(allTokens);

      // Enrich with Jupiter prices
      try {
        const enrichedTokens = await this.jupiter.enrichTokensWithPrices(mergedTokens);
        allTokens = enrichedTokens;
      } catch (error) {
        console.error('Jupiter enrichment failed:', error);
        allTokens = mergedTokens;
      }

      // Apply filters and sorting
      const filteredTokens = this.applyFiltersAndSorting(allTokens, filters);
      const result = this.applyCursorPagination(filteredTokens, filters);

      // Cache the result
      await cacheService.setTokens(cacheKey, result);

      return result;
    } catch (error) {
      console.error('Error in getTokens:', error);
      throw new APIError('Failed to aggregate token data', 500);
    }
  }

  async getTokenByAddress(tokenAddress: string): Promise<Token | null> {
    const cacheKey = `token:${tokenAddress}`;
    
    // Try cache first
    const cachedToken = await cacheService.getToken(tokenAddress);
    if (cachedToken) {
      return cachedToken;
    }

    try {
      // Try all sources in parallel
      const [dexScreenerResult, geckoResult] = await Promise.allSettled([
        this.dexScreener.getTokenByAddress(tokenAddress),
        this.geckoTerminal.getTokenByAddress(tokenAddress)
      ]);

      let token: Token | null = null;

      // Use the first successful result
      if (dexScreenerResult.status === 'fulfilled' && dexScreenerResult.value) {
        token = dexScreenerResult.value;
      } else if (geckoResult.status === 'fulfilled' && geckoResult.value) {
        token = geckoResult.value;
      }

      if (!token) {
        return null;
      }

      // Enrich with Jupiter price
      try {
        const enrichedTokens = await this.jupiter.enrichTokensWithPrices([token]);
        token = enrichedTokens[0];
      } catch (error) {
        console.error('Jupiter enrichment failed for single token:', error);
      }

      // Cache the result
      await cacheService.setToken(token);

      return token;
    } catch (error) {
      console.error('Error getting token by address:', error);
      return null;
    }
  }

  private mergeTokensIntelligently(tokens: Token[]): Token[] {
    const tokenMap = new Map<string, Token>();

    tokens.forEach(token => {
      const existing = tokenMap.get(token.token_address);
      
      if (!existing) {
        tokenMap.set(token.token_address, token);
      } else {
        // Intelligent merging logic
        const merged: Token = {
          ...existing,
          // Use the most reliable price (DexScreener > Jupiter > GeckoTerminal)
          price_sol: this.selectBestPrice(existing, token),
          price_usd: this.selectBestPrice(existing, token, 'price_usd'),
          // Use maximum values for volume and market cap (more comprehensive data)
          volume_sol: Math.max(existing.volume_sol, token.volume_sol),
          volume_usd: Math.max(existing.volume_usd || 0, token.volume_usd || 0),
          market_cap_sol: Math.max(existing.market_cap_sol, token.market_cap_sol),
          market_cap_usd: Math.max(existing.market_cap_usd || 0, token.market_cap_usd || 0),
          // Use maximum liquidity (better representation)
          liquidity_sol: Math.max(existing.liquidity_sol, token.liquidity_sol),
          liquidity_usd: Math.max(existing.liquidity_usd || 0, token.liquidity_usd || 0),
          // Sum transaction counts
          transaction_count: existing.transaction_count + token.transaction_count,
          // Use most recent price changes
          price_1hr_change: this.selectMostRecentChange(existing, token, 'price_1hr_change'),
          price_24hr_change: this.selectMostRecentChange(existing, token, 'price_24hr_change'),
          price_7d_change: this.selectMostRecentChange(existing, token, 'price_7d_change'),
          // Combine sources
          source: [...new Set([...existing.source, ...token.source])],
          // Use most recent update
          last_updated: Math.max(existing.last_updated, token.last_updated),
          // Keep the most complete token name and ticker
          token_name: this.selectBestString(existing.token_name, token.token_name),
          token_ticker: this.selectBestString(existing.token_ticker, token.token_ticker),
          // Use the most reliable protocol info
          protocol: this.selectBestProtocol(existing, token)
        };
        
        tokenMap.set(token.token_address, merged);
      }
    });

    return Array.from(tokenMap.values());
  }

  private selectBestPrice(existing: Token, newToken: Token, field: keyof Token = 'price_sol'): number {
    const sourcePriority = { dexscreener: 3, jupiter: 2, geckoterminal: 1 };
    
    const existingPriority = Math.max(...existing.source.map(s => sourcePriority[s as keyof typeof sourcePriority] || 0));
    const newPriority = Math.max(...newToken.source.map(s => sourcePriority[s as keyof typeof sourcePriority] || 0));
    
    const existingValue = existing[field] as number || 0;
    const newValue = newToken[field] as number || 0;
    
    // If priorities are equal, use the higher value (assuming it's more accurate)
    if (existingPriority === newPriority) {
      return Math.max(existingValue, newValue);
    }
    
    return newPriority > existingPriority ? newValue : existingValue;
  }

  private selectMostRecentChange(existing: Token, newToken: Token, field: keyof Token): number {
    const existingValue = existing[field] as number || 0;
    const newValue = newToken[field] as number || 0;
    
    // Use the value from the most recently updated token
    return existing.last_updated > newToken.last_updated ? existingValue : newValue;
  }

  private selectBestString(existing: string, newString: string): string {
    // Prefer non-default values
    if (existing === 'Unknown' || existing === 'UNKNOWN') return newString;
    if (newString === 'Unknown' || newString === 'UNKNOWN') return existing;
    
    // Prefer longer, more descriptive names
    return existing.length >= newString.length ? existing : newString;
  }

  private selectBestProtocol(existing: Token, newToken: Token): string {
    // Prefer specific protocol names over generic ones
    const genericProtocols = ['Unknown', 'GeckoTerminal'];
    
    if (genericProtocols.includes(existing.protocol)) return newToken.protocol;
    if (genericProtocols.includes(newToken.protocol)) return existing.protocol;
    
    return existing.protocol;
  }

  private applyFiltersAndSorting(tokens: Token[], filters: FilterParams): Token[] {
    let filtered = [...tokens];

    // Filter by minimum volume
    if (filters.minVolume) {
      filtered = filtered.filter(token => token.volume_sol >= filters.minVolume!);
    }

    // Filter by minimum market cap
    if (filters.minMarketCap) {
      filtered = filtered.filter(token => token.market_cap_sol >= filters.minMarketCap!);
    }

    // Sort tokens
    const sortBy = filters.sortBy || 'volume';
    const sortOrder = filters.sortOrder || 'desc';

    filtered.sort((a, b) => {
      let aValue: number, bValue: number;

      switch (sortBy) {
        case 'volume':
          aValue = a.volume_sol;
          bValue = b.volume_sol;
          break;
        case 'price_change':
          // Use appropriate timeframe for price change
          if (filters.timeframe === '24h') {
            aValue = a.price_24hr_change || a.price_1hr_change;
            bValue = b.price_24hr_change || b.price_1hr_change;
          } else if (filters.timeframe === '7d') {
            aValue = a.price_7d_change || a.price_1hr_change;
            bValue = b.price_7d_change || b.price_1hr_change;
          } else {
            aValue = a.price_1hr_change;
            bValue = b.price_1hr_change;
          }
          break;
        case 'market_cap':
          aValue = a.market_cap_sol;
          bValue = b.market_cap_sol;
          break;
        case 'liquidity':
          aValue = a.liquidity_sol;
          bValue = b.liquidity_sol;
          break;
        default:
          aValue = a.volume_sol;
          bValue = b.volume_sol;
      }

      return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
    });

    return filtered;
  }

  private applyCursorPagination(tokens: Token[], filters: FilterParams): TokenResponse {
    const limit = Math.min(filters.limit || 20, 100);
    let startIndex = 0;

    // Handle cursor-based pagination
    if (filters.cursor) {
      try {
        const decodedCursor = JSON.parse(Buffer.from(filters.cursor, 'base64').toString());
        
        // Find the index of the token with the cursor ID
        const cursorIndex = tokens.findIndex(token => 
          token.token_address === decodedCursor.token_address
        );
        
        if (cursorIndex !== -1) {
          startIndex = cursorIndex + 1; // Start after the cursor token
        } else {
          // Fallback to offset-based pagination
          startIndex = decodedCursor.offset || 0;
        }
      } catch (error) {
        console.error('Invalid cursor:', error);
        startIndex = 0;
      }
    }

    const endIndex = startIndex + limit;
    const paginatedTokens = tokens.slice(startIndex, endIndex);
    const hasNext = endIndex < tokens.length;

    let nextCursor: string | undefined;
    if (hasNext && paginatedTokens.length > 0) {
      const lastToken = paginatedTokens[paginatedTokens.length - 1];
      const cursorData = {
        token_address: lastToken.token_address,
        sort_value: this.getSortValue(lastToken, filters.sortBy || 'volume'),
        offset: endIndex // Fallback for offset-based pagination
      };
      nextCursor = Buffer.from(JSON.stringify(cursorData)).toString('base64');
    }

    return {
      tokens: paginatedTokens,
      total: tokens.length,
      hasNext,
      nextCursor
    };
  }

  private getSortValue(token: Token, sortBy: string): number {
    switch (sortBy) {
      case 'volume':
        return token.volume_sol;
      case 'price_change':
        return token.price_1hr_change;
      case 'market_cap':
        return token.market_cap_sol;
      case 'liquidity':
        return token.liquidity_sol;
      default:
        return token.volume_sol;
    }
  }
}