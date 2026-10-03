import React, { useState, useEffect, useCallback } from 'react';
import { Pill, Boxes, AlertTriangle, DollarSign, RefreshCw } from 'lucide-react';
import WelcomeBanner from '../components/dashboard/WelcomeBanner';
import StatCard from '../components/ui/StatCard';
import InventoryAlerts from '../components/dashboard/InventoryAlerts';
import RecentSalesTable from '../components/dashboard/RecentSalesTable';
import AddMedicineModal from '../components/inventory/AddMedicineModal';
import { apiService } from '../services/api';
import { DashboardStats } from '../types';

export const DashboardPage: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const fetchDashboard = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiService.getDashboardStats();
      setStats(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load dashboard.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  return (
    <div className="space-y-6">
      {/* Welcome Banner with Medical Shop Name & Quick Actions */}
      <WelcomeBanner onOpenAddMedicine={() => setIsAddModalOpen(true)} />

      {/* Error / Offline Banner if any */}
      {error && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between text-xs text-amber-800">
          <span>{error}</span>
          <button
            onClick={fetchDashboard}
            className="flex items-center gap-1 font-semibold text-[#087F5B] hover:underline"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry</span>
          </button>
        </div>
      )}

      {/* 4 Simple Statistic Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <StatCard
          title="Total Medicines"
          value={isLoading ? '...' : (stats?.totalMedicines ?? 0)}
          subtitle="Unique pharmaceutical products"
          icon={Pill}
          iconBgColor="bg-[#DDF5E9]"
          iconColor="text-[#087F5B]"
        />

        <StatCard
          title="Available Stock"
          value={isLoading ? '...' : `${stats?.availableStock ?? 0} units`}
          subtitle="Total inventory on shelves"
          icon={Boxes}
          iconBgColor="bg-blue-50"
          iconColor="text-blue-600"
        />

        <StatCard
          title="Low Stock Medicines"
          value={isLoading ? '...' : (stats?.lowStockCount ?? 0)}
          subtitle="Below safety threshold"
          icon={AlertTriangle}
          iconBgColor="bg-amber-50"
          iconColor="text-amber-600"
          isAlert={(stats?.lowStockCount ?? 0) > 0}
        />

        <StatCard
          title="Today's Sales"
          value={isLoading ? '...' : `₹${(stats?.todaySalesAmount ?? 0).toFixed(2)}`}
          subtitle="Total counter collections today"
          icon={DollarSign}
          iconBgColor="bg-emerald-50"
          iconColor="text-emerald-700"
        />
      </div>

      {/* Two-Column Practical Overview: Alerts & Recent Sales */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Inventory Action Alerts */}
        <InventoryAlerts
          lowStockItems={stats?.lowStockMedicines || []}
          nearExpiryItems={stats?.nearExpiryMedicines || []}
        />

        {/* Recent Sales Transactions */}
        <RecentSalesTable sales={stats?.recentSales || []} />
      </div>

      {/* Add Medicine Modal */}
      <AddMedicineModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={() => fetchDashboard()}
      />
    </div>
  );
};

export default DashboardPage;
