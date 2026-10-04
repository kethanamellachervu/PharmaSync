import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  BarChart3,
  ShoppingCart,
  Package,
  AlertTriangle,
  ShoppingBag,
  Download,
  Calendar,
  Filter,
  Search,
  RefreshCw,
  TrendingUp,
  Boxes,
  Clock,
  CheckCircle2,
  DollarSign,
  Tag,
  AlertOctagon,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  LineChart,
  Line,
} from 'recharts';
import { apiService } from '../services/api';
import {
  SalesReportRow,
  InventoryReportRow,
  ExpiryReportRow,
  PurchaseReportRow,
  SalesAnalyticsData,
  InventoryAnalyticsData,
  PurchasesAnalyticsData,
  Supplier,
} from '../types';

type ReportTab = 'sales' | 'inventory' | 'expiry' | 'purchases';

// Helper to trigger browser download of CSV string or blob
function downloadCsvFile(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Convert JSON rows to CSV client-side with proper RFC4180 escaping
function rowsToCsv(rows: Record<string, unknown>[], headers: { key: string; label: string }[]): string {
  const headerLine = headers.map((h) => `"${h.label.replace(/"/g, '""')}"`).join(',');
  const lines = rows.map((row) =>
    headers
      .map((h) => {
        const val = row[h.key] !== undefined && row[h.key] !== null ? String(row[h.key]) : '';
        return `"${val.replace(/"/g, '""')}"`;
      })
      .join(',')
  );
  return [headerLine, ...lines].join('\r\n');
}

export const ReportsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ReportTab>('sales');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Suppliers list for purchase filter
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  // 1. Sales Report & Analytics State
  const [salesAnalytics, setSalesAnalytics] = useState<SalesAnalyticsData | null>(null);
  const [salesReportRows, setSalesReportRows] = useState<SalesReportRow[]>([]);
  const [salesDatePreset, setSalesDatePreset] = useState<'all' | 'today' | '7days' | '30days' | 'custom'>('7days');
  const [salesStartDate, setSalesStartDate] = useState<string>('');
  const [salesEndDate, setSalesEndDate] = useState<string>('');
  const [salesSearch, setSalesSearch] = useState<string>('');

  // 2. Inventory Report & Analytics State
  const [inventoryAnalytics, setInventoryAnalytics] = useState<InventoryAnalyticsData | null>(null);
  const [inventoryReportRows, setInventoryReportRows] = useState<InventoryReportRow[]>([]);
  const [inventoryCategoryFilter, setInventoryCategoryFilter] = useState<string>('all');
  const [inventoryStatusFilter, setInventoryStatusFilter] = useState<string>('all');
  const [inventorySearch, setInventorySearch] = useState<string>('');

  // 3. Expiry Report State
  const [expiryReportRows, setExpiryReportRows] = useState<ExpiryReportRow[]>([]);
  const [expiryStatusFilter, setExpiryStatusFilter] = useState<'all' | 'near_expiry' | 'expired'>('all');
  const [expirySearch, setExpirySearch] = useState<string>('');

  // 4. Purchases Report & Analytics State
  const [purchasesAnalytics, setPurchasesAnalytics] = useState<PurchasesAnalyticsData | null>(null);
  const [purchaseReportRows, setPurchaseReportRows] = useState<PurchaseReportRow[]>([]);
  const [purchaseSupplierFilter, setPurchaseSupplierFilter] = useState<string>('all');
  const [purchaseStartDate, setPurchaseStartDate] = useState<string>('');
  const [purchaseEndDate, setPurchaseEndDate] = useState<string>('');
  const [purchaseSearch, setPurchaseSearch] = useState<string>('');

  // Set initial dates based on preset
  useEffect(() => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    if (salesDatePreset === 'today') {
      setSalesStartDate(todayStr);
      setSalesEndDate(todayStr);
    } else if (salesDatePreset === '7days') {
      const past = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000);
      setSalesStartDate(past.toISOString().split('T')[0]);
      setSalesEndDate(todayStr);
    } else if (salesDatePreset === '30days') {
      const past = new Date(Date.now() - 29 * 24 * 60 * 60 * 1000);
      setSalesStartDate(past.toISOString().split('T')[0]);
      setSalesEndDate(todayStr);
    } else if (salesDatePreset === 'all') {
      setSalesStartDate('');
      setSalesEndDate('');
    }
  }, [salesDatePreset]);

  // Load suppliers once for dropdowns
  useEffect(() => {
    apiService.getSuppliers().then(setSuppliers).catch(() => {});
  }, []);

  // Fetch Sales Data
  const fetchSalesData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params: { startDate?: string; endDate?: string } = {};
      if (salesStartDate) params.startDate = salesStartDate;
      if (salesEndDate) params.endDate = salesEndDate;

      const [analyticsData, rowsData] = await Promise.all([
        apiService.getSalesAnalytics(params),
        apiService.getSalesReport(params),
      ]);
      setSalesAnalytics(analyticsData);
      setSalesReportRows(rowsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load sales data.');
    } finally {
      setIsLoading(false);
    }
  }, [salesStartDate, salesEndDate]);

  // Fetch Inventory Data
  const fetchInventoryData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params: { category?: string; stockStatus?: string } = {};
      if (inventoryCategoryFilter !== 'all') params.category = inventoryCategoryFilter;
      if (inventoryStatusFilter !== 'all') params.stockStatus = inventoryStatusFilter;

      const [analyticsData, rowsData] = await Promise.all([
        apiService.getInventoryAnalytics(),
        apiService.getInventoryReport(params),
      ]);
      setInventoryAnalytics(analyticsData);
      setInventoryReportRows(rowsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load inventory data.');
    } finally {
      setIsLoading(false);
    }
  }, [inventoryCategoryFilter, inventoryStatusFilter]);

  // Fetch Expiry Data
  const fetchExpiryData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = expiryStatusFilter !== 'all' ? { status: expiryStatusFilter } : undefined;
      const rowsData = await apiService.getExpiryReport(params);
      setExpiryReportRows(rowsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load expiry data.');
    } finally {
      setIsLoading(false);
    }
  }, [expiryStatusFilter]);

  // Fetch Purchase Data
  const fetchPurchaseData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params: { supplierId?: string; startDate?: string; endDate?: string } = {};
      if (purchaseSupplierFilter !== 'all') params.supplierId = purchaseSupplierFilter;
      if (purchaseStartDate) params.startDate = purchaseStartDate;
      if (purchaseEndDate) params.endDate = purchaseEndDate;

      const [analyticsData, rowsData] = await Promise.all([
        apiService.getPurchasesAnalytics(params),
        apiService.getPurchaseReport(params),
      ]);
      setPurchasesAnalytics(analyticsData);
      setPurchaseReportRows(rowsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load purchase data.');
    } finally {
      setIsLoading(false);
    }
  }, [purchaseSupplierFilter, purchaseStartDate, purchaseEndDate]);

  // Trigger fetch when tab or relevant dependencies change
  useEffect(() => {
    if (activeTab === 'sales') {
      fetchSalesData();
    } else if (activeTab === 'inventory') {
      fetchInventoryData();
    } else if (activeTab === 'expiry') {
      fetchExpiryData();
    } else if (activeTab === 'purchases') {
      fetchPurchaseData();
    }
  }, [activeTab, fetchSalesData, fetchInventoryData, fetchExpiryData, fetchPurchaseData]);

  // --- Filtered Rows for Display & Export ---
  const filteredSalesRows = useMemo(() => {
    if (!salesSearch.trim()) return salesReportRows;
    const q = salesSearch.toLowerCase();
    return salesReportRows.filter(
      (r) =>
        r.saleId.toLowerCase().includes(q) ||
        r.customer.toLowerCase().includes(q) ||
        r.date.toLowerCase().includes(q)
    );
  }, [salesReportRows, salesSearch]);

  const filteredInventoryRows = useMemo(() => {
    if (!inventorySearch.trim()) return inventoryReportRows;
    const q = inventorySearch.toLowerCase();
    return inventoryReportRows.filter(
      (r) =>
        r.medicineName.toLowerCase().includes(q) ||
        r.genericName.toLowerCase().includes(q) ||
        r.category.toLowerCase().includes(q)
    );
  }, [inventoryReportRows, inventorySearch]);

  const filteredExpiryRows = useMemo(() => {
    if (!expirySearch.trim()) return expiryReportRows;
    const q = expirySearch.toLowerCase();
    return expiryReportRows.filter(
      (r) =>
        r.medicineName.toLowerCase().includes(q) ||
        r.batchNumber.toLowerCase().includes(q) ||
        r.category.toLowerCase().includes(q)
    );
  }, [expiryReportRows, expirySearch]);

  const filteredPurchaseRows = useMemo(() => {
    if (!purchaseSearch.trim()) return purchaseReportRows;
    const q = purchaseSearch.toLowerCase();
    return purchaseReportRows.filter(
      (r) =>
        r.purchaseId.toLowerCase().includes(q) ||
        r.supplierName.toLowerCase().includes(q) ||
        r.date.toLowerCase().includes(q)
    );
  }, [purchaseReportRows, purchaseSearch]);

  // --- CSV Export Handlers ---
  const handleExportSalesCsv = () => {
    const headers = [
      { key: 'saleId', label: 'Sale ID' },
      { key: 'date', label: 'Date' },
      { key: 'customer', label: 'Customer' },
      { key: 'numberOfItems', label: 'Number of Items' },
      { key: 'totalQuantity', label: 'Total Quantity' },
      { key: 'totalAmount', label: 'Total Amount (INR)' },
    ];
    const csv = rowsToCsv(filteredSalesRows as unknown as Record<string, unknown>[], headers);
    downloadCsvFile(csv, `sales_report_${new Date().toISOString().split('T')[0]}.csv`);
  };

  const handleExportInventoryCsv = () => {
    const headers = [
      { key: 'medicineName', label: 'Medicine Name' },
      { key: 'genericName', label: 'Generic Name' },
      { key: 'category', label: 'Category' },
      { key: 'unit', label: 'Unit' },
      { key: 'availableStock', label: 'Available Stock' },
      { key: 'minStockLevel', label: 'Minimum Stock' },
      { key: 'sellingPrice', label: 'Selling Price (INR)' },
      { key: 'stockStatus', label: 'Stock Status' },
    ];
    const csv = rowsToCsv(filteredInventoryRows as unknown as Record<string, unknown>[], headers);
    downloadCsvFile(csv, `inventory_report_${new Date().toISOString().split('T')[0]}.csv`);
  };

  const handleExportExpiryCsv = () => {
    const headers = [
      { key: 'medicineName', label: 'Medicine Name' },
      { key: 'category', label: 'Category' },
      { key: 'batchNumber', label: 'Batch Number' },
      { key: 'batchQuantity', label: 'Batch Quantity' },
      { key: 'expiryDate', label: 'Expiry Date' },
      { key: 'daysRemaining', label: 'Days Remaining' },
      { key: 'expiryStatus', label: 'Expiry Status' },
    ];
    const csv = rowsToCsv(filteredExpiryRows as unknown as Record<string, unknown>[], headers);
    downloadCsvFile(csv, `expiry_report_${new Date().toISOString().split('T')[0]}.csv`);
  };

  const handleExportPurchaseCsv = () => {
    const headers = [
      { key: 'purchaseId', label: 'Purchase ID' },
      { key: 'supplierName', label: 'Supplier' },
      { key: 'date', label: 'Date' },
      { key: 'numberOfItems', label: 'Number of Items' },
      { key: 'totalQuantity', label: 'Total Quantity' },
      { key: 'totalAmount', label: 'Total Amount (INR)' },
    ];
    const csv = rowsToCsv(filteredPurchaseRows as unknown as Record<string, unknown>[], headers);
    downloadCsvFile(csv, `purchases_report_${new Date().toISOString().split('T')[0]}.csv`);
  };

  // Distinct category list from inventory
  const categoriesList = useMemo(() => {
    if (!inventoryAnalytics?.categoryDistribution) return [];
    return inventoryAnalytics.categoryDistribution.map((c) => c.category);
  }, [inventoryAnalytics]);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-gray-200 shadow-subtle">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-[#DDF5E9] text-[#087F5B] flex items-center justify-center shrink-0">
            <BarChart3 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">
              Pharmacy Analytics & Reports
            </h1>
            <p className="text-xs text-gray-500">
              Operational intelligence, real-time sales trends, stock health, and CSV exports
            </p>
          </div>
        </div>

        {/* Tab Selector Pills */}
        <div className="flex items-center p-1 bg-gray-100/80 rounded-xl border border-gray-200/80 overflow-x-auto text-xs font-semibold">
          <button
            onClick={() => setActiveTab('sales')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'sales'
                ? 'bg-white text-[#087F5B] shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            <span>Sales Report</span>
          </button>

          <button
            onClick={() => setActiveTab('inventory')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'inventory'
                ? 'bg-white text-[#087F5B] shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            <span>Inventory Report</span>
          </button>

          <button
            onClick={() => setActiveTab('expiry')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'expiry'
                ? 'bg-white text-[#087F5B] shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Expiry Report</span>
          </button>

          <button
            onClick={() => setActiveTab('purchases')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'purchases'
                ? 'bg-white text-[#087F5B] shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>Purchase Report</span>
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between text-xs text-amber-800">
          <span>{error}</span>
          <button
            onClick={() => {
              if (activeTab === 'sales') fetchSalesData();
              if (activeTab === 'inventory') fetchInventoryData();
              if (activeTab === 'expiry') fetchExpiryData();
              if (activeTab === 'purchases') fetchPurchaseData();
            }}
            className="flex items-center gap-1 font-semibold text-[#087F5B] hover:underline cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry</span>
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. SALES ANALYTICS & REPORT TAB */}
      {/* ========================================================================= */}
      {activeTab === 'sales' && (
        <div className="space-y-6">
          {/* Sales Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-white border border-gray-200 shadow-subtle flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-emerald-50 text-[#087F5B] flex items-center justify-center shrink-0">
                <DollarSign className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block">
                  Total Sales Revenue
                </span>
                <span className="text-xl font-bold font-mono text-gray-900">
                  ₹{(salesAnalytics?.summary?.totalSalesAmount ?? (salesAnalytics as any)?.totalRevenue ?? 0).toFixed(2)}
                </span>
                <span className="text-[10px] text-gray-500 block">Gross counter collections</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-gray-200 shadow-subtle flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <Boxes className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block">
                  Total Items Sold
                </span>
                <span className="text-xl font-bold font-mono text-gray-900">
                  {salesAnalytics?.summary?.totalItemsSold ?? (salesAnalytics as any)?.totalUnitsSold ?? 0} units
                </span>
                <span className="text-[10px] text-gray-500 block">Quantity dispensed</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-gray-200 shadow-subtle flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                <ShoppingCart className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block">
                  Transactions
                </span>
                <span className="text-xl font-bold font-mono text-gray-900">
                  {salesAnalytics?.summary?.totalTransactions ?? (salesAnalytics as any)?.totalSales ?? 0}
                </span>
                <span className="text-[10px] text-gray-500 block">Completed invoices</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-gray-200 shadow-subtle flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block">
                  Avg. Transaction Value
                </span>
                <span className="text-xl font-bold font-mono text-gray-900">
                  ₹{(salesAnalytics?.summary?.averageOrderValue ?? (salesAnalytics as any)?.avgOrderValue ?? 0).toFixed(2)}
                </span>
                <span className="text-[10px] text-gray-500 block">Per order average</span>
              </div>
            </div>
          </div>

          {/* Sales Filter Bar */}
          <div className="p-4 rounded-2xl bg-white border border-gray-200 shadow-subtle flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-gray-600 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-gray-400" /> Date Filter:
              </span>
              {(['all', 'today', '7days', '30days', 'custom'] as const).map((preset) => (
                <button
                  key={preset}
                  onClick={() => setSalesDatePreset(preset)}
                  className={`px-3 py-1.5 rounded-lg border font-medium transition-colors cursor-pointer ${
                    salesDatePreset === preset
                      ? 'bg-[#087F5B] text-white border-[#087F5B]'
                      : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  {preset === 'all'
                    ? 'All Time'
                    : preset === 'today'
                    ? 'Today'
                    : preset === '7days'
                    ? 'Last 7 Days'
                    : preset === '30days'
                    ? 'Last 30 Days'
                    : 'Custom Range'}
                </button>
              ))}

              {salesDatePreset === 'custom' && (
                <div className="flex items-center gap-1.5 ml-2">
                  <input
                    type="date"
                    value={salesStartDate}
                    onChange={(e) => setSalesStartDate(e.target.value)}
                    className="px-2 py-1 border border-gray-200 rounded-lg text-xs"
                  />
                  <span className="text-gray-400">to</span>
                  <input
                    type="date"
                    value={salesEndDate}
                    onChange={(e) => setSalesEndDate(e.target.value)}
                    className="px-2 py-1 border border-gray-200 rounded-lg text-xs"
                  />
                  <button
                    onClick={fetchSalesData}
                    className="px-2.5 py-1 bg-[#087F5B] text-white rounded-lg text-xs font-semibold hover:bg-[#076b4d]"
                  >
                    Apply
                  </button>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleExportSalesCsv}
                disabled={filteredSalesRows.length === 0}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-50 text-[#087F5B] border border-[#087F5B]/20 rounded-xl font-semibold hover:bg-[#DDF5E9] transition-colors cursor-pointer disabled:opacity-50"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Sales CSV</span>
              </button>
            </div>
          </div>

          {/* Sales Trend Chart */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-subtle">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
              <div>
                <h3 className="text-sm font-bold text-gray-900">Sales Trend Visualizer</h3>
                <p className="text-[11px] text-gray-400">
                  Revenue collections over selected period (Actual DB records)
                </p>
              </div>
              <span className="text-[11px] font-semibold text-gray-500">
                {salesAnalytics?.trend.length ?? 0} data intervals
              </span>
            </div>

            <div className="h-64 w-full">
              {!salesAnalytics?.trend.length ? (
                <div className="h-full flex items-center justify-center text-xs text-gray-400">
                  No sales recorded for the selected range.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={salesAnalytics.trend} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#888' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#888' }} axisLine={false} tickLine={false} />
                    <Tooltip
                      formatter={(val: number) => [`₹${Number(val).toFixed(2)}`, 'Sales Revenue']}
                      labelFormatter={(label) => `Date: ${label}`}
                      contentStyle={{
                        backgroundColor: '#fff',
                        borderRadius: '8px',
                        border: '1px solid #e5e7eb',
                        fontSize: '12px',
                      }}
                    />
                    <Bar dataKey="totalAmount" fill="#087F5B" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Sales Report Table */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-subtle overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-gray-900">Sales Report Table</h3>
                <p className="text-[11px] text-gray-400">
                  Detailed transactions matching active date filter ({filteredSalesRows.length} records)
                </p>
              </div>

              <div className="relative">
                <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search Sale ID, Customer..."
                  value={salesSearch}
                  onChange={(e) => setSalesSearch(e.target.value)}
                  className="pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#087F5B] w-full sm:w-60"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-gray-50/75 border-b border-gray-200 text-gray-500 font-semibold uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-4">Sale ID</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4 text-center">Number of Items</th>
                    <th className="py-3 px-4 text-center">Total Quantity</th>
                    <th className="py-3 px-4 text-right">Total Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {isLoading ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-gray-400">
                        Loading sales records...
                      </td>
                    </tr>
                  ) : filteredSalesRows.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-gray-400">
                        No sales match your current search or date criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredSalesRows.map((row) => (
                      <tr key={row.saleId} className="hover:bg-gray-50/60 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-[#087F5B]">
                          {row.saleId}
                        </td>
                        <td className="py-3 px-4 text-gray-600 whitespace-nowrap">
                          {row.date}
                        </td>
                        <td className="py-3 px-4 font-medium text-gray-800">
                          {row.customer}
                        </td>
                        <td className="py-3 px-4 text-center text-gray-700">
                          {row.numberOfItems}
                        </td>
                        <td className="py-3 px-4 text-center text-gray-700 font-mono">
                          {row.totalQuantity}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-gray-900">
                          ₹{row.totalAmount.toFixed(2)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. INVENTORY ANALYTICS & REPORT TAB */}
      {/* ========================================================================= */}
      {activeTab === 'inventory' && (
        <div className="space-y-6">
          {/* Inventory Stat Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="p-3.5 rounded-xl bg-white border border-gray-200 shadow-subtle">
              <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block">
                Total Medicines
              </span>
              <span className="text-lg font-bold font-mono text-gray-900 block mt-1">
                {inventoryAnalytics?.summary?.totalMedicines ?? (inventoryAnalytics as any)?.totalMedicines ?? 0}
              </span>
              <span className="text-[10px] text-gray-500">Catalog items</span>
            </div>

            <div className="p-3.5 rounded-xl bg-white border border-gray-200 shadow-subtle">
              <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block">
                Usable Stock
              </span>
              <span className="text-lg font-bold font-mono text-emerald-600 block mt-1">
                {inventoryAnalytics?.summary?.totalUsableStock ?? (inventoryAnalytics as any)?.totalUsableStock ?? 0}
              </span>
              <span className="text-[10px] text-gray-500">Excludes expired</span>
            </div>

            <div className="p-3.5 rounded-xl bg-white border border-gray-200 shadow-subtle">
              <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block">
                Low Stock
              </span>
              <span className="text-lg font-bold font-mono text-amber-600 block mt-1">
                {inventoryAnalytics?.summary?.lowStockCount ?? (inventoryAnalytics as any)?.lowStockCount ?? 0}
              </span>
              <span className="text-[10px] text-gray-500">Needs replenishment</span>
            </div>

            <div className="p-3.5 rounded-xl bg-white border border-gray-200 shadow-subtle">
              <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block">
                Out of Stock
              </span>
              <span className="text-lg font-bold font-mono text-rose-600 block mt-1">
                {inventoryAnalytics?.summary?.outOfStockCount ?? (inventoryAnalytics as any)?.outOfStockCount ?? 0}
              </span>
              <span className="text-[10px] text-gray-500">Zero inventory</span>
            </div>

            <div className="p-3.5 rounded-xl bg-white border border-gray-200 shadow-subtle">
              <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block">
                Near-Expiry Batches
              </span>
              <span className="text-lg font-bold font-mono text-amber-600 block mt-1">
                {inventoryAnalytics?.summary?.nearExpiryBatchCount ?? (inventoryAnalytics as any)?.nearExpiryCount ?? 0}
              </span>
              <span className="text-[10px] text-gray-500">&lt; 30 days left</span>
            </div>

            <div className="p-3.5 rounded-xl bg-white border border-gray-200 shadow-subtle">
              <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block">
                Expired Batches
              </span>
              <span className="text-lg font-bold font-mono text-red-600 block mt-1">
                {inventoryAnalytics?.summary?.expiredBatchCount ?? (inventoryAnalytics as any)?.expiredCount ?? 0}
              </span>
              <span className="text-[10px] text-gray-500">Segregated</span>
            </div>
          </div>

          {/* Category Distribution Chart & Low Stock Summary */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7 bg-white rounded-2xl border border-gray-200 p-5 shadow-subtle">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-emerald-50 text-[#087F5B]">
                    <Tag className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-gray-900">Stock Distribution by Category</h3>
                    <p className="text-[11px] text-gray-400">Usable shelf units per therapeutic class</p>
                  </div>
                </div>
              </div>

              <div className="h-60 w-full pt-1">
                {!inventoryAnalytics?.categoryDistribution.length ? (
                  <div className="h-full flex items-center justify-center text-xs text-gray-400">
                    No categories found.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={inventoryAnalytics.categoryDistribution}
                      margin={{ top: 10, right: 10, left: -10, bottom: 25 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                      <XAxis
                        dataKey="category"
                        tick={{ fontSize: 10, fill: '#888' }}
                        angle={-15}
                        textAnchor="end"
                        interval={0}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis tick={{ fontSize: 11, fill: '#888' }} axisLine={false} tickLine={false} />
                      <Tooltip
                        formatter={(val: number) => [`${val} units`, 'Usable Stock']}
                        contentStyle={{
                          backgroundColor: '#fff',
                          borderRadius: '8px',
                          border: '1px solid #e5e7eb',
                          fontSize: '12px',
                        }}
                      />
                      <Bar dataKey="usableStock" fill="#087F5B" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Quick Restock Alert Box */}
            <div className="lg:col-span-5 bg-white rounded-2xl border border-gray-200 p-5 shadow-subtle flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-amber-50 text-amber-600">
                      <AlertTriangle className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-gray-900">Critical Stock Attention</h3>
                      <p className="text-[11px] text-gray-400">Medicines below minimum safety threshold</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                  {!inventoryAnalytics?.lowStockMedicines.length ? (
                    <div className="py-10 text-center text-xs text-emerald-600 flex flex-col items-center gap-1.5">
                      <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                      <span>All medicines maintain adequate stock levels.</span>
                    </div>
                  ) : (
                    inventoryAnalytics.lowStockMedicines.slice(0, 5).map((med) => (
                      <div
                        key={med.id}
                        className="p-2.5 rounded-xl border border-amber-200/80 bg-amber-50/40 flex items-center justify-between text-xs"
                      >
                        <div>
                          <p className="font-semibold text-gray-900">{med.name}</p>
                          <p className="text-[10px] text-gray-500">{med.category} • Min: {med.minStockLevel}</p>
                        </div>
                        <span className="px-2 py-0.5 rounded-md font-mono font-bold text-amber-800 bg-amber-100 text-xs">
                          {med.totalStock} left
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-gray-100 text-[11px] text-gray-400">
                Usable stock strictly excludes expired medicine batches.
              </div>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="p-4 rounded-2xl bg-white border border-gray-200 shadow-subtle flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-gray-400" />
                <span className="font-semibold text-gray-600">Category:</span>
                <select
                  value={inventoryCategoryFilter}
                  onChange={(e) => setInventoryCategoryFilter(e.target.value)}
                  className="px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs bg-white"
                >
                  <option value="all">All Categories</option>
                  {categoriesList.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-gray-600">Status:</span>
                <select
                  value={inventoryStatusFilter}
                  onChange={(e) => setInventoryStatusFilter(e.target.value)}
                  className="px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs bg-white"
                >
                  <option value="all">All Statuses</option>
                  <option value="in_stock">In Stock</option>
                  <option value="low_stock">Low Stock</option>
                  <option value="out_of_stock">Out of Stock</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleExportInventoryCsv}
                disabled={filteredInventoryRows.length === 0}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-50 text-[#087F5B] border border-[#087F5B]/20 rounded-xl font-semibold hover:bg-[#DDF5E9] transition-colors cursor-pointer disabled:opacity-50"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Inventory CSV</span>
              </button>
            </div>
          </div>

          {/* Inventory Report Table */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-subtle overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-gray-900">Inventory Status Report</h3>
                <p className="text-[11px] text-gray-400">
                  Comprehensive medicine stock levels ({filteredInventoryRows.length} items)
                </p>
              </div>

              <div className="relative">
                <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search medicine name, generic..."
                  value={inventorySearch}
                  onChange={(e) => setInventorySearch(e.target.value)}
                  className="pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#087F5B] w-full sm:w-60"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-gray-50/75 border-b border-gray-200 text-gray-500 font-semibold uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-4">Medicine Name</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4 text-center">Unit</th>
                    <th className="py-3 px-4 text-center">Available Stock</th>
                    <th className="py-3 px-4 text-center">Minimum Stock</th>
                    <th className="py-3 px-4 text-right">Selling Price</th>
                    <th className="py-3 px-4 text-center">Stock Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {isLoading ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-gray-400">
                        Loading inventory report...
                      </td>
                    </tr>
                  ) : filteredInventoryRows.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-gray-400">
                        No inventory items match current filters.
                      </td>
                    </tr>
                  ) : (
                    filteredInventoryRows.map((row, idx) => {
                      const isLow = row.stockStatus === 'Low Stock';
                      const isOut = row.stockStatus === 'Out of Stock';

                      return (
                        <tr key={idx} className="hover:bg-gray-50/60 transition-colors">
                          <td className="py-3 px-4">
                            <span className="font-semibold text-gray-900 block">{row.medicineName}</span>
                            <span className="text-[10px] text-gray-400">{row.genericName}</span>
                          </td>
                          <td className="py-3 px-4 text-gray-600">{row.category}</td>
                          <td className="py-3 px-4 text-center text-gray-600">{row.unit}</td>
                          <td className="py-3 px-4 text-center font-mono font-bold text-gray-800">
                            {row.availableStock}
                          </td>
                          <td className="py-3 px-4 text-center font-mono text-gray-500">
                            {row.minStockLevel}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-semibold text-gray-900">
                            ₹{row.sellingPrice.toFixed(2)}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span
                              className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                isOut
                                  ? 'bg-rose-100 text-rose-700'
                                  : isLow
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-emerald-100 text-emerald-800'
                              }`}
                            >
                              {row.stockStatus}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. EXPIRY REPORT TAB */}
      {/* ========================================================================= */}
      {activeTab === 'expiry' && (
        <div className="space-y-6">
          {/* Expiry Header Strip */}
          <div className="p-4 rounded-2xl bg-white border border-gray-200 shadow-subtle flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-gray-600 flex items-center gap-1">
                <Filter className="w-3.5 h-3.5 text-gray-400" /> Filter Expiry Status:
              </span>
              <button
                onClick={() => setExpiryStatusFilter('all')}
                className={`px-3 py-1.5 rounded-lg border font-medium transition-colors cursor-pointer ${
                  expiryStatusFilter === 'all'
                    ? 'bg-[#087F5B] text-white border-[#087F5B]'
                    : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                }`}
              >
                All Attention Batches
              </button>
              <button
                onClick={() => setExpiryStatusFilter('near_expiry')}
                className={`px-3 py-1.5 rounded-lg border font-medium transition-colors cursor-pointer ${
                  expiryStatusFilter === 'near_expiry'
                    ? 'bg-amber-600 text-white border-amber-600'
                    : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                }`}
              >
                Near Expiry (&lt; 30 Days)
              </button>
              <button
                onClick={() => setExpiryStatusFilter('expired')}
                className={`px-3 py-1.5 rounded-lg border font-medium transition-colors cursor-pointer ${
                  expiryStatusFilter === 'expired'
                    ? 'bg-rose-600 text-white border-rose-600'
                    : 'bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100'
                }`}
              >
                Expired Batches
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleExportExpiryCsv}
                disabled={filteredExpiryRows.length === 0}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-50 text-[#087F5B] border border-[#087F5B]/20 rounded-xl font-semibold hover:bg-[#DDF5E9] transition-colors cursor-pointer disabled:opacity-50"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Expiry CSV</span>
              </button>
            </div>
          </div>

          {/* Expiry Report Table */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-subtle overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-gray-900">Batch Expiry Management Report</h3>
                <p className="text-[11px] text-gray-400">
                  Monitors batches requiring FEFO priority or safe disposal ({filteredExpiryRows.length} batches)
                </p>
              </div>

              <div className="relative">
                <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search medicine, batch number..."
                  value={expirySearch}
                  onChange={(e) => setExpirySearch(e.target.value)}
                  className="pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#087F5B] w-full sm:w-60"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-gray-50/75 border-b border-gray-200 text-gray-500 font-semibold uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-4">Medicine Name</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Batch Number</th>
                    <th className="py-3 px-4 text-center">Batch Quantity</th>
                    <th className="py-3 px-4">Expiry Date</th>
                    <th className="py-3 px-4 text-center">Days Remaining</th>
                    <th className="py-3 px-4 text-center">Expiry Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {isLoading ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-gray-400">
                        Scanning batches...
                      </td>
                    </tr>
                  ) : filteredExpiryRows.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-gray-400">
                        No batches match the selected expiry criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredExpiryRows.map((row, idx) => {
                      const isExpired = row.expiryStatus === 'Expired';

                      return (
                        <tr key={idx} className="hover:bg-gray-50/60 transition-colors">
                          <td className="py-3 px-4 font-semibold text-gray-900">{row.medicineName}</td>
                          <td className="py-3 px-4 text-gray-600">{row.category}</td>
                          <td className="py-3 px-4 font-mono font-bold text-gray-800">
                            {row.batchNumber}
                          </td>
                          <td className="py-3 px-4 text-center font-mono font-bold text-gray-800">
                            {row.batchQuantity}
                          </td>
                          <td className="py-3 px-4 font-mono text-gray-600 whitespace-nowrap">
                            {row.expiryDate}
                          </td>
                          <td className="py-3 px-4 text-center font-mono">
                            {isExpired ? (
                              <span className="text-red-600 font-bold">Expired</span>
                            ) : (
                              <span className="text-amber-700 font-semibold">{row.daysRemaining} days</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                isExpired
                                  ? 'bg-rose-100 text-rose-700'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {isExpired ? (
                                <AlertOctagon className="w-3 h-3" />
                              ) : (
                                <Clock className="w-3 h-3" />
                              )}
                              <span>{row.expiryStatus}</span>
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. PURCHASE ANALYTICS & REPORT TAB */}
      {/* ========================================================================= */}
      {activeTab === 'purchases' && (
        <div className="space-y-6">
          {/* Purchase Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-white border border-gray-200 shadow-subtle flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block">
                  Total Purchases
                </span>
                <span className="text-xl font-bold font-mono text-gray-900">
                  {purchasesAnalytics?.summary?.totalPurchasesCount ?? (purchasesAnalytics as any)?.totalOrders ?? 0} orders
                </span>
                <span className="text-[10px] text-gray-500 block">Inward supplier receipts</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-gray-200 shadow-subtle flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-emerald-50 text-[#087F5B] flex items-center justify-center shrink-0">
                <DollarSign className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block">
                  Total Purchase Amount
                </span>
                <span className="text-xl font-bold font-mono text-gray-900">
                  ₹{(purchasesAnalytics?.summary?.totalPurchaseAmount ?? (purchasesAnalytics as any)?.totalSpent ?? 0).toFixed(2)}
                </span>
                <span className="text-[10px] text-gray-500 block">Inventory procurement cost</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-gray-200 shadow-subtle flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <Boxes className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block">
                  Total Units Received
                </span>
                <span className="text-xl font-bold font-mono text-gray-900">
                  {purchasesAnalytics?.summary?.totalUnitsPurchased ?? (purchasesAnalytics as any)?.totalUnitsReceived ?? 0} units
                </span>
                <span className="text-[10px] text-gray-500 block">Physical stock added</span>
              </div>
            </div>
          </div>

          {/* Purchase Filters & Export Strip */}
          <div className="p-4 rounded-2xl bg-white border border-gray-200 shadow-subtle flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-gray-400" />
                <span className="font-semibold text-gray-600">Supplier:</span>
                <select
                  value={purchaseSupplierFilter}
                  onChange={(e) => setPurchaseSupplierFilter(e.target.value)}
                  className="px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs bg-white"
                >
                  <option value="all">All Suppliers</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-gray-400" />
                <span className="font-semibold text-gray-600">From:</span>
                <input
                  type="date"
                  value={purchaseStartDate}
                  onChange={(e) => setPurchaseStartDate(e.target.value)}
                  className="px-2 py-1 border border-gray-200 rounded-lg text-xs"
                />
                <span className="text-gray-400">to</span>
                <input
                  type="date"
                  value={purchaseEndDate}
                  onChange={(e) => setPurchaseEndDate(e.target.value)}
                  className="px-2 py-1 border border-gray-200 rounded-lg text-xs"
                />
                <button
                  onClick={fetchPurchaseData}
                  className="px-2.5 py-1 bg-[#087F5B] text-white rounded-lg text-xs font-semibold hover:bg-[#076b4d]"
                >
                  Filter
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleExportPurchaseCsv}
                disabled={filteredPurchaseRows.length === 0}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-50 text-[#087F5B] border border-[#087F5B]/20 rounded-xl font-semibold hover:bg-[#DDF5E9] transition-colors cursor-pointer disabled:opacity-50"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Purchase CSV</span>
              </button>
            </div>
          </div>

          {/* Purchase Timeline Chart & Supplier Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Purchase Timeline Chart */}
            <div className="lg:col-span-7 bg-white rounded-2xl border border-gray-200 p-5 shadow-subtle">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-3">
                <div>
                  <h3 className="text-sm font-bold text-gray-900">Purchase Inward Over Time</h3>
                  <p className="text-[11px] text-gray-400">Total procurement spend per day</p>
                </div>
              </div>

              <div className="h-60 w-full pt-1">
                {!purchasesAnalytics?.timeline.length ? (
                  <div className="h-full flex items-center justify-center text-xs text-gray-400">
                    No purchase history found for this period.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={purchasesAnalytics.timeline} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                      <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#888' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: '#888' }} axisLine={false} tickLine={false} />
                      <Tooltip
                        formatter={(val: number) => [`₹${Number(val).toFixed(2)}`, 'Purchased Amount']}
                        contentStyle={{
                          backgroundColor: '#fff',
                          borderRadius: '8px',
                          border: '1px solid #e5e7eb',
                          fontSize: '12px',
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="totalAmount"
                        stroke="#087F5B"
                        strokeWidth={2.5}
                        dot={{ r: 4, fill: '#087F5B' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Supplier Breakdown Cards */}
            <div className="lg:col-span-5 bg-white rounded-2xl border border-gray-200 p-5 shadow-subtle flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-3">
                  <div>
                    <h3 className="text-sm font-bold text-gray-900">Purchases by Supplier</h3>
                    <p className="text-[11px] text-gray-400">Total inward volume & expenditure</p>
                  </div>
                </div>

                <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                  {!purchasesAnalytics?.purchasesBySupplier.length ? (
                    <div className="py-10 text-center text-xs text-gray-400">
                      No supplier purchases found.
                    </div>
                  ) : (
                    purchasesAnalytics.purchasesBySupplier.map((sup) => (
                      <div
                        key={sup.supplierId}
                        className="p-3 rounded-xl border border-gray-200/80 bg-gray-50/50 flex items-center justify-between text-xs"
                      >
                        <div>
                          <p className="font-semibold text-gray-900">{sup.supplierName}</p>
                          <p className="text-[10px] text-gray-500">
                            {sup.purchaseCount} POs • {sup.totalQuantity} units inward
                          </p>
                        </div>
                        <span className="font-mono font-bold text-gray-900 text-xs">
                          ₹{sup.totalAmount.toFixed(2)}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-gray-100 text-[11px] text-gray-400">
                Purchases tracked from verified vendor delivery challans.
              </div>
            </div>
          </div>

          {/* Purchase Report Table */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-subtle overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-gray-900">Purchase Orders Report Table</h3>
                <p className="text-[11px] text-gray-400">
                  Comprehensive vendor purchase records ({filteredPurchaseRows.length} orders)
                </p>
              </div>

              <div className="relative">
                <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search Purchase ID, Supplier..."
                  value={purchaseSearch}
                  onChange={(e) => setPurchaseSearch(e.target.value)}
                  className="pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#087F5B] w-full sm:w-60"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-gray-50/75 border-b border-gray-200 text-gray-500 font-semibold uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-4">Purchase ID</th>
                    <th className="py-3 px-4">Supplier</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4 text-center">Number of Items</th>
                    <th className="py-3 px-4 text-center">Total Quantity</th>
                    <th className="py-3 px-4 text-right">Total Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {isLoading ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-gray-400">
                        Loading purchase report...
                      </td>
                    </tr>
                  ) : filteredPurchaseRows.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-gray-400">
                        No purchase records found matching filters.
                      </td>
                    </tr>
                  ) : (
                    filteredPurchaseRows.map((row) => (
                      <tr key={row.purchaseId} className="hover:bg-gray-50/60 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-[#087F5B]">
                          {row.purchaseId}
                        </td>
                        <td className="py-3 px-4 font-medium text-gray-800">{row.supplierName}</td>
                        <td className="py-3 px-4 text-gray-600 whitespace-nowrap">{row.date}</td>
                        <td className="py-3 px-4 text-center text-gray-700">{row.numberOfItems}</td>
                        <td className="py-3 px-4 text-center text-gray-700 font-mono">
                          {row.totalQuantity}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-gray-900">
                          ₹{row.totalAmount.toFixed(2)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportsPage;
