import React from 'react';
import { Wifi, WifiOff, Clock } from 'lucide-react';

interface ConnectionStatusProps {
  connected: boolean;
  lastUpdate: Date | null;
}

export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({ connected, lastUpdate }) => {
  const formatLastUpdate = (date: Date | null) => {
    if (!date) return 'Never';
    
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const seconds = Math.floor(diff / 1000);
    
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    return `${Math.floor(seconds / 3600)}h ago`;
  };

  return (
    <div className="flex items-center space-x-3">
      {/* Connection Status */}
      <div className="flex items-center space-x-2">
        {connected ? (
          <div className="flex items-center space-x-2 text-green-400">
            <Wifi className="h-4 w-4" />
            <span className="text-sm font-medium">Live</span>
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          </div>
        ) : (
          <div className="flex items-center space-x-2 text-red-400">
            <WifiOff className="h-4 w-4" />
            <span className="text-sm font-medium">Offline</span>
          </div>
        )}
      </div>

      {/* Last Update */}
      {lastUpdate && (
        <div className="flex items-center space-x-1 text-gray-400">
          <Clock className="h-3 w-3" />
          <span className="text-xs">
            {formatLastUpdate(lastUpdate)}
          </span>
        </div>
      )}
    </div>
  );
};