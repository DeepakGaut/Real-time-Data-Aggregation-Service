import React, { useState, useEffect } from 'react';
import { TokenTable } from './components/TokenTable';
import { FilterControls } from './components/FilterControls';
import { SearchBar } from './components/SearchBar';
import { ConnectionStatus } from './components/ConnectionStatus';
import { VolumeSpikes } from './components/VolumeSpikes';
import { PriceChanges } from './components/PriceChanges';
import { useWebSocket } from './hooks/useWebSocket';
import { useTokenData } from './hooks/useTokenData';
import { FilterParams } from './types/token';
import { TrendingUp, Coins, Activity, BarChart3 } from 'lucide-react';

function App() {
  const [filters, setFilters] = useState<FilterParams>({
    timeframe: '1h',
    sortBy: 'volume',
    sortOrder: 'desc',
    limit: 20
  });

  const [searchQuery, setSearchQuery] = useState('');

  const { 
    tokens, 
    loading, 
    error, 
    hasNext, 
    loadMore, 
    refreshData 
  } = useTokenData(filters, searchQuery);

  const { 
    connected, 
    lastUpdate, 
    priceUpdates,
    volumeSpikes,
    priceChanges,
    clearVolumeSpikes,
    clearPriceChanges
  } = useWebSocket();

  const handleFilterChange = (newFilters: Partial<FilterParams>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  // Auto-refresh data every 30 seconds when connected
  useEffect(() => {
    if (connected) {
      const interval = setInterval(() => {
        refreshData();
      }, 30000);

      return () => clearInterval(interval);
    }
  }, [connected, refreshData]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Header */}
      <header className="bg-gray-800/50 backdrop-blur-sm border-b border-gray-700/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
                <Coins className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">MemeFlow</h1>
                <p className="text-xs text-gray-400">Real-time Meme Coin Tracker</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <ConnectionStatus connected={connected} lastUpdate={lastUpdate} />
              <button
                onClick={refreshData}
                disabled={loading}
                className="inline-flex items-center px-3 py-2 border border-gray-600 rounded-md text-sm font-medium text-gray-300 bg-gray-700 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <TrendingUp className="h-4 w-4 mr-2" />
                {loading ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Real-time Alerts */}
        <VolumeSpikes spikes={volumeSpikes} onClear={clearVolumeSpikes} />
        <PriceChanges changes={priceChanges} onClear={clearPriceChanges} />

        {/* Search and Filters */}
        <div className="mb-8 space-y-6">
          <SearchBar onSearch={handleSearch} />
          <FilterControls filters={filters} onFilterChange={handleFilterChange} />
        </div>

        {/* Stats Summary */}
        {tokens.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-4">
              <div className="flex items-center space-x-2">
                <Activity className="h-5 w-5 text-blue-400" />
                <span className="text-sm text-gray-400">Total Tokens</span>
              </div>
              <div className="text-2xl font-bold text-white mt-1">
                {tokens.length}
              </div>
            </div>
            
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-4">
              <div className="flex items-center space-x-2">
                <BarChart3 className="h-5 w-5 text-green-400" />
                <span className="text-sm text-gray-400">Avg Volume</span>
              </div>
              <div className="text-2xl font-bold text-white mt-1">
                {(tokens.reduce((sum, token) => sum + token.volume_sol, 0) / tokens.length).toFixed(1)} SOL
              </div>
            </div>
            
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-4">
              <div className="flex items-center space-x-2">
                <TrendingUp className="h-5 w-5 text-orange-400" />
                <span className="text-sm text-gray-400">Volume Spikes</span>
              </div>
              <div className="text-2xl font-bold text-white mt-1">
                {volumeSpikes.length}
              </div>
            </div>
            
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-4">
              <div className="flex items-center space-x-2">
                <Activity className="h-5 w-5 text-purple-400" />
                <span className="text-sm text-gray-400">Price Changes</span>
              </div>
              <div className="text-2xl font-bold text-white mt-1">
                {priceChanges.length}
              </div>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-900/50 border border-red-700 rounded-lg p-4">
            <p className="text-red-200 text-sm">
              {error.message || 'An error occurred while loading token data'}
            </p>
          </div>
        )}

        {/* Token Table */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 overflow-hidden">
          <TokenTable 
            tokens={tokens} 
            loading={loading} 
            priceUpdates={priceUpdates}
          />
          
          {/* Load More Button */}
          {hasNext && !loading && (
            <div className="p-6 text-center border-t border-gray-700/50">
              <button
                onClick={loadMore}
                className="inline-flex items-center px-6 py-3 border border-gray-600 rounded-lg text-sm font-medium text-gray-300 bg-gray-700 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
              >
                Load More Tokens
              </button>
            </div>
          )}
        </div>

        {/* Stats Footer */}
        <div className="mt-8 text-center text-gray-400 text-sm">
          <p>
            Showing {tokens.length} tokens • Real-time data from DexScreener, Jupiter & GeckoTerminal
          </p>
          {connected && (
            <p className="mt-1">
              🟢 Live updates every 15 seconds • Last update: {lastUpdate?.toLocaleTimeString()}
            </p>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;