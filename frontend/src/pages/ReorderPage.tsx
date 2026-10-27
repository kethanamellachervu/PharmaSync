import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Search,
  Package,
  Truck,
  Phone,
} from 'lucide-react';
import { apiService } from '../services/api';
import { MlForecastingFullResult, Supplier } from '../types';
import StatCard from '../components/ui/StatCard';

export const ReorderPage: React.FC = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<MlForecastingFullResult | null>(null);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Owner approval modal state for supplier contact
  const [contactModalSupplier, setContactModalSupplier] = useState<{
    supplier: Supplier;
    medicineName: string;
  } | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [mlRes, suppliersData] = await Promise.all([
        apiService.getMlPredictions(30),
        apiService.getSuppliers().catch(() => [] as Supplier[]),
      ]);
      setData(mlRes);
      setSuppliers(suppliersData);
    } catch (err: unknown) {
      setError('We couldn\'t load stock alerts right now. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Medicines needing attention
  const alertList = useMemo(() => {
    let list = (data?.predictions || []).filter(
      (p) => p.stockStatus === 'Low Stock' || p.stockStatus === 'May Run Out Soon'
    );

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (p) =>
          p.medicineName.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q)
      );
    }

    return list;
  }, [data, searchQuery]);

  const handleContactSupplierClick = (medName: string) => {
    const selectedSupplier = suppliers[0] || {
      id: 'sup-1',
      name: 'Apollo Pharmacy Wholesale',
      phone: '+91 98765 43210',
      contactPerson: 'Ramesh Gupta',
    };
    setContactModalSupplier({
      supplier: selectedSupplier as Supplier,
      medicineName: medName,
    });
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">
            Stock Alerts ({data?.summary.reorderNowCount ?? 0})
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Review medicines that need attention and plan supplier orders.
          </p>
        </div>

        <button
          onClick={loadData}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold transition-colors shrink-0"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Alerts</span>
        </button>
      </div>

      {/* Error state */}
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
          title="Stock Alerts Count"
          value={isLoading ? '...' : (data?.summary.reorderNowCount ?? 0)}
          subtitle="Medicines needing purchase"
          icon={AlertTriangle}
          iconBgColor="bg-amber-50"
          iconColor="text-amber-600"
          isAlert={(data?.summary.reorderNowCount ?? 0) > 0}
        />

        <StatCard
          title="Sufficient Stock Items"
          value={isLoading ? '...' : (data?.summary.stockSufficientCount ?? 0)}
          subtitle="Stock looks good"
          icon={CheckCircle2}
          iconBgColor="bg-emerald-50"
          iconColor="text-emerald-700"
        />

        <StatCard
          title="Suggested Purchase Units"
          value={isLoading ? '...' : `${(data?.summary.totalRecommendedOrderUnits ?? 0).toLocaleString()} units`}
          subtitle="Total recommended quantity"
          icon={Package}
          iconBgColor="bg-blue-50"
          iconColor="text-blue-600"
        />
      </div>

      {/* Search Filter */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-subtle flex items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search medicine name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#087F5B]"
          />
        </div>
      </div>

      {/* Stock Alerts List */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-subtle space-y-4">
        {isLoading ? (
          <div className="py-12 text-center text-xs text-gray-400">Loading stock alerts...</div>
        ) : alertList.length === 0 ? (
          <div className="py-12 text-center text-xs text-gray-500 flex flex-col items-center justify-center gap-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-600" />
            <span className="text-sm font-bold text-gray-900">No medicines need a purchase right now.</span>
            <span className="text-xs text-gray-500">Your current inventory covers expected medicine needs.</span>
          </div>
        ) : (
          <div className="space-y-3">
            {alertList.map((item) => (
              <div
                key={item.medicineId}
                className="p-4 rounded-xl border border-gray-200 bg-gray-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-gray-900">{item.medicineName}</span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                        item.stockStatus === 'Low Stock'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {item.stockStatus}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-gray-600 pt-1">
                    <span>
                      Current stock: <strong className="text-gray-900">{item.currentStock.toLocaleString()} {item.unit}</strong>
                    </span>
                    <span>
                      Needed in 30 Days: <strong className="text-gray-900">{item.forecast30d.toLocaleString()} {item.unit}</strong>
                    </span>
                    <span>
                      Suggested Order: <strong className="text-[#087F5B] font-mono">{item.recommendedQuantity.toLocaleString()} {item.unit}</strong>
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => navigate('/purchases')}
                    className="px-3 py-1.5 bg-[#087F5B] hover:bg-[#066347] text-white text-xs font-bold rounded-lg transition-colors"
                  >
                    Add Purchase
                  </button>

                  <button
                    onClick={() => handleContactSupplierClick(item.medicineName)}
                    className="px-3 py-1.5 bg-white border border-gray-300 hover:bg-gray-100 text-gray-700 text-xs font-bold rounded-lg transition-colors flex items-center gap-1"
                  >
                    <Phone className="w-3.5 h-3.5 text-[#087F5B]" />
                    <span>Contact Supplier</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Owner Approval Modal for Supplier Call */}
      {contactModalSupplier && (
        <div className="fixed inset-0 z-50 bg-gray-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-3 border-b border-gray-100 pb-3">
              <div className="p-2 rounded-xl bg-emerald-50 text-[#087F5B]">
                <Truck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">Owner Approval Required</h3>
                <p className="text-xs text-gray-400">Contact Supplier</p>
              </div>
            </div>

            <div className="space-y-2 text-xs text-gray-700 leading-relaxed">
              <p>
                You are preparing to contact supplier <strong className="text-gray-900">{contactModalSupplier.supplier.name}</strong> for medicine <strong className="text-gray-900">{contactModalSupplier.medicineName}</strong>.
              </p>
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 space-y-1 font-mono text-[11px]">
                <div>Contact: {contactModalSupplier.supplier.contactPerson || 'Sales Desk'}</div>
                <div>Phone: {contactModalSupplier.supplier.phone || '+91 98765 43210'}</div>
              </div>
              <p className="text-[11px] text-amber-700 bg-amber-50 p-2.5 rounded-lg border border-amber-200">
                🔒 Pharmacy owner approval is required before initiating contact. The system will not place automatic purchases.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
              <button
                onClick={() => setContactModalSupplier(null)}
                className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl"
              >
                Cancel
              </button>

              <a
                href={`tel:${contactModalSupplier.supplier.phone || '9876543210'}`}
                onClick={() => setContactModalSupplier(null)}
                className="px-4 py-2 text-xs font-bold text-white bg-[#087F5B] hover:bg-[#066347] rounded-xl flex items-center gap-1.5"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>Call Supplier</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReorderPage;
