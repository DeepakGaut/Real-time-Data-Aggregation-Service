import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Token, TokenResponse, FilterParams, APIResponse } from '../types/token';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export const useTokenData = (filters: FilterParams, searchQuery: string = '') => {
  const [tokens, setTokens] = useState<Token[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [hasNext, setHasNext] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | undefined>();

  const fetchTokens = useCallback(async (isLoadMore = false) => {
    try {
      if (!isLoadMore) {
        setLoading(true);
        setError(null);
      }

      const params: any = {
        ...filters,
        cursor: isLoadMore ? nextCursor : undefined
      };

      let response: APIResponse<TokenResponse>;

      if (searchQuery.trim()) {
        // Search tokens
        const { data } = await axios.get<APIResponse<TokenResponse>>(
          `${API_BASE_URL}/tokens/search/${encodeURIComponent(searchQuery.trim())}`
        );
        response = data;
      } else {
        // Get filtered tokens
        const { data } = await axios.get<APIResponse<TokenResponse>>(
          `${API_BASE_URL}/tokens`,
          { params }
        );
        response = data;
      }

      if (response.success && response.data) {
        if (isLoadMore) {
          setTokens(prev => [...prev, ...response.data!.tokens]);
        } else {
          setTokens(response.data.tokens);
        }
        setHasNext(response.data.hasNext);
        setNextCursor(response.data.nextCursor);
      } else {
        throw new Error(response.error || 'Failed to fetch tokens');
      }
    } catch (err) {
      console.error('Error fetching tokens:', err);
      setError(err instanceof Error ? err : new Error('Unknown error occurred'));
      if (!isLoadMore) {
        setTokens([]);
        setHasNext(false);
        setNextCursor(undefined);
      }
    } finally {
      setLoading(false);
    }
  }, [filters, searchQuery, nextCursor]);

  const loadMore = useCallback(() => {
    if (hasNext && !loading && nextCursor) {
      fetchTokens(true);
    }
  }, [hasNext, loading, nextCursor, fetchTokens]);

  const refreshData = useCallback(() => {
    setNextCursor(undefined);
    fetchTokens(false);
  }, [fetchTokens]);

  // Fetch data when filters or search query changes
  useEffect(() => {
    setNextCursor(undefined);
    fetchTokens(false);
  }, [filters, searchQuery]);

  return {
    tokens,
    loading,
    error,
    hasNext,
    loadMore,
    refreshData
  };
};