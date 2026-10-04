import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  RotateCcw,
  AlertOctagon,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Search,
  DollarSign,
  Package,
  ShoppingBag,
  Info,
  Edit3,
  Check,
  X,
  Clock,
  Truck,
} from 'lucide-react';
import { apiService } from '../services/api';
import { ReorderRecommendation, ReorderUrgency, ReviewStatus, Supplier } from '../types';
import StatCard from '../components/ui/StatCard';

export const ReorderPage: React.FC = () => {
  const navigate = useNavigate();
  const [recommendations, setRecommendations] = useState<ReorderRecommendation[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [urgencyFilter, setUrgencyFilter] = useState<ReorderUrgency | 'all'>('all');
  const [reviewStatusFilter, setReviewStatusFilter] = useState<ReviewStatus | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Editing state for manual adjustment
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adjustedQtyInput, setAdjustedQtyInput] = useState<number>(0);
  const [notesInput, setNotesInput] = useState<string>('');
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  const loadRecommendations = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [data, suppliersData] = await Promise.all([
        apiService.getReorderRecommendations({
          urgency: urgencyFilter !== 'all' ? urgencyFilter : undefined,
          reviewStatus: reviewStatusFilter !== 'all' ? reviewStatusFilter : undefined,
          category: categoryFilter !== 'all' ? categoryFilter : undefined,
        }),
        apiService.getSuppliers().catch(() => [] as Supplier[]),
      ]);
      setRecommendations(data);
      setSuppliers(suppliersData);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load reorder recommendations.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [urgencyFilter, reviewStatusFilter, categoryFilter]);

  useEffect(() => {
    loadRecommendations();
  }, [loadRecommendations]);

  // Derived categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    recommendations.forEach((r) => set.add(r.category));
    return Array.from(set);
  }, [recommendations]);

  // Client-side search filtering
  const filteredList = useMemo(() => {
    if (!searchQuery.trim()) return recommendations;
    const q = searchQuery.toLowerCase();
    return recommendations.filter(
      (r) =>
        r.medicineName.toLowerCase().includes(q) ||
        r.category.toLowerCase().includes(q) ||
        r.medicineId.toLowerCase().includes(q)
    );
  }, [recommendations, searchQuery]);

  // Overall metric counters
  const summaryMetrics = useMemo(() => {
    const criticalCount = recommendations.filter((r) => r.urgency === 'critical').length;
    const pendingCount = recommendations.filter((r) => r.reviewStatus === 'pending').length;
    const totalSuggestedUnits = recommendations.reduce(
      (sum, r) => sum + (r.adjustedQuantity !== undefined ? r.adjustedQuantity : r.suggestedReorderQuantity),
      0
    );
    const estimatedCost = recommendations.reduce((sum, r) => {
      const qty = r.adjustedQuantity !== undefined ? r.adjustedQuantity : r.suggestedReorderQuantity;
      return sum + qty * (r.purchasePrice || 0);
    }, 0);

    return {
      criticalCount,
      pendingCount,
      totalSuggestedUnits,
      estimatedCost,
    };
  }, [recommendations]);

  // Review status handler
  const handleReviewStatus = async (
    medicineId: string,
    status: ReviewStatus,
    customQty?: number,
    customNotes?: string
  ) => {
    setIsUpdating(true);
    setActionSuccessMsg(null);
    try {
      const updated = await apiService.reviewReorderRecommendation(medicineId, {
        status,
        adjustedQuantity: customQty,
        notes: customNotes,
      });

      // Update in local state
      setRecommendations((prev) =>
        prev.map((r) => (r.medicineId === medicineId ? updated : r))
      );
      setEditingId(null);
      setActionSuccessMsg(`Status updated: ${updated.medicineName} marked as ${status}.`);
      setTimeout(() => setActionSuccessMsg(null), 3000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update review status.';
      setError(msg);
    } finally {
      setIsUpdating(false);
    }
  };

  const startEditing = (item: ReorderRecommendation) => {
    setEditingId(item.medicineId);
    setAdjustedQtyInput(
      item.adjustedQuantity !== undefined ? item.adjustedQuantity : item.suggestedReorderQuantity
    );
    setNotesInput(item.reviewerNotes || '');
  };

  const saveEdit = (medicineId: string) => {
    handleReviewStatus(medicineId, 'reviewed', adjustedQtyInput, notesInput);
  };

  const getSuppliersForItem = (item: ReorderRecommendation) => {
    if (suppliers.length === 0) return { preferred: null, alternates: [] };

    const matching = suppliers.filter((s) => {
      const matchCat = s.productCategories?.some((c) =>
        item.category.toLowerCase().includes(c.toLowerCase()) || c.toLowerCase().includes(item.category.toLowerCase())
      );
      const matchMed = s.medicinesSupplied?.some((m) =>
        item.medicineName.toLowerCase().includes(m.toLowerCase()) || m.toLowerCase().includes(item.medicineName.toLowerCase())
      );
      return matchCat || matchMed;
    });

    const candidateList = matching.length > 0 ? matching : suppliers;
    const preferred = candidateList[0] || null;
    const alternates = candidateList.slice(1, 4);

    return { preferred, alternates };
  };

  return (
    <div className="space-y-6">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-200 shadow-subtle">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-[#DDF5E9] text-[#087F5B]">
              <RotateCcw className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Smart Reorder Recommendations</h1>
              <p className="text-xs text-gray-500">
                Automated replenishment recommendations based on forecasted demand, stockout risk, and safety buffers
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={loadRecommendations}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-[#087F5B] rounded-xl hover:bg-[#066c4d] transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Error / Offline Alert */}
      {error && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between text-xs text-amber-800">
          <span>{error}</span>
          <button
            onClick={loadRecommendations}
            className="flex items-center gap-1 font-semibold text-[#087F5B] hover:underline cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry</span>
          </button>
        </div>
      )}

      {/* 2. Notice Banner */}
      <div className="p-3.5 rounded-xl bg-amber-50/80 border border-amber-200 flex items-start gap-2.5 text-xs text-amber-900">
        <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold">Pharmacist Review Required:</span> Recommendations are decision-support
          suggestions. You can adjust quantities and review items before ordering. Marking a recommendation as reviewed
          does <span className="underline font-semibold">not</span> place an automatic purchase order.
        </div>
      </div>

      {/* Action feedback banner */}
      {actionSuccessMsg && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-2 text-xs text-emerald-800">
          <CheckCircle2 className="w-4 h-4 text-[#087F5B]" />
          <span>{actionSuccessMsg}</span>
        </div>
      )}

      {/* 3. KPI Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <StatCard
          title="Pending Reviews"
          value={isLoading ? '...' : summaryMetrics.pendingCount}
          subtitle="Reorders requiring attention"
          icon={Clock}
          iconBgColor="bg-amber-50"
          iconColor="text-amber-600"
        />

        <StatCard
          title="Critical Shortages"
          value={isLoading ? '...' : summaryMetrics.criticalCount}
          subtitle="Out of stock or depleting in <=3d"
          icon={AlertOctagon}
          iconBgColor="bg-red-50"
          iconColor="text-red-600"
        />

        <StatCard
          title="Suggested Restock Units"
          value={isLoading ? '...' : `${summaryMetrics.totalSuggestedUnits} units`}
          subtitle="Total recommended quantity"
          icon={Package}
          iconBgColor="bg-blue-50"
          iconColor="text-blue-600"
        />

        <StatCard
          title="Est. Wholesale Cost"
          value={isLoading ? '...' : `₹${summaryMetrics.estimatedCost.toFixed(2)}`}
          subtitle="Calculated at purchase price"
          icon={DollarSign}
          iconBgColor="bg-emerald-50"
          iconColor="text-[#087F5B]"
        />
      </div>

      {/* 4. Filter Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-subtle space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Review Status Filter */}
          <div className="flex items-center gap-1.5 p-1 bg-gray-100 rounded-xl w-fit">
            <span className="text-[11px] font-semibold text-gray-500 px-2">Status:</span>
            {[
              { id: 'all', label: 'All' },
              { id: 'pending', label: 'Pending Review' },
              { id: 'reviewed', label: 'Reviewed' },
              { id: 'dismissed', label: 'Dismissed' },
            ].map((st) => (
              <button
                key={st.id}
                onClick={() => setReviewStatusFilter(st.id as ReviewStatus | 'all')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  reviewStatusFilter === st.id
                    ? 'bg-white text-[#087F5B] shadow-xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {st.label}
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

        {/* Urgency & Category Filters */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-gray-100">
          <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
            Urgency:
          </span>
          {[
            { id: 'all', label: 'All Urgencies' },
            { id: 'critical', label: 'Critical' },
            { id: 'high', label: 'High' },
            { id: 'medium', label: 'Medium' },
            { id: 'low', label: 'Low / Adequate' },
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

          {categories.length > 0 && (
            <div className="flex items-center gap-1 ml-auto">
              <span className="text-[11px] text-gray-400">Category:</span>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="text-xs p-1 border border-gray-200 rounded-lg focus:outline-none"
              >
                <option value="all">All Categories</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* 5. Reorder Recommendations List */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="bg-white p-12 text-center text-gray-400 rounded-2xl border border-gray-200">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#087F5B]" />
            Evaluating stock levels, buffer requirements, and shortage formulas...
          </div>
        ) : filteredList.length === 0 ? (
          <div className="bg-white p-12 text-center text-gray-400 rounded-2xl border border-gray-200">
            No reorder recommendations match the selected filters.
          </div>
        ) : (
          filteredList.map((item) => {
            const isEditing = editingId === item.medicineId;
            const effectiveQty =
              item.adjustedQuantity !== undefined
                ? item.adjustedQuantity
                : item.suggestedReorderQuantity;

            return (
              <div
                key={item.id}
                className={`bg-white rounded-2xl p-5 border transition-all shadow-subtle ${
                  item.urgency === 'critical'
                    ? 'border-red-200 bg-red-50/10'
                    : item.urgency === 'high'
                    ? 'border-amber-200 bg-amber-50/10'
                    : 'border-gray-200'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Left: Medicine & Urgency Info */}
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-bold text-gray-900">{item.medicineName}</h3>
                      <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md">
                        {item.category}
                      </span>
                      {item.urgency === 'critical' && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded-full animate-pulse">
                          <AlertOctagon className="w-3 h-3" />
                          Critical Shortage
                        </span>
                      )}
                      {item.urgency === 'high' && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
                          <AlertTriangle className="w-3 h-3" />
                          High Priority
                        </span>
                      )}
                      {item.reviewStatus === 'reviewed' && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="w-3 h-3" />
                          Reviewed
                        </span>
                      )}
                      {item.reviewStatus === 'dismissed' && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-gray-600 bg-gray-200 px-2 py-0.5 rounded-full">
                          <XCircle className="w-3 h-3" />
                          Dismissed
                        </span>
                      )}
                    </div>

                    {/* Stock & Demand Metrics Bar */}
                    <div className="flex flex-wrap items-center gap-4 text-xs text-gray-600 pt-1">
                      <div>
                        <span className="text-gray-400">Usable Stock:</span>{' '}
                        <span
                          className={`font-mono font-bold ${
                            item.currentUsableStock === 0 ? 'text-red-600' : 'text-gray-900'
                          }`}
                        >
                          {item.currentUsableStock} {item.unit}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-400">Daily Demand:</span>{' '}
                        <span className="font-mono font-semibold text-gray-800">
                          {item.avgDailyDemand} {item.unit}/day
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-400">{item.planningHorizonDays}D Demand:</span>{' '}
                        <span className="font-mono font-semibold text-blue-600">
                          {item.forecastedDemand} {item.unit}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-400">Safety Buffer:</span>{' '}
                        <span className="font-mono font-semibold text-emerald-700">
                          {item.safetyBuffer} {item.unit}
                        </span>
                      </div>
                      {item.stockDepletionDays !== null && (
                        <div>
                          <span className="text-gray-400">Stockout In:</span>{' '}
                          <span
                            className={`font-mono font-bold ${
                              item.stockDepletionDays <= 3 ? 'text-red-600' : 'text-amber-600'
                            }`}
                          >
                            ~{item.stockDepletionDays} days
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Explanatory Reason Box */}
                    <p className="text-xs text-gray-700 bg-white/70 p-2.5 rounded-xl border border-gray-200/80 leading-relaxed">
                      <span className="font-semibold text-gray-900">Reason:</span> {item.reason}
                    </p>

                    {item.reviewerNotes && (
                      <p className="text-[11px] text-gray-500 italic pl-1">
                        Pharmacist Note: "{item.reviewerNotes}"
                      </p>
                    )}

                    {/* Preferred & Alternate Telangana Suppliers */}
                    {(() => {
                      const { preferred, alternates } = getSuppliersForItem(item);
                      if (!preferred) return null;
                      return (
                        <div className="p-2.5 rounded-xl bg-gray-50/80 border border-gray-200 text-xs space-y-1">
                          <div className="flex flex-wrap items-center justify-between gap-1">
                            <div className="flex items-center gap-1.5 font-semibold text-gray-800">
                              <Truck className="w-3.5 h-3.5 text-[#087F5B]" />
                              <span>Preferred Vendor:</span>
                              <span className="text-gray-900 font-bold">{preferred.name}</span>
                              <span className="text-[10px] text-gray-500 font-normal">
                                ({preferred.city}, Lead Time: {preferred.deliveryTime || '24-48 hrs'})
                              </span>
                            </div>
                            <span className="text-[10px] text-emerald-800 bg-emerald-100 font-semibold px-2 py-0.5 rounded-full">
                              Min Order: ₹{(preferred.minOrderAmount || 0).toLocaleString('en-IN')}
                            </span>
                          </div>
                          {alternates.length > 0 && (
                            <div className="text-[11px] text-gray-500">
                              <span className="font-medium text-gray-700">Alternate Suppliers:</span>{' '}
                              {alternates.map((a) => `${a.name} (${a.city || 'Regional'})`).join(' • ')}
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>

                  {/* Right: Suggested Qty & Action Controls */}
                  <div className="flex flex-col sm:flex-row lg:flex-col items-end gap-3 shrink-0 pt-2 lg:pt-0">
                    <div className="text-right">
                      <span className="text-[11px] text-gray-400 uppercase font-semibold block">
                        Suggested Reorder
                      </span>
                      {isEditing ? (
                        <div className="flex items-center gap-1.5 mt-1">
                          <input
                            type="number"
                            min={0}
                            value={adjustedQtyInput}
                            onChange={(e) => setAdjustedQtyInput(Number(e.target.value))}
                            className="w-20 p-1 text-right text-sm font-mono font-bold border border-[#087F5B] rounded-lg focus:outline-none"
                          />
                          <span className="text-xs text-gray-600">{item.unit}</span>
                          <button
                            onClick={() => saveEdit(item.medicineId)}
                            className="p-1 rounded-lg bg-[#087F5B] text-white hover:bg-[#066c4d]"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="p-1 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end gap-1.5 mt-0.5">
                          <span className="text-xl font-bold font-mono text-[#087F5B]">
                            {effectiveQty} {item.unit}
                          </span>
                          <button
                            onClick={() => startEditing(item)}
                            title="Adjust quantity manually"
                            className="p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-md"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}

                      {item.purchasePrice && (
                        <span className="text-[11px] text-gray-500 font-mono block">
                          Est. Cost: ₹{(effectiveQty * item.purchasePrice).toFixed(2)} (@ ₹
                          {item.purchasePrice}/unit)
                        </span>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-1.5">
                      {item.reviewStatus !== 'reviewed' && (
                        <button
                          onClick={() => handleReviewStatus(item.medicineId, 'reviewed')}
                          disabled={isUpdating}
                          className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-colors cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Mark Reviewed</span>
                        </button>
                      )}

                      {item.reviewStatus !== 'dismissed' && (
                        <button
                          onClick={() => handleReviewStatus(item.medicineId, 'dismissed')}
                          disabled={isUpdating}
                          className="px-2.5 py-1.5 text-xs font-semibold text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
                        >
                          Dismiss
                        </button>
                      )}

                      {/* Link to Purchases page to record purchase order */}
                      {(() => {
                        const { preferred } = getSuppliersForItem(item);
                        return (
                          <button
                            onClick={() =>
                              navigate('/purchases', {
                                state: {
                                  supplierId: preferred?.id,
                                  reorderItem: {
                                    medicineId: item.medicineId,
                                    medicineName: item.medicineName,
                                    quantity: effectiveQty,
                                    purchasePrice: item.purchasePrice || 0,
                                  },
                                },
                              })
                            }
                            className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-[#087F5B] hover:bg-[#066c4d] rounded-xl transition-colors shadow-xs cursor-pointer"
                          >
                            <ShoppingBag className="w-3.5 h-3.5" />
                            <span>Create Draft PO</span>
                          </button>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default ReorderPage;
