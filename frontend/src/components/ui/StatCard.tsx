import React from 'react';
import { LucideIcon } from 'lucide-react';

export interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  iconBgColor?: string;
  iconColor?: string;
  isAlert?: boolean;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  iconBgColor = 'bg-[#DDF5E9]',
  iconColor = 'text-[#087F5B]',
  isAlert = false,
}) => {
  return (
    <div
      className={`bg-white rounded-xl border p-5 shadow-subtle transition-all duration-200 ${
        isAlert ? 'border-amber-200 bg-amber-50/20' : 'border-gray-100 hover:shadow-card'
      }`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            {title}
          </p>
          <h3
            className={`mt-2 text-2xl font-bold tracking-tight ${
              isAlert ? 'text-amber-800' : 'text-gray-900'
            }`}
          >
            {value}
          </h3>
          {subtitle && (
            <p className="mt-1 text-xs text-pharmacy-text-muted">
              {subtitle}
            </p>
          )}
        </div>
        <div className={`p-3 rounded-xl ${iconBgColor} ${iconColor} flex items-center justify-center shrink-0`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
};

export default StatCard;
