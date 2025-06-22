import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { DexAggregatorService } from './dexAggregator.js';
import { PriceUpdate } from '../models/token.js';
import { config } from '../config/index.js';

export interface VolumeSpike {
  token_address: string;
  token_name: string;
  token_ticker: string;
  current_volume: number;
  previous_volume: number;
  spike_percentage: number;
  timestamp: number;
}

export interface PriceChange {
  token_address: string;
  token_name: string;
  token_ticker: string;
  current_price: number;
  previous_price: number;
  change_percentage: number;
  timestamp: number;
}

export class WebSocketService {
  private io: SocketIOServer;
  private aggregator: DexAggregatorService;
  private updateInterval: NodeJS.Timeout | null = null;
  private connectedClients = new Set<string>();
  private previousTokenData = new Map<string, any>();
  private readonly VOLUME_SPIKE_THRESHOLD = 50; // 50% increase
  private readonly PRICE_CHANGE_THRESHOLD = 10; // 10% change

  constructor(server: HTTPServer) {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: process.env.NODE_ENV === 'production' ? false : "http://localhost:5173",
        methods: ["GET", "POST"]
      }
    });

    this.aggregator = new DexAggregatorService();
    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.io.on('connection', (socket) => {
      console.log(`Client connected: ${socket.id}`);
      this.connectedClients.add(socket.id);

      // Send initial data
      this.sendInitialData(socket);

      socket.on('subscribe_token', (tokenAddress: string) => {
        socket.join(`token:${tokenAddress}`);
        console.log(`Client ${socket.id} subscribed to token ${tokenAddress}`);
      });

      socket.on('unsubscribe_token', (tokenAddress: string) => {
        socket.leave(`token:${tokenAddress}`);
        console.log(`Client ${socket.id} unsubscribed from token ${tokenAddress}`);
      });

      socket.on('disconnect', () => {
        console.log(`Client disconnected: ${socket.id}`);
        this.connectedClients.delete(socket.id);
        
        // Stop updates if no clients connected
        if (this.connectedClients.size === 0) {
          this.stopRealTimeUpdates();
        }
      });

      // Start real-time updates if this is the first client
      if (this.connectedClients.size === 1) {
        this.startRealTimeUpdates();
      }
    });
  }

  private async sendInitialData(socket: any): Promise<void> {
    try {
      const tokenResponse = await this.aggregator.getTokens({ limit: 50 });
      socket.emit('initial_tokens', tokenResponse);
      
      // Store initial data for comparison
      tokenResponse.tokens.forEach(token => {
        this.previousTokenData.set(token.token_address, {
          price_sol: token.price_sol,
          volume_sol: token.volume_sol,
          market_cap_sol: token.market_cap_sol
        });
      });
    } catch (error) {
      console.error('Error sending initial data:', error);
      socket.emit('error', { message: 'Failed to load initial token data' });
    }
  }

  private startRealTimeUpdates(): void {
    if (this.updateInterval) return;

    console.log('Starting real-time updates every 15 seconds...');
    this.updateInterval = setInterval(async () => {
      await this.fetchAndBroadcastUpdates();
    }, 15000); // 15 seconds for more frequent updates

    // Initial update
    this.fetchAndBroadcastUpdates();
  }

  private stopRealTimeUpdates(): void {
    if (this.updateInterval) {
      console.log('Stopping real-time updates...');
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  private async fetchAndBroadcastUpdates(): Promise<void> {
    try {
      // Get fresh token data
      const tokenResponse = await this.aggregator.getTokens({ limit: 100 });
      
      // Emit general token list update
      this.io.emit('tokens_update', tokenResponse);

      // Process individual token updates
      const priceUpdates: PriceUpdate[] = [];
      const volumeSpikes: VolumeSpike[] = [];
      const priceChanges: PriceChange[] = [];

      tokenResponse.tokens.forEach(token => {
        const previous = this.previousTokenData.get(token.token_address);
        
        if (previous) {
          // Check for significant price changes
          const priceChangePercent = ((token.price_sol - previous.price_sol) / previous.price_sol) * 100;
          if (Math.abs(priceChangePercent) >= this.PRICE_CHANGE_THRESHOLD) {
            priceChanges.push({
              token_address: token.token_address,
              token_name: token.token_name,
              token_ticker: token.token_ticker,
              current_price: token.price_sol,
              previous_price: previous.price_sol,
              change_percentage: priceChangePercent,
              timestamp: Date.now()
            });
          }

          // Check for volume spikes
          const volumeChangePercent = ((token.volume_sol - previous.volume_sol) / previous.volume_sol) * 100;
          if (volumeChangePercent >= this.VOLUME_SPIKE_THRESHOLD) {
            volumeSpikes.push({
              token_address: token.token_address,
              token_name: token.token_name,
              token_ticker: token.token_ticker,
              current_volume: token.volume_sol,
              previous_volume: previous.volume_sol,
              spike_percentage: volumeChangePercent,
              timestamp: Date.now()
            });
          }
        }

        // Create price update for all tokens
        const priceUpdate: PriceUpdate = {
          token_address: token.token_address,
          price_sol: token.price_sol,
          price_usd: token.price_usd,
          price_change: token.price_1hr_change,
          volume_change: previous ? 
            ((token.volume_sol - previous.volume_sol) / previous.volume_sol) * 100 : 0,
          timestamp: Date.now()
        };

        priceUpdates.push(priceUpdate);

        // Update stored data
        this.previousTokenData.set(token.token_address, {
          price_sol: token.price_sol,
          volume_sol: token.volume_sol,
          market_cap_sol: token.market_cap_sol
        });
      });

      // Emit individual price updates to subscribed rooms
      priceUpdates.forEach(update => {
        this.io.to(`token:${update.token_address}`).emit('price_update', update);
      });

      // Emit volume spikes
      if (volumeSpikes.length > 0) {
        this.io.emit('volume_spike', volumeSpikes);
        console.log(`Detected ${volumeSpikes.length} volume spikes`);
      }

      // Emit significant price changes
      if (priceChanges.length > 0) {
        this.io.emit('price_change', priceChanges);
        console.log(`Detected ${priceChanges.length} significant price changes`);
      }

      console.log(`Broadcasted updates for ${priceUpdates.length} tokens`);
    } catch (error) {
      console.error('Error fetching and broadcasting updates:', error);
      this.io.emit('error', { message: 'Failed to update token prices' });
    }
  }

  // Public methods for external updates
  public async broadcastTokenUpdate(tokenAddress: string): Promise<void> {
    try {
      const token = await this.aggregator.getTokenByAddress(tokenAddress);
      if (token) {
        this.io.to(`token:${tokenAddress}`).emit('token_update', token);
      }
    } catch (error) {
      console.error('Error broadcasting token update:', error);
    }
  }

  public getConnectedClientsCount(): number {
    return this.connectedClients.size;
  }

  public getUpdateStats() {
    return {
      connectedClients: this.connectedClients.size,
      isUpdating: this.updateInterval !== null,
      trackedTokens: this.previousTokenData.size
    };
  }
}