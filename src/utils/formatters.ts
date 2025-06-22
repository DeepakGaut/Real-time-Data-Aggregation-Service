export const formatNumber = (value: number, decimals: number = 2): string => {
  if (value === 0) return '0';
  
  if (Math.abs(value) < 0.001) {
    return value.toExponential(2);
  }
  
  if (Math.abs(value) >= 1e9) {
    return (value / 1e9).toFixed(1) + 'B';
  }
  
  if (Math.abs(value) >= 1e6) {
    return (value / 1e6).toFixed(1) + 'M';
  }
  
  if (Math.abs(value) >= 1e3) {
    return (value / 1e3).toFixed(1) + 'K';
  }
  
  return value.toFixed(decimals);
};

export const formatCurrency = (value: number): string => {
  if (value === 0) return '0.00';
  
  if (Math.abs(value) < 0.01) {
    return value.toExponential(2);
  }
  
  if (Math.abs(value) >= 1e9) {
    return (value / 1e9).toFixed(2) + 'B';
  }
  
  if (Math.abs(value) >= 1e6) {
    return (value / 1e6).toFixed(2) + 'M';
  }
  
  if (Math.abs(value) >= 1e3) {
    return (value / 1e3).toFixed(2) + 'K';
  }
  
  return value.toFixed(2);
};

export const formatPercent = (value: number): string => {
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
};

export const formatAddress = (address: string, startChars: number = 6, endChars: number = 4): string => {
  if (address.length <= startChars + endChars) {
    return address;
  }
  
  return `${address.slice(0, startChars)}...${address.slice(-endChars)}`;
};