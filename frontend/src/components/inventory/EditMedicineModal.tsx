import React, { useState, useEffect } from 'react';
import { X, Save, AlertCircle, Plus, Trash2 } from 'lucide-react';
import { Medicine, MedicineBatch } from '../../types';
import { apiService } from '../../services/api';

interface EditMedicineModalProps {
  medicine: Medicine | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const EditMedicineModal: React.FC<EditMedicineModalProps> = ({
  medicine,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [price, setPrice] = useState('');
  const [minStock, setMinStock] = useState('20');
  const [batches, setBatches] = useState<MedicineBatch[]>([]);

  // New batch row state
  const [newBatchNumber, setNewBatchNumber] = useState('');
  const [newBatchQty, setNewBatchQty] = useState('');
  const [newBatchExp, setNewBatchExp] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (medicine) {
      setName(medicine.name);
      setCategory(medicine.category);
      setPrice(medicine.price.toString());
      setMinStock(medicine.minStock.toString());
      setBatches(medicine.batches ? [...medicine.batches] : []);
      setError(null);
    }
  }, [medicine]);

  if (!isOpen || !medicine) return null;

  const handleAddBatch = () => {
    if (!newBatchQty || Number(newBatchQty) <= 0 || !newBatchExp) {
      setError('Please provide batch quantity and expiration date.');
      return;
    }

    const batch: MedicineBatch = {
      batchNumber: newBatchNumber.trim() || `BT-${Math.floor(100 + Math.random() * 900)}`,
      quantity: Number(newBatchQty),
      expiryDate: newBatchExp,
    };

    setBatches([...batches, batch]);
    setNewBatchNumber('');
    setNewBatchQty('');
    setNewBatchExp('');
    setError(null);
  };

  const handleRemoveBatch = (index: number) => {
    setBatches(batches.filter((_, i) => i !== index));
  };

  const handleBatchQuantityChange = (index: number, qty: number) => {
    const updated = [...batches];
    updated[index].quantity = Math.max(0, qty);
    setBatches(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Medicine name is required.');
      return;
    }
    if (!price || Number(price) <= 0) {
      setError('Please enter a valid selling price.');
      return;
    }

    setIsLoading(true);
    try {
      await apiService.updateMedicine(medicine.id, {
        name: name.trim(),
        category: category.trim(),
        price: Number(price),
        minStock: Number(minStock),
        batches,
      });

      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update medicine.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-gray-100 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-gray-100">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Edit Medicine Details</h3>
            <p className="text-xs text-pharmacy-text-muted mt-0.5">
              Update pricing, minimum alert thresholds, or batch quantities
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-lg bg-red-50 border border-red-200 flex items-center gap-2 text-xs text-red-700">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-gray-700 mb-1">
              Medicine Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-hidden focus:ring-2 focus:ring-[#087F5B]/30 focus:border-[#087F5B]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-gray-700 mb-1">
                Category
              </label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-hidden focus:ring-2 focus:ring-[#087F5B]/30 focus:border-[#087F5B]"
              />
            </div>

            <div>
              <label className="block font-semibold text-gray-700 mb-1">
                Selling Price (₹) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-hidden focus:ring-2 focus:ring-[#087F5B]/30 focus:border-[#087F5B]"
              />
            </div>

            <div>
              <label className="block font-semibold text-gray-700 mb-1">
                Min Stock Alert *
              </label>
              <input
                type="number"
                min="0"
                required
                value={minStock}
                onChange={(e) => setMinStock(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-hidden focus:ring-2 focus:ring-[#087F5B]/30 focus:border-[#087F5B]"
              />
            </div>
          </div>

          {/* Batches Section */}
          <div className="pt-2 border-t border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <label className="font-semibold text-gray-800">
                Tracked Batches & Expiry Dates
              </label>
              <span className="text-[11px] text-gray-500">
                Total Stock: {batches.reduce((sum, b) => sum + b.quantity, 0)} units
              </span>
            </div>

            <div className="space-y-2 mb-3 max-h-40 overflow-y-auto">
              {batches.map((batch, index) => (
                <div
                  key={`${batch.batchNumber}-${index}`}
                  className="flex items-center justify-between gap-2 p-2 bg-gray-50 rounded-lg border border-gray-200"
                >
                  <div className="min-w-0 flex-1">
                    <span className="font-mono font-semibold text-gray-800">
                      {batch.batchNumber}
                    </span>
                    <span className="text-gray-500 ml-2">Exp: {batch.expiryDate}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      value={batch.quantity}
                      onChange={(e) => handleBatchQuantityChange(index, Number(e.target.value))}
                      className="w-20 px-2 py-1 rounded border border-gray-300 text-center font-bold"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveBatch(index)}
                      className="p-1 text-red-500 hover:text-red-700"
                      title="Remove Batch"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Add another batch row */}
            <div className="p-3 bg-gray-50/70 border border-dashed border-gray-300 rounded-lg space-y-2">
              <p className="text-[11px] font-semibold text-gray-600">Add Another Batch to Inventory</p>
              <div className="grid grid-cols-3 gap-2">
                <input
                  type="text"
                  placeholder="Batch No."
                  value={newBatchNumber}
                  onChange={(e) => setNewBatchNumber(e.target.value)}
                  className="px-2 py-1 bg-white rounded border border-gray-300"
                />
                <input
                  type="number"
                  placeholder="Qty"
                  min="1"
                  value={newBatchQty}
                  onChange={(e) => setNewBatchQty(e.target.value)}
                  className="px-2 py-1 bg-white rounded border border-gray-300"
                />
                <input
                  type="date"
                  value={newBatchExp}
                  onChange={(e) => setNewBatchExp(e.target.value)}
                  className="px-2 py-1 bg-white rounded border border-gray-300"
                />
              </div>
              <button
                type="button"
                onClick={handleAddBatch}
                className="w-full py-1.5 rounded bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold flex items-center justify-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Append Batch</span>
              </button>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-[#087F5B] hover:bg-[#066347] text-white font-semibold transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{isLoading ? 'Saving Changes...' : 'Save Changes'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditMedicineModal;
