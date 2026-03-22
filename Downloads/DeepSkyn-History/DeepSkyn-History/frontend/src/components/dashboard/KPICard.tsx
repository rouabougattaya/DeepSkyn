import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface KPICardProps {
  title: string;
  value: number | string;
  unit?: string;
  trend?: {
    direction: 'up' | 'down' | 'stable';
    percentage: number;
  };
  color?: 'blue' | 'green' | 'red' | 'yellow';
}

export const KPICard: React.FC<KPICardProps> = ({
  title,
  value,
  unit = '',
  trend,
  color = 'blue',
}) => {
  const getTrendIcon = () => {
    switch (trend?.direction) {
      case 'up':
        return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'down':
        return <TrendingDown className="w-4 h-4 text-red-500" />;
      case 'stable':
        return <Minus className="w-4 h-4 text-gray-500" />;
      default:
        return null;
    }
  };

  const getTrendColor = () => {
    switch (trend?.direction) {
      case 'up':
        return 'text-green-500';
      case 'down':
        return 'text-red-500';
      case 'stable':
        return 'text-gray-500';
      default:
        return 'text-gray-500';
    }
  };

  const getColorClasses = () => {
    switch (color) {
      case 'blue':
        return 'bg-blue-50 border-blue-200';
      case 'green':
        return 'bg-green-50 border-green-200';
      case 'red':
        return 'bg-red-50 border-red-200';
      case 'yellow':
        return 'bg-yellow-50 border-yellow-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className={`p-6 rounded-lg border ${getColorClasses()}`}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-600">{title}</h3>
        {trend && getTrendIcon()}
      </div>
      <div className="mt-2">
        <div className="flex items-baseline">
          <span className="text-2xl font-bold text-gray-900">
            {typeof value === 'number' ? value.toFixed(1) : value}
          </span>
          {unit && <span className="ml-1 text-sm text-gray-500">{unit}</span>}
        </div>
        {trend && (
          <div className={`mt-1 text-sm ${getTrendColor()}`}>
            {trend.direction === 'up' && '+'}
            {trend.percentage.toFixed(1)}% vs previous period
          </div>
        )}
      </div>
    </div>
  );
};
