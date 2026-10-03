import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  RefreshCw,
  AlertTriangle,
  Clock,
  Package,
} from 'lucide-react';
import Badge from '../components/ui/Badge';
import AddMedicineModal from '../components/inventory/AddMedicineModal';
import EditMedicineModal from '../components/inventory/EditMedicineModal';
import { apiService } from '../services/api';
import { Medicine } from '../types';

export const InventoryPage: React.FC = () => {
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'low-stock' | 'near-expiry'>('all');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedMedicine, setSelectedMedicine] = useState<Medicine | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Deletion confirm
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const fetchInventory = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiService.getInventory();
      setMedicines(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch inventory.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  const handleDelete = async (id: string) => {
    try {
      await apiService.deleteMedicine(id);
      setDeleteConfirmId(null);
      fetchInventory();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete medicine.';
      alert(msg);
    }
  };

  // Filtered medicines
  const filteredMedicines = useMemo(() => {
    return medicines.filter((med) => {
      const matchesSearch =
        med.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        med.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        med.batches.some((b) => b.batchNumber.toLowerCase().includes(searchQuery.toLowerCase()));

      if (!matchesSearch) return false;

      if (filterType === 'low-stock') return med.isLowStock;
      if (filterType === 'near-expiry') return med.isNearExpiry;

      return true;
    });
  }, [medicines, searchQuery, filterType]);

  const totalMedicinesCount = medicines.length;
  const lowStockCount = medicines.filter((m) => m.isLowStock).length;
  const nearExpiryCount = medicines.filter((m) => m.isNearExpiry).length;

  return (
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-subtle">
        <div>
          <h2 className="text-xl font-bold text-gray-900 tracking-tight">
            Medicine Stock & Inventory
          </h2>
          <p className="text-xs text-pharmacy-text-muted mt-1">
            Manage catalogue, monitor stock levels, and track expiration dates
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#087F5B] hover:bg-[#066347] text-white text-xs font-semibold shadow-xs transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Medicine</span>
        </button>
      </div>

      {/* Search and Filters Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by medicine name, category, or batch number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs bg-white border border-gray-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[#087F5B]/30 focus:border-[#087F5B]"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
              filterType === 'all'
                ? 'bg-[#087F5B] text-white shadow-xs'
                : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            All Items ({totalMedicinesCount})
          </button>

          <button
            onClick={() => setFilterType('low-stock')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
              filterType === 'low-stock'
                ? 'bg-red-600 text-white shadow-xs'
                : 'bg-white text-red-700 hover:bg-red-50 border border-red-200'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Low Stock ({lowStockCount})</span>
          </button>

          <button
            onClick={() => setFilterType('near-expiry')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
              filterType === 'near-expiry'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-white text-amber-700 hover:bg-amber-50 border border-amber-200'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Near Expiry ({nearExpiryCount})</span>
          </button>

          <button
            onClick={fetchInventory}
            disabled={isLoading}
            className="p-2 text-gray-500 hover:text-[#087F5B] bg-white border border-gray-200 rounded-lg transition-colors ml-auto"
            title="Refresh Inventory"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Medicines Table Card */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-subtle overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-xs text-gray-500">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#087F5B] mb-2" />
            <span>Loading inventory records...</span>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-xs text-red-600">
            <p>{error}</p>
            <button
              onClick={fetchInventory}
              className="mt-2 font-semibold underline text-[#087F5B]"
            >
              Retry
            </button>
          </div>
        ) : filteredMedicines.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <Package className="w-10 h-10 mx-auto text-gray-300 mb-2" />
            <p className="text-sm font-semibold text-gray-800">No medicines found</p>
            <p className="text-xs text-gray-400 mt-1">
              {searchQuery
                ? 'Try adjusting your search criteria.'
                : 'Add your first medicine to the inventory.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[760px]">
              <thead>
                <tr className="bg-gray-50/80 text-gray-500 font-semibold border-b border-gray-200">
                  <th className="py-3 px-4">Medicine Details</th>
                  <th className="py-3 px-4">Batches & Expiry (FEFO)</th>
                  <th className="py-3 px-4 text-center">Available Stock</th>
                  <th className="py-3 px-4 text-right">Selling Price</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredMedicines.map((med) => {
                  return (
                    <tr
                      key={med.id}
                      className={`hover:bg-gray-50/70 transition-colors ${
                        med.isLowStock ? 'bg-red-50/30' : ''
                      }`}
                    >
                      {/* Name & Category */}
                      <td className="py-3 px-4">
                        <p className="font-bold text-gray-900 text-sm">{med.name}</p>
                        <p className="text-[11px] text-gray-500 mt-0.5">{med.category}</p>
                      </td>

                      {/* Batches & Expiry */}
                      <td className="py-3 px-4">
                        <div className="space-y-1">
                          {med.batches.map((batch, idx) => (
                            <div
                              key={`${batch.batchNumber}-${idx}`}
                              className="flex items-center gap-2 text-[11px]"
                            >
                              <span className="font-mono font-medium text-gray-700 bg-gray-100 px-1.5 py-0.5 rounded">
                                {batch.batchNumber}
                              </span>
                              <span className="text-gray-500">
                                {batch.quantity} units • Exp: {batch.expiryDate}
                              </span>
                            </div>
                          ))}
                        </div>
                      </td>

                      {/* Available Stock */}
                      <td className="py-3 px-4 text-center">
                        <div className="inline-block text-center">
                          <span
                            className={`text-sm font-bold ${
                              med.isLowStock ? 'text-red-600 font-extrabold' : 'text-gray-900'
                            }`}
                          >
                            {med.totalStock} units
                          </span>
                          <span className="block text-[10px] text-gray-400">
                            Min safety: {med.minStock}
                          </span>
                        </div>
                      </td>

                      {/* Selling Price */}
                      <td className="py-3 px-4 text-right font-mono font-bold text-gray-900">
                        ₹{med.price.toFixed(2)}
                      </td>

                      {/* Status Badges */}
                      <td className="py-3 px-4 text-center">
                        <div className="flex flex-col items-center gap-1">
                          {med.isLowStock && (
                            <Badge variant="critical">Low Stock</Badge>
                          )}
                          {med.isNearExpiry && (
                            <Badge variant="warning">Near Expiry</Badge>
                          )}
                          {!med.isLowStock && !med.isNearExpiry && (
                            <Badge variant="success">Normal</Badge>
                          )}
                        </div>
                      </td>

                      {/* Action buttons */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              setSelectedMedicine(med);
                              setIsEditModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg text-gray-500 hover:text-[#087F5B] hover:bg-gray-100 transition-colors"
                            title="Edit Medicine"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {deleteConfirmId === med.id ? (
                            <div className="inline-flex items-center gap-1">
                              <button
                                onClick={() => handleDelete(med.id)}
                                className="px-2 py-0.5 text-[10px] font-bold bg-red-600 text-white rounded hover:bg-red-700"
                              >
                                Confirm
                              </button>
                              <button
                                onClick={() => setDeleteConfirmId(null)}
                                className="px-1.5 py-0.5 text-[10px] text-gray-500 hover:text-gray-800"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setDeleteConfirmId(med.id)}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                              title="Delete Medicine"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Medicine Modal */}
      <AddMedicineModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={() => fetchInventory()}
      />

      {/* Edit Medicine Modal */}
      <EditMedicineModal
        medicine={selectedMedicine}
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedMedicine(null);
        }}
        onSuccess={() => fetchInventory()}
      />
    </div>
  );
};

export default InventoryPage;
