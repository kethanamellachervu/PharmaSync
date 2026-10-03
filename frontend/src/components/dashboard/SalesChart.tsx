import React, { useState } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { WeeklySalesPoint } from '../../types';

const weeklyData: WeeklySalesPoint[] = [
  { day: 'Mon', sales: 3200, prescriptions: 142 },
  { day: 'Tue', sales: 4100, prescriptions: 185 },
  { day: 'Wed', sales: 3850, prescriptions: 164 },
  { day: 'Thu', sales: 5200, prescriptions: 220 },
  { day: 'Fri', sales: 4900, prescriptions: 210 },
  { day: 'Sat', sales: 6150, prescriptions: 275 },
  { day: 'Sun', sales: 4285, prescriptions: 190 },
];

export const SalesChart: React.FC = () => {
  const [metric, setMetric] = useState<'sales' | 'prescriptions'>('sales');

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-subtle flex flex-col h-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-gray-100 gap-3">
        <div>
          <h3 className="text-base font-semibold text-gray-900">
            Weekly Sales Overview
          </h3>
          <p className="text-xs text-pharmacy-text-muted">
            Revenue trends and dispensed prescriptions for the past 7 days
          </p>
        </div>

        {/* Metric Selector Toggle */}
        <div className="inline-flex rounded-lg bg-gray-100 p-0.5 text-xs font-medium self-start sm:self-auto">
          <button
            onClick={() => setMetric('sales')}
            className={`px-3 py-1 rounded-md transition-all ${
              metric === 'sales'
                ? 'bg-white text-gray-900 shadow-xs'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            Revenue ($)
          </button>
          <button
            onClick={() => setMetric('prescriptions')}
            className={`px-3 py-1 rounded-md transition-all ${
              metric === 'prescriptions'
                ? 'bg-white text-gray-900 shadow-xs'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            Prescriptions
          </button>
        </div>
      </div>

      <div className="flex-1 w-full pt-4 min-h-[260px]">
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={weeklyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#087F5B" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#087F5B" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="colorRx" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
            <XAxis
              dataKey="day"
              tickLine={false}
              axisLine={false}
              tick={{ fill: '#64748B', fontSize: 12 }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tick={{ fill: '#64748B', fontSize: 12 }}
              tickFormatter={(val) => (metric === 'sales' ? `$${val}` : `${val}`)}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1E293B',
                color: '#FFFFFF',
                borderRadius: '8px',
                border: 'none',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                fontSize: '12px',
              }}
              formatter={(value: number) => [
                metric === 'sales' ? `$${value.toLocaleString()}` : `${value} rx`,
                metric === 'sales' ? 'Revenue' : 'Prescriptions',
              ]}
            />
            {metric === 'sales' ? (
              <Area
                type="monotone"
                dataKey="sales"
                stroke="#087F5B"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#colorSales)"
              />
            ) : (
              <Area
                type="monotone"
                dataKey="prescriptions"
                stroke="#3B82F6"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#colorRx)"
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default SalesChart;
