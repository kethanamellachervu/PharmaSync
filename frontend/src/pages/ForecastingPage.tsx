import React, { useState, useEffect, useCallback } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  AlertOctagon,
  Search,
  RefreshCw,
  Sliders,
  X,
  Boxes,
  Info,
  CheckCircle2,
  ChevronRight,
  ShieldCheck,
  Zap,
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
import { apiService } from '../services/api';
import {
  MedicineForecastSummary,
  MedicineForecastDetail,
  ForecastOverview,
  ForecastSettings,
  DemandTrend,
  ReorderUrgency,
  ForecastHorizon,
} from '../types';
import StatCard from '../components/ui/StatCard';

export const ForecastingPage: React.FC = () => {
  const [overview, setOverview] = useState<ForecastOverview | null>(null);
  const [forecasts, setForecasts] = useState<MedicineForecastSummary[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [trendFilter, setTrendFilter] = useState<DemandTrend | 'all'>('all');
  const [urgencyFilter, setUrgencyFilter] = useState<ReorderUrgency | 'all'>('all');
  const [selectedHorizon, setSelectedHorizon] = useState<ForecastHorizon>(30);

  // Detail Modal
  const [selectedMedicineId, setSelectedMedicineId] = useState<string | null>(null);
  const [detailData, setDetailData] = useState<MedicineForecastDetail | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState<boolean>(false);

  // Settings Modal
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [settingsForm, setSettingsForm] = useState<ForecastSettings>({
    defaultHorizonDays: 30,
    safetyBufferDays: 5,
    minDataDaysRequired: 7,
    method: 'weighted_moving_average',
  });
  const [isSavingSettings, setIsSavingSettings] = useState<boolean>(false);
  const [settingsSuccessMsg, setSettingsSuccessMsg] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [overviewRes, forecastsRes, settingsRes] = await Promise.all([
        apiService.getForecastOverview(selectedHorizon),
        apiService.getMedicineForecasts({
          period: selectedHorizon,
          trend: trendFilter !== 'all' ? trendFilter : undefined,
          urgency: urgencyFilter !== 'all' ? urgencyFilter : undefined,
          search: searchQuery || undefined,
        }),
        apiService.getForecastSettings(),
      ]);

      setOverview(overviewRes);
      setForecasts(forecastsRes);
      setSettingsForm(settingsRes);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load forecasting data.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [selectedHorizon, trendFilter, urgencyFilter, searchQuery]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Load individual detail modal
  const openDetailModal = async (medicineId: string) => {
    setSelectedMedicineId(medicineId);
    setIsDetailLoading(true);
    try {
      const detail = await apiService.getMedicineForecastById(medicineId, selectedHorizon);
      setDetailData(detail);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load detail.';
      setError(msg);
    } finally {
      setIsDetailLoading(false);
    }
  };

  const closeDetailModal = () => {
    setSelectedMedicineId(null);
    setDetailData(null);
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSettings(true);
    setSettingsSuccessMsg(null);
    try {
      const updated = await apiService.updateForecastSettings(settingsForm);
      setSettingsForm(updated);
      setSettingsSuccessMsg('Settings updated successfully!');
      setTimeout(() => {
        setIsSettingsOpen(false);
        setSettingsSuccessMsg(null);
        loadData();
      }, 1200);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update settings.';
      setError(msg);
    } finally {
      setIsSavingSettings(false);
    }
  };

  // Helper for trend badge
  const renderTrendBadge = (trend: DemandTrend, growthPct: number) => {
    switch (trend) {
      case 'increasing':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <TrendingUp className="w-3.5 h-3.5" />
            Increasing ({growthPct > 0 ? `+${growthPct}%` : `${growthPct}%`})
          </span>
        );
      case 'decreasing':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <TrendingDown className="w-3.5 h-3.5" />
            Decreasing ({growthPct}%)
          </span>
        );
      case 'stable':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <Minus className="w-3.5 h-3.5" />
            Stable
          </span>
        );
      case 'insufficient_data':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
            <Info className="w-3.5 h-3.5" />
            Insufficient Data
          </span>
        );
      case 'no_sales':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-600 border border-gray-200">
            No Sales History
          </span>
        );
    }
  };

  // Helper for urgency badge
  const renderUrgencyBadge = (urgency: ReorderUrgency) => {
    switch (urgency) {
      case 'critical':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-red-100 text-red-800 animate-pulse">
            <AlertOctagon className="w-3 h-3" />
            Critical
          </span>
        );
      case 'high':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800">
            <AlertTriangle className="w-3 h-3" />
            High Risk
          </span>
        );
      case 'medium':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-100 text-blue-800">
            Medium
          </span>
        );
      case 'low':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-gray-100 text-gray-700">
            Adequate
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header with Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-200 shadow-subtle">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-[#DDF5E9] text-[#087F5B]">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">AI Demand Forecasting</h1>
              <p className="text-xs text-gray-500">
                Statistical moving-average projections and stockout risk estimates based on historical sales
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-gray-700 bg-gray-50 border border-gray-200 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <Sliders className="w-4 h-4 text-gray-500" />
            <span>Forecasting Settings</span>
          </button>

          <button
            onClick={loadData}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-[#087F5B] rounded-xl hover:bg-[#066c4d] transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Recalculate</span>
          </button>
        </div>
      </div>

      {/* Error / Offline Alert */}
      {error && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between text-xs text-amber-800">
          <span>{error}</span>
          <button
            onClick={loadData}
            className="flex items-center gap-1 font-semibold text-[#087F5B] hover:underline cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry</span>
          </button>
        </div>
      )}

      {/* 2. Statistical Disclaimer Banner */}
      <div className="p-3.5 rounded-xl bg-blue-50/80 border border-blue-200 flex items-start gap-2.5 text-xs text-blue-900">
        <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold">Notice on Statistical Forecasting:</span> Projections are mathematical
          estimates derived from weighted moving averages and trend velocities from past pharmacy sales. They serve as
          decision-support indicators and are not guaranteed sales. Medicines with fewer than 7 days of sales are
          conservatively flagged.
        </div>
      </div>

      {/* 3. KPI Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <StatCard
          title="Medicines Analyzed"
          value={isLoading ? '...' : (overview?.totalAnalyzed ?? 0)}
          subtitle="Catalog items tracked"
          icon={Boxes}
          iconBgColor="bg-blue-50"
          iconColor="text-blue-600"
        />

        <StatCard
          title="Increasing Demand"
          value={isLoading ? '...' : (overview?.increasingDemandCount ?? 0)}
          subtitle="Sales velocity accelerating (>15%)"
          icon={TrendingUp}
          iconBgColor="bg-emerald-50"
          iconColor="text-[#087F5B]"
        />

        <StatCard
          title="Decreasing Demand"
          value={isLoading ? '...' : (overview?.decreasingDemandCount ?? 0)}
          subtitle="Sales velocity dropping (>15%)"
          icon={TrendingDown}
          iconBgColor="bg-amber-50"
          iconColor="text-amber-600"
        />

        <StatCard
          title="Imminent Stockout Risk"
          value={isLoading ? '...' : (overview?.atRiskStockoutCount ?? 0)}
          subtitle="Depletion predicted within 7 days"
          icon={AlertOctagon}
          iconBgColor="bg-red-50"
          iconColor="text-red-600"
        />
      </div>

      {/* 4. Controls & Filters Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-subtle space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Horizon Period Selector Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-gray-100 rounded-xl w-fit">
            <span className="text-[11px] font-semibold text-gray-500 px-2">Planning Period:</span>
            {[7, 30, 90].map((period) => (
              <button
                key={period}
                onClick={() => setSelectedHorizon(period as ForecastHorizon)}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  selectedHorizon === period
                    ? 'bg-white text-[#087F5B] shadow-xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {period} Days
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative w-full lg:w-72">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search medicine, category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#087F5B]"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Trend & Urgency Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-gray-100">
          <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mr-1">
            Filter Trend:
          </span>
          {[
            { id: 'all', label: 'All Items' },
            { id: 'increasing', label: 'Increasing Demand' },
            { id: 'decreasing', label: 'Decreasing Demand' },
            { id: 'stable', label: 'Stable' },
            { id: 'insufficient_data', label: 'Insufficient Data' },
            { id: 'no_sales', label: 'No Sales History' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setTrendFilter(item.id as DemandTrend | 'all')}
              className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-colors cursor-pointer ${
                trendFilter === item.id
                  ? 'bg-[#087F5B] text-white'
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              {item.label}
            </button>
          ))}

          <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider ml-3 mr-1">
            Urgency:
          </span>
          {[
            { id: 'all', label: 'All' },
            { id: 'critical', label: 'Critical' },
            { id: 'high', label: 'High' },
            { id: 'medium', label: 'Medium' },
            { id: 'low', label: 'Adequate' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setUrgencyFilter(item.id as ReorderUrgency | 'all')}
              className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-colors cursor-pointer ${
                urgencyFilter === item.id
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* 5. Medicine Forecast Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-subtle overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-gray-900">Medicine Demand Projections</h3>
            <span className="text-xs text-gray-400">({forecasts.length} medicines)</span>
          </div>
          <span className="text-[11px] font-mono font-semibold text-[#087F5B] bg-[#DDF5E9] px-2 py-0.5 rounded-full">
            {selectedHorizon}-Day Projection Window
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-gray-50/75 border-b border-gray-200 text-gray-500 font-semibold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4">Medicine Name</th>
                <th className="py-3 px-4 text-center">Usable Stock</th>
                <th className="py-3 px-4 text-center">Daily Sales Rate</th>
                <th className="py-3 px-4 text-center">Predicted {selectedHorizon}D Demand</th>
                <th className="py-3 px-4 text-center">Demand Trend</th>
                <th className="py-3 px-4 text-center">Stock Depletion</th>
                <th className="py-3 px-4">Suggested Action</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-gray-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[#087F5B]" />
                    Calculating moving-average forecasts and velocity trends...
                  </td>
                </tr>
              ) : forecasts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-gray-400">
                    No medicines match the selected filter criteria.
                  </td>
                </tr>
              ) : (
                forecasts.map((item) => (
                  <tr key={item.medicineId} className="hover:bg-gray-50/60 transition-colors">
                    {/* Medicine Name */}
                    <td className="py-3 px-4">
                      <div className="font-semibold text-gray-900">{item.medicineName}</div>
                      <div className="text-[11px] text-gray-400">
                        {item.category} • {item.genericName || 'Standard Form'}
                      </div>
                    </td>

                    {/* Usable Stock */}
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`font-mono font-bold ${
                          item.usableStock === 0
                            ? 'text-red-600'
                            : item.usableStock <= item.minStockLevel
                            ? 'text-amber-600'
                            : 'text-gray-900'
                        }`}
                      >
                        {item.usableStock} {item.unit}
                      </span>
                      {item.expiredStock > 0 && (
                        <span className="block text-[10px] text-red-500 font-medium">
                          ({item.expiredStock} expired excluded)
                        </span>
                      )}
                    </td>

                    {/* Daily Sales Rate */}
                    <td className="py-3 px-4 text-center font-mono">
                      {item.avgDailySales > 0 ? (
                        <span className="text-gray-800 font-medium">
                          {item.avgDailySales} <span className="text-[10px] text-gray-400">/day</span>
                        </span>
                      ) : (
                        <span className="text-gray-400">0.0</span>
                      )}
                    </td>

                    {/* Predicted Demand */}
                    <td className="py-3 px-4 text-center">
                      <span className="font-mono font-bold text-[#087F5B] text-sm">
                        {item.predictedHorizonDemand}
                      </span>
                      <span className="text-[10px] text-gray-400 block">{item.unit}</span>
                    </td>

                    {/* Demand Trend */}
                    <td className="py-3 px-4 text-center">
                      {renderTrendBadge(item.demandTrend, item.trendGrowthPct)}
                    </td>

                    {/* Stock Depletion */}
                    <td className="py-3 px-4 text-center">
                      {item.stockDepletionDays !== null ? (
                        <span
                          className={`font-mono font-bold text-xs px-2 py-0.5 rounded-md ${
                            item.stockDepletionDays === 0
                              ? 'bg-red-100 text-red-700'
                              : item.stockDepletionDays <= 3
                              ? 'bg-red-50 text-red-600 border border-red-200'
                              : item.stockDepletionDays <= 7
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-emerald-50 text-emerald-700'
                          }`}
                        >
                          ~{item.stockDepletionDays} days
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs">N/A</span>
                      )}
                    </td>

                    {/* Suggested Action */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        {renderUrgencyBadge(item.urgency)}
                        <span className="text-[11px] text-gray-700 font-medium truncate max-w-[200px]">
                          {item.suggestedAction}
                        </span>
                      </div>
                    </td>

                    {/* Action Button */}
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => openDetailModal(item.medicineId)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-[#087F5B] hover:text-[#066c4d] bg-[#DDF5E9]/60 hover:bg-[#DDF5E9] rounded-lg transition-colors cursor-pointer"
                      >
                        <span>Analyze</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ============================================================================== */}
      {/* 6. Individual Medicine Detail Analysis Modal */}
      {/* ============================================================================== */}
      {selectedMedicineId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-xl border border-gray-200 max-h-[92vh] overflow-y-auto space-y-6">
            {isDetailLoading || !detailData ? (
              <div className="py-16 text-center text-gray-400">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#087F5B]" />
                Loading detailed historical curves and mathematical breakdown...
              </div>
            ) : (
              <>
                {/* Modal Header */}
                <div className="flex items-start justify-between pb-4 border-b border-gray-100">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-bold text-gray-900">
                        {detailData.summary.medicineName}
                      </h2>
                      {renderTrendBadge(
                        detailData.summary.demandTrend,
                        detailData.summary.trendGrowthPct
                      )}
                    </div>
                    <p className="text-xs text-gray-500">
                      {detailData.summary.category} • Generic: {detailData.summary.genericName || 'N/A'} • Unit: {detailData.summary.unit}
                    </p>
                  </div>
                  <button
                    onClick={closeDetailModal}
                    className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Quick Metric Strip */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-gray-50 p-4 rounded-xl border border-gray-200">
                  <div>
                    <span className="text-[11px] text-gray-500 block">Current Usable Stock</span>
                    <span className="text-base font-bold font-mono text-gray-900">
                      {detailData.summary.usableStock} {detailData.summary.unit}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-gray-500 block">Avg Daily Velocity</span>
                    <span className="text-base font-bold font-mono text-[#087F5B]">
                      {detailData.summary.avgDailySales} /day
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-gray-500 block">
                      Predicted {selectedHorizon}D Demand
                    </span>
                    <span className="text-base font-bold font-mono text-blue-600">
                      {detailData.summary.predictedHorizonDemand} {detailData.summary.unit}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-gray-500 block">Depletion Timeline</span>
                    <span className="text-base font-bold font-mono text-amber-600">
                      {detailData.summary.stockDepletionDays !== null
                        ? `~${detailData.summary.stockDepletionDays} days`
                        : 'N/A'}
                    </span>
                  </div>
                </div>

                {/* Historical vs Forecast Charts */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700">
                      Historical Sales vs. Projected Depletion
                    </h4>
                    <span className="text-[11px] text-gray-400">Past 30 Days & Next {selectedHorizon} Days</span>
                  </div>

                  {/* Dual Chart Container */}
                  <div className="h-64 w-full bg-gray-50/50 p-3 rounded-xl border border-gray-200">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={detailData.historicalSalesTimeline}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                        <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#888' }} />
                        <YAxis tick={{ fontSize: 10, fill: '#888' }} />
                        <Tooltip
                          formatter={(val: number) => [`${val} ${detailData.summary.unit}`, 'Sold']}
                        />
                        <Bar dataKey="quantity" fill="#087F5B" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Mathematical Calculation Breakdown */}
                <div className="bg-emerald-50/50 border border-emerald-200 rounded-xl p-4 space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[#087F5B]">
                    <Zap className="w-4 h-4" />
                    <span>Forecasting Algorithm & Weights</span>
                  </div>
                  <p className="text-xs text-gray-700 leading-relaxed">
                    {detailData.calculationDetails.explanation}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 text-[11px] border-t border-emerald-200/60">
                    <div>
                      <span className="text-gray-500">Recent 7-Day Velocity:</span>{' '}
                      <span className="font-mono font-bold text-gray-800">
                        {detailData.calculationDetails.recent7DayAvg} {detailData.summary.unit}/day
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Previous 14-Day Velocity:</span>{' '}
                      <span className="font-mono font-bold text-gray-800">
                        {detailData.calculationDetails.previous14DayAvg} {detailData.summary.unit}/day
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Safety Buffer Applied:</span>{' '}
                      <span className="font-mono font-bold text-emerald-800">
                        {detailData.calculationDetails.safetyBufferApplied} {detailData.summary.unit}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Batch Status & Expiry Risk */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700">
                    Shelf Batches & Expiry Risk
                  </h4>
                  <div className="overflow-x-auto border border-gray-200 rounded-xl">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="bg-gray-50 text-gray-500 text-[10px] uppercase font-semibold">
                          <th className="py-2 px-3">Batch Number</th>
                          <th className="py-2 px-3 text-center">Quantity</th>
                          <th className="py-2 px-3">Expiry Date</th>
                          <th className="py-2 px-3 text-center">Days Remaining</th>
                          <th className="py-2 px-3 text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {detailData.batchesBreakdown.map((batch) => (
                          <tr key={batch.batchId} className="hover:bg-gray-50/50">
                            <td className="py-2 px-3 font-mono font-semibold text-gray-800">
                              {batch.batchNumber}
                            </td>
                            <td className="py-2 px-3 text-center font-mono">{batch.quantity}</td>
                            <td className="py-2 px-3 text-gray-600">{batch.expiryDate}</td>
                            <td className="py-2 px-3 text-center font-mono">
                              <span
                                className={`font-semibold ${
                                  batch.daysRemaining < 0
                                    ? 'text-red-600'
                                    : batch.daysRemaining <= 30
                                    ? 'text-amber-600'
                                    : 'text-gray-700'
                                }`}
                              >
                                {batch.daysRemaining < 0
                                  ? `${Math.abs(batch.daysRemaining)}d ago`
                                  : `${batch.daysRemaining} days`}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-right">
                              {batch.daysRemaining < 0 ? (
                                <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                                  Expired
                                </span>
                              ) : batch.expiresWithinHorizon ? (
                                <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                                  Expires in Window
                                </span>
                              ) : (
                                <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                                  Usable
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <ShieldCheck className="w-4 h-4 text-[#087F5B]" />
                    <span>Calculated with safety buffers & FEFO compliance</span>
                  </div>
                  <button
                    onClick={closeDetailModal}
                    className="px-4 py-2 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ============================================================================== */}
      {/* 7. Forecasting Settings Modal */}
      {/* ============================================================================== */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-gray-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Sliders className="w-5 h-5 text-[#087F5B]" />
                <h3 className="text-base font-bold text-gray-900">Forecasting Settings</h3>
              </div>
              <button
                onClick={() => setIsSettingsOpen(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {settingsSuccessMsg && (
              <div className="p-3 bg-emerald-50 text-emerald-800 text-xs font-semibold rounded-xl border border-emerald-200 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#087F5B]" />
                <span>{settingsSuccessMsg}</span>
              </div>
            )}

            <form onSubmit={handleSaveSettings} className="space-y-4 text-xs">
              <div>
                <label className="font-semibold text-gray-700 block mb-1">
                  Default Forecast Horizon
                </label>
                <select
                  value={settingsForm.defaultHorizonDays}
                  onChange={(e) =>
                    setSettingsForm({
                      ...settingsForm,
                      defaultHorizonDays: Number(e.target.value) as 7 | 30 | 90,
                    })
                  }
                  className="w-full p-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#087F5B]"
                >
                  <option value={7}>7 Days (Short-term weekly reorders)</option>
                  <option value={30}>30 Days (Standard monthly planning)</option>
                  <option value={90}>90 Days (Quarterly wholesale planning)</option>
                </select>
                <p className="text-[10px] text-gray-400 mt-1">
                  The primary projection window used across calculations and reorder checks.
                </p>
              </div>

              <div>
                <label className="font-semibold text-gray-700 block mb-1">
                  Safety Stock Buffer (Days of Demand)
                </label>
                <input
                  type="number"
                  min={0}
                  max={30}
                  value={settingsForm.safetyBufferDays}
                  onChange={(e) =>
                    setSettingsForm({
                      ...settingsForm,
                      safetyBufferDays: Number(e.target.value),
                    })
                  }
                  className="w-full p-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#087F5B]"
                />
                <p className="text-[10px] text-gray-400 mt-1">
                  Number of days of buffer stock to maintain above projected demand.
                </p>
              </div>

              <div>
                <label className="font-semibold text-gray-700 block mb-1">
                  Minimum Historical Data Requirement (Days)
                </label>
                <input
                  type="number"
                  min={1}
                  max={30}
                  value={settingsForm.minDataDaysRequired}
                  onChange={(e) =>
                    setSettingsForm({
                      ...settingsForm,
                      minDataDaysRequired: Number(e.target.value),
                    })
                  }
                  className="w-full p-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#087F5B]"
                />
                <p className="text-[10px] text-gray-400 mt-1">
                  Minimum days with recorded sales needed before showing confident trend growth.
                </p>
              </div>

              <div>
                <label className="font-semibold text-gray-700 block mb-1">Forecasting Method</label>
                <select
                  value={settingsForm.method}
                  onChange={(e) =>
                    setSettingsForm({
                      ...settingsForm,
                      method: e.target.value as ForecastSettings['method'],
                    })
                  }
                  className="w-full p-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#087F5B]"
                >
                  <option value="weighted_moving_average">
                    Weighted Moving Average (50% 7d / 35% 14d / 15% 30d)
                  </option>
                  <option value="simple_moving_average">
                    Simple Moving Average (Uniform 30d)
                  </option>
                  <option value="trend_adjusted">
                    Trend-Adjusted Moving Average (Momentum bounded)
                  </option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsSettingsOpen(false)}
                  className="px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingSettings}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-[#087F5B] hover:bg-[#066c4d] rounded-xl shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {isSavingSettings ? 'Saving...' : 'Save Settings'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ForecastingPage;
