import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ShoppingBag,
  Plus,
  Eye,
  X,
  Calendar,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Truck,
  Trash2,
  FileText,
  Boxes,
} from 'lucide-react';
import { apiService } from '../services/api';
import { Purchase, Supplier, Medicine, PurchaseItemInput } from '../types';

interface NewPurchaseItemDraft extends PurchaseItemInput {
  medicineName: string;
  unit: string;
  subtotal: number;
}

export const PurchasesPage: React.FC = () => {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [filterSupplierId, setFilterSupplierId] = useState('');
  const [filterDate, setFilterDate] = useState('');

  // Modals
  const [isNewPurchaseModalOpen, setIsNewPurchaseModalOpen] = useState(false);
  const [selectedPurchaseDetails, setSelectedPurchaseDetails] = useState<Purchase | null>(null);

  // New Purchase Form state
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [purchaseNotes, setPurchaseNotes] = useState('');
  const [draftItems, setDraftItems] = useState<NewPurchaseItemDraft[]>([]);

  // Item entry line
  const [itemMedicineId, setItemMedicineId] = useState('');
  const [itemBatchNumber, setItemBatchNumber] = useState('');
  const [itemQuantity, setItemQuantity] = useState<number>(10);
  const [itemPurchasePrice, setItemPurchasePrice] = useState<number>(0);
  const [itemMfgDate, setItemMfgDate] = useState('');
  const [itemExpiryDate, setItemExpiryDate] = useState('');

  // Feedback states
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [itemFormError, setItemFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [purchasesData, suppliersData, medsData] = await Promise.all([
        apiService.getPurchases({
          supplierId: filterSupplierId || undefined,
          date: filterDate || undefined,
        }),
        apiService.getSuppliers(),
        apiService.getInventory(),
      ]);
      setPurchases(purchasesData);
      setSuppliers(suppliersData);
      setMedicines(medsData);
    } catch {
      setErrorMessage('Failed to load purchases data.');
    } finally {
      setIsLoading(false);
    }
  }, [filterSupplierId, filterDate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Selected medicine for line item
  const selectedMedForLine = useMemo(() => {
    return medicines.find((m) => m.id === itemMedicineId) || null;
  }, [medicines, itemMedicineId]);

  // Total draft purchase amount
  const draftTotalAmount = useMemo(() => {
    return draftItems.reduce((sum, item) => sum + item.subtotal, 0);
  }, [draftItems]);

  const draftTotalQuantity = useMemo(() => {
    return draftItems.reduce((sum, item) => sum + item.quantity, 0);
  }, [draftItems]);

  // Open modal
  const handleOpenNewPurchase = () => {
    setSelectedSupplierId('');
    setPurchaseNotes('');
    setDraftItems([]);
    setItemMedicineId('');
    setItemBatchNumber('');
    setItemQuantity(10);
    setItemPurchasePrice(0);
    setItemMfgDate('');
    setItemExpiryDate('');
    setItemFormError(null);
    setErrorMessage(null);
    setIsNewPurchaseModalOpen(true);
  };

  // Medicine selection in line item form automatically suggests previous purchase price
  const handleSelectMedicineForLine = (medId: string) => {
    setItemMedicineId(medId);
    setItemFormError(null);
    const med = medicines.find((m) => m.id === medId);
    if (med) {
      if (med.purchasePrice) {
        setItemPurchasePrice(med.purchasePrice);
      }
    }
  };

  // Add line item to draft purchase
  const handleAddLineItem = () => {
    setItemFormError(null);
    if (!selectedMedForLine) {
      setItemFormError('Please select a medicine.');
      return;
    }
    if (!itemBatchNumber.trim()) {
      setItemFormError('Batch number is required.');
      return;
    }
    if (itemQuantity <= 0 || !Number.isInteger(itemQuantity)) {
      setItemFormError('Quantity must be a positive whole number.');
      return;
    }
    if (itemPurchasePrice < 0) {
      setItemFormError('Purchase price must be non-negative.');
      return;
    }
    if (!itemExpiryDate) {
      setItemFormError('Expiry date is required.');
      return;
    }
    if (itemMfgDate && new Date(itemExpiryDate) <= new Date(itemMfgDate)) {
      setItemFormError('Expiry date must be later than the manufacturing date.');
      return;
    }

    // Check for conflicting batch information within medicine's existing batches
    const existingBatch = selectedMedForLine.batches.find(
      (b) => b.batchNumber.toLowerCase() === itemBatchNumber.trim().toLowerCase()
    );
    if (existingBatch && existingBatch.expiryDate !== itemExpiryDate) {
      setItemFormError(
        `Conflicting batch: Batch "${itemBatchNumber}" already exists with expiry date ${existingBatch.expiryDate}. Cannot merge incoming batch with conflicting expiry date ${itemExpiryDate}. Assign a distinct batch number or adjust expiry date.`
      );
      return;
    }

    // Check if already added to this draft with conflicting details
    const inDraft = draftItems.find(
      (it) =>
        it.medicineId === selectedMedForLine.id &&
        it.batchNumber.toLowerCase() === itemBatchNumber.trim().toLowerCase()
    );
    if (inDraft && inDraft.expiryDate !== itemExpiryDate) {
      setItemFormError(
        `Batch "${itemBatchNumber}" is already in this purchase draft with a different expiry date (${inDraft.expiryDate}).`
      );
      return;
    }

    const subtotal = itemQuantity * itemPurchasePrice;
    setDraftItems((prev) => [
      ...prev,
      {
        medicineId: selectedMedForLine.id,
        medicineName: selectedMedForLine.name,
        unit: selectedMedForLine.unit,
        batchNumber: itemBatchNumber.trim().toUpperCase(),
        quantity: itemQuantity,
        purchasePrice: itemPurchasePrice,
        subtotal,
        expiryDate: itemExpiryDate,
        mfgDate: itemMfgDate || undefined,
      },
    ]);

    // Reset line item inputs
    setItemMedicineId('');
    setItemBatchNumber('');
    setItemQuantity(10);
    setItemPurchasePrice(0);
    setItemMfgDate('');
    setItemExpiryDate('');
  };

  const handleRemoveDraftItem = (index: number) => {
    setDraftItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  // Submit complete purchase order
  const handleConfirmPurchase = async () => {
    if (!selectedSupplierId) {
      setErrorMessage('Please select a supplier.');
      return;
    }
    if (draftItems.length === 0) {
      setErrorMessage('Please add at least one medicine item to the purchase order.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const payload = {
        supplierId: selectedSupplierId,
        notes: purchaseNotes.trim() || undefined,
        items: draftItems.map((item) => ({
          medicineId: item.medicineId,
          batchNumber: item.batchNumber,
          quantity: item.quantity,
          purchasePrice: item.purchasePrice,
          expiryDate: item.expiryDate,
          mfgDate: item.mfgDate,
        })),
      };

      const result = await apiService.createPurchase(payload);
      setSuccessMessage(
        `Purchase Order #${result.purchaseNumber} recorded! Added ${result.totalQuantity} units to inventory stock across ${result.items.length} item(s).`
      );
      setIsNewPurchaseModalOpen(false);
      loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to record purchase.';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatPurchaseDate = (isoString: string): string => {
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
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
            Purchase Orders & Stock Intake
          </h2>
          <p className="text-xs text-pharmacy-text-muted mt-1">
            Receive incoming medicine batches from suppliers, record wholesale costs, and update stock
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            disabled={isLoading}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={handleOpenNewPurchase}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#087F5B] hover:bg-[#076b4d] text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Record New Purchase</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {successMessage && (
        <div className="p-4 rounded-xl bg-[#DDF5E9] border border-[#087F5B]/30 flex items-start gap-3 text-xs text-[#087F5B]">
          <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="flex-1 font-medium">{successMessage}</div>
          <button onClick={() => setSuccessMessage(null)} className="text-gray-400 hover:text-gray-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 flex items-start gap-3 text-xs text-red-700">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="flex-1 font-medium">{errorMessage}</div>
          <button onClick={() => setErrorMessage(null)} className="text-gray-400 hover:text-gray-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-subtle flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Supplier Filter */}
          <div className="flex items-center gap-2">
            <Truck className="w-4 h-4 text-gray-400" />
            <select
              value={filterSupplierId}
              onChange={(e) => setFilterSupplierId(e.target.value)}
              className="text-xs px-3 py-1.5 border border-gray-200 rounded-lg bg-gray-50 focus:outline-hidden focus:ring-2 focus:ring-[#087F5B]/30"
            >
              <option value="">All Suppliers</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Date Filter */}
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-400" />
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="text-xs px-3 py-1.5 border border-gray-200 rounded-lg bg-gray-50 focus:outline-hidden focus:ring-2 focus:ring-[#087F5B]/30"
            />
            {filterDate && (
              <button
                onClick={() => setFilterDate('')}
                className="text-[11px] text-gray-400 hover:text-gray-600 underline"
              >
                Reset Date
              </button>
            )}
          </div>
        </div>

        <span className="text-xs font-semibold text-gray-500">
          {purchases.length} {purchases.length === 1 ? 'Purchase Order' : 'Purchase Orders'}
        </span>
      </div>

      {/* Purchases Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-subtle overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/70 text-gray-400 font-semibold uppercase tracking-wider">
                <th className="py-3 px-4">Purchase ID</th>
                <th className="py-3 px-4">Supplier</th>
                <th className="py-3 px-4">Purchase Date</th>
                <th className="py-3 px-4 text-center">Items</th>
                <th className="py-3 px-4 text-center">Total Quantity</th>
                <th className="py-3 px-4 text-right">Total Amount</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {purchases.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-gray-400">
                    No purchase orders found matching criteria. Click "Record New Purchase" to receive stock.
                  </td>
                </tr>
              ) : (
                purchases.map((po) => (
                  <tr key={po.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-gray-900">
                      {po.purchaseNumber || po.id}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-gray-800">
                      <div className="flex items-center gap-1.5">
                        <Truck className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        <span>{po.supplierName}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-gray-600">
                      {formatPurchaseDate(po.createdAt)}
                    </td>
                    <td className="py-3.5 px-4 text-center font-medium text-gray-700">
                      {po.items.length} {po.items.length === 1 ? 'item' : 'items'}
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold font-mono text-gray-900">
                      {po.totalQuantity} units
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-[#087F5B]">
                      ₹{po.totalAmount.toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={() => setSelectedPurchaseDetails(po)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-[#DDF5E9] hover:text-[#087F5B] text-gray-600 text-xs font-semibold transition-colors cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Details</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record New Purchase Modal */}
      {isNewPurchaseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-xl border border-gray-100 space-y-4 max-h-[92vh] overflow-y-auto text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-[#087F5B]" />
                <div>
                  <h3 className="font-bold text-gray-900 text-base">Record Purchase & Stock Intake</h3>
                  <p className="text-[11px] text-gray-500">
                    Create new batches or replenish stock from supplier
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsNewPurchaseModalOpen(false)}
                className="p-1 rounded-md text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Supplier Selector */}
            <div>
              <label className="block font-semibold text-gray-700 mb-1">
                Select Supplier / Distributor *
              </label>
              <select
                required
                value={selectedSupplierId}
                onChange={(e) => setSelectedSupplierId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white font-medium focus:outline-hidden focus:ring-2 focus:ring-[#087F5B]/30"
              >
                <option value="">-- Choose registered supplier --</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.phone})
                  </option>
                ))}
              </select>
            </div>

            {/* Line Item Entry Box */}
            <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 space-y-3">
              <h4 className="font-bold text-gray-800 text-[11px] uppercase tracking-wider flex items-center gap-1">
                <Boxes className="w-3.5 h-3.5 text-[#087F5B]" />
                <span>Add Medicine Batch Line</span>
              </h4>

              {itemFormError && (
                <div className="p-2 rounded-lg bg-red-50 border border-red-200 text-red-700 text-[11px] flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{itemFormError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Medicine *</label>
                  <select
                    value={itemMedicineId}
                    onChange={(e) => handleSelectMedicineForLine(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-gray-300 bg-white text-xs font-medium"
                  >
                    <option value="">-- Choose medicine --</option>
                    {medicines.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.unit})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">
                    Batch Number *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. PCM-B103"
                    value={itemBatchNumber}
                    onChange={(e) => setItemBatchNumber(e.target.value.toUpperCase())}
                    className="w-full px-3 py-1.5 rounded-lg border border-gray-300 font-mono text-xs uppercase"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Quantity *</label>
                  <input
                    type="number"
                    min="1"
                    value={itemQuantity}
                    onChange={(e) => setItemQuantity(Math.max(1, Number(e.target.value)))}
                    className="w-full px-3 py-1.5 rounded-lg border border-gray-300 font-mono text-xs"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">
                    Unit Purchase Price (₹) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={itemPurchasePrice}
                    onChange={(e) => setItemPurchasePrice(Math.max(0, Number(e.target.value)))}
                    className="w-full px-3 py-1.5 rounded-lg border border-gray-300 font-mono text-xs"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Mfg Date</label>
                  <input
                    type="date"
                    value={itemMfgDate}
                    onChange={(e) => setItemMfgDate(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-gray-300 text-xs"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Expiry Date *</label>
                  <input
                    type="date"
                    required
                    value={itemExpiryDate}
                    onChange={(e) => setItemExpiryDate(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-gray-300 text-xs"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleAddLineItem}
                  className="px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-900 text-white font-semibold text-xs flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Line to Purchase</span>
                </button>
              </div>
            </div>

            {/* Purchase Items List Table */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-gray-800 uppercase tracking-wide text-[11px]">
                  Purchase Order Line Items ({draftItems.length})
                </span>
                <span className="text-gray-500 font-medium">
                  Total Units: <strong className="text-gray-900">{draftTotalQuantity}</strong>
                </span>
              </div>

              <div className="overflow-x-auto border border-gray-200 rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200 text-gray-500">
                      <th className="py-2 px-3">Medicine</th>
                      <th className="py-2 px-3">Batch</th>
                      <th className="py-2 px-3">Expiry</th>
                      <th className="py-2 px-3 text-center">Qty</th>
                      <th className="py-2 px-3 text-right">Price</th>
                      <th className="py-2 px-3 text-right">Subtotal</th>
                      <th className="py-2 px-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {draftItems.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-6 text-center text-gray-400">
                          No medicine lines added yet. Fill out the box above and click "Add Line to Purchase".
                        </td>
                      </tr>
                    ) : (
                      draftItems.map((item, index) => (
                        <tr key={index} className="hover:bg-gray-50/60">
                          <td className="py-2.5 px-3 font-semibold text-gray-800">
                            {item.medicineName}
                            <span className="block text-[10px] text-gray-400">{item.unit}</span>
                          </td>
                          <td className="py-2.5 px-3 font-mono font-bold text-gray-700">
                            {item.batchNumber}
                          </td>
                          <td className="py-2.5 px-3 text-gray-600">{item.expiryDate}</td>
                          <td className="py-2.5 px-3 text-center font-bold">{item.quantity}</td>
                          <td className="py-2.5 px-3 text-right font-mono">
                            ₹{item.purchasePrice.toFixed(2)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-[#087F5B]">
                            ₹{item.subtotal.toFixed(2)}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveDraftItem(index)}
                              className="p-1 rounded-md text-red-500 hover:bg-red-50 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block font-semibold text-gray-700 mb-1">
                Purchase Order Notes / Invoice Reference
              </label>
              <textarea
                rows={2}
                placeholder="Optional supplier invoice number, payment terms, or delivery notes..."
                value={purchaseNotes}
                onChange={(e) => setPurchaseNotes(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border border-gray-300 focus:outline-hidden focus:ring-2 focus:ring-[#087F5B]/30"
              />
            </div>

            {/* Footer Calculation & Submission */}
            <div className="pt-3 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-gray-500 text-xs block">Total Purchase Value:</span>
                <span className="font-bold font-mono text-xl text-[#087F5B]">
                  ₹{draftTotalAmount.toFixed(2)}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsNewPurchaseModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmPurchase}
                  disabled={draftItems.length === 0 || !selectedSupplierId || isSubmitting}
                  className="px-5 py-2 rounded-xl bg-[#087F5B] hover:bg-[#076b4d] text-white font-bold cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Recording Purchase...' : 'Confirm & Inward Stock'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Purchase Details Modal */}
      {selectedPurchaseDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-xl border border-gray-100 space-y-4 max-h-[90vh] overflow-y-auto text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#087F5B]" />
                <h3 className="font-bold text-gray-900 text-base">
                  Purchase Order — {selectedPurchaseDetails.purchaseNumber || selectedPurchaseDetails.id}
                </h3>
              </div>
              <button
                onClick={() => setSelectedPurchaseDetails(null)}
                className="p-1 rounded-md text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Summary card */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-xl bg-gray-50 border border-gray-200">
              <div>
                <span className="text-[10px] text-gray-400 uppercase font-semibold block">Supplier</span>
                <span className="font-bold text-gray-800">{selectedPurchaseDetails.supplierName}</span>
              </div>
              <div>
                <span className="text-[10px] text-gray-400 uppercase font-semibold block">Date</span>
                <span className="font-medium text-gray-800">
                  {formatPurchaseDate(selectedPurchaseDetails.createdAt)}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-gray-400 uppercase font-semibold block">Total Stock</span>
                <span className="font-bold font-mono text-gray-800">
                  {selectedPurchaseDetails.totalQuantity} units
                </span>
              </div>
              <div>
                <span className="text-[10px] text-gray-400 uppercase font-semibold block">Total Inward Cost</span>
                <span className="font-bold font-mono text-[#087F5B]">
                  ₹{selectedPurchaseDetails.totalAmount.toFixed(2)}
                </span>
              </div>
            </div>

            {selectedPurchaseDetails.notes && (
              <div className="p-3 rounded-lg bg-gray-50 border border-gray-200 text-gray-700">
                <span className="font-semibold text-gray-900 block mb-0.5">Notes:</span>
                <p>{selectedPurchaseDetails.notes}</p>
              </div>
            )}

            {/* Inward Items Breakdown */}
            <div className="space-y-2">
              <h4 className="font-bold text-gray-900 uppercase tracking-wider text-[11px]">
                Received Medicines & Batches
              </h4>

              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-gray-50 text-gray-400 border-b border-gray-200">
                      <th className="py-2 px-3">Medicine</th>
                      <th className="py-2 px-3">Batch Number</th>
                      <th className="py-2 px-3">Expiry Date</th>
                      <th className="py-2 px-3 text-center">Quantity</th>
                      <th className="py-2 px-3 text-right">Unit Price</th>
                      <th className="py-2 px-3 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {selectedPurchaseDetails.items.map((it) => (
                      <tr key={it.id} className="hover:bg-gray-50/60">
                        <td className="py-2 px-3 font-semibold text-gray-800">{it.medicineName}</td>
                        <td className="py-2 px-3 font-mono font-bold text-gray-700">{it.batchNumber}</td>
                        <td className="py-2 px-3 text-gray-600">{it.expiryDate}</td>
                        <td className="py-2 px-3 text-center font-bold">{it.quantity}</td>
                        <td className="py-2 px-3 text-right font-mono">₹{it.purchasePrice.toFixed(2)}</td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-[#087F5B]">
                          ₹{it.subtotal.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="pt-3 border-t border-gray-100 flex justify-end">
              <button
                onClick={() => setSelectedPurchaseDetails(null)}
                className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PurchasesPage;
