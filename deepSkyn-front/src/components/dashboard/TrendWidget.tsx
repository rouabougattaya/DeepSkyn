import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { TrendData } from '../../types/dashboard';

interface TrendWidgetProps {
  trend: TrendData;
}

export const TrendWidget: React.FC<TrendWidgetProps> = ({ trend }) => {
  const getTrendIcon = () => {
    switch (trend.direction) {
      case 'up':
        return <TrendingUp className="w-5 h-5 text-green-500" />;
      case 'down':
        return <TrendingDown className="w-5 h-5 text-red-500" />;
      case 'stable':
        return <Minus className="w-5 h-5 text-gray-500" />;
      default:
        return null;
    }
  };

  const getTrendColor = () => {
    switch (trend.direction) {
      case 'up':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'down':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'stable':
        return 'text-gray-600 bg-gray-50 border-gray-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className={`p-4 rounded-lg border ${getTrendColor()}`}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{trend.period}</span>
        {getTrendIcon()}
      </div>
      <div className="mt-2">
        <div className="flex items-baseline space-x-2">
          <span className="text-lg font-bold">{trend.current.toFixed(1)}</span>
          <span className="text-xs text-gray-500">vs {trend.previous.toFixed(1)}</span>
        </div>
        <div className="mt-1 text-xs">
          {trend.direction === 'up' && '+'}
          {trend.percentage.toFixed(1)}% de changement
        </div>
      </div>
    </div>
  );
};
