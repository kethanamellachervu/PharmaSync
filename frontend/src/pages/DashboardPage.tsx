import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Pill,
  Boxes,
  AlertTriangle,
  DollarSign,
  ShoppingBag,
  Clock,
  CalendarCheck,
  RefreshCw,
  BarChart2,
  PieChart as PieChartIcon,
  TrendingUp,
  RotateCcw,
  Sparkles,
  Truck,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import WelcomeBanner from '../components/dashboard/WelcomeBanner';
import StatCard from '../components/ui/StatCard';
import InventoryAlerts from '../components/dashboard/InventoryAlerts';
import RecentSalesTable from '../components/dashboard/RecentSalesTable';
import AddMedicineModal from '../components/inventory/AddMedicineModal';
import { apiService } from '../services/api';
import { DashboardStats, ForecastOverview } from '../types';

export const DashboardPage: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const [forecastOverview, setForecastOverview] = useState<ForecastOverview | null>(null);

  const fetchDashboard = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [statsData, forecastData] = await Promise.all([
        apiService.getDashboardStats(),
        apiService.getForecastOverview(30).catch(() => null),
      ]);
      setStats(statsData);
      setForecastOverview(forecastData);
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

  // Extract trend data for 7-day sales chart
  const salesChartData = (stats as unknown as { salesTrend7Days?: { label: string; amount: number; count: number }[] })
    ?.salesTrend7Days || [];

  // Extract category distribution data
  const categoryChartData = (
    stats as unknown as { categoryDistribution?: { category: string; usableStock: number; medicineCount: number }[] }
  )?.categoryDistribution?.slice(0, 5) || [];

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
            className="flex items-center gap-1 font-semibold text-[#087F5B] hover:underline cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry</span>
          </button>
        </div>
      )}

      {/* 1. Primary Statistic Cards */}
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
          subtitle="Total usable inventory on shelves"
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
          subtitle="Counter collections today"
          icon={DollarSign}
          iconBgColor="bg-emerald-50"
          iconColor="text-emerald-700"
        />
      </div>

      {/* 2. Additional Operational Metrics Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-white border border-gray-200 shadow-subtle flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
            <ShoppingBag className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block">
              Today's Purchases
            </span>
            <span className="text-base font-bold font-mono text-gray-900">
              ₹{(stats?.todayPurchaseAmount ?? 0).toFixed(2)}
            </span>
            <span className="text-[10px] text-gray-500 block">Inward supplier stock</span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-gray-200 shadow-subtle flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block">
              Near-Expiry Batches
            </span>
            <span className="text-base font-bold font-mono text-amber-600">
              {stats?.nearExpiryBatchCount ?? 0} batches
            </span>
            <span className="text-[10px] text-gray-500 block">Expiring within 30 days</span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-gray-200 shadow-subtle flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
            <CalendarCheck className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block">
              Monthly Sales
            </span>
            <span className="text-base font-bold font-mono text-gray-900">
              ₹{(stats?.monthSalesAmount ?? 0).toFixed(2)}
            </span>
            <span className="text-[10px] text-gray-500 block">Current calendar month</span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-gray-200 shadow-subtle flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <Truck className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block">
              Registered Suppliers
            </span>
            <span className="text-base font-bold font-mono text-gray-900">
              {stats?.totalSuppliers ?? 0} Suppliers
            </span>
            <span className="text-[10px] text-indigo-600 font-semibold block">
              {stats?.pendingPurchaseOrders ?? 0} pending orders
            </span>
          </div>
        </div>
      </div>

      {/* 3. Visual Analytics Charts: Sales Trend & Category Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Sales Trend Chart (7 Days) */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-gray-200 p-5 shadow-subtle flex flex-col justify-between">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-emerald-50 text-[#087F5B]">
                <BarChart2 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900">Sales Trend (Last 7 Days)</h3>
                <p className="text-[11px] text-gray-400">Daily revenue collections</p>
              </div>
            </div>
            <span className="text-[11px] font-semibold text-[#087F5B] bg-[#DDF5E9] px-2 py-0.5 rounded-full">
              Live Data
            </span>
          </div>

          <div className="h-56 w-full pt-2">
            {salesChartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-gray-400">
                No recent sales recorded.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={salesChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#888' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#888' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    formatter={(value: number) => [`₹${Number(value).toFixed(2)}`, 'Sales Revenue']}
                    contentStyle={{
                      backgroundColor: '#fff',
                      borderRadius: '8px',
                      border: '1px solid #e5e7eb',
                      fontSize: '12px',
                    }}
                  />
                  <Bar dataKey="amount" fill="#087F5B" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Inventory Category Distribution Chart */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-gray-200 p-5 shadow-subtle flex flex-col justify-between">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
                <PieChartIcon className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900">Stock by Category</h3>
                <p className="text-[11px] text-gray-400">Usable shelf units</p>
              </div>
            </div>
            <span className="text-[11px] font-semibold text-gray-500">Top Categories</span>
          </div>

          <div className="space-y-3 pt-1">
            {categoryChartData.length === 0 ? (
              <div className="py-8 text-center text-xs text-gray-400">No inventory data available.</div>
            ) : (
              categoryChartData.map((cat, idx) => {
                const totalStock = stats?.availableStock || 1;
                const pct = Math.round((cat.usableStock / totalStock) * 100);
                const colors = ['#087F5B', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899'];
                const color = colors[idx % colors.length];

                return (
                  <div key={cat.category} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-gray-800">{cat.category}</span>
                      <span className="font-mono text-gray-600 font-medium">
                        {cat.usableStock} units ({pct}%)
                      </span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                      <div
                        className="h-2 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, Math.max(5, pct))}%`, backgroundColor: color }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* 4. AI Demand Forecasting & Smart Reorder Insights */}
      {forecastOverview && (
        <div className="bg-gradient-to-r from-emerald-900 to-[#087F5B] text-white rounded-2xl p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-1 rounded-lg bg-white/20 text-white">
                <Sparkles className="w-4 h-4" />
              </span>
              <h3 className="text-sm font-bold tracking-wide">
                AI Demand Forecasting & Reorder Insights
              </h3>
            </div>
            <p className="text-xs text-emerald-100 max-w-xl leading-relaxed">
              Analyzing {forecastOverview.totalAnalyzed} medicines across 30-day moving averages.{' '}
              {forecastOverview.atRiskStockoutCount > 0 ? (
                <span className="font-semibold text-amber-200">
                  {forecastOverview.atRiskStockoutCount} medicine{forecastOverview.atRiskStockoutCount > 1 ? 's' : ''} at risk of stockout within 7 days.
                </span>
              ) : (
                'All medicines have sufficient stock coverage.'
              )}
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <Link
              to="/forecasting"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-[#087F5B] text-xs font-bold rounded-xl hover:bg-emerald-50 transition-colors shadow-xs"
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Demand Forecasts</span>
            </Link>

            <Link
              to="/reorder"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-800/80 hover:bg-emerald-800 text-white border border-white/20 text-xs font-bold rounded-xl transition-colors shadow-xs"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Smart Reorder ({forecastOverview.pendingReviewsCount})</span>
            </Link>
          </div>
        </div>
      )}

      {/* 5. Two-Column Operational Overview: Alerts & Recent Sales */}
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
