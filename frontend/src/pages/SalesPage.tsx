import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ShoppingCart,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  RefreshCw,
  Plus,
  Trash2,
  Eye,
  X,
  FileText,
  User,
  Calendar,
} from 'lucide-react';
import { apiService } from '../services/api';
import { Medicine, Sale } from '../types';

interface CartLineItem {
  medicineId: string;
  medicineName: string;
  category: string;
  unit: string;
  unitPrice: number;
  availableStock: number;
  quantity: number;
  subtotal: number;
}

export const SalesPage: React.FC = () => {
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Counter cart state (supports multiple medicines per sale)
  const [cartItems, setCartItems] = useState<CartLineItem[]>([]);
  const [customerName, setCustomerName] = useState('Walk-in Customer');

  // Single medicine selection before adding to cart
  const [selectedMedId, setSelectedMedId] = useState<string>('');
  const [selectedQty, setSelectedQty] = useState<number>(1);
  const [medSearchQuery, setMedSearchQuery] = useState('');

  // Sales history filters
  const [historySearch, setHistorySearch] = useState('');
  const [historyDate, setHistoryDate] = useState('');

  // Selected sale for details modal
  const [selectedSaleForDetails, setSelectedSaleForDetails] = useState<Sale | null>(null);

  // Status message
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [medsData, salesData] = await Promise.all([
        apiService.getInventory(),
        apiService.getSales({ search: historySearch || undefined, date: historyDate || undefined }),
      ]);
      setMedicines(medsData);
      setSales(salesData);
    } catch {
      setErrorMessage('Failed to load medicine inventory and sales data.');
    } finally {
      setIsLoading(false);
    }
  }, [historySearch, historyDate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Selected medicine object for the selector
  const activeSelectedMed = useMemo(() => {
    return medicines.find((m) => m.id === selectedMedId) || null;
  }, [medicines, selectedMedId]);

  // Filter available medicines for dropdown
  const filteredMedicineList = useMemo(() => {
    return medicines.filter(
      (m) =>
        m.name.toLowerCase().includes(medSearchQuery.toLowerCase()) ||
        (m.genericName && m.genericName.toLowerCase().includes(medSearchQuery.toLowerCase())) ||
        m.category.toLowerCase().includes(medSearchQuery.toLowerCase())
    );
  }, [medicines, medSearchQuery]);

  // Available stock considering items already placed into cart
  const effectiveAvailableStock = useMemo(() => {
    if (!activeSelectedMed) return 0;
    const inCart = cartItems
      .filter((item) => item.medicineId === activeSelectedMed.id)
      .reduce((sum, it) => sum + it.quantity, 0);
    return Math.max(0, activeSelectedMed.usableStock - inCart);
  }, [activeSelectedMed, cartItems]);

  // Total cart amount
  const cartTotalAmount = useMemo(() => {
    return cartItems.reduce((sum, item) => sum + item.subtotal, 0);
  }, [cartItems]);

  const cartTotalQuantity = useMemo(() => {
    return cartItems.reduce((sum, item) => sum + item.quantity, 0);
  }, [cartItems]);

  // Add line item to cart
  const handleAddToCart = () => {
    if (!activeSelectedMed) {
      setErrorMessage('Please select a medicine first.');
      return;
    }

    if (selectedQty <= 0) {
      setErrorMessage('Quantity must be at least 1.');
      return;
    }

    if (selectedQty > effectiveAvailableStock) {
      setErrorMessage(
        `Cannot add: Only ${effectiveAvailableStock} usable units of "${activeSelectedMed.name}" remain available.`
      );
      return;
    }

    setErrorMessage(null);

    // If medicine already exists in cart, update quantity
    const existingIndex = cartItems.findIndex((it) => it.medicineId === activeSelectedMed.id);
    if (existingIndex > -1) {
      const updated = [...cartItems];
      const newQty = updated[existingIndex].quantity + selectedQty;
      updated[existingIndex].quantity = newQty;
      updated[existingIndex].subtotal = newQty * updated[existingIndex].unitPrice;
      setCartItems(updated);
    } else {
      const price = activeSelectedMed.sellingPrice;
      setCartItems((prev) => [
        ...prev,
        {
          medicineId: activeSelectedMed.id,
          medicineName: activeSelectedMed.name,
          category: activeSelectedMed.category,
          unit: activeSelectedMed.unit,
          unitPrice: price,
          availableStock: activeSelectedMed.usableStock,
          quantity: selectedQty,
          subtotal: selectedQty * price,
        },
      ]);
    }

    // Reset selector
    setSelectedQty(1);
    setSelectedMedId('');
  };

  // Remove line item from cart
  const handleRemoveFromCart = (index: number) => {
    setCartItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  // Confirm and record the multi-item sale
  const handleConfirmSale = async () => {
    if (cartItems.length === 0) {
      setErrorMessage('Cannot record sale: Cart is empty. Add at least one medicine item.');
      return;
    }

    setErrorMessage(null);
    setSuccessMessage(null);
    setIsSubmitting(true);

    try {
      const idempotencyKey = `sale-req-${Date.now()}-${Math.random()}`;
      const payload = {
        customerName: customerName.trim() || 'Walk-in Customer',
        items: cartItems.map((item) => ({
          medicineId: item.medicineId,
          quantity: item.quantity,
        })),
        idempotencyKey,
      };

      const recordedSale = await apiService.createSale(payload);

      setSuccessMessage(
        `Sale Invoice #${recordedSale.saleNumber} recorded successfully! Total: ₹${recordedSale.totalAmount.toFixed(
          2
        )} (${recordedSale.totalQuantity} items). Inventory batches updated via FEFO priority.`
      );

      // Reset cart
      setCartItems([]);
      setCustomerName('Walk-in Customer');

      // Refresh inventory and sales history
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
        year: 'numeric',
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
            Sales & Dispensing Counter
          </h2>
          <p className="text-xs text-pharmacy-text-muted mt-1">
            Multi-item patient billing, instant stock verification, and automatic FEFO batch deductions
          </p>
        </div>

        <button
          onClick={loadData}
          disabled={isLoading}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold transition-colors self-start sm:self-auto cursor-pointer"
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

      {/* Counter POS Grid: Left is Item Selection & Add, Right is Cart Receipt */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Medicine Picker Form */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-gray-200 p-6 shadow-subtle h-fit space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-gray-100">
            <div className="p-2 rounded-lg bg-[#DDF5E9] text-[#087F5B]">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">Add Medicines to Sale</h3>
              <p className="text-[11px] text-gray-500">Pick medicine and allocate quantity</p>
            </div>
          </div>

          {/* Quick search filter for medicines */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Search Medicines by Name or Category
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                type="text"
                placeholder="Type name (e.g. Paracetamol, Amoxicillin)..."
                value={medSearchQuery}
                onChange={(e) => setMedSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[#087F5B]/30"
              />
            </div>
          </div>

          {/* Medicine Selector */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Select Medicine *
            </label>
            <select
              value={selectedMedId}
              onChange={(e) => {
                setSelectedMedId(e.target.value);
                setSelectedQty(1);
                setErrorMessage(null);
              }}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-[#087F5B]/30 focus:border-[#087F5B]"
            >
              <option value="">-- Choose a medicine --</option>
              {filteredMedicineList.map((med) => (
                <option key={med.id} value={med.id} disabled={med.usableStock <= 0}>
                  {med.name} — Usable: {med.usableStock} {med.unit} — ₹{med.sellingPrice.toFixed(2)}
                  {med.usableStock <= 0 ? ' (OUT OF STOCK)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Selected Medicine Status Box */}
          {activeSelectedMed && (
            <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-200 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Usable Shelf Stock:</span>
                <span
                  className={`font-bold font-mono ${
                    effectiveAvailableStock <= activeSelectedMed.minStockLevel
                      ? 'text-amber-600'
                      : 'text-gray-800'
                  }`}
                >
                  {effectiveAvailableStock} {activeSelectedMed.unit}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-gray-500">Unit Selling Price:</span>
                <span className="font-bold font-mono text-[#087F5B]">
                  ₹{activeSelectedMed.sellingPrice.toFixed(2)}
                </span>
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-gray-200 text-gray-500 text-[11px]">
                <span>Active Batches:</span>
                <span className="font-medium text-gray-700">
                  {activeSelectedMed.batches.filter((b) => b.quantity > 0).length} batch(es)
                </span>
              </div>

              {activeSelectedMed.earliestExpiry && (
                <div className="flex items-center gap-1.5 text-[11px] text-[#087F5B] pt-1">
                  <Clock className="w-3.5 h-3.5 shrink-0" />
                  <span>Earliest batch expires on {activeSelectedMed.earliestExpiry} (FEFO)</span>
                </div>
              )}
            </div>
          )}

          {/* Quantity Input & Subtotal */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Quantity ({activeSelectedMed ? activeSelectedMed.unit : 'units'}) *
              </label>
              <input
                type="number"
                min="1"
                max={effectiveAvailableStock || 1}
                disabled={!activeSelectedMed || effectiveAvailableStock <= 0}
                value={selectedQty}
                onChange={(e) => setSelectedQty(Math.max(1, Number(e.target.value)))}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 font-bold text-sm text-gray-800 focus:outline-hidden focus:ring-2 focus:ring-[#087F5B]/30 disabled:bg-gray-100 disabled:text-gray-400"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Subtotal (₹)
              </label>
              <div className="w-full px-3 py-2 rounded-lg bg-gray-50 border border-gray-200 font-mono font-bold text-sm text-gray-800 flex items-center">
                ₹{activeSelectedMed ? (activeSelectedMed.sellingPrice * selectedQty).toFixed(2) : '0.00'}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleAddToCart}
            disabled={!activeSelectedMed || effectiveAvailableStock <= 0}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#087F5B] hover:bg-[#076b4d] text-white text-xs font-bold shadow-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add to Current Sale</span>
          </button>
        </div>

        {/* Right Column: Sale Order Summary / Receipt Cart */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-gray-200 p-6 shadow-subtle flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#087F5B]" />
                <h3 className="text-base font-bold text-gray-900">Current Sale Invoice</h3>
              </div>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#DDF5E9] text-[#087F5B] font-semibold">
                {cartItems.length} {cartItems.length === 1 ? 'item' : 'items'}
              </span>
            </div>

            {/* Customer Name input */}
            <div className="mt-3 flex items-center gap-2">
              <User className="w-4 h-4 text-gray-400 shrink-0" />
              <input
                type="text"
                placeholder="Patient / Customer Name"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full text-xs px-3 py-1.5 border border-gray-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[#087F5B]/30"
              />
            </div>

            {/* Cart Items Table */}
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-gray-100 text-gray-400 font-medium">
                    <th className="py-2">Medicine</th>
                    <th className="py-2 text-right">Price</th>
                    <th className="py-2 text-center">Qty</th>
                    <th className="py-2 text-right">Subtotal</th>
                    <th className="py-2 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {cartItems.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-gray-400">
                        No medicines added to sale yet. Select medicines on the left and click "Add to Current Sale".
                      </td>
                    </tr>
                  ) : (
                    cartItems.map((item, index) => (
                      <tr key={item.medicineId} className="hover:bg-gray-50">
                        <td className="py-2.5 font-semibold text-gray-800">
                          {item.medicineName}
                          <span className="block text-[10px] text-gray-400 font-normal">
                            {item.category} • {item.unit}
                          </span>
                        </td>
                        <td className="py-2.5 text-right font-mono text-gray-600">
                          ₹{item.unitPrice.toFixed(2)}
                        </td>
                        <td className="py-2.5 text-center font-bold text-gray-800">
                          {item.quantity}
                        </td>
                        <td className="py-2.5 text-right font-mono font-bold text-[#087F5B]">
                          ₹{item.subtotal.toFixed(2)}
                        </td>
                        <td className="py-2.5 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveFromCart(index)}
                            className="p-1 rounded-md text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
                            title="Remove item"
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

          {/* Cart Footer Calculation & Confirmation */}
          <div className="pt-4 border-t border-gray-100 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500 font-medium">Total Quantity:</span>
              <span className="font-bold font-mono text-gray-800">{cartTotalQuantity} units</span>
            </div>

            <div className="flex items-center justify-between text-base">
              <span className="font-bold text-gray-900">Total Payable:</span>
              <span className="font-bold font-mono text-xl text-[#087F5B]">
                ₹{cartTotalAmount.toFixed(2)}
              </span>
            </div>

            <button
              type="button"
              onClick={handleConfirmSale}
              disabled={cartItems.length === 0 || isSubmitting}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[#087F5B] hover:bg-[#076b4d] text-white text-sm font-bold shadow-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isSubmitting ? 'Recording & Allocating Stock...' : 'Confirm & Record Sale'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Sales History Section */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-subtle space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100">
          <div>
            <h3 className="text-base font-bold text-gray-900">Sales History & Invoices</h3>
            <p className="text-xs text-gray-500">Review recent transactions and batch allocations</p>
          </div>

          {/* Search & Date Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                type="text"
                placeholder="Search Invoice # or Patient..."
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                className="pl-9 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[#087F5B]/30"
              />
            </div>

            <div className="relative flex items-center">
              <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
              <input
                type="date"
                value={historyDate}
                onChange={(e) => setHistoryDate(e.target.value)}
                className="pl-8 pr-2 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[#087F5B]/30"
              />
              {historyDate && (
                <button
                  onClick={() => setHistoryDate('')}
                  className="ml-1 text-[11px] text-gray-400 hover:text-gray-600"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Sales Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-gray-100 text-gray-400 font-medium">
                <th className="py-2.5 px-3">Sale ID</th>
                <th className="py-2.5 px-3">Date & Time</th>
                <th className="py-2.5 px-3">Customer</th>
                <th className="py-2.5 px-3">Items Sold</th>
                <th className="py-2.5 px-3 text-center">Total Qty</th>
                <th className="py-2.5 px-3 text-right">Total Amount</th>
                <th className="py-2.5 px-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {sales.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-gray-400">
                    No sales recorded matching criteria.
                  </td>
                </tr>
              ) : (
                sales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="py-3 px-3 font-mono font-bold text-gray-900">
                      {sale.saleNumber || sale.id}
                    </td>
                    <td className="py-3 px-3 text-gray-600">
                      {formatSaleDate(sale.createdAt)}
                    </td>
                    <td className="py-3 px-3 text-gray-800 font-medium">
                      {sale.customerName || 'Walk-in Customer'}
                    </td>
                    <td className="py-3 px-3 text-gray-600">
                      {sale.items && sale.items.length > 0 ? (
                        <div className="flex flex-col">
                          <span className="font-semibold text-gray-800">
                            {sale.items[0].medicineName}
                            {sale.items.length > 1 && ` + ${sale.items.length - 1} more`}
                          </span>
                          <span className="text-[10px] text-gray-400">
                            {sale.items.length} {sale.items.length === 1 ? 'item' : 'items'}
                          </span>
                        </div>
                      ) : (
                        <span>{sale.medicineName || 'Medicine'}</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-center font-bold font-mono text-gray-800">
                      {sale.totalQuantity || sale.quantity}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-[#087F5B]">
                      ₹{sale.totalAmount.toFixed(2)}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <button
                        onClick={() => setSelectedSaleForDetails(sale)}
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

      {/* Sale Details Modal */}
      {selectedSaleForDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-xl border border-gray-100 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#087F5B]" />
                <h3 className="font-bold text-gray-900 text-base">
                  Sale Details — {selectedSaleForDetails.saleNumber || selectedSaleForDetails.id}
                </h3>
              </div>
              <button
                onClick={() => setSelectedSaleForDetails(null)}
                className="p-1 rounded-md text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Sale Meta Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3 rounded-xl bg-gray-50 text-xs">
              <div>
                <span className="text-gray-400 block text-[10px] uppercase font-semibold">Customer</span>
                <span className="font-semibold text-gray-800">
                  {selectedSaleForDetails.customerName || 'Walk-in Customer'}
                </span>
              </div>
              <div>
                <span className="text-gray-400 block text-[10px] uppercase font-semibold">Timestamp</span>
                <span className="font-medium text-gray-800">
                  {formatSaleDate(selectedSaleForDetails.createdAt)}
                </span>
              </div>
              <div>
                <span className="text-gray-400 block text-[10px] uppercase font-semibold">Total Paid</span>
                <span className="font-bold font-mono text-[#087F5B]">
                  ₹{selectedSaleForDetails.totalAmount.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Items and Batch Allocations */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider">
                Dispensed Medicines & FEFO Batch Breakdown
              </h4>

              {selectedSaleForDetails.items && selectedSaleForDetails.items.length > 0 ? (
                selectedSaleForDetails.items.map((item, idx) => (
                  <div key={item.id || idx} className="p-3 rounded-xl border border-gray-200 space-y-2 text-xs">
                    <div className="flex items-center justify-between font-bold text-gray-900">
                      <span>{item.medicineName}</span>
                      <span className="font-mono text-[#087F5B]">₹{item.subtotal.toFixed(2)}</span>
                    </div>

                    <div className="flex items-center justify-between text-gray-500 text-[11px]">
                      <span>
                        {item.quantity} {item.unit || 'units'} × ₹{item.unitPrice.toFixed(2)}
                      </span>
                    </div>

                    {/* Batch Allocations */}
                    {item.batchAllocations && item.batchAllocations.length > 0 && (
                      <div className="pt-2 border-t border-gray-100 space-y-1">
                        <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
                          FEFO Batch Allocation:
                        </span>
                        {item.batchAllocations.map((alloc, bIdx) => (
                          <div
                            key={bIdx}
                            className="flex items-center justify-between bg-emerald-50/60 text-[#087F5B] px-2.5 py-1 rounded-md text-[11px]"
                          >
                            <span className="font-medium">
                              Batch <span className="font-mono font-bold">{alloc.batchNumber}</span> (Exp: {alloc.expiryDate})
                            </span>
                            <span className="font-bold">{alloc.quantity} units</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              ) : selectedSaleForDetails.batchesDeducted ? (
                // Backward compatible display
                <div className="p-3 rounded-xl border border-gray-200 space-y-2 text-xs">
                  <div className="flex items-center justify-between font-bold text-gray-900">
                    <span>{selectedSaleForDetails.medicineName}</span>
                    <span className="font-mono text-[#087F5B]">
                      ₹{selectedSaleForDetails.totalAmount.toFixed(2)}
                    </span>
                  </div>
                  <div className="space-y-1">
                    {selectedSaleForDetails.batchesDeducted.map((b, bIdx) => (
                      <div
                        key={bIdx}
                        className="flex items-center justify-between bg-emerald-50/60 text-[#087F5B] px-2.5 py-1 rounded-md text-[11px]"
                      >
                        <span>
                          Batch <span className="font-mono font-bold">{b.batchNumber}</span> (Exp: {b.expiryDate})
                        </span>
                        <span className="font-bold">{b.quantity} units</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="pt-3 border-t border-gray-100 flex justify-end">
              <button
                onClick={() => setSelectedSaleForDetails(null)}
                className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold cursor-pointer"
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

export default SalesPage;
