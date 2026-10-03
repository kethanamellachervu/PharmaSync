import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ShoppingCart,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  Layers,
  RefreshCw,
} from 'lucide-react';
import { apiService } from '../services/api';
import { Medicine, SaleRecord } from '../types';

export const SalesPage: React.FC = () => {
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Sale form state
  const [selectedMedId, setSelectedMedId] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [searchFilter, setSearchFilter] = useState('');

  // Status message
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [medsData, salesData] = await Promise.all([
        apiService.getInventory(),
        apiService.getSales(),
      ]);
      setMedicines(medsData);
      setSales(salesData);
    } catch {
      setErrorMessage('Failed to load medicine inventory and sales.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Currently selected medicine object
  const selectedMedicine = useMemo(() => {
    return medicines.find((m) => m.id === selectedMedId) || null;
  }, [medicines, selectedMedId]);

  // Filtered medicine options for the selector
  const availableMedicines = useMemo(() => {
    return medicines.filter((m) =>
      m.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
      m.category.toLowerCase().includes(searchFilter.toLowerCase())
    );
  }, [medicines, searchFilter]);

  // Earliest expiring active batch (FEFO preview)
  const earliestExpiringBatch = useMemo(() => {
    if (!selectedMedicine) return null;
    const active = selectedMedicine.batches.filter((b) => b.quantity > 0);
    if (active.length === 0) return null;
    return [...active].sort(
      (a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime()
    )[0];
  }, [selectedMedicine]);

  const maxStock = selectedMedicine ? selectedMedicine.totalStock : 0;
  const unitPrice = selectedMedicine ? (selectedMedicine.sellingPrice ?? selectedMedicine.price ?? 0) : 0;
  const totalPrice = unitPrice * (quantity || 0);

  const handleRecordSale = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMessage(null);
    setErrorMessage(null);

    if (!selectedMedicine) {
      setErrorMessage('Please select a medicine first.');
      return;
    }

    if (quantity <= 0) {
      setErrorMessage('Quantity must be at least 1.');
      return;
    }

    if (quantity > maxStock) {
      setErrorMessage(
        `Cannot record sale: Only ${maxStock} units of "${selectedMedicine.name}" are available in stock.`
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await apiService.recordSale(selectedMedicine.id, quantity);

      const deductedDetails = result.sale.batchesDeducted
        .map((b) => `${b.quantity} from batch ${b.batchNumber} (Exp: ${b.expiryDate})`)
        .join(', ');

      setSuccessMessage(
        `Sale recorded successfully! Dispensed ${quantity} unit(s) of ${selectedMedicine.name} for ₹${result.sale.totalAmount.toFixed(
          2
        )} using FEFO priority (${deductedDetails}). Stock decreased to ${
          result.updatedMedicine.totalStock
        } units.`
      );

      // Reset selection and reload data
      setQuantity(1);
      setSelectedMedId('');
      loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to record sale.';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatSaleDate = (isoString: string): string => {
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 tracking-tight">
            Point of Sale & Billing Counter
          </h2>
          <p className="text-xs text-pharmacy-text-muted mt-1">
            Fast counter checkout with automatic stock deduction and FEFO (First-Expired, First-Out) priority
          </p>
        </div>

        <button
          onClick={loadData}
          disabled={isLoading}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold transition-colors self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh Stock</span>
        </button>
      </div>

      {/* Notifications */}
      {successMessage && (
        <div className="p-4 rounded-xl bg-[#DDF5E9] border border-[#087F5B]/30 flex items-start gap-3 text-xs text-[#087F5B]">
          <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="flex-1 font-medium">{successMessage}</div>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 flex items-start gap-3 text-xs text-red-700">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="flex-1 font-medium">{errorMessage}</div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Record Sale Counter Form */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-gray-200 p-6 shadow-subtle h-fit">
          <div className="flex items-center gap-2.5 pb-4 border-b border-gray-100 mb-4">
            <div className="p-2 rounded-lg bg-[#DDF5E9] text-[#087F5B]">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">
                Record New Sale
              </h3>
              <p className="text-[11px] text-gray-500">
                Select item and specify dispensed quantity
              </p>
            </div>
          </div>

          <form onSubmit={handleRecordSale} className="space-y-4 text-xs">
            {/* Quick search filter for medicines */}
            <div>
              <label className="block font-semibold text-gray-700 mb-1">
                Filter Medicine
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Type to filter medicine list..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[#087F5B]/30"
                />
              </div>
            </div>

            {/* Medicine Select */}
            <div>
              <label className="block font-semibold text-gray-700 mb-1">
                Select Medicine *
              </label>
              <select
                required
                value={selectedMedId}
                onChange={(e) => {
                  setSelectedMedId(e.target.value);
                  setQuantity(1);
                  setSuccessMessage(null);
                  setErrorMessage(null);
                }}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white font-medium focus:outline-hidden focus:ring-2 focus:ring-[#087F5B]/30 focus:border-[#087F5B]"
              >
                <option value="">-- Choose a medicine from stock --</option>
                {availableMedicines.map((med) => (
                  <option
                    key={med.id}
                    value={med.id}
                    disabled={med.totalStock <= 0}
                  >
                    {med.name} ({med.totalStock} in stock) — ₹{(med.sellingPrice ?? med.price ?? 0).toFixed(2)}
                  </option>
                ))}
              </select>
            </div>

            {/* Selected Medicine Status Box */}
            {selectedMedicine && (
              <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-200 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">Available Stock:</span>
                  <span
                    className={`font-bold font-mono ${
                      maxStock <= (selectedMedicine.minStockLevel ?? selectedMedicine.minStock ?? 0)
                        ? 'text-red-600'
                        : 'text-gray-800'
                    }`}
                  >
                    {maxStock} units
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">Unit Selling Price:</span>
                  <span className="font-bold font-mono text-[#087F5B]">
                    ₹{unitPrice.toFixed(2)}
                  </span>
                </div>

                {/* FEFO Batch Priority Indicator */}
                {earliestExpiringBatch && (
                  <div className="mt-2 pt-2 border-t border-gray-200/80 flex items-start gap-1.5 text-[11px] text-amber-800 bg-amber-50/60 p-2 rounded-lg">
                    <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold">FEFO Batch Selected:</span>{' '}
                      Batch <span className="font-mono">{earliestExpiringBatch.batchNumber}</span> (Exp: {earliestExpiringBatch.expiryDate}) will be deducted first.
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Quantity Input */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-semibold text-gray-700">
                  Sale Quantity (units) *
                </label>
                {selectedMedicine && (
                  <span className="text-[11px] text-gray-400">
                    Max: {maxStock}
                  </span>
                )}
              </div>
              <input
                type="number"
                min="1"
                max={maxStock || 1}
                required
                disabled={!selectedMedicine || maxStock <= 0}
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 font-bold text-base text-gray-800 focus:outline-hidden focus:ring-2 focus:ring-[#087F5B]/30 focus:border-[#087F5B] disabled:bg-gray-100 disabled:text-gray-400"
              />
            </div>

            {/* Total Calculation Panel */}
            <div className="p-4 rounded-xl bg-[#DDF5E9]/50 border border-[#087F5B]/20 flex items-center justify-between">
              <div>
                <span className="block text-[11px] font-semibold text-gray-600 uppercase tracking-wider">
                  Total Bill Amount
                </span>
                <span className="text-xs text-gray-500">
                  {quantity} unit(s) × ₹{unitPrice.toFixed(2)}
                </span>
              </div>
              <div className="text-2xl font-extrabold text-[#087F5B] font-mono">
                ₹{totalPrice.toFixed(2)}
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting || !selectedMedicine || maxStock <= 0}
              className="w-full py-3 rounded-lg bg-[#087F5B] hover:bg-[#066347] text-white font-bold text-sm shadow-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ShoppingCart className="w-4 h-4" />
              <span>
                {isSubmitting
                  ? 'Recording Sale...'
                  : maxStock <= 0 && selectedMedicine
                  ? 'Out of Stock'
                  : 'Complete Sale & Deduct Stock'}
              </span>
            </button>
          </form>
        </div>

        {/* Right Column: Recent Sales Activity Table */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-gray-200 p-6 shadow-subtle flex flex-col">
          <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-4">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#087F5B]" />
              <h3 className="text-base font-bold text-gray-900">
                Sales Transaction History
              </h3>
            </div>
            <span className="text-xs text-gray-400">
              {sales.length} transactions recorded
            </span>
          </div>

          <div className="flex-1 overflow-x-auto">
            {sales.length === 0 ? (
              <div className="py-16 text-center text-xs text-gray-400">
                No counter sales recorded yet.
              </div>
            ) : (
              <table className="w-full text-left text-xs min-w-[500px]">
                <thead>
                  <tr className="text-gray-400 font-semibold border-b border-gray-100">
                    <th className="py-2.5 px-3">Medicine</th>
                    <th className="py-2.5 px-2 text-center">Qty</th>
                    <th className="py-2.5 px-3 text-right">Unit Price</th>
                    <th className="py-2.5 px-3 text-right">Total Amount</th>
                    <th className="py-2.5 px-3 text-right">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {sales.map((sale) => (
                    <tr key={sale.id} className="hover:bg-gray-50/70 transition-colors">
                      <td className="py-3 px-3">
                        <p className="font-bold text-gray-800">{sale.medicineName}</p>
                        {sale.batchesDeducted && sale.batchesDeducted.length > 0 && (
                          <p className="text-[10px] text-gray-400 mt-0.5">
                            FEFO Batch: {sale.batchesDeducted.map((b) => `${b.batchNumber} (${b.quantity}u)`).join(', ')}
                          </p>
                        )}
                      </td>
                      <td className="py-3 px-2 text-center font-bold text-gray-700">
                        {sale.quantity}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-gray-600">
                        ₹{sale.unitPrice.toFixed(2)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-[#087F5B]">
                        ₹{sale.totalAmount.toFixed(2)}
                      </td>
                      <td className="py-3 px-3 text-right text-gray-400 text-[11px]">
                        {formatSaleDate(sale.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SalesPage;
