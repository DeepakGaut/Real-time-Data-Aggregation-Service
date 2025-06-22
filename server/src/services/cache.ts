import { createClient, RedisClientType } from 'redis';
import { config } from '../config/index.js';
import { Token, TokenResponse } from '../models/token.js';

export class CacheService {
  private client: RedisClientType;
  private connected: boolean = false;

  constructor() {
    this.client = createClient({
      url: config.redis.url
    });

    this.client.on('error', (err:Error) => {
      console.error('Redis Client Error:', err);
      this.connected = false;
    });

    this.client.on('connect', () => {
      console.log('Connected to Redis');
      this.connected = true;
    });
  }

  async connect(): Promise<void> {
    if (!this.connected) {
      try {
        await this.client.connect();
      } catch (error) {
        console.error('Failed to connect to Redis:', error);
        // Continue without cache if Redis is unavailable
      }
    }
  }

  async disconnect(): Promise<void> {
    if (this.connected) {
      await this.client.disconnect();
      this.connected = false;
    }
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.connected) return null;

    try {
      const value = await this.client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  async set(key: string, value: any, ttlSeconds: number = config.redis.ttl): Promise<void> {
    if (!this.connected) return;

    try {
      await this.client.setEx(key, ttlSeconds, JSON.stringify(value));
    } catch (error) {
      console.error('Cache set error:', error);
    }
  }

  async del(key: string): Promise<void> {
    if (!this.connected) return;

    try {
      await this.client.del(key);
    } catch (error) {
      console.error('Cache delete error:', error);
    }
  }

  async exists(key: string): Promise<boolean> {
    if (!this.connected) return false;

    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      console.error('Cache exists error:', error);
      return false;
    }
  }

  // Token-specific cache methods
  async getTokens(cacheKey: string): Promise<TokenResponse | null> {
    return this.get<TokenResponse>(cacheKey);
  }

  async setTokens(cacheKey: string, tokens: TokenResponse): Promise<void> {
    await this.set(cacheKey, tokens);
  }

  async getToken(tokenAddress: string): Promise<Token | null> {
    return this.get<Token>(`token:${tokenAddress}`);
  }

  async setToken(token: Token): Promise<void> {
    await this.set(`token:${token.token_address}`, token);
  }

  generateCacheKey(prefix: string, params: Record<string, any>): string {
    const sortedKeys = Object.keys(params).sort();
    const keyParts = sortedKeys.map(key => `${key}:${params[key]}`);
    return `${prefix}:${keyParts.join(':')}`;
  }
}

export const cacheService = new CacheService();