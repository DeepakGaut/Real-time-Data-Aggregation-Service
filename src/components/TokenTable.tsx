import React, { memo } from 'react';
import { Token, PriceUpdate } from '../types/token';
import { formatNumber, formatPercent, formatCurrency } from '../utils/formatters';
import { TrendingUp, TrendingDown, ExternalLink, Loader2 } from 'lucide-react';

interface TokenTableProps {
  tokens: Token[];
  loading: boolean;
  priceUpdates: Map<string, PriceUpdate>;
}

const TokenRow = memo(({ token, priceUpdate }: { token: Token; priceUpdate?: PriceUpdate }) => {
  const priceChange = priceUpdate?.price_change ?? token.price_1hr_change;
  const isPositive = priceChange > 0;
  const isNegative = priceChange < 0;

  return (
    <tr className="hover:bg-gray-700/30 transition-colors">
      {/* Token Info */}
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
            <span className="text-white text-xs font-bold">
              {token.token_ticker.charAt(0)}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium text-white truncate">
              {token.token_name}
            </div>
            <div className="text-xs text-gray-400 truncate">
              {token.token_ticker}
            </div>
          </div>
        </div>
      </td>

      {/* Price */}
      <td className="px-6 py-4 whitespace-nowrap text-right">
        <div className="text-sm font-medium text-white">
          {priceUpdate ? (
            <span className="text-yellow-400 animate-pulse">
              ${formatCurrency(priceUpdate.price_usd || priceUpdate.price_sol * 100)}
            </span>
          ) : (
            <span>
              ${formatCurrency(token.price_usd || token.price_sol * 100)}
            </span>
          )}
        </div>
        <div className="text-xs text-gray-400">
          {formatNumber(token.price_sol, 8)} SOL
        </div>
      </td>

      {/* Price Change */}
      <td className="px-6 py-4 whitespace-nowrap text-right">
        <div className={`flex items-center justify-end space-x-1 text-sm font-medium ${
          isPositive ? 'text-green-400' : isNegative ? 'text-red-400' : 'text-gray-400'
        }`}>
          {isPositive && <TrendingUp className="h-3 w-3" />}
          {isNegative && <TrendingDown className="h-3 w-3" />}
          <span>{formatPercent(priceChange)}</span>
        </div>
      </td>

      {/* Volume */}
      <td className="px-6 py-4 whitespace-nowrap text-right">
        <div className="text-sm font-medium text-white">
          ${formatCurrency(token.volume_usd || token.volume_sol * 100)}
        </div>
        <div className="text-xs text-gray-400">
          {formatNumber(token.volume_sol)} SOL
        </div>
      </td>

      {/* Market Cap */}
      <td className="px-6 py-4 whitespace-nowrap text-right">
        <div className="text-sm font-medium text-white">
          ${formatCurrency(token.market_cap_usd || token.market_cap_sol * 100)}
        </div>
        <div className="text-xs text-gray-400">
          {formatNumber(token.market_cap_sol)} SOL
        </div>
      </td>

      {/* Liquidity */}
      <td className="px-6 py-4 whitespace-nowrap text-right">
        <div className="text-sm font-medium text-white">
          ${formatCurrency(token.liquidity_usd || token.liquidity_sol * 100)}
        </div>
        <div className="text-xs text-gray-400">
          {formatNumber(token.liquidity_sol)} SOL
        </div>
      </td>

      {/* Protocol/DEX */}
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center space-x-2">
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-900/50 text-blue-200 border border-blue-700/50">
            {token.protocol}
          </span>
          {token.pair_address && (
            <a
              href={`https://dexscreener.com/solana/${token.pair_address}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-white transition-colors"
            >
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      </td>

      {/* Sources */}
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex flex-wrap gap-1">
          {token.source.map(source => (
            <span
              key={source}
              className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-gray-700 text-gray-300"
            >
              {source}
            </span>
          ))}
        </div>
      </td>
    </tr>
  );
});

TokenRow.displayName = 'TokenRow';

export const TokenTable: React.FC<TokenTableProps> = ({ tokens, loading, priceUpdates }) => {
  if (loading && tokens.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center space-x-3 text-gray-400">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading token data...</span>
        </div>
      </div>
    );
  }

  if (tokens.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center text-gray-400">
          <p className="text-lg font-medium">No tokens found</p>
          <p className="text-sm">Try adjusting your search or filters</p>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-700">
        <thead>
          <tr className="bg-gray-800/50">
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
              Token
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">
              Price
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">
              1h Change
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">
              Volume (24h)
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">
              Market Cap
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">
              Liquidity
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
              Protocol
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
              Sources
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-700/50">
          {tokens.map((token) => (
            <TokenRow
              key={token.token_address}
              token={token}
              priceUpdate={priceUpdates.get(token.token_address)}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
};