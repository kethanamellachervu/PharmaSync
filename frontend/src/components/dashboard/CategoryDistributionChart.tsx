import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { CategoryDistributionPoint } from '../../types';

const categoryData: CategoryDistributionPoint[] = [
  { name: 'Antibiotics', value: 385, color: '#087F5B' },
  { name: 'Analgesics', value: 295, color: '#0EA5E9' },
  { name: 'Cardiovascular', value: 245, color: '#8B5CF6' },
  { name: 'Diabetes Care', value: 210, color: '#F59E0B' },
  { name: 'Respiratory', value: 160, color: '#EC4899' },
  { name: 'Vitamins & OTC', value: 133, color: '#10B981' },
];

export const CategoryDistributionChart: React.FC = () => {
  const totalItems = categoryData.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-subtle flex flex-col h-full">
      <div className="pb-4 border-b border-gray-100">
        <h3 className="text-base font-semibold text-gray-900">
          Category Distribution
        </h3>
        <p className="text-xs text-pharmacy-text-muted">
          Current stock distribution across major pharmacological classes
        </p>
      </div>

      <div className="pt-2 flex-1 flex flex-col sm:flex-row items-center justify-between">
        {/* Doughnut Chart */}
        <div className="w-full sm:w-1/2 h-[220px] relative flex items-center justify-center">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={categoryData}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={80}
                paddingAngle={3}
                dataKey="value"
              >
                {categoryData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} stroke="#FFFFFF" strokeWidth={2} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1E293B',
                  color: '#FFFFFF',
                  borderRadius: '8px',
                  border: 'none',
                  fontSize: '12px',
                }}
                formatter={(value: number) => [`${value} SKUs`, 'Count']}
              />
            </PieChart>
          </ResponsiveContainer>
          {/* Centered label */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-xl font-bold text-gray-800">{totalItems}</span>
            <span className="text-[10px] text-gray-500 uppercase tracking-wider">Total SKUs</span>
          </div>
        </div>

        {/* Legend List */}
        <div className="w-full sm:w-1/2 mt-4 sm:mt-0 sm:pl-4 space-y-2">
          {categoryData.map((category) => {
            const percentage = Math.round((category.value / totalItems) * 100);
            return (
              <div key={category.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 truncate">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: category.color }}
                  />
                  <span className="text-gray-700 font-medium truncate">{category.name}</span>
                </div>
                <div className="flex items-center gap-2 pl-2">
                  <span className="text-gray-500 font-mono text-[11px]">{category.value}</span>
                  <span className="text-gray-400 font-mono text-[10px] w-7 text-right">
                    {percentage}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default CategoryDistributionChart;
