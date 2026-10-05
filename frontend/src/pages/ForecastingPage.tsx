import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  Search,
  RefreshCw,
  Boxes,
  CheckCircle2,
  Package,
} from 'lucide-react';
import { apiService } from '../services/api';
import { MlForecastingFullResult } from '../types';
import StatCard from '../components/ui/StatCard';

export const ForecastingPage: React.FC = () => {
  const [data, setData] = useState<MlForecastingFullResult | null>(null);
  const [selectedHorizon, setSelectedHorizon] = useState<7 | 30>(30);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'Good' | 'May Run Out Soon' | 'Low Stock'>('all');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const results = await apiService.getMlPredictions(selectedHorizon);
      setData(results);
    } catch (err: unknown) {
      setError('We couldn\'t calculate the expected need right now. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [selectedHorizon]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filter predictions based on search query and status filter
  const predictionsList = useMemo(() => {
    let list = data?.predictions || [];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (p) =>
          p.medicineName.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          (p.genericName && p.genericName.toLowerCase().includes(q))
      );
    }

    if (statusFilter !== 'all') {
      list = list.filter((p) => p.stockStatus === statusFilter);
    }

    return list;
  }, [data, searchQuery, statusFilter]);

  // Render demand badge
  const renderDemandBadge = (trend: 'Increasing' | 'Decreasing' | 'Stable') => {
    switch (trend) {
      case 'Increasing':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <TrendingUp className="w-3.5 h-3.5" />
            Increasing
          </span>
        );
      case 'Decreasing':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <TrendingDown className="w-3.5 h-3.5" />
            Decreasing
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-50 text-gray-700 border border-gray-200">
            <Minus className="w-3.5 h-3.5" />
            Stable
          </span>
        );
    }
  };

  // Render stock status badge
  const renderStatusBadge = (status: 'Good' | 'May Run Out Soon' | 'Low Stock') => {
    switch (status) {
      case 'Good':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Good
          </span>
        );
      case 'May Run Out Soon':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <AlertTriangle className="w-3.5 h-3.5" />
            May Run Out Soon
          </span>
        );
      case 'Low Stock':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <AlertTriangle className="w-3.5 h-3.5" />
            Low Stock
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Title & Subtitle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Stock Planning</h1>
          <p className="text-sm text-gray-500 mt-1">
            See which medicines you may need soon and plan your purchases.
          </p>
        </div>

        {/* Planning Buttons: [ 7 Days ] [ 30 Days ] */}
        <div className="flex items-center bg-gray-100 p-1 rounded-xl shrink-0">
          <button
            onClick={() => setSelectedHorizon(7)}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
              selectedHorizon === 7
                ? 'bg-[#087F5B] text-white shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            7 Days
          </button>
          <button
            onClick={() => setSelectedHorizon(30)}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
              selectedHorizon === 30
                ? 'bg-[#087F5B] text-white shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            30 Days
          </button>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between text-xs text-amber-800">
          <span>{error}</span>
          <button
            onClick={loadData}
            className="flex items-center gap-1 font-semibold text-[#087F5B] hover:underline"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry</span>
          </button>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Total Medicines Analyzed"
          value={isLoading ? '...' : (data?.summary.totalMedicinesAnalyzed ?? 0)}
          subtitle="Pharmaceutical inventory items"
          icon={Package}
          iconBgColor="bg-blue-50"
          iconColor="text-blue-600"
        />

        <StatCard
          title="Medicines Needing Attention"
          value={isLoading ? '...' : (data?.summary.reorderNowCount ?? 0)}
          subtitle="Low stock or running out soon"
          icon={AlertTriangle}
          iconBgColor="bg-amber-50"
          iconColor="text-amber-600"
          isAlert={(data?.summary.reorderNowCount ?? 0) > 0}
        />

        <StatCard
          title={`Expected Need (${selectedHorizon} Days)`}
          value={
            isLoading
              ? '...'
              : `${(selectedHorizon === 7
                  ? data?.summary.total7dForecastUnits
                  : data?.summary.total30dForecastUnits
                )?.toLocaleString() ?? 0} units`
          }
          subtitle="Calculated requirement"
          icon={Boxes}
          iconBgColor="bg-emerald-50"
          iconColor="text-emerald-700"
        />
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-subtle flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search medicine name or category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#087F5B]"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              statusFilter === 'all'
                ? 'bg-gray-900 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            All Items
          </button>
          <button
            onClick={() => setStatusFilter('Low Stock')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              statusFilter === 'Low Stock'
                ? 'bg-rose-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Low Stock
          </button>
          <button
            onClick={() => setStatusFilter('May Run Out Soon')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              statusFilter === 'May Run Out Soon'
                ? 'bg-amber-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            May Run Out Soon
          </button>
          <button
            onClick={() => setStatusFilter('Good')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              statusFilter === 'Good'
                ? 'bg-emerald-700 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Good Stock
          </button>
        </div>
      </div>

      {/* Main Stock Planning Table */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-subtle">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                <th className="py-3.5 px-4">Medicine</th>
                <th className="py-3.5 px-4">Current Stock</th>
                <th className="py-3.5 px-4">Needed in 7 Days</th>
                <th className="py-3.5 px-4">Needed in 30 Days</th>
                <th className="py-3.5 px-4">Demand</th>
                <th className="py-3.5 px-4">Stock Status</th>
                <th className="py-3.5 px-4 text-right">What to Do</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-xs">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-400">
                    Loading stock planning information...
                  </td>
                </tr>
              ) : predictionsList.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-400">
                    Not enough past sales information yet.
                  </td>
                </tr>
              ) : (
                predictionsList.map((item) => (
                  <tr key={item.medicineId} className="hover:bg-gray-50/70 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-gray-900">
                      <div>{item.medicineName}</div>
                      <div className="text-[10px] text-gray-400 font-normal">{item.category}</div>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-gray-800">
                      {item.currentStock.toLocaleString()} {item.unit}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-medium text-gray-700">
                      {item.forecast7d.toLocaleString()} {item.unit}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-medium text-gray-700">
                      {item.forecast30d.toLocaleString()} {item.unit}
                    </td>
                    <td className="py-3.5 px-4">{renderDemandBadge(item.demandTrend)}</td>
                    <td className="py-3.5 px-4">{renderStatusBadge(item.stockStatus)}</td>
                    <td className="py-3.5 px-4 text-right">
                      {item.whatToDo === 'Plan Purchase' ? (
                        <Link
                          to="/reorder"
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#087F5B] hover:bg-[#066347] text-white text-xs font-bold rounded-lg transition-colors"
                        >
                          Plan Purchase
                        </Link>
                      ) : (
                        <span className="text-gray-400 font-medium">No action needed</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ForecastingPage;
