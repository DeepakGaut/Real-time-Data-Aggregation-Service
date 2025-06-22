import React from 'react';
import { VolumeSpike } from '../hooks/useWebSocket';
import { formatNumber, formatPercent } from '../utils/formatters';
import { TrendingUp, X } from 'lucide-react';

interface VolumeSpikesProps {
  spikes: VolumeSpike[];
  onClear: () => void;
}

export const VolumeSpikes: React.FC<VolumeSpikesProps> = ({ spikes, onClear }) => {
  if (spikes.length === 0) return null;

  return (
    <div className="bg-gradient-to-r from-orange-900/50 to-red-900/50 backdrop-blur-sm rounded-xl border border-orange-700/50 p-4 mb-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <TrendingUp className="h-5 w-5 text-orange-400" />
          <h3 className="text-lg font-semibold text-orange-200">Volume Spikes Detected</h3>
          <span className="bg-orange-600 text-white text-xs px-2 py-1 rounded-full">
            {spikes.length}
          </span>
        </div>
        <button
          onClick={onClear}
          className="text-orange-400 hover:text-orange-200 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      
      <div className="space-y-2 max-h-40 overflow-y-auto">
        {spikes.slice(0, 10).map((spike, index) => (
          <div
            key={`${spike.token_address}-${spike.timestamp}`}
            className="flex items-center justify-between bg-black/20 rounded-lg p-3 border border-orange-700/30"
          >
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-red-600 rounded-full flex items-center justify-center">
                <span className="text-white text-xs font-bold">
                  {spike.token_ticker.charAt(0)}
                </span>
              </div>
              <div>
                <div className="text-sm font-medium text-white">
                  {spike.token_name}
                </div>
                <div className="text-xs text-orange-300">
                  {spike.token_ticker}
                </div>
              </div>
            </div>
            
            <div className="text-right">
              <div className="text-sm font-bold text-orange-400">
                +{formatPercent(spike.spike_percentage)}
              </div>
              <div className="text-xs text-orange-300">
                {formatNumber(spike.current_volume)} SOL
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {spikes.length > 10 && (
        <div className="text-center mt-3 text-xs text-orange-400">
          +{spikes.length - 10} more spikes
        </div>
      )}
    </div>
  );
};