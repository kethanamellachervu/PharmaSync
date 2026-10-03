import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  RefreshCw,
  Layers,
  History,
  Sparkles,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Package,
} from 'lucide-react';
import Badge from '../components/ui/Badge';
import AddMedicineModal from '../components/inventory/AddMedicineModal';
import EditMedicineModal from '../components/inventory/EditMedicineModal';
import BatchManagementModal from '../components/inventory/BatchManagementModal';
import StockMovementsModal from '../components/inventory/StockMovementsModal';
import DeleteConfirmDialog from '../components/inventory/DeleteConfirmDialog';
import FefoPreviewModal from '../components/inventory/FefoPreviewModal';
import InventoryAlertsBanner from '../components/inventory/InventoryAlertsBanner';
import { apiService } from '../services/api';
import { Medicine, InventoryAlertsData } from '../types';

type SortField = 'name' | 'quantity' | 'expiry';
type SortOrder = 'asc' | 'desc';
type StockStatusFilter = 'all' | 'in-stock' | 'low-stock' | 'out-of-stock' | 'near-expiry' | 'expired';

export const InventoryPage: React.FC = () => {
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [alerts, setAlerts] = useState<InventoryAlertsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search, Filters & Sorting
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<StockStatusFilter>('all');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingMedicine, setEditingMedicine] = useState<Medicine | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const [batchMedicine, setBatchMedicine] = useState<Medicine | null>(null);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);

  const [historyMedicine, setHistoryMedicine] = useState<Medicine | null>(null);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

  const [fefoMedicine, setFefoMedicine] = useState<Medicine | null>(null);
  const [isFefoModalOpen, setIsFefoModalOpen] = useState(false);

  const [deletingMedicine, setDeletingMedicine] = useState<Medicine | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [inventoryData, alertsData] = await Promise.all([
        apiService.getInventory(),
        apiService.getInventoryAlerts(),
      ]);
      setMedicines(inventoryData);
      setAlerts(alertsData);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch inventory.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Extract distinct categories for filter dropdown
  const categories = useMemo(() => {
    const set = new Set<string>();
    medicines.forEach((m) => {
      if (m.category) set.add(m.category);
    });
    return Array.from(set).sort();
  }, [medicines]);

  // Filter and Sort Medicines
  const filteredAndSortedMedicines = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();

    const filtered = medicines.filter((med) => {
      // 1. Search by name, generic name, category, or ID
      const matchesSearch =
        !q ||
        med.name.toLowerCase().includes(q) ||
        (med.genericName && med.genericName.toLowerCase().includes(q)) ||
        med.category.toLowerCase().includes(q) ||
        med.id.toLowerCase().includes(q) ||
        med.batches.some((b) => b.batchNumber.toLowerCase().includes(q));

      if (!matchesSearch) return false;

      // 2. Filter by category
      if (categoryFilter !== 'all' && med.category !== categoryFilter) {
        return false;
      }

      // 3. Filter by stock status
      if (statusFilter !== 'all') {
        if (statusFilter === 'in-stock' && med.stockStatus !== 'In Stock') return false;
        if (statusFilter === 'low-stock' && !med.isLowStock) return false;
        if (statusFilter === 'out-of-stock' && !med.isOutOfStock) return false;
        if (statusFilter === 'near-expiry' && !med.isNearExpiry) return false;
        if (statusFilter === 'expired' && !med.isExpired) return false;
      }

      return true;
    });

    // Sort
    return filtered.sort((a, b) => {
      let cmp = 0;
      if (sortField === 'name') {
        cmp = a.name.localeCompare(b.name);
      } else if (sortField === 'quantity') {
        cmp = a.usableStock - b.usableStock;
      } else if (sortField === 'expiry') {
        const expA = a.earliestExpiry ? new Date(a.earliestExpiry).getTime() : 0;
        const expB = b.earliestExpiry ? new Date(b.earliestExpiry).getTime() : 0;
        cmp = expA - expB;
      }
      return sortOrder === 'asc' ? cmp : -cmp;
    });
  }, [medicines, searchQuery, categoryFilter, statusFilter, sortField, sortOrder]);

  // Paginated records
  const totalPages = Math.ceil(filteredAndSortedMedicines.length / pageSize) || 1;
  const paginatedMedicines = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredAndSortedMedicines.slice(start, start + pageSize);
  }, [filteredAndSortedMedicines, currentPage, pageSize]);

  // Handle Sort Toggle
  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
    setCurrentPage(1);
  };

  // Handle Delete Confirmation
  const handleDeleteConfirm = async () => {
    if (!deletingMedicine) return;
    setIsDeleting(true);
    try {
      await apiService.deleteMedicine(deletingMedicine.id);
      setDeletingMedicine(null);
      fetchData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete medicine.';
      alert(msg);
    } finally {
      setIsDeleting(false);
    }
  };

  const getStatusBadge = (med: Medicine) => {
    switch (med.stockStatus) {
      case 'Out of Stock':
        return <Badge variant="neutral">Out of Stock</Badge>;
      case 'Low Stock':
        return <Badge variant="critical">Low Stock</Badge>;
      case 'Near Expiry':
        return <Badge variant="warning">Near Expiry (&le;30d)</Badge>;
      case 'Expired':
        return <Badge variant="critical">Expired Batch</Badge>;
      case 'In Stock':
      default:
        return <Badge variant="success">In Stock</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-subtle">
        <div>
          <h2 className="text-xl font-bold text-gray-900 tracking-tight">
            Pharmacy Inventory Management
          </h2>
          <p className="text-xs text-pharmacy-text-muted mt-1">
            Complete catalogue, multi-batch tracking, stock status alerts, and FEFO prioritization
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#087F5B] hover:bg-[#066347] text-white text-xs font-semibold shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Medicine</span>
          </button>

          <button
            onClick={fetchData}
            disabled={isLoading}
            className="p-2.5 text-gray-500 hover:text-[#087F5B] bg-gray-50 border border-gray-200 rounded-lg transition-colors"
            title="Refresh Inventory"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Stock Health Alerts Banner */}
      <InventoryAlertsBanner
        alerts={alerts}
        activeFilter={statusFilter}
        onSelectFilter={(filter) => {
          setStatusFilter(filter);
          setCurrentPage(1);
        }}
      />

      {/* Search, Category Filter, and Status Controls */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-subtle space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* Search Input */}
          <div className="md:col-span-5 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, generic name, category, or ID..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-4 py-2 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[#087F5B]/30 focus:border-[#087F5B]"
            />
          </div>

          {/* Category Dropdown */}
          <div className="md:col-span-3">
            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-lg text-gray-700 font-medium focus:outline-hidden focus:ring-2 focus:ring-[#087F5B]/30"
            >
              <option value="all">All Categories ({categories.length})</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Stock Status Dropdown */}
          <div className="md:col-span-4">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as StockStatusFilter);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-lg text-gray-700 font-medium focus:outline-hidden focus:ring-2 focus:ring-[#087F5B]/30"
            >
              <option value="all">All Stock Statuses</option>
              <option value="in-stock">In Stock (Healthy)</option>
              <option value="low-stock">Low Stock (At or Below Min Threshold)</option>
              <option value="near-expiry">Near Expiry (&le; 30 Days)</option>
              <option value="expired">Expired Batches</option>
              <option value="out-of-stock">Out of Stock (Zero Usable Units)</option>
            </select>
          </div>
        </div>

        {/* Quick Result Counter & Active Filter Tags */}
        <div className="flex flex-wrap items-center justify-between text-xs text-gray-500 pt-2 border-t border-gray-100">
          <div>
            Showing <strong className="text-gray-800">{filteredAndSortedMedicines.length}</strong> of{' '}
            <strong className="text-gray-800">{medicines.length}</strong> medicines
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] text-gray-400">Sort by:</span>
            <button
              onClick={() => toggleSort('name')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-semibold transition-colors ${
                sortField === 'name' ? 'bg-[#DDF5E9] text-[#087F5B]' : 'hover:bg-gray-100 text-gray-600'
              }`}
            >
              <span>Name</span>
              <ArrowUpDown className="w-3 h-3" />
            </button>

            <button
              onClick={() => toggleSort('quantity')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-semibold transition-colors ${
                sortField === 'quantity' ? 'bg-[#DDF5E9] text-[#087F5B]' : 'hover:bg-gray-100 text-gray-600'
              }`}
            >
              <span>Quantity</span>
              <ArrowUpDown className="w-3 h-3" />
            </button>

            <button
              onClick={() => toggleSort('expiry')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-semibold transition-colors ${
                sortField === 'expiry' ? 'bg-[#DDF5E9] text-[#087F5B]' : 'hover:bg-gray-100 text-gray-600'
              }`}
            >
              <span>Expiry Date</span>
              <ArrowUpDown className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Medicines Table Card */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-subtle overflow-hidden">
        {isLoading ? (
          <div className="p-16 text-center text-xs text-gray-500">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#087F5B] mb-2" />
            <span>Loading inventory catalogue and batches...</span>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-xs text-red-600">
            <p>{error}</p>
            <button onClick={fetchData} className="mt-2 font-semibold underline text-[#087F5B]">
              Retry
            </button>
          </div>
        ) : filteredAndSortedMedicines.length === 0 ? (
          <div className="p-16 text-center text-gray-500">
            <Package className="w-10 h-10 mx-auto text-gray-300 mb-2" />
            <p className="text-sm font-semibold text-gray-800">No medicines match your criteria</p>
            <p className="text-xs text-gray-400 mt-1">
              Try adjusting your search query or reset your stock status filter.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[900px]">
              <thead>
                <tr className="bg-gray-50/80 text-gray-500 font-semibold border-b border-gray-200">
                  <th className="py-3 px-4">Medicine Name</th>
                  <th className="py-3 px-3">Category</th>
                  <th className="py-3 px-3 text-center">Available Quantity</th>
                  <th className="py-3 px-3 text-center">Unit</th>
                  <th className="py-3 px-3 text-right">Selling Price</th>
                  <th className="py-3 px-3">Batch Number</th>
                  <th className="py-3 px-3">Expiry Date (FEFO)</th>
                  <th className="py-3 px-3 text-center">Stock Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginatedMedicines.map((med) => {
                  return (
                    <tr
                      key={med.id}
                      className={`hover:bg-gray-50/70 transition-colors ${
                        med.isOutOfStock
                          ? 'bg-gray-50/60'
                          : med.isLowStock
                          ? 'bg-amber-50/20'
                          : med.isExpired
                          ? 'bg-red-50/20'
                          : ''
                      }`}
                    >
                      {/* Medicine Name */}
                      <td className="py-3.5 px-4">
                        <div className="min-w-0">
                          <p className="font-bold text-gray-900 text-sm">{med.name}</p>
                          <div className="flex items-center gap-2 mt-0.5 text-[11px] text-gray-400">
                            {med.genericName && (
                              <span className="text-gray-500 truncate">{med.genericName}</span>
                            )}
                            {med.manufacturer && (
                              <>
                                <span>•</span>
                                <span className="text-gray-400">{med.manufacturer}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-3.5 px-3">
                        <span className="font-medium text-gray-700 bg-gray-100 px-2 py-0.5 rounded text-[11px]">
                          {med.category}
                        </span>
                      </td>

                      {/* Available Quantity */}
                      <td className="py-3.5 px-3 text-center">
                        <div className="inline-block text-center">
                          <span
                            className={`text-sm font-bold font-mono ${
                              med.isOutOfStock
                                ? 'text-gray-400'
                                : med.isLowStock
                                ? 'text-amber-700 font-extrabold'
                                : 'text-gray-900'
                            }`}
                          >
                            {med.usableStock}
                          </span>
                          <span className="block text-[10px] text-gray-400">
                            Min: {med.minStockLevel}
                          </span>
                        </div>
                      </td>

                      {/* Unit */}
                      <td className="py-3.5 px-3 text-center font-medium text-gray-600 capitalize">
                        {med.unit}
                      </td>

                      {/* Selling Price */}
                      <td className="py-3.5 px-3 text-right font-mono font-bold text-gray-900">
                        ₹{med.sellingPrice.toFixed(2)}
                      </td>

                      {/* Batch Number */}
                      <td className="py-3.5 px-3">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-xs font-semibold text-gray-800 bg-gray-100 px-1.5 py-0.5 rounded">
                            {med.batches.length > 0 ? med.batches[0].batchNumber : 'None'}
                          </span>
                          {med.batches.length > 1 && (
                            <button
                              onClick={() => {
                                setBatchMedicine(med);
                                setIsBatchModalOpen(true);
                              }}
                              className="text-[10px] font-semibold text-[#087F5B] bg-[#DDF5E9] px-1.5 py-0.5 rounded hover:bg-[#cbf0dd]"
                              title="Click to view all batches"
                            >
                              +{med.batches.length - 1} more
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Expiry Date */}
                      <td className="py-3.5 px-3">
                        <span
                          className={`font-mono text-[11px] ${
                            med.isExpired
                              ? 'text-red-600 font-bold'
                              : med.isNearExpiry
                              ? 'text-amber-700 font-bold'
                              : 'text-gray-700'
                          }`}
                        >
                          {med.earliestExpiry || 'N/A'}
                        </span>
                      </td>

                      {/* Stock Status Badge */}
                      <td className="py-3.5 px-3 text-center">
                        {getStatusBadge(med)}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* Batch Management button */}
                          <button
                            onClick={() => {
                              setBatchMedicine(med);
                              setIsBatchModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg text-gray-500 hover:text-[#087F5B] hover:bg-gray-100"
                            title="Manage Batches & Add Stock"
                          >
                            <Layers className="w-3.5 h-3.5" />
                          </button>

                          {/* FEFO simulation button */}
                          <button
                            onClick={() => {
                              setFefoMedicine(med);
                              setIsFefoModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg text-gray-500 hover:text-[#087F5B] hover:bg-gray-100"
                            title="Simulate FEFO Stock Allocation"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                          </button>

                          {/* Movement history button */}
                          <button
                            onClick={() => {
                              setHistoryMedicine(med);
                              setIsHistoryModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg text-gray-500 hover:text-blue-600 hover:bg-blue-50"
                            title="View Stock Movement Audit History"
                          >
                            <History className="w-3.5 h-3.5" />
                          </button>

                          {/* Edit button */}
                          <button
                            onClick={() => {
                              setEditingMedicine(med);
                              setIsEditModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg text-gray-500 hover:text-[#087F5B] hover:bg-gray-100"
                            title="Edit Medicine"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete button */}
                          <button
                            onClick={() => setDeletingMedicine(med)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50"
                            title="Delete Medicine"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Table Pagination Footer */}
        {!isLoading && filteredAndSortedMedicines.length > 0 && (
          <div className="p-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-500">
            <div>
              Page <strong className="text-gray-800">{currentPage}</strong> of{' '}
              <strong className="text-gray-800">{totalPages}</strong>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Previous</span>
              </button>

              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <span>Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <AddMedicineModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={() => fetchData()}
      />

      <EditMedicineModal
        medicine={editingMedicine}
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingMedicine(null);
        }}
        onSuccess={() => fetchData()}
      />

      <BatchManagementModal
        medicine={batchMedicine}
        isOpen={isBatchModalOpen}
        onClose={() => {
          setIsBatchModalOpen(false);
          setBatchMedicine(null);
        }}
        onSuccess={() => fetchData()}
      />

      <StockMovementsModal
        medicine={historyMedicine}
        isOpen={isHistoryModalOpen}
        onClose={() => {
          setIsHistoryModalOpen(false);
          setHistoryMedicine(null);
        }}
      />

      <FefoPreviewModal
        medicine={fefoMedicine}
        isOpen={isFefoModalOpen}
        onClose={() => {
          setIsFefoModalOpen(false);
          setFefoMedicine(null);
        }}
      />

      <DeleteConfirmDialog
        medicine={deletingMedicine}
        isOpen={Boolean(deletingMedicine)}
        onClose={() => setDeletingMedicine(null)}
        onConfirm={handleDeleteConfirm}
        isDeleting={isDeleting}
      />
    </div>
  );
};

export default InventoryPage;
