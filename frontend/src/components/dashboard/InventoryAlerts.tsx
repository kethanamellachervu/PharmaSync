import React, { useState } from 'react';
import { AlertCircle, Clock, ShieldAlert, ArrowRight } from 'lucide-react';
import Badge from '../ui/Badge';
import { LowStockAlert, NearExpiryAlert } from '../../types';

const lowStockMedicines: LowStockAlert[] = [
  {
    id: 'ls-1',
    medicineName: 'Amoxicillin Trihydrate',
    dosage: '500mg Capsule',
    category: 'Antibiotics',
    currentStock: 12,
    minThreshold: 50,
    unit: 'strips',
    status: 'critical',
  },
  {
    id: 'ls-2',
    medicineName: 'Metformin Hydrochloride',
    dosage: '850mg Tablet',
    category: 'Diabetes Care',
    currentStock: 24,
    minThreshold: 80,
    unit: 'boxes',
    status: 'critical',
  },
  {
    id: 'ls-3',
    medicineName: 'Atorvastatin Calcium',
    dosage: '20mg Tablet',
    category: 'Cardiovascular',
    currentStock: 35,
    minThreshold: 60,
    unit: 'boxes',
    status: 'warning',
  },
  {
    id: 'ls-4',
    medicineName: 'Salbutamol Inhaler',
    dosage: '100mcg/dose',
    category: 'Respiratory',
    currentStock: 8,
    minThreshold: 25,
    unit: 'canisters',
    status: 'critical',
  },
];

const nearExpiryMedicines: NearExpiryAlert[] = [
  {
    id: 'ne-1',
    medicineName: 'Cefixime Oral Suspension',
    batchNumber: 'BT-8849',
    quantity: 42,
    expiryDate: '2026-11-15',
    daysRemaining: 18,
    status: 'critical',
  },
  {
    id: 'ne-2',
    medicineName: 'Insulin Glargine Pen',
    batchNumber: 'BT-9102',
    quantity: 16,
    expiryDate: '2026-12-01',
    daysRemaining: 34,
    status: 'warning',
  },
  {
    id: 'ne-3',
    medicineName: 'Azithromycin Tablets',
    batchNumber: 'BT-7721',
    quantity: 58,
    expiryDate: '2026-12-10',
    daysRemaining: 43,
    status: 'warning',
  },
  {
    id: 'ne-4',
    medicineName: 'Omeprazole Capsules',
    batchNumber: 'BT-6632',
    quantity: 90,
    expiryDate: '2026-12-25',
    daysRemaining: 58,
    status: 'warning',
  },
];

export const InventoryAlerts: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'low-stock' | 'near-expiry'>('low-stock');

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-subtle flex flex-col h-full">
      {/* Alert Header and Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-gray-100 gap-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-red-50 text-red-600">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-900">
              Inventory Action Alerts
            </h3>
            <p className="text-xs text-pharmacy-text-muted">
              Critical warnings requiring pharmacist review
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
            <span>Low Stock ({lowStockMedicines.length})</span>
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
            <span>Near Expiry ({nearExpiryMedicines.length})</span>
          </button>
        </div>
      </div>

      {/* Alert List */}
      <div className="pt-3 divide-y divide-gray-100 flex-1">
        {activeTab === 'low-stock' ? (
          lowStockMedicines.map((item) => (
            <div
              key={item.id}
              className="py-3 flex items-center justify-between gap-4 hover:bg-gray-50/70 rounded-lg px-2 transition-colors"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-semibold text-gray-900 truncate">
                    {item.medicineName}
                  </h4>
                  <Badge variant={item.status === 'critical' ? 'critical' : 'warning'}>
                    {item.status === 'critical' ? 'Critical' : 'Low'}
                  </Badge>
                </div>
                <p className="text-xs text-pharmacy-text-muted mt-0.5">
                  {item.dosage} • <span className="text-gray-500">{item.category}</span>
                </p>
              </div>

              <div className="text-right shrink-0">
                <div className="text-sm font-bold text-gray-900">
                  <span className={item.status === 'critical' ? 'text-red-600 font-extrabold' : 'text-amber-700'}>
                    {item.currentStock}
                  </span>{' '}
                  <span className="text-xs font-normal text-gray-500">/ {item.minThreshold} {item.unit}</span>
                </div>
                <span className="text-[11px] text-gray-400 block">Min Threshold</span>
              </div>
            </div>
          ))
        ) : (
          nearExpiryMedicines.map((item) => (
            <div
              key={item.id}
              className="py-3 flex items-center justify-between gap-4 hover:bg-gray-50/70 rounded-lg px-2 transition-colors"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-semibold text-gray-900 truncate">
                    {item.medicineName}
                  </h4>
                  <Badge variant={item.status === 'critical' ? 'critical' : 'warning'}>
                    {item.daysRemaining} days left
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
                <span className="text-[11px] text-amber-700 block">Stock at risk</span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer link */}
      <div className="pt-3 border-t border-gray-100 flex justify-end">
        <button className="text-xs font-medium text-[#087F5B] hover:text-[#066347] flex items-center gap-1 transition-colors">
          <span>View all inventory alerts in Phase 2</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

export default InventoryAlerts;
