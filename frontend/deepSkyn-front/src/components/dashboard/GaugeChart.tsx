import React from 'react';

interface GaugeChartProps {
  value: number;
  max: number;
  label: string;
  color?: string;
}

export const GaugeChart: React.FC<GaugeChartProps> = ({
  value,
  max,
  label,
  color = '#3B82F6',
}) => {
  const percentage = (value / max) * 100;

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-32 h-16">
        {/* Background arc */}
        <svg
          className="absolute inset-0 w-full h-full"
          viewBox="0 0 120 60"
        >
          <path
            d="M 10 50 A 50 50 0 0 1 110 50"
            fill="none"
            stroke="#E5E7EB"
            strokeWidth="10"
            strokeLinecap="round"
          />
          {/* Value arc */}
          <path
            d="M 10 50 A 50 50 0 0 1 110 50"
            fill="none"
            stroke={color}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={`${percentage * 1.57} 157`}
            transform="rotate(-90 60 50)"
          />
        </svg>
        {/* Center text */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <span className="text-xl font-bold text-gray-900">
              {value.toFixed(0)}
            </span>
            <span className="text-xs text-gray-500 block">/{max}</span>
          </div>
        </div>
      </div>
      <p className="mt-2 text-sm text-gray-600">{label}</p>
    </div>
  );
};
