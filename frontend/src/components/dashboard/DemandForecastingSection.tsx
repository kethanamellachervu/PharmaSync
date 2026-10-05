import React, { useState, useEffect } from 'react';
import {
  BrainCircuit,
  AlertOctagon,
  CheckCircle2,
  Database,
  Info,
  RefreshCw,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import { apiService } from '../../services/api';
import { MlForecastingFullResult, MlMedicinePrediction, MlDatasetInfo } from '../../types';

export const DemandForecastingSection: React.FC = () => {
  const [data, setData] = useState<MlForecastingFullResult | null>(null);
  const [datasetInfo, setDatasetInfo] = useState<MlDatasetInfo | null>(null);
  const [selectedMedId, setSelectedMedId] = useState<string>('MED001');
  const [selectedHorizon, setSelectedHorizon] = useState<7 | 30>(30);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadData = async (horizon: 7 | 30 = selectedHorizon) => {
    setIsLoading(true);
    setError(null);
    try {
      const [mlRes, metaRes] = await Promise.all([
        apiService.getMlPredictions(horizon),
        apiService.getHistoricalDatasetInfo().catch(() => null),
      ]);
      setData(mlRes);
      setDatasetInfo(metaRes);
    } catch (err: any) {
      console.error('Failed to load ML forecasting data:', err);
      setError(err.message || 'Failed to load ML forecasting data.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData(selectedHorizon);
  }, [selectedHorizon]);

  const handleImportToSupabase = async () => {
    setIsImporting(true);
    setImportMessage(null);
    try {
      const res = await apiService.importHistoricalCsv();
      if (res.status === 'success') {
        setImportMessage(res.message || 'Successfully imported 5,490 records into Supabase table public.historical_sales!');
      } else {
        setImportMessage(res.message || 'Migration required in Supabase SQL editor.');
      }
      // Refresh metadata
      const meta = await apiService.getHistoricalDatasetInfo();
      setDatasetInfo(meta);
    } catch (err: any) {
      setImportMessage(`Import notice: ${err.message}`);
    } finally {
      setIsImporting(false);
    }
  };

  const selectedPrediction: MlMedicinePrediction | undefined =
    data?.predictions.find((p) => p.csvMedicineId === selectedMedId || p.medicineId === selectedMedId) ||
    data?.predictions[0];

  const currentStock = selectedPrediction?.currentStock ?? 0;
  const forecastHorizonDemand =
    selectedHorizon === 7
      ? selectedPrediction?.forecast7d ?? 0
      : selectedPrediction?.forecast30d ?? 0;

  const isReorderNow = forecastHorizonDemand > currentStock;
  const safetyStock = selectedPrediction?.safetyStock ?? 10;
  const recommendedQuantity = Math.max(0, Math.round(forecastHorizonDemand + safetyStock - currentStock));

  // Chart data formatting
  const historyChartData = (selectedPrediction?.recentHistory || []).map((h) => ({
    date: h.date,
    label: h.date.slice(5),
    'Units Sold': h.units_sold,
    '7-Day Moving Avg': h.sales_7d_avg,
  }));

  const forecastChartData = (selectedPrediction?.dailyForecasts || [])
    .slice(0, selectedHorizon)
    .map((f) => ({
      day: `Day ${f.day}`,
      date: f.date,
      'Predicted Daily Demand': f.predicted_units,
    }));

  return (
    <section className="bg-white rounded-2xl border border-gray-200 p-5 sm:p-6 shadow-subtle space-y-6">
      {/* 1. Header with ML Badge & Synthetic Data Disclosure */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-gray-100">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white shadow-xs">
              <BrainCircuit className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-gray-900 flex items-center gap-2">
                <span>AI Demand Forecasting & Smart Reorder</span>
                <span className="text-[11px] font-semibold bg-emerald-100 text-[#087F5B] px-2 py-0.5 rounded-full border border-emerald-200">
                  Scikit-learn GradientBoostingRegressor
                </span>
              </h2>
              <p className="text-xs text-gray-500">
                Trained on 6 months chronological historical sales data to project demand and prevent stockouts
              </p>
            </div>
          </div>
        </div>

        {/* Dataset Tag & Import Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-50 text-amber-900 text-xs font-semibold border border-amber-200/80">
            <Info className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span>Historical Synthetic Sales Data (6 mo | 30 meds | 5,490 rows)</span>
          </span>

          <button
            onClick={() => loadData(selectedHorizon)}
            disabled={isLoading}
            className="p-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
            title="Refresh ML predictions"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Dataset & Model Transparency Alert */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs text-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start sm:items-center gap-2.5">
          <Database className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5 sm:mt-0" />
          <div>
            <span className="font-semibold text-slate-900">Synthetic Historical Data Disclosure: </span>
            <span>
              Trained on {datasetInfo?.totalRecords || '5,490'} synthetic records (Apr 5 – Oct 4, 2026). Storage source: <span className="font-medium text-emerald-800">{datasetInfo?.isImportedToSupabase ? 'Supabase (historical_sales)' : 'Synthetic Dataset Engine'}</span>. Units sold indicates past demand. Current stock reflects live PharmaSync inventory database.
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleImportToSupabase}
            disabled={isImporting}
            className="px-3 py-1 text-xs font-medium rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <Database className="w-3 h-3" />
            <span>{isImporting ? 'Importing...' : 'Sync to Supabase'}</span>
          </button>
        </div>
      </div>

      {importMessage && (
        <div className="p-3 bg-blue-50 border border-blue-200 text-blue-800 rounded-xl text-xs flex items-center justify-between">
          <span>{importMessage}</span>
          <button onClick={() => setImportMessage(null)} className="font-bold ml-2">✕</button>
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs">
          {error}
        </div>
      )}

      {/* 2. Controls: Medicine Selector & Forecasting Horizon (7 / 30 / 90 Days) */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center bg-gray-50/80 p-3.5 rounded-xl border border-gray-100">
        <div className="sm:col-span-8 flex flex-col sm:flex-row sm:items-center gap-2.5">
          <label className="text-xs font-semibold text-gray-700 shrink-0">
            Select Medicine for Forecast:
          </label>
          <select
            value={selectedMedId}
            onChange={(e) => setSelectedMedId(e.target.value)}
            className="w-full sm:max-w-md px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-xs font-medium text-gray-900 shadow-xs focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
          >
            {data?.predictions.map((p) => (
              <option key={p.csvMedicineId} value={p.csvMedicineId}>
                {p.csvMedicineId} - {p.medicineName} (Stock: {p.currentStock})
              </option>
            ))}
          </select>
        </div>

        <div className="sm:col-span-4 flex items-center justify-end gap-1">
          <span className="text-xs text-gray-500 font-medium mr-1.5">Horizon:</span>
          {([7, 30] as const).map((h) => (
            <button
              key={h}
              onClick={() => setSelectedHorizon(h)}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                selectedHorizon === h
                  ? 'bg-[#087F5B] text-white shadow-xs'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'
              }`}
            >
              {h} Days
            </button>
          ))}
        </div>
      </div>

      {/* 3. Operational Comparison: Forecast vs Current Stock vs Recommendation */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* Current Stock Card */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
            Current Stock (Live)
          </span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-2xl font-bold font-mono text-slate-900">
              {isLoading ? '...' : currentStock}
            </span>
            <span className="text-xs text-slate-500 font-medium">units</span>
          </div>
          <span className="text-[11px] text-slate-500 block mt-1">
            Safety buffer: {safetyStock} units
          </span>
        </div>

        {/* 7-Day Forecast */}
        <div className={`p-4 rounded-xl border ${selectedHorizon === 7 ? 'bg-emerald-50/60 border-emerald-300' : 'bg-white border-gray-200'}`}>
          <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block">
            7-Day Forecast
          </span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-2xl font-bold font-mono text-emerald-700">
              {isLoading ? '...' : selectedPrediction?.forecast7d ?? 0}
            </span>
            <span className="text-xs text-emerald-600 font-medium">units</span>
          </div>
          <span className="text-[11px] text-gray-500 block mt-1">
            ~{selectedPrediction?.dailyAverageSales ?? 0} units/day avg
          </span>
        </div>

        {/* 30-Day Forecast */}
        <div className={`p-4 rounded-xl border ${selectedHorizon === 30 ? 'bg-emerald-50/60 border-emerald-300' : 'bg-white border-gray-200'}`}>
          <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block">
            30-Day Forecast
          </span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-2xl font-bold font-mono text-emerald-700">
              {isLoading ? '...' : selectedPrediction?.forecast30d ?? 0}
            </span>
            <span className="text-xs text-emerald-600 font-medium">units</span>
          </div>
          <span className="text-[11px] text-gray-500 block mt-1">
            Monthly demand expectation
          </span>
        </div>



        {/* Reorder Recommendation Card */}
        <div className={`p-4 rounded-xl border ${
          isReorderNow
            ? 'bg-rose-50 border-rose-200 text-rose-900'
            : 'bg-emerald-50 border-emerald-200 text-emerald-900'
        }`}>
          <span className="text-[11px] font-semibold uppercase tracking-wider block">
            Reorder Status ({selectedHorizon}d)
          </span>
          <div className="flex items-center gap-1.5 mt-1">
            {isReorderNow ? (
              <AlertOctagon className="w-5 h-5 text-rose-600 shrink-0" />
            ) : (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            )}
            <span className="text-sm font-black tracking-tight">
              {isReorderNow ? 'REORDER NOW' : 'STOCK SUFFICIENT'}
            </span>
          </div>
          <div className="mt-1 text-[11px] font-mono">
            {isReorderNow ? (
              <span className="font-semibold text-rose-700">
                Order Qty: +{recommendedQuantity} units
              </span>
            ) : (
              <span className="text-emerald-700">
                Sufficient for ~{selectedHorizon} days
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 4. Visual Charts: Historical Sales (Synthetic) & Future Forecast Projections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart A: Past 30 Days Sales Trend */}
        <div className="p-4 bg-slate-50/70 rounded-xl border border-slate-200/80">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200">
            <div>
              <h3 className="text-xs font-bold text-slate-800">
                Historical Sales Trend (Last 30 Days)
              </h3>
              <p className="text-[10px] text-slate-500">
                `units_sold` with 7-day rolling moving average
              </p>
            </div>
            <span className="text-[10px] font-semibold text-slate-600 bg-slate-200/70 px-2 py-0.5 rounded-full">
              Synthetic Baseline
            </span>
          </div>

          <div className="h-56 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={historyChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorUnits" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#087F5B" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#087F5B" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip
                  formatter={(val: number) => [`${val} units`, '']}
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '11px' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Area type="monotone" dataKey="Units Sold" stroke="#087F5B" fillOpacity={1} fill="url(#colorUnits)" />
                <Line type="monotone" dataKey="7-Day Moving Avg" stroke="#f59e0b" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart B: Projected Future Demand (Gradient Boosting) */}
        <div className="p-4 bg-emerald-50/40 rounded-xl border border-emerald-200/70">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-emerald-200/60">
            <div>
              <h3 className="text-xs font-bold text-emerald-950">
                Projected Future Demand ({selectedHorizon} Days)
              </h3>
              <p className="text-[10px] text-emerald-700">
                GradientBoostingRegressor multi-step recursive projection
              </p>
            </div>
            <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-300">
              ML Model Output
            </span>
          </div>

          <div className="h-56 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={forecastChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#cbd5e1" />
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#065f46' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#065f46' }} axisLine={false} tickLine={false} />
                <Tooltip
                  formatter={(val: number) => [`${val} units`, 'Predicted Demand']}
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #10b981', fontSize: '11px' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Line type="monotone" dataKey="Predicted Daily Demand" stroke="#059669" strokeWidth={2.5} dot={selectedHorizon <= 30} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>


    </section>
  );
};

export default DemandForecastingSection;
