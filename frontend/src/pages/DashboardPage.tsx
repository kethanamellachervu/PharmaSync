import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Boxes,
  AlertTriangle,
  DollarSign,
  ShoppingBag,
  Clock,
  RefreshCw,
  TrendingUp,
  RotateCcw,
  Truck,
  CheckCircle2,
  Send,
} from 'lucide-react';
import WelcomeBanner from '../components/dashboard/WelcomeBanner';
import StatCard from '../components/ui/StatCard';
import InventoryAlerts from '../components/dashboard/InventoryAlerts';
import RecentSalesTable from '../components/dashboard/RecentSalesTable';
import AddMedicineModal from '../components/inventory/AddMedicineModal';
import { apiService } from '../services/api';
import { DashboardStats, MlForecastingFullResult, ProcurementSummary } from '../types';

export const DashboardPage: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [mlData, setMlData] = useState<MlForecastingFullResult | null>(null);
  const [procurementSummary, setProcurementSummary] = useState<ProcurementSummary | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const fetchDashboard = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [statsData, mlPredictions, procSummary] = await Promise.all([
        apiService.getDashboardStats(),
        apiService.getMlPredictions(30).catch(() => null),
        apiService.getProcurementSummary().catch(() => null),
      ]);
      setStats(statsData);
      setMlData(mlPredictions);
      setProcurementSummary(procSummary);
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

  const itemsNeedingAttention = (mlData?.predictions || []).filter(
    (p) => p.stockStatus === 'Low Stock' || p.stockStatus === 'May Run Out Soon'
  );

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <WelcomeBanner onOpenAddMedicine={() => setIsAddModalOpen(true)} />

      {/* Error Banner if any */}
      {error && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between text-xs text-amber-800">
          <span>We couldn't load this information. Please try again.</span>
          <button
            onClick={fetchDashboard}
            className="flex items-center gap-1 font-semibold text-[#087F5B] hover:underline cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry</span>
          </button>
        </div>
      )}

      {/* 1. Primary Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        <StatCard
          title="Today's Sales"
          value={isLoading ? '...' : `₹${(stats?.todaySalesAmount ?? 0).toFixed(2)}`}
          subtitle="Counter collections today"
          icon={DollarSign}
          iconBgColor="bg-emerald-50"
          iconColor="text-emerald-700"
        />

        <StatCard
          title="Current Stock"
          value={isLoading ? '...' : `${(stats?.availableStock ?? 0).toLocaleString()} units`}
          subtitle="Total usable inventory on shelves"
          icon={Boxes}
          iconBgColor="bg-blue-50"
          iconColor="text-blue-600"
        />

        <StatCard
          title="Low Stock"
          value={isLoading ? '...' : `${stats?.lowStockCount ?? 0} medicines`}
          subtitle="Below safety threshold"
          icon={AlertTriangle}
          iconBgColor="bg-amber-50"
          iconColor="text-amber-600"
          isAlert={(stats?.lowStockCount ?? 0) > 0}
        />

        <StatCard
          title="Expiring Soon"
          value={isLoading ? '...' : `${stats?.nearExpiryBatchCount ?? 0} batches`}
          subtitle="Expiring within 30 days"
          icon={Clock}
          iconBgColor="bg-amber-50"
          iconColor="text-amber-600"
        />

        <StatCard
          title="Purchases"
          value={isLoading ? '...' : `₹${(stats?.todayPurchaseAmount ?? 0).toFixed(2)}`}
          subtitle="Inward supplier stock today"
          icon={ShoppingBag}
          iconBgColor="bg-purple-50"
          iconColor="text-purple-600"
        />

        <StatCard
          title="Suppliers"
          value={isLoading ? '...' : `${stats?.totalSuppliers ?? 0} registered`}
          subtitle="Active supplier accounts"
          icon={Truck}
          iconBgColor="bg-teal-50"
          iconColor="text-teal-600"
        />
      </div>

      {/* 2. Stock Planning Banner (Replaces AI technical banner) */}
      <div className="bg-gradient-to-r from-emerald-900 to-[#087F5B] text-white rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-white/20 text-white">
              <TrendingUp className="w-5 h-5" />
            </span>
            <h3 className="text-base font-bold tracking-wide">Stock Planning</h3>
          </div>
          <p className="text-xs text-emerald-100 max-w-xl leading-relaxed">
            See which medicines you may need soon and plan your purchases.{' '}
            {itemsNeedingAttention.length > 0 ? (
              <span className="font-semibold text-amber-200">
                {itemsNeedingAttention.length} medicine{itemsNeedingAttention.length > 1 ? 's' : ''} may need attention soon.
              </span>
            ) : (
              'Your stock looks good.'
            )}
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <Link
            to="/forecasting"
            className="flex items-center gap-1.5 px-4 py-2 bg-white text-[#087F5B] text-xs font-bold rounded-xl hover:bg-emerald-50 transition-colors shadow-xs"
          >
            <TrendingUp className="w-4 h-4" />
            <span>View Stock Planning</span>
          </Link>

          <Link
            to="/reorder"
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-800/80 hover:bg-emerald-800 text-white border border-white/20 text-xs font-bold rounded-xl transition-colors shadow-xs"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Review Stock Alerts ({itemsNeedingAttention.length})</span>
          </Link>
        </div>
      </div>

      {/* 3. Stock Alerts Cards (Simple recommendation cards for owner decision) */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-subtle space-y-4">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-amber-50 text-amber-600">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">Stock Alerts</h3>
              <p className="text-[11px] text-gray-400">
                {itemsNeedingAttention.length > 0
                  ? `${itemsNeedingAttention.length} medicines may need attention.`
                  : 'Your stock looks good.'}
              </p>
            </div>
          </div>
          <Link
            to="/reorder"
            className="text-xs font-bold text-[#087F5B] hover:underline flex items-center gap-1"
          >
            View All Alerts
          </Link>
        </div>

        {itemsNeedingAttention.length === 0 ? (
          <div className="py-6 text-center text-xs text-gray-500 flex items-center justify-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>No medicines need a purchase right now.</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {itemsNeedingAttention.slice(0, 6).map((item) => (
              <div
                key={item.medicineId}
                className="p-3.5 rounded-xl border border-gray-100 bg-gray-50/70 flex flex-col justify-between space-y-2"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-gray-900 truncate">{item.medicineName}</span>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                      {item.stockStatus}
                    </span>
                  </div>
                  <div className="mt-1 text-[11px] text-gray-500">
                    Current stock: <strong className="text-gray-800">{item.currentStock.toLocaleString()} {item.unit}</strong>
                  </div>
                  <div className="text-[11px] text-gray-500">
                    Needed in 30 Days: <strong className="text-gray-800">{item.forecast30d.toLocaleString()} {item.unit}</strong>
                  </div>
                </div>

                <div className="pt-2 border-t border-gray-200/60 flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-gray-600">{item.whatToDo}</span>
                  <Link
                    to="/reorder"
                    className="px-2.5 py-1 bg-[#087F5B] text-white text-[11px] font-bold rounded-lg hover:bg-[#066347] transition-colors"
                  >
                    Plan Purchase
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 4. PROCUREMENT STATUS WIDGET */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-subtle space-y-4">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-50 text-[#087F5B]">
              <Truck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">Procurement Status</h3>
              <p className="text-[11px] text-gray-400">Reorder request progression & supplier orders</p>
            </div>
          </div>
          <Link
            to="/supplier-messages"
            className="text-xs font-bold text-[#087F5B] hover:underline flex items-center gap-1"
          >
            Supplier Messages
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">Pending Admin Approval</p>
              <p className="text-2xl font-bold text-amber-900 mt-1">{procurementSummary?.pendingAdminApprovalCount ?? 0}</p>
            </div>
            <Clock className="w-6 h-6 text-amber-600" />
          </div>

          <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-200 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-blue-800 uppercase tracking-wider">Orders Sent to Suppliers</p>
              <p className="text-2xl font-bold text-blue-900 mt-1">{procurementSummary?.ordersSentCount ?? 0}</p>
            </div>
            <Send className="w-6 h-6 text-blue-600" />
          </div>

          <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">Orders Confirmed</p>
              <p className="text-2xl font-bold text-emerald-900 mt-1">{procurementSummary?.ordersConfirmedCount ?? 0}</p>
            </div>
            <CheckCircle2 className="w-6 h-6 text-emerald-600" />
          </div>
        </div>
      </div>

      {/* 5. Two-Column Operational Overview: Recent Activity & Expiry Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <InventoryAlerts
          lowStockItems={stats?.lowStockMedicines || []}
          nearExpiryItems={stats?.nearExpiryMedicines || []}
        />

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
