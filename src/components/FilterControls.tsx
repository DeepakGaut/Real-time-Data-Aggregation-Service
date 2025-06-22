import React from 'react';
import { FilterParams } from '../types/token';
import { Filter, SortAsc, SortDesc } from 'lucide-react';

interface FilterControlsProps {
  filters: FilterParams;
  onFilterChange: (filters: Partial<FilterParams>) => void;
}

export const FilterControls: React.FC<FilterControlsProps> = ({ filters, onFilterChange }) => {
  return (
    <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
      <div className="flex items-center space-x-2 mb-4">
        <Filter className="h-5 w-5 text-gray-400" />
        <h3 className="text-lg font-medium text-white">Filters & Sorting</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Timeframe */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Timeframe
          </label>
          <select
            value={filters.timeframe || '1h'}
            onChange={(e) => onFilterChange({ timeframe: e.target.value as FilterParams['timeframe'] })}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="1h">1 Hour</option>
            <option value="24h">24 Hours</option>
            <option value="7d">7 Days</option>
          </select>
        </div>

        {/* Sort By */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Sort By
          </label>
          <select
            value={filters.sortBy || 'volume'}
            onChange={(e) => onFilterChange({ sortBy: e.target.value as FilterParams['sortBy'] })}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="volume">Volume</option>
            <option value="price_change">Price Change</option>
            <option value="market_cap">Market Cap</option>
            <option value="liquidity">Liquidity</option>
          </select>
        </div>

        {/* Sort Order */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Sort Order
          </label>
          <div className="flex space-x-2">
            <button
              onClick={() => onFilterChange({ sortOrder: 'desc' })}
              className={`flex-1 flex items-center justify-center px-3 py-2 rounded-lg border transition-colors ${
                filters.sortOrder === 'desc'
                  ? 'bg-blue-600 border-blue-500 text-white'
                  : 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600'
              }`}
            >
              <SortDesc className="h-4 w-4 mr-1" />
              High
            </button>
            <button
              onClick={() => onFilterChange({ sortOrder: 'asc' })}
              className={`flex-1 flex items-center justify-center px-3 py-2 rounded-lg border transition-colors ${
                filters.sortOrder === 'asc'
                  ? 'bg-blue-600 border-blue-500 text-white'
                  : 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600'
              }`}
            >
              <SortAsc className="h-4 w-4 mr-1" />
              Low
            </button>
          </div>
        </div>

        {/* Results per page */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Results per page
          </label>
          <select
            value={filters.limit || 20}
            onChange={(e) => onFilterChange({ limit: parseInt(e.target.value) })}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>
      </div>

      {/* Advanced Filters */}
      <div className="mt-6 pt-6 border-t border-gray-700/50">
        <h4 className="text-sm font-medium text-gray-300 mb-4">Advanced Filters</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Minimum Volume */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Minimum Volume (SOL)
            </label>
            <input
              type="number"
              min="0"
              step="0.1"
              placeholder="e.g., 100"
              value={filters.minVolume || ''}
              onChange={(e) => onFilterChange({ 
                minVolume: e.target.value ? parseFloat(e.target.value) : undefined 
              })}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Minimum Market Cap */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Minimum Market Cap (SOL)
            </label>
            <input
              type="number"
              min="0"
              step="1"
              placeholder="e.g., 1000"
              value={filters.minMarketCap || ''}
              onChange={(e) => onFilterChange({ 
                minMarketCap: e.target.value ? parseFloat(e.target.value) : undefined 
              })}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>
    </div>
  );
};