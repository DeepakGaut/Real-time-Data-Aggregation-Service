import { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { Token, TokenResponse, PriceUpdate } from '../types/token';

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

export const useWebSocket = () => {
  const [connected, setConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [priceUpdates, setPriceUpdates] = useState<Map<string, PriceUpdate>>(new Map());
  const [volumeSpikes, setVolumeSpikes] = useState<VolumeSpike[]>([]);
  const [priceChanges, setPriceChanges] = useState<PriceChangeEvent[]>([]);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    // Connect to WebSocket server
    const socket = io(import.meta.env.VITE_WS_URL || 'http://localhost:3001', {
      transports: ['websocket'],
      upgrade: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
      timeout: 20000
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('WebSocket connected');
      setConnected(true);
    });

    socket.on('disconnect', (reason) => {
      console.log('WebSocket disconnected:', reason);
      setConnected(false);
    });

    socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      setConnected(false);
    });

    socket.on('reconnect', (attemptNumber) => {
      console.log('WebSocket reconnected after', attemptNumber, 'attempts');
      setConnected(true);
    });

    socket.on('initial_tokens', (data: TokenResponse) => {
      console.log('Received initial tokens:', data.tokens.length);
      setLastUpdate(new Date());
    });

    socket.on('tokens_update', (data: TokenResponse) => {
      console.log('Received token updates:', data.tokens.length);
      setLastUpdate(new Date());
    });

    socket.on('price_update', (update: PriceUpdate) => {
      setPriceUpdates(prev => {
        const newUpdates = new Map(prev);
        newUpdates.set(update.token_address, update);
        
        // Keep only recent updates (last 100)
        if (newUpdates.size > 100) {
          const firstKey = newUpdates.keys().next().value;
          newUpdates.delete(firstKey);
        }
        return newUpdates;
      });
      setLastUpdate(new Date());
    });

    socket.on('volume_spike', (spikes: VolumeSpike[]) => {
      console.log('Received volume spikes:', spikes.length);
      setVolumeSpikes(prev => {
        const newSpikes = [...spikes, ...prev].slice(0, 50); // Keep last 50 spikes
        return newSpikes;
      });
      setLastUpdate(new Date());
    });

    socket.on('price_change', (changes: PriceChangeEvent[]) => {
      console.log('Received significant price changes:', changes.length);
      setPriceChanges(prev => {
        const newChanges = [...changes, ...prev].slice(0, 50); // Keep last 50 changes
        return newChanges;
      });
      setLastUpdate(new Date());
    });

    socket.on('token_update', (token: Token) => {
      console.log('Received individual token update:', token.token_ticker);
      setLastUpdate(new Date());
    });

    socket.on('error', (error: { message: string }) => {
      console.error('WebSocket error:', error);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const subscribeToToken = (tokenAddress: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('subscribe_token', tokenAddress);
      console.log('Subscribed to token:', tokenAddress);
    }
  };

  const unsubscribeFromToken = (tokenAddress: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('unsubscribe_token', tokenAddress);
      console.log('Unsubscribed from token:', tokenAddress);
    }
  };

  const clearVolumeSpikes = () => {
    setVolumeSpikes([]);
  };

  const clearPriceChanges = () => {
    setPriceChanges([]);
  };

  return {
    connected,
    lastUpdate,
    priceUpdates,
    volumeSpikes,
    priceChanges,
    subscribeToToken,
    unsubscribeFromToken,
    clearVolumeSpikes,
    clearPriceChanges
  };
};