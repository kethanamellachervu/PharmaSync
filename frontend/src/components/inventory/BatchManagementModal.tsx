import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  Plus,
  AlertTriangle,
  Layers,
  Edit2,
  Save,
} from 'lucide-react';
import { Medicine, MedicineBatch } from '../../types';
import { apiService } from '../../services/api';
import Badge from '../ui/Badge';

interface BatchManagementModalProps {
  medicine: Medicine | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const BatchManagementModal: React.FC<BatchManagementModalProps> = ({
  medicine,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [batches, setBatches] = useState<MedicineBatch[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // New batch form state
  const [newBatchNumber, setNewBatchNumber] = useState('');
  const [newQuantity, setNewQuantity] = useState('');
  const [newMfgDate, setNewMfgDate] = useState('');
  const [newExpiryDate, setNewExpiryDate] = useState('');
  const [newReason, setNewReason] = useState('New batch received');
  const [isAddingBatch, setIsAddingBatch] = useState(false);

  // Editing existing batch state
  const [editingBatchId, setEditingBatchId] = useState<string | null>(null);
  const [editQty, setEditQty] = useState('');
  const [editExp, setEditExp] = useState('');
  const [editReason, setEditReason] = useState('');

  const loadBatches = useCallback(async () => {
    if (!medicine) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiService.getBatches(medicine.id);
      setBatches(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch batches.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [medicine]);

  useEffect(() => {
    if (isOpen && medicine) {
      loadBatches();
      setEditingBatchId(null);
      setError(null);
    }
  }, [isOpen, medicine, loadBatches]);

  if (!isOpen || !medicine) return null;

  const handleAddBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!newBatchNumber.trim()) {
      setError('Batch number is required.');
      return;
    }
    if (newQuantity === '' || Number(newQuantity) < 0) {
      setError('Quantity must be a non-negative number.');
      return;
    }
    if (!newExpiryDate) {
      setError('Expiry date is required.');
      return;
    }
    if (newMfgDate && new Date(newExpiryDate) <= new Date(newMfgDate)) {
      setError('Expiry date must be later than the manufacturing date.');
      return;
    }

    setIsAddingBatch(true);
    try {
      await apiService.addBatch(medicine.id, {
        batchNumber: newBatchNumber.trim(),
        quantity: Number(newQuantity),
        mfgDate: newMfgDate || undefined,
        expiryDate: newExpiryDate,
        reason: newReason || 'New batch received',
      });

      // Reset
      setNewBatchNumber('');
      setNewQuantity('');
      setNewMfgDate('');
      setNewExpiryDate('');
      setNewReason('New batch received');

      loadBatches();
      onSuccess();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to add batch.';
      setError(msg);
    } finally {
      setIsAddingBatch(false);
    }
  };

  const handleStartEdit = (b: MedicineBatch) => {
    setEditingBatchId(b.id);
    setEditQty(b.quantity.toString());
    setEditExp(b.expiryDate);
    setEditReason('Stock count adjustment');
  };

  const handleSaveEdit = async (batchId: string) => {
    if (!medicine) return;
    setError(null);

    if (editQty === '' || Number(editQty) < 0) {
      setError('Quantity must be a non-negative number.');
      return;
    }
    if (!editExp) {
      setError('Expiry date is required.');
      return;
    }

    try {
      await apiService.updateBatch(medicine.id, batchId, {
        quantity: Number(editQty),
        expiryDate: editExp,
        reason: editReason || 'Batch details updated',
      });

      setEditingBatchId(null);
      loadBatches();
      onSuccess();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update batch.';
      setError(msg);
    }
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Usable stock vs Expired stock
  const usableBatches = batches.filter((b) => new Date(b.expiryDate) >= today && b.quantity > 0);
  const totalUsableStock = usableBatches.reduce((sum, b) => sum + b.quantity, 0);
  const expiredBatches = batches.filter((b) => new Date(b.expiryDate) < today && b.quantity > 0);
  const totalExpiredStock = expiredBatches.reduce((sum, b) => sum + b.quantity, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-xl border border-gray-100 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-gray-100">
          <div>
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-[#087F5B]" />
              <h3 className="text-lg font-bold text-gray-900">
                Batch Management: {medicine.name}
              </h3>
            </div>
            <p className="text-xs text-pharmacy-text-muted mt-0.5">
              Category: {medicine.category} • Unit: {medicine.unit} • Min Alert: {medicine.minStockLevel}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stock Summary Banner */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3 rounded-xl bg-[#DDF5E9]/60 border border-[#087F5B]/20 text-xs">
            <span className="block text-gray-500 font-medium">Usable In-Stock</span>
            <span className="text-xl font-bold text-[#087F5B] font-mono">
              {totalUsableStock} {medicine.unit}
            </span>
            <span className="block text-[10px] text-gray-400">Available for dispensing</span>
          </div>

          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs">
            <span className="block text-gray-500 font-medium">Near Expiry (&le;30d)</span>
            <span className="text-xl font-bold text-amber-700 font-mono">
              {
                batches.filter((b) => {
                  const exp = new Date(b.expiryDate);
                  const diff = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                  return diff >= 0 && diff <= 30 && b.quantity > 0;
                }).length
              }{' '}
              batch(es)
            </span>
            <span className="block text-[10px] text-gray-400">FEFO priority allocation</span>
          </div>

          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs">
            <span className="block text-gray-500 font-medium">Expired Stock</span>
            <span className="text-xl font-bold text-red-600 font-mono">
              {totalExpiredStock} {medicine.unit}
            </span>
            <span className="block text-[10px] text-red-400">Excluded from usable stock</span>
          </div>
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-lg bg-red-50 border border-red-200 flex items-center gap-2 text-xs text-red-700">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Batches Table List */}
        <div className="mt-5 space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider">
              Tracked Batches ({batches.length})
            </h4>
            <span className="text-[11px] text-gray-400">
              Sorted by Expiry Date (FEFO)
            </span>
          </div>

          {isLoading ? (
            <div className="py-8 text-center text-xs text-gray-500">Loading batches...</div>
          ) : batches.length === 0 ? (
            <div className="py-6 text-center text-xs text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200">
              No batches registered yet. Add a batch below.
            </div>
          ) : (
            <div className="border border-gray-200 rounded-xl overflow-hidden divide-y divide-gray-100 text-xs">
              {batches
                .sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime())
                .map((batch) => {
                  const expDate = new Date(batch.expiryDate);
                  expDate.setHours(0, 0, 0, 0);
                  const daysLeft = Math.ceil(
                    (expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
                  );
                  const isExpired = daysLeft < 0;
                  const isNearExpiry = daysLeft >= 0 && daysLeft <= 30;
                  const isEditing = editingBatchId === batch.id;

                  return (
                    <div
                      key={batch.id}
                      className={`p-3.5 transition-colors ${
                        isExpired
                          ? 'bg-red-50/40'
                          : isNearExpiry
                          ? 'bg-amber-50/40'
                          : 'hover:bg-gray-50/60'
                      }`}
                    >
                      {isEditing ? (
                        <div className="space-y-2">
                          <div className="font-semibold text-gray-800">
                            Editing Batch: <span className="font-mono">{batch.batchNumber}</span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            <div>
                              <label className="block text-[10px] text-gray-500 font-medium">Quantity</label>
                              <input
                                type="number"
                                min="0"
                                value={editQty}
                                onChange={(e) => setEditQty(e.target.value)}
                                className="w-full px-2 py-1 rounded border border-gray-300 font-bold"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] text-gray-500 font-medium">Expiry Date</label>
                              <input
                                type="date"
                                value={editExp}
                                onChange={(e) => setEditExp(e.target.value)}
                                className="w-full px-2 py-1 rounded border border-gray-300"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] text-gray-500 font-medium">Adjustment Reason</label>
                              <input
                                type="text"
                                placeholder="e.g. Audit correction"
                                value={editReason}
                                onChange={(e) => setEditReason(e.target.value)}
                                className="w-full px-2 py-1 rounded border border-gray-300"
                              />
                            </div>
                          </div>
                          <div className="flex items-center justify-end gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => setEditingBatchId(null)}
                              className="px-2.5 py-1 text-xs text-gray-600 hover:bg-gray-200 rounded"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSaveEdit(batch.id)}
                              className="inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold bg-[#087F5B] text-white rounded hover:bg-[#066347]"
                            >
                              <Save className="w-3.5 h-3.5" />
                              <span>Save Adjustment</span>
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-gray-900 text-sm bg-gray-100 px-2 py-0.5 rounded">
                                {batch.batchNumber}
                              </span>

                              {isExpired ? (
                                <Badge variant="critical">Expired ({Math.abs(daysLeft)}d ago)</Badge>
                              ) : isNearExpiry ? (
                                <Badge variant="warning">Expiring in {daysLeft} days</Badge>
                              ) : (
                                <Badge variant="success">Healthy ({daysLeft} days)</Badge>
                              )}
                            </div>

                            <p className="text-gray-500 text-[11px]">
                              Expiry: <span className="font-semibold text-gray-700">{batch.expiryDate}</span>
                              {batch.mfgDate && (
                                <span className="ml-2 text-gray-400">Mfg: {batch.mfgDate}</span>
                              )}
                            </p>
                          </div>

                          <div className="flex items-center gap-3 self-end sm:self-center">
                            <div className="text-right">
                              <span
                                className={`text-sm font-bold font-mono ${
                                  isExpired ? 'text-red-600 line-through' : 'text-gray-900'
                                }`}
                              >
                                {batch.quantity} {medicine.unit}
                              </span>
                              {isExpired && (
                                <span className="block text-[10px] text-red-500 font-semibold">
                                  Unusable
                                </span>
                              )}
                            </div>

                            <button
                              onClick={() => handleStartEdit(batch)}
                              className="p-1.5 rounded-lg text-gray-500 hover:text-[#087F5B] hover:bg-gray-100"
                              title="Edit Batch / Adjust Stock"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          )}
        </div>

        {/* Add New Batch Form */}
        <div className="mt-6 p-4 rounded-xl bg-gray-50/80 border border-gray-200">
          <div className="flex items-center gap-2 mb-3">
            <Plus className="w-4 h-4 text-[#087F5B]" />
            <h4 className="text-xs font-bold text-gray-900">
              Receive New Batch for this Medicine
            </h4>
          </div>

          <form onSubmit={handleAddBatch} className="space-y-3 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  Batch Number *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. B103, BT-772"
                  value={newBatchNumber}
                  onChange={(e) => setNewBatchNumber(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-gray-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-[#087F5B]/30"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  Quantity ({medicine.unit}) *
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  placeholder="e.g. 50"
                  value={newQuantity}
                  onChange={(e) => setNewQuantity(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-gray-300 bg-white font-bold focus:outline-hidden focus:ring-2 focus:ring-[#087F5B]/30"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  Mfg Date (Optional)
                </label>
                <input
                  type="date"
                  value={newMfgDate}
                  onChange={(e) => setNewMfgDate(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-gray-300 bg-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  Expiry Date *
                </label>
                <input
                  type="date"
                  required
                  value={newExpiryDate}
                  onChange={(e) => setNewExpiryDate(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-gray-300 bg-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  Intake Reason
                </label>
                <input
                  type="text"
                  placeholder="e.g. Routine Restock"
                  value={newReason}
                  onChange={(e) => setNewReason(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-gray-300 bg-white"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={isAddingBatch}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#087F5B] hover:bg-[#066347] text-white font-semibold text-xs transition-colors disabled:opacity-50"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{isAddingBatch ? 'Registering...' : 'Register Batch'}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Modal Close */}
        <div className="mt-5 pt-3 border-t border-gray-100 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors text-xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default BatchManagementModal;
