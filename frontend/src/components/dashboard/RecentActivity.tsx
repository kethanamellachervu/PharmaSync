import React from 'react';
import { ShoppingBag, ArrowDownLeft, RotateCcw, Truck } from 'lucide-react';
import Badge from '../ui/Badge';
import { RecentActivityItem } from '../../types';

const activities: RecentActivityItem[] = [
  {
    id: 'act-1',
    type: 'sale',
    title: 'Prescription Dispensed #RX-4912',
    description: 'Amoxicillin 500mg (2), Paracetamol 500mg (1)',
    timestamp: '12 mins ago',
    amount: '+$42.50',
    status: 'completed',
  },
  {
    id: 'act-2',
    type: 'supplier_order',
    title: 'Supplier Batch Received #PO-1084',
    description: 'MedPharma Corp - 250 units Cefixime, Atorvastatin',
    timestamp: '45 mins ago',
    amount: '-$1,240.00',
    status: 'completed',
  },
  {
    id: 'act-3',
    type: 'sale',
    title: 'OTC Sale #INV-8821',
    description: 'Vitamin C 1000mg, Omeprazole 20mg',
    timestamp: '1 hour ago',
    amount: '+$28.00',
    status: 'completed',
  },
  {
    id: 'act-4',
    type: 'adjustment',
    title: 'Inventory Audit Discrepancy',
    description: 'Batch #BT-4412 adjusted (-2 units damaged during shelving)',
    timestamp: '3 hours ago',
    status: 'in_progress',
  },
  {
    id: 'act-5',
    type: 'restock',
    title: 'Automated Reorder Triggered',
    description: 'Smart reorder dispatched for Metformin 850mg (100 units)',
    timestamp: '5 hours ago',
    status: 'pending',
  },
];

export const RecentActivity: React.FC = () => {
  const getActivityIcon = (type: RecentActivityItem['type']) => {
    switch (type) {
      case 'sale':
        return (
          <div className="p-2 rounded-lg bg-emerald-50 text-[#087F5B]">
            <ShoppingBag className="w-4 h-4" />
          </div>
        );
      case 'supplier_order':
        return (
          <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
            <Truck className="w-4 h-4" />
          </div>
        );
      case 'restock':
        return (
          <div className="p-2 rounded-lg bg-purple-50 text-purple-600">
            <ArrowDownLeft className="w-4 h-4" />
          </div>
        );
      case 'adjustment':
        return (
          <div className="p-2 rounded-lg bg-amber-50 text-amber-600">
            <RotateCcw className="w-4 h-4" />
          </div>
        );
    }
  };

  const getStatusBadge = (status: RecentActivityItem['status']) => {
    switch (status) {
      case 'completed':
        return <Badge variant="success">Completed</Badge>;
      case 'pending':
        return <Badge variant="warning">Pending</Badge>;
      case 'in_progress':
        return <Badge variant="info">Reviewing</Badge>;
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-subtle">
      <div className="flex items-center justify-between pb-4 border-b border-gray-100">
        <div>
          <h3 className="text-base font-semibold text-gray-900">
            Recent System Activity
          </h3>
          <p className="text-xs text-pharmacy-text-muted">
            Live log of dispensations, deliveries, and inventory audits
          </p>
        </div>
        <span className="text-xs font-medium text-gray-400">
          Showing last 5 events
        </span>
      </div>

      <div className="divide-y divide-gray-100 overflow-x-auto">
        <table className="w-full text-left text-xs min-w-[580px]">
          <thead>
            <tr className="text-gray-400 font-medium">
              <th className="py-3 px-2">Activity</th>
              <th className="py-3 px-2">Details</th>
              <th className="py-3 px-2 text-right">Amount</th>
              <th className="py-3 px-2 text-center">Status</th>
              <th className="py-3 px-2 text-right">Time</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {activities.map((item) => (
              <tr key={item.id} className="hover:bg-gray-50/60 transition-colors">
                <td className="py-3 px-2">
                  <div className="flex items-center gap-2.5">
                    {getActivityIcon(item.type)}
                    <span className="font-semibold text-gray-800">{item.title}</span>
                  </div>
                </td>
                <td className="py-3 px-2 text-gray-600 max-w-xs truncate">
                  {item.description}
                </td>
                <td className="py-3 px-2 text-right font-medium font-mono text-gray-800">
                  {item.amount || '—'}
                </td>
                <td className="py-3 px-2 text-center">
                  {getStatusBadge(item.status)}
                </td>
                <td className="py-3 px-2 text-right text-gray-400">
                  {item.timestamp}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default RecentActivity;
