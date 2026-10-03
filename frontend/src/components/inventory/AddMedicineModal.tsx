import React, { useState } from 'react';
import { X, Plus, AlertCircle } from 'lucide-react';
import { apiService } from '../../services/api';

interface AddMedicineModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const AddMedicineModal: React.FC<AddMedicineModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [price, setPrice] = useState('');
  const [minStock, setMinStock] = useState('20');
  const [batchNumber, setBatchNumber] = useState('');
  const [quantity, setQuantity] = useState('');
  const [expiryDate, setExpiryDate] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

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
    if (!minStock || Number(minStock) < 0) {
      setError('Please enter a valid minimum stock threshold.');
      return;
    }
    if (!quantity || Number(quantity) <= 0) {
      setError('Please enter the initial quantity in stock.');
      return;
    }
    if (!expiryDate) {
      setError('Please select an expiration date.');
      return;
    }

    setIsLoading(true);
    try {
      await apiService.addMedicine({
        name: name.trim(),
        category: category.trim() || 'General',
        price: Number(price),
        minStock: Number(minStock),
        batchNumber: batchNumber.trim() || `BT-${Math.floor(100 + Math.random() * 900)}`,
        quantity: Number(quantity),
        expiryDate,
      });

      // Reset form
      setName('');
      setCategory('');
      setPrice('');
      setMinStock('20');
      setBatchNumber('');
      setQuantity('');
      setExpiryDate('');

      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to add medicine.';
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
            <h3 className="text-lg font-bold text-gray-900">Add New Medicine</h3>
            <p className="text-xs text-pharmacy-text-muted mt-0.5">
              Enter medicine specifications and initial batch details
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
              placeholder="e.g. Paracetamol 500mg, Amoxicillin 250mg"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-hidden focus:ring-2 focus:ring-[#087F5B]/30 focus:border-[#087F5B]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-gray-700 mb-1">
                Category
              </label>
              <input
                type="text"
                placeholder="e.g. Analgesics, Antibiotics, Antacids"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-hidden focus:ring-2 focus:ring-[#087F5B]/30 focus:border-[#087F5B]"
              />
            </div>

            <div>
              <label className="block font-semibold text-gray-700 mb-1">
                Selling Price (₹ per unit) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                placeholder="e.g. 15.00"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-hidden focus:ring-2 focus:ring-[#087F5B]/30 focus:border-[#087F5B]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-gray-700 mb-1">
                Min. Stock Alert Threshold *
              </label>
              <input
                type="number"
                min="1"
                required
                placeholder="e.g. 20"
                value={minStock}
                onChange={(e) => setMinStock(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-hidden focus:ring-2 focus:ring-[#087F5B]/30 focus:border-[#087F5B]"
              />
              <span className="text-[10px] text-gray-400">Triggers low-stock warning</span>
            </div>

            <div>
              <label className="block font-semibold text-gray-700 mb-1">
                Initial Batch Number
              </label>
              <input
                type="text"
                placeholder="e.g. BT-801 (Auto if empty)"
                value={batchNumber}
                onChange={(e) => setBatchNumber(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-hidden focus:ring-2 focus:ring-[#087F5B]/30 focus:border-[#087F5B]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-gray-700 mb-1">
                Initial Stock Quantity *
              </label>
              <input
                type="number"
                min="1"
                required
                placeholder="e.g. 50"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-hidden focus:ring-2 focus:ring-[#087F5B]/30 focus:border-[#087F5B]"
              />
            </div>

            <div>
              <label className="block font-semibold text-gray-700 mb-1">
                Expiry Date *
              </label>
              <input
                type="date"
                required
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-hidden focus:ring-2 focus:ring-[#087F5B]/30 focus:border-[#087F5B]"
              />
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
              <Plus className="w-4 h-4" />
              <span>{isLoading ? 'Saving...' : 'Add Medicine'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddMedicineModal;
