import React from 'react';
import type { MonthlyData } from '../../types/dashboard';

interface MonthlyChartProps {
  data: MonthlyData[];
}

export const MonthlyChart: React.FC<MonthlyChartProps> = ({ data }) => {
  const maxScore = Math.max(...data.map(d => d.averageScore), 100);

  return (
    <div className="bg-white p-6 rounded-lg border">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Monthly Evolution
      </h3>
      <div className="h-64">
        <div className="relative h-full">
          {/* Y-axis labels */}
          <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-xs text-gray-500">
            <span>{maxScore.toFixed(0)}</span>
            <span>{(maxScore * 0.75).toFixed(0)}</span>
            <span>{(maxScore * 0.5).toFixed(0)}</span>
            <span>{(maxScore * 0.25).toFixed(0)}</span>
            <span>0</span>
          </div>

          {/* Chart area */}
          <div className="ml-8 h-full relative">
            {/* Grid lines */}
            <div className="absolute inset-0 flex flex-col justify-between">
              {[0, 1, 2, 3, 4].map(i => (
                <div key={`grid-y-${i}`} className="border-b border-gray-200" />
              ))}
            </div>

            {/* Data line */}
            <svg className="absolute inset-0 w-full h-full">
              <polyline
                fill="none"
                stroke="#3B82F6"
                strokeWidth="2"
                points={data.map((d, i) => {
                  const x = (i / (data.length - 1)) * 100;
                  const y = 100 - (d.averageScore / maxScore) * 100;
                  return `${x}%,${y}%`;
                }).join(' ')}
              />

              {/* Data points */}
              {data.map((d, i) => {
                const x = (i / (data.length - 1)) * 100;
                const y = 100 - (d.averageScore / maxScore) * 100;
                return (
                  <circle
                    key={`point-${d.month}`}
                    cx={`${x}%`}
                    cy={`${y}%`}
                    r="4"
                    fill="#3B82F6"
                    className="hover:r-6 transition-all"
                  />
                );
              })}
            </svg>
          </div>
        </div>

        {/* X-axis labels */}
        <div className="ml-8 mt-2 flex justify-between text-xs text-gray-500">
          {data.map(d => (
            <span key={d.month} className="truncate">
              {new Date(d.month + '-01').toLocaleDateString('en-US', {
                month: 'short',
                year: '2-digit'
              })}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};
