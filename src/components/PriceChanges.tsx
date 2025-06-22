import React from 'react';
import { PriceChangeEvent } from '../hooks/useWebSocket';
import { formatCurrency, formatPercent } from '../utils/formatters';
import { TrendingUp, TrendingDown, X } from 'lucide-react';

interface PriceChangesProps {
  changes: PriceChangeEvent[];
  onClear: () => void;
}

export const PriceChanges: React.FC<PriceChangesProps> = ({ changes, onClear }) => {
  if (changes.length === 0) return null;

  return (
    <div className="bg-gradient-to-r from-blue-900/50 to-purple-900/50 backdrop-blur-sm rounded-xl border border-blue-700/50 p-4 mb-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <TrendingUp className="h-5 w-5 text-blue-400" />
          <h3 className="text-lg font-semibold text-blue-200">Significant Price Changes</h3>
          <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded-full">
            {changes.length}
          </span>
        </div>
        <button
          onClick={onClear}
          className="text-blue-400 hover:text-blue-200 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      
      <div className="space-y-2 max-h-40 overflow-y-auto">
        {changes.slice(0, 10).map((change, index) => {
          const isPositive = change.change_percentage > 0;
          
          return (
            <div
              key={`${change.token_address}-${change.timestamp}`}
              className="flex items-center justify-between bg-black/20 rounded-lg p-3 border border-blue-700/30"
            >
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-bold">
                    {change.token_ticker.charAt(0)}
                  </span>
                </div>
                <div>
                  <div className="text-sm font-medium text-white">
                    {change.token_name}
                  </div>
                  <div className="text-xs text-blue-300">
                    {change.token_ticker}
                  </div>
                </div>
              </div>
              
              <div className="text-right">
                <div className={`flex items-center space-x-1 text-sm font-bold ${
                  isPositive ? 'text-green-400' : 'text-red-400'
                }`}>
                  {isPositive ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (
                    <TrendingDown className="h-3 w-3" />
                  )}
                  <span>{formatPercent(change.change_percentage)}</span>
                </div>
                <div className="text-xs text-blue-300">
                  ${formatCurrency(change.current_price * 100)}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      
      {changes.length > 10 && (
        <div className="text-center mt-3 text-xs text-blue-400">
          +{changes.length - 10} more changes
        </div>
      )}
    </div>
  );
};