import React, { useState } from 'react';
import { X, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';
import { Medicine } from '../../types';

interface FefoPreviewModalProps {
  medicine: Medicine | null;
  isOpen: boolean;
  onClose: () => void;
}

export const FefoPreviewModal: React.FC<FefoPreviewModalProps> = ({
  medicine,
  isOpen,
  onClose,
}) => {
  const [testQty, setTestQty] = useState('10');
  const [allocationResult, setAllocationResult] = useState<{
    allocatedBatches: { batchId: string; batchNumber: string; quantity: number; expiryDate: string }[];
    usableStockRemaining: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !medicine) return null;

  const handleSimulate = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setAllocationResult(null);

    const qty = Number(testQty);
    if (!qty || qty <= 0) {
      setError('Please enter a quantity greater than zero.');
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Filter usable batches (quantity > 0 and NOT expired)
    const usable = medicine.batches.filter(
      (b) => b.quantity > 0 && new Date(b.expiryDate) >= today
    );

    // Sort by earliest expiration
    usable.sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());

    const totalUsable = usable.reduce((sum, b) => sum + b.quantity, 0);
    if (totalUsable < qty) {
      setError(
        `Insufficient usable stock! Usable available: ${totalUsable} ${medicine.unit}, Requested: ${qty} ${medicine.unit}. (Note: Expired batches are excluded from allocation).`
      );
      return;
    }

    let remaining = qty;
    const allocated: { batchId: string; batchNumber: string; quantity: number; expiryDate: string }[] = [];

    for (const b of usable) {
      if (remaining <= 0) break;
      const take = Math.min(b.quantity, remaining);
      allocated.push({
        batchId: b.id,
        batchNumber: b.batchNumber,
        quantity: take,
        expiryDate: b.expiryDate,
      });
      remaining -= take;
    }

    setAllocationResult({
      allocatedBatches: allocated,
      usableStockRemaining: totalUsable - qty,
    });
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-gray-100 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-[#DDF5E9] text-[#087F5B]">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">
                FEFO Stock Allocation Engine
              </h3>
              <p className="text-xs text-pharmacy-text-muted">
                First-Expired, First-Out simulation for {medicine.name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Medicine Batch Availability Overview */}
        <div className="mt-4 p-3.5 rounded-xl bg-gray-50 border border-gray-200 text-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-gray-500 font-medium">Usable In-Stock:</span>
            <span className="font-bold text-[#087F5B] font-mono">
              {medicine.usableStock} {medicine.unit}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-500 font-medium">Expired (Excluded):</span>
            <span className="font-bold text-red-600 font-mono">
              {medicine.expiredStock} {medicine.unit}
            </span>
          </div>

          <div className="pt-2 border-t border-gray-200 text-[11px] text-gray-600">
            <strong>Active Batches in Chronological Order:</strong>
            <ul className="mt-1 space-y-1">
              {[...medicine.batches]
                .sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime())
                .map((b) => {
                  const isExp = new Date(b.expiryDate) < today;
                  return (
                    <li key={b.id} className="flex items-center justify-between font-mono">
                      <span>
                        {b.batchNumber} (Exp: {b.expiryDate})
                      </span>
                      <span className={isExp ? 'text-red-500 line-through' : 'font-bold text-gray-800'}>
                        {b.quantity} {medicine.unit} {isExp ? '[EXPIRED - SKIPPED]' : ''}
                      </span>
                    </li>
                  );
                })}
            </ul>
          </div>
        </div>

        {/* Simulation Input Form */}
        <form onSubmit={handleSimulate} className="mt-4 space-y-3 text-xs">
          <div>
            <label className="block font-semibold text-gray-700 mb-1">
              Simulate Dispense Quantity ({medicine.unit})
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                min="1"
                required
                value={testQty}
                onChange={(e) => setTestQty(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 font-bold focus:outline-hidden focus:ring-2 focus:ring-[#087F5B]/30"
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-[#087F5B] hover:bg-[#066347] text-white font-semibold whitespace-nowrap transition-colors"
              >
                Compute FEFO
              </button>
            </div>
          </div>
        </form>

        {error && (
          <div className="mt-4 p-3 rounded-lg bg-red-50 border border-red-200 flex items-start gap-2 text-xs text-red-700">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {allocationResult && (
          <div className="mt-4 p-4 rounded-xl bg-[#DDF5E9]/60 border border-[#087F5B]/20 text-xs space-y-3">
            <div className="flex items-center gap-1.5 font-bold text-[#087F5B]">
              <CheckCircle2 className="w-4 h-4" />
              <span>FEFO Allocation Path Computed:</span>
            </div>

            <div className="space-y-2">
              {allocationResult.allocatedBatches.map((item, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-lg bg-white border border-gray-200 flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-[#087F5B] text-white flex items-center justify-center font-bold text-[10px]">
                      {idx + 1}
                    </span>
                    <div>
                      <span className="font-bold text-gray-900 font-mono">
                        Batch {item.batchNumber}
                      </span>
                      <span className="block text-[10px] text-gray-500">
                        Expiry Date: {item.expiryDate}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-[#087F5B] text-sm font-mono">
                      {item.quantity} {medicine.unit}
                    </span>
                    <span className="block text-[10px] text-gray-400">allocated</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-2 border-t border-[#087F5B]/20 flex items-center justify-between text-gray-700">
              <span>Usable Stock Remaining After Allocation:</span>
              <span className="font-bold font-mono text-gray-900">
                {allocationResult.usableStockRemaining} {medicine.unit}
              </span>
            </div>
          </div>
        )}

        <div className="mt-5 pt-3 border-t border-gray-100 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 text-xs font-semibold hover:bg-gray-50 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default FefoPreviewModal;
