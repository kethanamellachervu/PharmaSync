import React, { useState, useEffect, useCallback } from 'react';
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
} from 'lucide-react';
import { apiService } from '../services/api';
import { Supplier, Purchase } from '../types';

export const SuppliersPage: React.FC = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

  const [detailsSupplier, setDetailsSupplier] = useState<(Supplier & { purchases?: Purchase[] }) | null>(
    null
  );
  const [deleteConfirmSupplier, setDeleteConfirmSupplier] = useState<Supplier | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    contactPerson: '',
    phone: '',
    email: '',
    address: '',
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

  // Open Add Modal
  const handleOpenAdd = () => {
    setEditingSupplier(null);
    setFormData({
      name: '',
      contactPerson: '',
      phone: '',
      email: '',
      address: '',
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
    if (!formData.name.trim()) {
      errors.name = 'Supplier company name is required.';
    }
    if (!formData.phone.trim()) {
      errors.phone = 'Phone number is required.';
    }
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
      if (editingSupplier) {
        await apiService.updateSupplier(editingSupplier.id, {
          name: formData.name.trim(),
          contactPerson: formData.contactPerson.trim() || undefined,
          phone: formData.phone.trim(),
          email: formData.email.trim() || undefined,
          address: formData.address.trim() || undefined,
        });
        setSuccessMessage(`Supplier "${formData.name}" updated successfully.`);
      } else {
        await apiService.createSupplier({
          name: formData.name.trim(),
          contactPerson: formData.contactPerson.trim() || undefined,
          phone: formData.phone.trim(),
          email: formData.email.trim() || undefined,
          address: formData.address.trim() || undefined,
        });
        setSuccessMessage(`New supplier "${formData.name}" registered successfully.`);
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

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 tracking-tight">
            Supplier & Vendor Directory
          </h2>
          <p className="text-xs text-pharmacy-text-muted mt-1">
            Manage pharmaceutical vendors, wholesale distributors, and supplier contacts
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

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-subtle flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search suppliers by name, contact, phone, or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[#087F5B]/30"
          />
        </div>
        <span className="text-xs font-semibold text-gray-500">
          {suppliers.length} {suppliers.length === 1 ? 'Supplier' : 'Suppliers'} registered
        </span>
      </div>

      {/* Supplier Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-subtle overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/70 text-gray-400 font-semibold uppercase tracking-wider">
                <th className="py-3 px-4">Supplier Name</th>
                <th className="py-3 px-4">Contact Person</th>
                <th className="py-3 px-4">Phone Number</th>
                <th className="py-3 px-4">Email</th>
                <th className="py-3 px-4">Address</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {suppliers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-gray-400">
                    No suppliers found matching query. Click "Add Supplier" to register a new vendor.
                  </td>
                </tr>
              ) : (
                suppliers.map((supp) => (
                  <tr key={supp.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-gray-900">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-[#DDF5E9] text-[#087F5B] flex items-center justify-center shrink-0">
                          <Truck className="w-3.5 h-3.5" />
                        </div>
                        <span>{supp.name}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-gray-700">
                      {supp.contactPerson || <span className="text-gray-400 italic">None</span>}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-medium text-gray-800">
                      <div className="flex items-center gap-1.5">
                        <Phone className="w-3 h-3 text-gray-400 shrink-0" />
                        <span>{supp.phone}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-gray-600">
                      {supp.email ? (
                        <div className="flex items-center gap-1.5">
                          <Mail className="w-3 h-3 text-gray-400 shrink-0" />
                          <a href={`mailto:${supp.email}`} className="hover:underline text-[#087F5B]">
                            {supp.email}
                          </a>
                        </div>
                      ) : (
                        <span className="text-gray-400 italic">—</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-gray-500 max-w-xs truncate" title={supp.address}>
                      {supp.address || <span className="text-gray-400 italic">—</span>}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          onClick={() => handleOpenDetails(supp)}
                          className="p-1.5 rounded-lg text-gray-500 hover:text-[#087F5B] hover:bg-[#DDF5E9] transition-colors cursor-pointer"
                          title="View Details & Purchases"
                        >
                          <Eye className="w-4 h-4" />
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

      {/* Add / Edit Supplier Modal */}
      {isAddEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-gray-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Truck className="w-5 h-5 text-[#087F5B]" />
                <h3 className="font-bold text-gray-900 text-base">
                  {editingSupplier ? 'Edit Supplier' : 'Register New Supplier'}
                </h3>
              </div>
              <button
                onClick={() => setIsAddEditModalOpen(false)}
                className="p-1 rounded-md text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitSupplier} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  Supplier Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. MedLife Pharma Distributors"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-hidden focus:ring-2 focus:ring-[#087F5B]/30"
                />
                {formErrors.name && (
                  <p className="text-[11px] text-red-600 mt-0.5">{formErrors.name}</p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">
                    Contact Person
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Rajesh Sharma"
                    value={formData.contactPerson}
                    onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-hidden focus:ring-2 focus:ring-[#087F5B]/30"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">
                    Phone Number *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. +91 98765 43210"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-hidden focus:ring-2 focus:ring-[#087F5B]/30"
                  />
                  {formErrors.phone && (
                    <p className="text-[11px] text-red-600 mt-0.5">{formErrors.phone}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  placeholder="e.g. orders@medlifedist.com"
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
                  placeholder="e.g. Plot 45, Industrial Area Phase II, Hyderabad"
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
                <h3 className="font-bold text-gray-900 text-base">{detailsSupplier.name}</h3>
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
                          {new Date(po.createdAt).toLocaleDateString()} • {po.items.length} item(s)
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

            <div className="pt-3 border-t border-gray-100 flex justify-end">
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
