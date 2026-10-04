import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Truck,
  Plus,
  Search,
  Edit2,
  Trash2,
  Eye,
  X,
  Phone,
  Mail,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  ShoppingBag,
  MapPin,
  Star,
  Zap,
  Clock,
  Layers,
  SlidersHorizontal,
  ChevronRight,
  Building2,
} from 'lucide-react';
import { apiService } from '../services/api';
import { Supplier, Purchase } from '../types';

export const SuppliersPage: React.FC = () => {
  const navigate = useNavigate();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Active View Tab: 'directory' | 'comparison'
  const [activeTab, setActiveTab] = useState<'directory' | 'comparison'>('directory');

  // Filters
  const [cityFilter, setCityFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'Active' | 'Inactive'>('all');

  // Modals state
  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [detailsSupplier, setDetailsSupplier] = useState<(Supplier & { purchases?: Purchase[] }) | null>(null);
  const [deleteConfirmSupplier, setDeleteConfirmSupplier] = useState<Supplier | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    contactPerson: '',
    phone: '',
    email: '',
    address: '',
    city: 'Hyderabad',
    district: 'Hyderabad',
    pincode: '500001',
    deliveryTime: '24-48 Hours',
    paymentTerms: 'Net 30 Days',
    minOrderAmount: 3000,
    status: 'Active' as 'Active' | 'Inactive',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Status feedback
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadSuppliers = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await apiService.getSuppliers(searchQuery || undefined);
      setSuppliers(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load suppliers.';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    loadSuppliers();
  }, [loadSuppliers]);

  // Derived unique cities & categories for filter chips
  const telanganaCities = useMemo(() => {
    const set = new Set<string>();
    suppliers.forEach((s) => {
      if (s.city) set.add(s.city);
    });
    return Array.from(set).sort();
  }, [suppliers]);

  const allProductCategories = useMemo(() => {
    const set = new Set<string>();
    suppliers.forEach((s) => {
      if (s.productCategories && Array.isArray(s.productCategories)) {
        s.productCategories.forEach((c) => set.add(c));
      }
    });
    return Array.from(set).sort();
  }, [suppliers]);

  // Filtered Suppliers list
  const filteredSuppliers = useMemo(() => {
    return suppliers.filter((s) => {
      if (cityFilter !== 'all' && s.city !== cityFilter) return false;
      if (statusFilter !== 'all' && s.status !== statusFilter) return false;
      if (categoryFilter !== 'all') {
        const cats = s.productCategories || [];
        if (!cats.some((c) => c.toLowerCase().includes(categoryFilter.toLowerCase()))) return false;
      }
      return true;
    });
  }, [suppliers, cityFilter, statusFilter, categoryFilter]);

  // Key comparison benchmarks
  const comparisonList = useMemo(() => {
    return filteredSuppliers.map((s) => {
      const isLowestMinOrder = s.minOrderAmount ? s.minOrderAmount <= 2000 : false;
      const isFastest = s.deliveryTime?.toLowerCase().includes('same day') || s.deliveryTime?.includes('24');
      return {
        ...s,
        isLowestMinOrder,
        isFastest,
      };
    });
  }, [filteredSuppliers]);

  // Total summary metrics
  const totalVendors = suppliers.length;
  const activeVendors = suppliers.filter((s) => s.status === 'Active' || s.status === undefined).length;
  const totalPurchasesAmt = suppliers.reduce((sum, s) => sum + (s.totalPurchases || 0), 0);

  // Open Add Modal
  const handleOpenAdd = () => {
    setEditingSupplier(null);
    setFormData({
      name: '',
      contactPerson: '',
      phone: '',
      email: '',
      address: '',
      city: 'Hyderabad',
      district: 'Hyderabad',
      pincode: '500001',
      deliveryTime: '24-48 Hours',
      paymentTerms: 'Net 30 Days',
      minOrderAmount: 3000,
      status: 'Active',
    });
    setFormErrors({});
    setIsAddEditModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (supp: Supplier) => {
    setEditingSupplier(supp);
    setFormData({
      name: supp.name,
      contactPerson: supp.contactPerson || '',
      phone: supp.phone,
      email: supp.email || '',
      address: supp.address || '',
      city: supp.city || 'Hyderabad',
      district: supp.district || 'Hyderabad',
      pincode: supp.pincode || '500001',
      deliveryTime: supp.deliveryTime || '24-48 Hours',
      paymentTerms: supp.paymentTerms || 'Net 30 Days',
      minOrderAmount: supp.minOrderAmount || 3000,
      status: supp.status || 'Active',
    });
    setFormErrors({});
    setIsAddEditModalOpen(true);
  };

  // View Supplier Details & Purchases
  const handleOpenDetails = async (supp: Supplier) => {
    try {
      const details = await apiService.getSupplierById(supp.id);
      setDetailsSupplier(details);
    } catch {
      setDetailsSupplier({ ...supp, purchases: [] });
    }
  };

  // Validate form
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!formData.name.trim()) errors.name = 'Supplier company name is required.';
    if (!formData.phone.trim()) errors.phone = 'Phone number is required.';
    if (formData.email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email.trim())) {
        errors.email = 'Please provide a valid email address.';
      }
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Submit Add or Edit
  const handleSubmitSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const fullAddress = formData.address.trim()
        ? formData.address.trim()
        : `${formData.city}, ${formData.district}, Telangana - ${formData.pincode}`;

      if (editingSupplier) {
        await apiService.updateSupplier(editingSupplier.id, {
          name: formData.name.trim(),
          contactPerson: formData.contactPerson.trim() || undefined,
          phone: formData.phone.trim(),
          email: formData.email.trim() || undefined,
          address: fullAddress,
        });
        setSuccessMessage(`Supplier "${formData.name}" updated successfully.`);
      } else {
        await apiService.createSupplier({
          name: formData.name.trim(),
          contactPerson: formData.contactPerson.trim() || undefined,
          phone: formData.phone.trim(),
          email: formData.email.trim() || undefined,
          address: fullAddress,
        });
        setSuccessMessage(`New Telangana supplier "${formData.name}" registered successfully.`);
      }
      setIsAddEditModalOpen(false);
      loadSuppliers();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Operation failed.';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Supplier
  const handleDeleteSupplier = async () => {
    if (!deleteConfirmSupplier) return;
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await apiService.deleteSupplier(deleteConfirmSupplier.id);
      setSuccessMessage(`Supplier "${deleteConfirmSupplier.name}" deleted successfully.`);
      setDeleteConfirmSupplier(null);
      loadSuppliers();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete supplier.';
      setErrorMessage(msg);
      setDeleteConfirmSupplier(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOrderWithSupplier = (supplierId: string) => {
    navigate('/purchases', { state: { supplierId } });
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-gray-900 tracking-tight">
              Pharmacy Supplier Directory
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#DDF5E9] text-[#087F5B] border border-[#087F5B]/20">
              Commercial Distributors
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Registered wholesale distributors and pharmaceutical agencies
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadSuppliers}
            disabled={isLoading}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#087F5B] hover:bg-[#076b4d] text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Supplier</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-gray-200 shadow-subtle flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-[#DDF5E9] text-[#087F5B] flex items-center justify-center shrink-0">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block">
              Registered Vendors
            </span>
            <span className="text-xl font-bold font-mono text-gray-900">
              {totalVendors}
            </span>
            <span className="text-[10px] text-gray-500 block">Active pharmaceutical suppliers</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-gray-200 shadow-subtle flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Truck className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block">
              Active Vendors
            </span>
            <span className="text-xl font-bold font-mono text-gray-900">
              {activeVendors}
            </span>
            <span className="text-[10px] text-emerald-600 block">100% active delivery network</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-gray-200 shadow-subtle flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-[#087F5B] flex items-center justify-center shrink-0">
            <ShoppingBag className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block">
              Total Inward Purchases
            </span>
            <span className="text-xl font-bold font-mono text-gray-900">
              ₹{totalPurchasesAmt.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
            </span>
            <span className="text-[10px] text-gray-500 block">Procured from vendors</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-gray-200 shadow-subtle flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block">
              Fastest Dispatch
            </span>
            <span className="text-base font-bold text-gray-900">
              Same Day
            </span>
            <span className="text-[10px] text-gray-500 block">Hyderabad & Secunderabad Hubs</span>
          </div>
        </div>
      </div>

      {/* Notifications */}
      {successMessage && (
        <div className="p-4 rounded-xl bg-[#DDF5E9] border border-[#087F5B]/30 flex items-start gap-3 text-xs text-[#087F5B]">
          <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="flex-1 font-medium">{successMessage}</div>
          <button onClick={() => setSuccessMessage(null)} className="text-gray-400 hover:text-gray-600 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 flex items-start gap-3 text-xs text-red-700">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="flex-1 font-medium">{errorMessage}</div>
          <button onClick={() => setErrorMessage(null)} className="text-gray-400 hover:text-gray-600 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Tabs & Search & Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-subtle space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Tab Buttons */}
          <div className="flex items-center gap-1.5 p-1 bg-gray-100 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setActiveTab('directory')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                activeTab === 'directory'
                  ? 'bg-white text-gray-900 shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Vendor Directory ({filteredSuppliers.length})
            </button>
            <button
              onClick={() => setActiveTab('comparison')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'comparison'
                  ? 'bg-white text-[#087F5B] shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Telangana Vendor Comparison</span>
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by vendor, contact, city, district, or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[#087F5B]/30"
            />
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-gray-100 text-xs">
          <span className="font-semibold text-gray-500 flex items-center gap-1 text-[11px]">
            <MapPin className="w-3 h-3 text-[#087F5B]" /> City/District:
          </span>
          <select
            value={cityFilter}
            onChange={(e) => setCityFilter(e.target.value)}
            className="px-2.5 py-1 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-[#087F5B]"
          >
            <option value="all">All Telangana Cities</option>
            {telanganaCities.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <span className="font-semibold text-gray-500 flex items-center gap-1 text-[11px] ml-2">
            <Layers className="w-3 h-3 text-[#087F5B]" /> Category:
          </span>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-2.5 py-1 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-[#087F5B]"
          >
            <option value="all">All Categories</option>
            {allProductCategories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <span className="font-semibold text-gray-500 text-[11px] ml-2">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-2.5 py-1 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-[#087F5B]"
          >
            <option value="all">All Status</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>

          {(cityFilter !== 'all' || categoryFilter !== 'all' || statusFilter !== 'all') && (
            <button
              onClick={() => {
                setCityFilter('all');
                setCategoryFilter('all');
                setStatusFilter('all');
              }}
              className="text-[11px] font-semibold text-[#087F5B] hover:underline cursor-pointer ml-auto"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 1. DIRECTORY TABLE VIEW */}
      {/* ===================================================================== */}
      {activeTab === 'directory' && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-subtle overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/70 text-gray-400 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Supplier & Region</th>
                  <th className="py-3 px-4">Contact Person</th>
                  <th className="py-3 px-4">Contact Details</th>
                  <th className="py-3 px-4">Product Specialization</th>
                  <th className="py-3 px-4 text-center">Delivery & Terms</th>
                  <th className="py-3 px-4 text-center">Min Order</th>
                  <th className="py-3 px-4 text-right">Total Purchases</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredSuppliers.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-10 text-center text-gray-400">
                      No suppliers found matching active filter. Click "Reset Filters" or "Add Supplier".
                    </td>
                  </tr>
                ) : (
                  filteredSuppliers.map((supp) => (
                    <tr key={supp.id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-gray-900">
                        <div className="flex items-start gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-[#DDF5E9] text-[#087F5B] flex items-center justify-center shrink-0 mt-0.5">
                            <Truck className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-gray-900 font-bold">{supp.name}</span>
                            </div>
                            <div className="flex items-center gap-1 text-[11px] text-gray-500 font-normal mt-0.5">
                              <MapPin className="w-3 h-3 text-[#087F5B]" />
                              <span>{supp.city || 'Hyderabad'}, Telangana</span>
                              {supp.pincode && <span className="text-gray-400 font-mono">({supp.pincode})</span>}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-gray-700">
                        {supp.contactPerson || <span className="text-gray-400 italic">None</span>}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5 font-mono text-gray-800">
                            <Phone className="w-3 h-3 text-gray-400 shrink-0" />
                            <span>{supp.phone}</span>
                          </div>
                          {supp.email && (
                            <div className="flex items-center gap-1.5 text-gray-500">
                              <Mail className="w-3 h-3 text-gray-400 shrink-0" />
                              <a href={`mailto:${supp.email}`} className="hover:underline text-[#087F5B] truncate max-w-[140px]">
                                {supp.email}
                              </a>
                            </div>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap gap-1 max-w-[200px]">
                          {(supp.productCategories || ['General Pharmaceuticals']).slice(0, 2).map((c) => (
                            <span key={c} className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-700">
                              {c}
                            </span>
                          ))}
                          {(supp.productCategories || []).length > 2 && (
                            <span className="text-[10px] text-gray-400">
                              +{(supp.productCategories || []).length - 2} more
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <div className="inline-flex flex-col items-center">
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                            <Clock className="w-3 h-3" />
                            {supp.deliveryTime || '24-48 Hours'}
                          </span>
                          <span className="text-[10px] text-gray-400 mt-0.5">
                            {supp.paymentTerms || 'Net 30 Days'}
                          </span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-center font-mono font-medium text-gray-800">
                        ₹{(supp.minOrderAmount || 3000).toLocaleString('en-IN')}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="font-mono font-bold text-gray-900">
                          ₹{(supp.totalPurchases || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                        </div>
                        {supp.lastPurchaseDate && (
                          <span className="text-[10px] text-gray-400 block">
                            Last: {new Date(supp.lastPurchaseDate).toLocaleDateString()}
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => handleOpenDetails(supp)}
                            className="p-1.5 rounded-lg text-gray-500 hover:text-[#087F5B] hover:bg-[#DDF5E9] transition-colors cursor-pointer"
                            title="View Vendor Details & Purchases"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleOrderWithSupplier(supp.id)}
                            className="p-1.5 rounded-lg text-gray-500 hover:text-emerald-700 hover:bg-emerald-50 transition-colors cursor-pointer"
                            title="Create Purchase Order"
                          >
                            <ShoppingBag className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleOpenEdit(supp)}
                            className="p-1.5 rounded-lg text-gray-500 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                            title="Edit Supplier"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirmSupplier(supp)}
                            className="p-1.5 rounded-lg text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                            title="Delete Supplier"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* 2. SUPPLIER COMPARISON MATRIX VIEW */}
      {/* ===================================================================== */}
      {activeTab === 'comparison' && (
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-subtle">
            <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-gray-100 gap-3">
              <div>
                <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <SlidersHorizontal className="w-5 h-5 text-[#087F5B]" />
                  <span>Telangana Wholesale Supplier Comparison Matrix</span>
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Evaluate regional distributors on delivery turnaround, minimum order value, payment credit, and pricing benchmark
                </p>
              </div>
              <span className="text-xs font-semibold text-gray-500">
                Comparing {comparisonList.length} Telangana vendors
              </span>
            </div>

            <div className="overflow-x-auto mt-4">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/70 text-gray-500 font-semibold uppercase tracking-wider">
                    <th className="py-3 px-4">Vendor & City</th>
                    <th className="py-3 px-4 text-center">Delivery Lead Time</th>
                    <th className="py-3 px-4 text-center">Min. Order Value</th>
                    <th className="py-3 px-4 text-center">Payment Credit Terms</th>
                    <th className="py-3 px-4">Supplied Medicines</th>
                    <th className="py-3 px-4 text-center">Vendor Rating</th>
                    <th className="py-3 px-4 text-center">Purchase Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {comparisonList.map((s) => (
                    <tr key={s.id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-gray-900">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-[#DDF5E9] text-[#087F5B] flex items-center justify-center shrink-0">
                            <Truck className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <span className="block">{s.name}</span>
                            <span className="text-[11px] text-gray-500 font-normal">
                              📍 {s.city || 'Hyderabad'} ({s.district || 'Telangana'})
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            s.isFastest
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          <Clock className="w-3 h-3" />
                          <span>{s.deliveryTime || '24-48 Hours'}</span>
                          {s.isFastest && <Zap className="w-3 h-3 text-amber-500 fill-amber-500" />}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-block font-mono font-bold px-2 py-0.5 rounded-md ${
                            s.isLowestMinOrder
                              ? 'bg-blue-100 text-blue-800'
                              : 'text-gray-800'
                          }`}
                        >
                          ₹{(s.minOrderAmount || 3000).toLocaleString('en-IN')}
                        </span>
                        {s.isLowestMinOrder && (
                          <span className="block text-[9px] text-blue-600 font-semibold mt-0.5">
                            Lowest Min Order
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-center text-gray-700 font-medium">
                        {s.paymentTerms || 'Net 30 Days'}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap gap-1 max-w-[240px]">
                          {(s.medicinesSupplied && s.medicinesSupplied.length > 0
                            ? s.medicinesSupplied
                            : s.productCategories || []
                          ).slice(0, 3).map((item) => (
                            <span key={item} className="px-2 py-0.5 rounded-full text-[10px] bg-gray-100 text-gray-700">
                              {item}
                            </span>
                          ))}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <div className="inline-flex items-center gap-1 font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md">
                          <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                          <span>{s.rating || 4.7}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={() => handleOrderWithSupplier(s.id)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#087F5B] hover:bg-[#076b4d] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                        >
                          <span>Order</span>
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Supplier Modal */}
      {isAddEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-gray-100 space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="font-bold text-gray-900 text-base">
                {editingSupplier ? 'Edit Supplier Information' : 'Register New Telangana Supplier'}
              </h3>
              <button
                onClick={() => setIsAddEditModalOpen(false)}
                className="p-1 rounded-md text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitSupplier} className="space-y-3">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  Supplier / Agency Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Deccan Pharma Distributors"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-hidden focus:ring-2 focus:ring-[#087F5B]/30"
                />
                {formErrors.name && (
                  <p className="text-[11px] text-red-600 mt-0.5">{formErrors.name}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">
                    Contact Person
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Srinivas Rao"
                    value={formData.contactPerson}
                    onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-hidden focus:ring-2 focus:ring-[#087F5B]/30"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">
                    Phone Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. +91 98490 12001"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-hidden focus:ring-2 focus:ring-[#087F5B]/30"
                  />
                  {formErrors.phone && (
                    <p className="text-[11px] text-red-600 mt-0.5">{formErrors.phone}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">
                    City (Telangana)
                  </label>
                  <select
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value, district: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-hidden focus:ring-2 focus:ring-[#087F5B]/30"
                  >
                    <option value="Hyderabad">Hyderabad</option>
                    <option value="Secunderabad">Secunderabad</option>
                    <option value="Medchal">Medchal</option>
                    <option value="Warangal">Warangal</option>
                    <option value="Nizamabad">Nizamabad</option>
                    <option value="Karimnagar">Karimnagar</option>
                    <option value="Shamshabad">Shamshabad (Rangareddy)</option>
                    <option value="Mahabubnagar">Mahabubnagar</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">
                    PIN Code
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 500037"
                    value={formData.pincode}
                    onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-hidden focus:ring-2 focus:ring-[#087F5B]/30"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">
                    Delivery Turnaround
                  </label>
                  <select
                    value={formData.deliveryTime}
                    onChange={(e) => setFormData({ ...formData, deliveryTime: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-hidden focus:ring-2 focus:ring-[#087F5B]/30"
                  >
                    <option value="Same Day (Hyd/Sec)">Same Day (Hyderabad/Secunderabad)</option>
                    <option value="24 Hours">24 Hours</option>
                    <option value="24-48 Hours">24-48 Hours</option>
                    <option value="48-72 Hours">48-72 Hours</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">
                    Payment Terms
                  </label>
                  <select
                    value={formData.paymentTerms}
                    onChange={(e) => setFormData({ ...formData, paymentTerms: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-hidden focus:ring-2 focus:ring-[#087F5B]/30"
                  >
                    <option value="Immediate UPI/Cash">Immediate UPI / Cash</option>
                    <option value="Net 15 Days">Net 15 Days</option>
                    <option value="Net 21 Days">Net 21 Days</option>
                    <option value="Net 30 Days">Net 30 Days</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  placeholder="e.g. orders@deccanpharma.example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-hidden focus:ring-2 focus:ring-[#087F5B]/30"
                />
                {formErrors.email && (
                  <p className="text-[11px] text-red-600 mt-0.5">{formErrors.email}</p>
                )}
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  Physical Address
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Plot 42, Balanagar Industrial Area, Hyderabad, Telangana - 500037"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-hidden focus:ring-2 focus:ring-[#087F5B]/30"
                />
              </div>

              <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-[#087F5B] hover:bg-[#076b4d] text-white font-bold cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : editingSupplier ? 'Update Supplier' : 'Save Supplier'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Supplier Details & Purchase History Modal */}
      {detailsSupplier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-gray-100 space-y-4 max-h-[90vh] overflow-y-auto text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Truck className="w-5 h-5 text-[#087F5B]" />
                <div>
                  <h3 className="font-bold text-gray-900 text-base">{detailsSupplier.name}</h3>
                  <span className="text-[11px] text-gray-500">
                    📍 {detailsSupplier.city || 'Hyderabad'}, Telangana {detailsSupplier.pincode ? `(${detailsSupplier.pincode})` : ''}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setDetailsSupplier(null)}
                className="p-1 rounded-md text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Supplier Information Card */}
            <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-gray-50 border border-gray-200">
              <div>
                <span className="text-[10px] text-gray-400 uppercase font-semibold block">Contact Person</span>
                <span className="font-bold text-gray-800">{detailsSupplier.contactPerson || 'N/A'}</span>
              </div>
              <div>
                <span className="text-[10px] text-gray-400 uppercase font-semibold block">Phone</span>
                <span className="font-bold font-mono text-gray-800">{detailsSupplier.phone}</span>
              </div>
              <div>
                <span className="text-[10px] text-gray-400 uppercase font-semibold block">Delivery Lead Time</span>
                <span className="font-semibold text-emerald-700">{detailsSupplier.deliveryTime || '24-48 Hours'}</span>
              </div>
              <div>
                <span className="text-[10px] text-gray-400 uppercase font-semibold block">Payment Terms</span>
                <span className="font-semibold text-gray-800">{detailsSupplier.paymentTerms || 'Net 30 Days'}</span>
              </div>
              <div className="col-span-2">
                <span className="text-[10px] text-gray-400 uppercase font-semibold block">Email</span>
                <span className="font-medium text-gray-700">{detailsSupplier.email || 'N/A'}</span>
              </div>
              <div className="col-span-2">
                <span className="text-[10px] text-gray-400 uppercase font-semibold block">Address</span>
                <span className="text-gray-600">{detailsSupplier.address || 'N/A'}</span>
              </div>
            </div>

            {/* Purchases from this Supplier */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-gray-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <ShoppingBag className="w-3.5 h-3.5 text-[#087F5B]" />
                  <span>Purchases from this Vendor</span>
                </h4>
                <span className="text-gray-400 text-[11px]">
                  {detailsSupplier.purchases ? detailsSupplier.purchases.length : 0} invoice(s)
                </span>
              </div>

              {detailsSupplier.purchases && detailsSupplier.purchases.length > 0 ? (
                <div className="space-y-2">
                  {detailsSupplier.purchases.map((po) => (
                    <div
                      key={po.id}
                      className="p-3 rounded-xl border border-gray-200 flex items-center justify-between"
                    >
                      <div>
                        <span className="font-mono font-bold text-gray-800 block">
                          {po.purchaseNumber}
                        </span>
                        <span className="text-[11px] text-gray-500">
                          {new Date(po.createdAt).toLocaleDateString()} • {po.items?.length || 1} item(s)
                        </span>
                      </div>
                      <span className="font-mono font-bold text-[#087F5B]">
                        ₹{po.totalAmount.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-400 text-center py-4 italic">
                  No purchases recorded from this supplier yet.
                </p>
              )}
            </div>

            <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
              <button
                onClick={() => {
                  const id = detailsSupplier.id;
                  setDetailsSupplier(null);
                  handleOrderWithSupplier(id);
                }}
                className="px-4 py-2 rounded-xl bg-[#087F5B] hover:bg-[#076b4d] text-white font-bold cursor-pointer"
              >
                Create Purchase Order
              </button>
              <button
                onClick={() => setDetailsSupplier(null)}
                className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteConfirmSupplier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-gray-100 space-y-4 text-xs">
            <div className="flex items-center gap-3 text-red-600">
              <div className="p-2 rounded-xl bg-red-50">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-base">Delete Supplier</h3>
                <p className="text-gray-500 text-[11px]">Confirm vendor deletion</p>
              </div>
            </div>

            <p className="text-gray-600">
              Are you sure you want to delete supplier{' '}
              <strong className="text-gray-900">"{deleteConfirmSupplier.name}"</strong>?
            </p>

            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-[11px]">
              Note: A supplier cannot be deleted if active purchase orders depend on it for audit compliance.
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setDeleteConfirmSupplier(null)}
                className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteSupplier}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? 'Deleting...' : 'Delete Supplier'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuppliersPage;
