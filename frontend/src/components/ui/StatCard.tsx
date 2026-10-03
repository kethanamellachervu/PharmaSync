import React from 'react';
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';

export interface StatCardProps {
  title: string;
  value: string | number;
  change?: string;
  isPositive?: boolean;
  timeframe?: string;
  icon: LucideIcon;
  iconBgColor?: string;
  iconColor?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  change,
  isPositive = true,
  timeframe = 'vs last month',
  icon: Icon,
  iconBgColor = 'bg-[#DDF5E9]',
  iconColor = 'text-[#087F5B]',
}) => {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-subtle hover:shadow-card transition-all duration-200">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-pharmacy-text-muted tracking-wide uppercase">
            {title}
          </p>
          <h3 className="mt-2 text-2xl font-bold text-pharmacy-text-main tracking-tight">
            {value}
          </h3>
        </div>
        <div className={`p-3 rounded-lg ${iconBgColor} ${iconColor} flex items-center justify-center`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>

      {change && (
        <div className="mt-4 flex items-center gap-2 pt-2 border-t border-gray-50">
          <span
            className={`inline-flex items-center text-xs font-semibold px-1.5 py-0.5 rounded ${
              isPositive
                ? 'text-[#087F5B] bg-[#DDF5E9]/60'
                : 'text-amber-700 bg-amber-50'
            }`}
          >
            {isPositive ? (
              <TrendingUp className="w-3 h-3 mr-1" />
            ) : (
              <TrendingDown className="w-3 h-3 mr-1" />
            )}
            {change}
          </span>
          <span className="text-xs text-pharmacy-text-muted">{timeframe}</span>
        </div>
      )}
    </div>
  );
};

export default StatCard;
