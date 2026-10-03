import React, { useState } from 'react';
import { AlertCircle, Clock, ShieldAlert, ArrowRight, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import Badge from '../ui/Badge';

interface LowStockItem {
  id: string;
  name: string;
  category: string;
  totalStock: number;
  minStock: number;
}

interface NearExpiryItem {
  medicineId: string;
  medicineName: string;
  batchNumber: string;
  quantity: number;
  expiryDate: string;
  daysRemaining: number;
}

interface InventoryAlertsProps {
  lowStockItems: LowStockItem[];
  nearExpiryItems: NearExpiryItem[];
}

export const InventoryAlerts: React.FC<InventoryAlertsProps> = ({
  lowStockItems,
  nearExpiryItems,
}) => {
  const [activeTab, setActiveTab] = useState<'low-stock' | 'near-expiry'>('low-stock');

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-subtle flex flex-col h-full">
      {/* Alert Header and Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-gray-100 gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-amber-50 text-amber-700">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-900">
              Inventory Alerts
            </h3>
            <p className="text-xs text-pharmacy-text-muted">
              Stock replenishment and expiry tracking warnings
            </p>
          </div>
        </div>

        {/* Tab Buttons */}
        <div className="inline-flex rounded-lg bg-gray-100 p-0.5 text-xs font-medium self-start sm:self-auto">
          <button
            onClick={() => setActiveTab('low-stock')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all ${
              activeTab === 'low-stock'
                ? 'bg-white text-gray-900 shadow-xs'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            <AlertCircle className="w-3.5 h-3.5 text-red-500" />
            <span>Low Stock ({lowStockItems.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('near-expiry')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all ${
              activeTab === 'near-expiry'
                ? 'bg-white text-gray-900 shadow-xs'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-amber-500" />
            <span>Near Expiry ({nearExpiryItems.length})</span>
          </button>
        </div>
      </div>

      {/* Alert List */}
      <div className="pt-2 divide-y divide-gray-100 flex-1 min-h-[180px]">
        {activeTab === 'low-stock' ? (
          lowStockItems.length === 0 ? (
            <div className="py-8 flex flex-col items-center justify-center text-center">
              <CheckCircle2 className="w-8 h-8 text-[#087F5B] mb-2" />
              <p className="text-sm font-medium text-gray-800">All medicines are well-stocked</p>
              <p className="text-xs text-gray-500">No items are below minimum safety stock levels.</p>
            </div>
          ) : (
            lowStockItems.map((item) => (
              <div
                key={item.id}
                className="py-3 flex items-center justify-between gap-4 hover:bg-gray-50/70 rounded-lg px-2 transition-colors"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-semibold text-gray-900 truncate">
                      {item.name}
                    </h4>
                    <Badge variant={item.totalStock <= item.minStock / 2 ? 'critical' : 'warning'}>
                      {item.totalStock <= item.minStock / 2 ? 'Critical' : 'Low Stock'}
                    </Badge>
                  </div>
                  <p className="text-xs text-pharmacy-text-muted mt-0.5">
                    Category: <span className="text-gray-600">{item.category}</span>
                  </p>
                </div>

                <div className="text-right shrink-0">
                  <div className="text-sm font-bold text-gray-900">
                    <span className="text-red-600 font-extrabold">{item.totalStock}</span>{' '}
                    <span className="text-xs font-normal text-gray-500">/ {item.minStock} min</span>
                  </div>
                  <Link
                    to="/inventory"
                    className="text-[11px] text-[#087F5B] hover:underline font-medium inline-flex items-center gap-0.5"
                  >
                    Manage in Inventory →
                  </Link>
                </div>
              </div>
            ))
          )
        ) : (
          nearExpiryItems.length === 0 ? (
            <div className="py-8 flex flex-col items-center justify-center text-center">
              <CheckCircle2 className="w-8 h-8 text-[#087F5B] mb-2" />
              <p className="text-sm font-medium text-gray-800">No medicines near expiry</p>
              <p className="text-xs text-gray-500">All current batches have healthy shelf life.</p>
            </div>
          ) : (
            nearExpiryItems.map((item, idx) => (
              <div
                key={`${item.medicineId}-${item.batchNumber}-${idx}`}
                className="py-3 flex items-center justify-between gap-4 hover:bg-gray-50/70 rounded-lg px-2 transition-colors"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-semibold text-gray-900 truncate">
                      {item.medicineName}
                    </h4>
                    <Badge variant={item.daysRemaining <= 30 ? 'critical' : 'warning'}>
                      {item.daysRemaining <= 0
                        ? 'Expired'
                        : `${item.daysRemaining} days left`}
                    </Badge>
                  </div>
                  <p className="text-xs text-pharmacy-text-muted mt-0.5">
                    Batch: <span className="font-mono text-gray-700">{item.batchNumber}</span> • Expiry: {item.expiryDate}
                  </p>
                </div>

                <div className="text-right shrink-0">
                  <div className="text-sm font-bold text-gray-900">
                    {item.quantity} <span className="text-xs font-normal text-gray-500">units</span>
                  </div>
                  <Link
                    to="/inventory"
                    className="text-[11px] text-[#087F5B] hover:underline font-medium inline-flex items-center gap-0.5"
                  >
                    View in Inventory →
                  </Link>
                </div>
              </div>
            ))
          )
        )}
      </div>

      {/* Footer link to view inventory */}
      <div className="pt-3 border-t border-gray-100 flex justify-end">
        <Link
          to="/inventory"
          className="text-xs font-semibold text-[#087F5B] hover:text-[#066347] flex items-center gap-1 transition-colors"
        >
          <span>View all medicines in inventory</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
};

export default InventoryAlerts;
