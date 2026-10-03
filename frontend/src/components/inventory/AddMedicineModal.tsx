import React, { useState } from 'react';
import { X, Plus, AlertCircle } from 'lucide-react';
import { apiService } from '../../services/api';

interface AddMedicineModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const unitOptions = [
  { value: 'tablets', label: 'Tablets' },
  { value: 'strips', label: 'Strips' },
  { value: 'bottles', label: 'Bottles' },
  { value: 'boxes', label: 'Boxes' },
  { value: 'capsules', label: 'Capsules' },
  { value: 'vials', label: 'Vials' },
  { value: 'ampoules', label: 'Ampoules' },
  { value: 'tubes', label: 'Tubes (Ointment)' },
  { value: 'syrups', label: 'Syrups' },
  { value: 'sachets', label: 'Sachets' },
];

export const AddMedicineModal: React.FC<AddMedicineModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [name, setName] = useState('');
  const [genericName, setGenericName] = useState('');
  const [category, setCategory] = useState('');
  const [manufacturer, setManufacturer] = useState('');
  const [description, setDescription] = useState('');
  const [unit, setUnit] = useState('tablets');
  const [minStockLevel, setMinStockLevel] = useState('20');
  const [sellingPrice, setSellingPrice] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');

  // Initial Batch fields
  const [batchNumber, setBatchNumber] = useState('');
  const [quantity, setQuantity] = useState('');
  const [mfgDate, setMfgDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  if (!isOpen) return null;

  const validate = (): boolean => {
    const errors: string[] = [];

    if (!name.trim()) errors.push('Medicine name is required.');
    if (!category.trim()) errors.push('Category is required.');

    const sp = Number(sellingPrice);
    if (!sellingPrice || isNaN(sp) || sp <= 0) {
      errors.push('Selling price must be greater than zero.');
    }

    const minStock = Number(minStockLevel);
    if (minStockLevel === '' || isNaN(minStock) || minStock < 0) {
      errors.push('Minimum stock level must be a non-negative number.');
    }

    if (!batchNumber.trim()) {
      errors.push('Batch number is required for the initial batch.');
    }

    const qty = Number(quantity);
    if (quantity === '' || isNaN(qty) || qty < 0) {
      errors.push('Initial quantity must be a non-negative number.');
    }

    if (!expiryDate) {
      errors.push('Expiry date is required.');
    }

    if (mfgDate && expiryDate) {
      const mfg = new Date(mfgDate);
      const exp = new Date(expiryDate);
      if (exp <= mfg) {
        errors.push('Expiry date must be later than the manufacturing date.');
      }
    }

    setValidationErrors(errors);
    return errors.length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsLoading(true);
    try {
      await apiService.addMedicine({
        name: name.trim(),
        genericName: genericName.trim() || undefined,
        category: category.trim(),
        manufacturer: manufacturer.trim() || undefined,
        description: description.trim() || undefined,
        unit: unit.trim().toLowerCase(),
        minStockLevel: Number(minStockLevel),
        sellingPrice: Number(sellingPrice),
        purchasePrice: purchasePrice ? Number(purchasePrice) : undefined,
        batchNumber: batchNumber.trim(),
        quantity: Number(quantity),
        mfgDate: mfgDate || undefined,
        expiryDate,
      });

      // Reset form
      setName('');
      setGenericName('');
      setCategory('');
      setManufacturer('');
      setDescription('');
      setUnit('tablets');
      setMinStockLevel('20');
      setSellingPrice('');
      setPurchasePrice('');
      setBatchNumber('');
      setQuantity('');
      setMfgDate('');
      setExpiryDate('');
      setValidationErrors([]);

      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to add medicine.';
      setValidationErrors([msg]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-xl border border-gray-100 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-gray-100">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Add New Medicine</h3>
            <p className="text-xs text-pharmacy-text-muted mt-0.5">
              Enter pharmaceutical specifications, pricing, and initial batch details
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Validation Errors Box */}
        {validationErrors.length > 0 && (
          <div className="mt-4 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
            <div className="flex items-center gap-1.5 font-bold mb-1">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>Please fix the following:</span>
            </div>
            <ul className="list-disc pl-5 space-y-0.5">
              {validationErrors.map((err, idx) => (
                <li key={idx}>{err}</li>
              ))}
            </ul>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4 text-xs">
          {/* Section: Basic Information */}
          <div className="space-y-3">
            <h4 className="text-[11px] font-bold text-[#087F5B] uppercase tracking-wider">
              1. Basic Information
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  Medicine Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Paracetamol 500mg Tablets"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-hidden focus:ring-2 focus:ring-[#087F5B]/30 focus:border-[#087F5B]"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  Generic Name (Composition)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Acetaminophen"
                  value={genericName}
                  onChange={(e) => setGenericName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-hidden focus:ring-2 focus:ring-[#087F5B]/30 focus:border-[#087F5B]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  Category *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Analgesics, Antibiotics"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-hidden focus:ring-2 focus:ring-[#087F5B]/30 focus:border-[#087F5B]"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  Manufacturer
                </label>
                <input
                  type="text"
                  placeholder="e.g. Cipla, Sun Pharma"
                  value={manufacturer}
                  onChange={(e) => setManufacturer(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-hidden focus:ring-2 focus:ring-[#087F5B]/30 focus:border-[#087F5B]"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  Unit of Measure *
                </label>
                <select
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white font-medium focus:outline-hidden focus:ring-2 focus:ring-[#087F5B]/30 focus:border-[#087F5B]"
                >
                  {unitOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-gray-700 mb-1">
                Medicine Description / Indications
              </label>
              <textarea
                rows={2}
                placeholder="Optional dosage notes, indications, or storage requirements..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-hidden focus:ring-2 focus:ring-[#087F5B]/30 focus:border-[#087F5B]"
              />
            </div>
          </div>

          {/* Section: Pricing & Inventory Thresholds */}
          <div className="space-y-3 pt-2 border-t border-gray-100">
            <h4 className="text-[11px] font-bold text-[#087F5B] uppercase tracking-wider">
              2. Pricing & Alert Threshold
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  Selling Price (₹) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  placeholder="e.g. 15.00"
                  value={sellingPrice}
                  onChange={(e) => setSellingPrice(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-hidden focus:ring-2 focus:ring-[#087F5B]/30 focus:border-[#087F5B]"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  Purchase Price (₹)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="e.g. 9.50"
                  value={purchasePrice}
                  onChange={(e) => setPurchasePrice(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-hidden focus:ring-2 focus:ring-[#087F5B]/30 focus:border-[#087F5B]"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  Min. Stock Level *
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  placeholder="e.g. 20"
                  value={minStockLevel}
                  onChange={(e) => setMinStockLevel(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-hidden focus:ring-2 focus:ring-[#087F5B]/30 focus:border-[#087F5B]"
                />
                <span className="text-[10px] text-gray-400">Triggers low stock alert</span>
              </div>
            </div>
          </div>

          {/* Section: Initial Batch Stock */}
          <div className="space-y-3 pt-2 border-t border-gray-100 bg-[#F7F9F8] p-3.5 rounded-xl border border-gray-200">
            <h4 className="text-[11px] font-bold text-gray-800 uppercase tracking-wider">
              3. Initial Batch Receipt Details
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  Batch Number *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. B101, BT-502"
                  value={batchNumber}
                  onChange={(e) => setBatchNumber(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-[#087F5B]/30 focus:border-[#087F5B]"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  Received Quantity ({unit}) *
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  placeholder="e.g. 100"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white font-bold focus:outline-hidden focus:ring-2 focus:ring-[#087F5B]/30 focus:border-[#087F5B]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  Manufacturing Date (Mfg)
                </label>
                <input
                  type="date"
                  value={mfgDate}
                  onChange={(e) => setMfgDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-[#087F5B]/30 focus:border-[#087F5B]"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  Expiration Date (Exp) *
                </label>
                <input
                  type="date"
                  required
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-[#087F5B]/30 focus:border-[#087F5B]"
                />
              </div>
            </div>
          </div>

          {/* Form Action Buttons */}
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
              <span>{isLoading ? 'Adding Medicine...' : 'Add Medicine to Inventory'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddMedicineModal;
