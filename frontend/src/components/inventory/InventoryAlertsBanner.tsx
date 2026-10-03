import React from 'react';
import { AlertTriangle, Clock, AlertOctagon, CheckCircle2 } from 'lucide-react';
import { InventoryAlertsData } from '../../types';

interface InventoryAlertsBannerProps {
  alerts: InventoryAlertsData | null;
  activeFilter: string;
  onSelectFilter: (filter: 'all' | 'in-stock' | 'low-stock' | 'out-of-stock' | 'near-expiry' | 'expired') => void;
}

export const InventoryAlertsBanner: React.FC<InventoryAlertsBannerProps> = ({
  alerts,
  activeFilter,
  onSelectFilter,
}) => {
  if (!alerts) return null;

  const { summary } = alerts;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-5 shadow-subtle">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-gray-100 gap-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-emerald-50 text-[#087F5B]">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
              Inventory Health & Stock Status
            </h3>
            <p className="text-[11px] text-gray-500">
              Live monitoring of safety margins, batch expirations, and stockouts
            </p>
          </div>
        </div>

        <button
          onClick={() => onSelectFilter('all')}
          className="text-xs font-semibold text-[#087F5B] hover:underline self-start sm:self-auto"
        >
          Reset All Filters
        </button>
      </div>

      {/* Alert Metric Cards / Quick Filter Pills */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3">
        {/* Low Stock */}
        <button
          onClick={() => onSelectFilter('low-stock')}
          className={`p-3 rounded-xl border text-left transition-all ${
            activeFilter === 'low-stock'
              ? 'ring-2 ring-amber-500 bg-amber-50/80 border-amber-300'
              : 'bg-amber-50/40 border-amber-200/80 hover:bg-amber-50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-amber-800">Low Stock</span>
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          </div>
          <div className="mt-1 text-xl font-extrabold text-amber-900 font-mono">
            {summary.lowStockCount}
          </div>
          <span className="text-[10px] text-amber-700">Below safety limit</span>
        </button>

        {/* Near Expiry (<= 30 days) */}
        <button
          onClick={() => onSelectFilter('near-expiry')}
          className={`p-3 rounded-xl border text-left transition-all ${
            activeFilter === 'near-expiry'
              ? 'ring-2 ring-orange-500 bg-orange-50/80 border-orange-300'
              : 'bg-orange-50/40 border-orange-200/80 hover:bg-orange-50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-orange-800">Near Expiry</span>
            <Clock className="w-4 h-4 text-orange-600" />
          </div>
          <div className="mt-1 text-xl font-extrabold text-orange-900 font-mono">
            {summary.nearExpiryBatchCount}
          </div>
          <span className="text-[10px] text-orange-700">Expiring in &le; 30 days</span>
        </button>

        {/* Expired Batches */}
        <button
          onClick={() => onSelectFilter('expired')}
          className={`p-3 rounded-xl border text-left transition-all ${
            activeFilter === 'expired'
              ? 'ring-2 ring-red-500 bg-red-50/80 border-red-300'
              : 'bg-red-50/40 border-red-200/80 hover:bg-red-50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-red-800">Expired</span>
            <AlertOctagon className="w-4 h-4 text-red-600" />
          </div>
          <div className="mt-1 text-xl font-extrabold text-red-900 font-mono">
            {summary.expiredBatchCount}
          </div>
          <span className="text-[10px] text-red-700">Excluded from stock</span>
        </button>

        {/* Out of Stock */}
        <button
          onClick={() => onSelectFilter('out-of-stock')}
          className={`p-3 rounded-xl border text-left transition-all ${
            activeFilter === 'out-of-stock'
              ? 'ring-2 ring-gray-600 bg-gray-100 border-gray-400'
              : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-gray-700">Out of Stock</span>
            <AlertOctagon className="w-4 h-4 text-gray-500" />
          </div>
          <div className="mt-1 text-xl font-extrabold text-gray-800 font-mono">
            {summary.outOfStockCount}
          </div>
          <span className="text-[10px] text-gray-500">Zero usable units</span>
        </button>
      </div>
    </div>
  );
};

export default InventoryAlertsBanner;
