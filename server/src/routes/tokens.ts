import express from 'express';
import { z } from 'zod';
import { DexAggregatorService } from '../services/dexAggregator.js';
import { FilterParams } from '../models/token.js';
import { APIError } from '../utils/errorHandler.js';
import { config } from '../config/index.js';

const router = express.Router();
const aggregator = new DexAggregatorService();

// Enhanced validation schemas
const getTokensSchema = z.object({
  // Timeframe filtering
  timeframe: z.enum(['1h', '24h', '7d']).optional(),
  
  // Sorting parameters
  sortBy: z.enum(['volume', 'price_change', 'market_cap', 'liquidity']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  
  // Pagination
  limit: z.coerce.number().min(1).max(config.pagination.maxLimit).optional(),
  cursor: z.string().optional(),
  
  // Advanced filters
  minVolume: z.coerce.number().min(0).optional(),
  minMarketCap: z.coerce.number().min(0).optional(),
  minLiquidity: z.coerce.number().min(0).optional(),
  minPriceChange: z.coerce.number().optional(),
  maxPriceChange: z.coerce.number().optional(),
  
  // Protocol filtering
  protocol: z.string().optional(),
  
  // Source filtering
  source: z.string().optional()
});

const tokenAddressSchema = z.object({
  address: z.string().min(32).max(44) // Solana address length
});

const searchQuerySchema = z.object({
  query: z.string().min(2).max(50)
});

// GET /api/tokens - Get paginated list of tokens with comprehensive filtering
router.get('/', async (req, res, next) => {
  try {
    const validatedQuery = getTokensSchema.parse(req.query);
    
    const filters: FilterParams = {
      timeframe: validatedQuery.timeframe || '1h',
      sortBy: validatedQuery.sortBy || 'volume',
      sortOrder: validatedQuery.sortOrder || 'desc',
      limit: validatedQuery.limit || config.pagination.defaultLimit,
      cursor: validatedQuery.cursor,
      minVolume: validatedQuery.minVolume,
      minMarketCap: validatedQuery.minMarketCap,
      minLiquidity: validatedQuery.minLiquidity,
      minPriceChange: validatedQuery.minPriceChange,
      maxPriceChange: validatedQuery.maxPriceChange,
      protocol: validatedQuery.protocol,
      source: validatedQuery.source
    };

    const result = await aggregator.getTokens(filters);
    
    res.json({
      success: true,
      data: result,
      pagination: {
        limit: filters.limit,
        hasNext: result.hasNext,
        nextCursor: result.nextCursor
      },
      filters: {
        applied: filters,
        available: {
          timeframes: ['1h', '24h', '7d'],
          sortBy: ['volume', 'price_change', 'market_cap', 'liquidity'],
          sortOrder: ['asc', 'desc']
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/tokens/trending - Get trending tokens based on price changes and volume
router.get('/trending', async (req, res, next) => {
  try {
    const trendingFilters: FilterParams = {
      sortBy: 'price_change',
      sortOrder: 'desc',
      limit: 20,
      minVolume: 10, // Minimum volume to avoid low-liquidity tokens
      timeframe: '1h'
    };

    const result = await aggregator.getTokens(trendingFilters);
    
    res.json({
      success: true,
      data: {
        ...result,
        tokens: result.tokens.filter(token => token.price_1hr_change > 0) // Only positive changes
      }
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/tokens/volume-leaders - Get tokens with highest volume
router.get('/volume-leaders', async (req, res, next) => {
  try {
    const volumeFilters: FilterParams = {
      sortBy: 'volume',
      sortOrder: 'desc',
      limit: 20,
      minVolume: 50
    };

    const result = await aggregator.getTokens(volumeFilters);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/tokens/:address - Get specific token by address
router.get('/:address', async (req, res, next) => {
  try {
    const { address } = tokenAddressSchema.parse(req.params);
    
    const token = await aggregator.getTokenByAddress(address);
    
    if (!token) {
      return res.status(404).json({
        success: false,
        error: 'Token not found',
        message: `No token found with address: ${address}`
      });
    }

    res.json({
      success: true,
      data: token
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/tokens/search/:query - Search tokens by name or symbol with enhanced filtering
router.get('/search/:query', async (req, res, next) => {
  try {
    const { query } = searchQuerySchema.parse(req.params);
    const validatedQuery = getTokensSchema.parse(req.query);

    // Get all tokens with applied filters
    const filters: FilterParams = {
      ...validatedQuery,
      limit: 100 // Get more tokens for better search results
    };
    
    const result = await aggregator.getTokens(filters);
    const searchQuery = query.toLowerCase();
    
    // Enhanced search logic
    const filteredTokens = result.tokens.filter(token => {
      const nameMatch = token.token_name.toLowerCase().includes(searchQuery);
      const tickerMatch = token.token_ticker.toLowerCase().includes(searchQuery);
      const addressMatch = token.token_address.toLowerCase().includes(searchQuery);
      
      return nameMatch || tickerMatch || addressMatch;
    });

    // Sort search results by relevance
    const sortedTokens = filteredTokens.sort((a, b) => {
      const aExactMatch = a.token_ticker.toLowerCase() === searchQuery || 
                         a.token_name.toLowerCase() === searchQuery;
      const bExactMatch = b.token_ticker.toLowerCase() === searchQuery || 
                         b.token_name.toLowerCase() === searchQuery;
      
      if (aExactMatch && !bExactMatch) return -1;
      if (!aExactMatch && bExactMatch) return 1;
      
      // Secondary sort by volume
      return b.volume_sol - a.volume_sol;
    });

    const limit = validatedQuery.limit || 20;
    const paginatedResults = sortedTokens.slice(0, limit);

    res.json({
      success: true,
      data: {
        tokens: paginatedResults,
        total: sortedTokens.length,
        hasNext: sortedTokens.length > limit,
        query: query
      },
      search: {
        query,
        totalMatches: sortedTokens.length,
        exactMatches: sortedTokens.filter(token => 
          token.token_ticker.toLowerCase() === searchQuery || 
          token.token_name.toLowerCase() === searchQuery
        ).length
      }
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/tokens/stats/summary - Get aggregated statistics
router.get('/stats/summary', async (req, res, next) => {
  try {
    const result = await aggregator.getTokens({ limit: 100 });
    
    const stats = {
      totalTokens: result.total,
      totalVolume: result.tokens.reduce((sum, token) => sum + token.volume_sol, 0),
      totalMarketCap: result.tokens.reduce((sum, token) => sum + token.market_cap_sol, 0),
      averagePrice: result.tokens.reduce((sum, token) => sum + token.price_sol, 0) / result.tokens.length,
      topGainers: result.tokens
        .filter(token => token.price_1hr_change > 0)
        .sort((a, b) => b.price_1hr_change - a.price_1hr_change)
        .slice(0, 5),
      topLosers: result.tokens
        .filter(token => token.price_1hr_change < 0)
        .sort((a, b) => a.price_1hr_change - b.price_1hr_change)
        .slice(0, 5),
      protocolDistribution: result.tokens.reduce((acc, token) => {
        acc[token.protocol] = (acc[token.protocol] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    };

    res.json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// Error handling middleware
router.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Token routes error:', error);

  if (error instanceof z.ZodError) {
    return res.status(400).json({
      success: false,
      error: 'Invalid request parameters',
      details: error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message,
        received: err.received
      }))
    });
  }

  if (error instanceof APIError) {
    return res.status(error.statusCode).json({
      success: false,
      error: error.message,
      service: error.service
    });
  }

  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: 'An unexpected error occurred while processing your request'
  });
});

export default router;