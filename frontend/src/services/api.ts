import axios, { AxiosError } from 'axios';
import {
  Medicine,
  MedicineBatch,
  StockMovement,
  SaleRecord,
  Sale,
  Supplier,
  Purchase,
  PurchaseItemInput,
  ShopSettings,
  DashboardStats,
  InventoryAlertsData,
  FefoAllocationResult,
} from '../types';

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

function handleApiError(err: unknown, defaultMsg: string): never {
  const error = err as AxiosError<{ message?: string }>;
  const message = error.response?.data?.message || error.message || defaultMsg;
  throw new Error(message);
}

export const apiService = {
  // --- Dashboard ---
  async getDashboardStats(): Promise<DashboardStats> {
    try {
      const response = await apiClient.get<{ status: string; data: DashboardStats }>('/inventory/dashboard');
      return response.data.data;
    } catch (err) {
      return handleApiError(err, 'Failed to fetch dashboard statistics.');
    }
  },

  // --- Inventory Medicines ---
  async getInventory(): Promise<Medicine[]> {
    try {
      const response = await apiClient.get<{ status: string; data: Medicine[] }>('/inventory');
      return response.data.data;
    } catch (err) {
      return handleApiError(err, 'Failed to fetch inventory.');
    }
  },

  async getMedicineById(id: string): Promise<Medicine> {
    try {
      const response = await apiClient.get<{ status: string; data: Medicine }>(`/inventory/${id}`);
      return response.data.data;
    } catch (err) {
      return handleApiError(err, 'Failed to fetch medicine details.');
    }
  },

  async addMedicine(data: {
    name: string;
    genericName?: string;
    category: string;
    manufacturer?: string;
    description?: string;
    unit: string;
    minStockLevel: number;
    sellingPrice: number;
    purchasePrice?: number;
    batchNumber: string;
    quantity: number;
    mfgDate?: string;
    expiryDate: string;
  }): Promise<Medicine> {
    try {
      const response = await apiClient.post<{ status: string; data: Medicine }>('/inventory', data);
      return response.data.data;
    } catch (err) {
      return handleApiError(err, 'Failed to add medicine.');
    }
  },

  async updateMedicine(
    id: string,
    data: {
      name?: string;
      genericName?: string;
      category?: string;
      manufacturer?: string;
      description?: string;
      unit?: string;
      minStockLevel?: number;
      sellingPrice?: number;
      purchasePrice?: number;
    }
  ): Promise<Medicine> {
    try {
      const response = await apiClient.put<{ status: string; data: Medicine }>(`/inventory/${id}`, data);
      return response.data.data;
    } catch (err) {
      return handleApiError(err, 'Failed to update medicine.');
    }
  },

  async deleteMedicine(id: string): Promise<void> {
    try {
      await apiClient.delete(`/inventory/${id}`);
    } catch (err) {
      return handleApiError(err, 'Failed to delete medicine.');
    }
  },

  // --- Batches Management ---
  async getBatches(medicineId: string): Promise<MedicineBatch[]> {
    try {
      const response = await apiClient.get<{ status: string; data: MedicineBatch[] }>(
        `/inventory/${medicineId}/batches`
      );
      return response.data.data;
    } catch (err) {
      return handleApiError(err, 'Failed to fetch batches.');
    }
  },

  async addBatch(
    medicineId: string,
    data: {
      batchNumber: string;
      quantity: number;
      mfgDate?: string;
      expiryDate: string;
      reason?: string;
    }
  ): Promise<{ batch: MedicineBatch; medicine: Medicine }> {
    try {
      const response = await apiClient.post<{
        status: string;
        data: { batch: MedicineBatch; medicine: Medicine };
      }>(`/inventory/${medicineId}/batches`, data);
      return response.data.data;
    } catch (err) {
      return handleApiError(err, 'Failed to add batch.');
    }
  },

  async updateBatch(
    medicineId: string,
    batchId: string,
    data: {
      batchNumber?: string;
      quantity?: number;
      mfgDate?: string;
      expiryDate?: string;
      reason?: string;
    }
  ): Promise<{ batch: MedicineBatch; medicine: Medicine }> {
    try {
      const response = await apiClient.put<{
        status: string;
        data: { batch: MedicineBatch; medicine: Medicine };
      }>(`/inventory/${medicineId}/batches/${batchId}`, data);
      return response.data.data;
    } catch (err) {
      return handleApiError(err, 'Failed to update batch.');
    }
  },

  // --- Stock Movement History ---
  async getStockMovements(medicineId?: string, limit = 50): Promise<StockMovement[]> {
    try {
      const url = medicineId
        ? `/inventory/${medicineId}/movements?limit=${limit}`
        : `/inventory/movements?limit=${limit}`;
      const response = await apiClient.get<{ status: string; data: StockMovement[] }>(url);
      return response.data.data;
    } catch (err) {
      return handleApiError(err, 'Failed to fetch stock movements.');
    }
  },

  // --- Inventory Alerts ---
  async getInventoryAlerts(): Promise<InventoryAlertsData> {
    try {
      const response = await apiClient.get<{ status: string; data: InventoryAlertsData }>(
        '/inventory/alerts'
      );
      return response.data.data;
    } catch (err) {
      return handleApiError(err, 'Failed to fetch inventory alerts.');
    }
  },

  // --- FEFO Allocation Simulation/Execution ---
  async allocateFefo(medicineId: string, quantity: number, reason?: string): Promise<FefoAllocationResult> {
    try {
      const response = await apiClient.post<{ status: string; data: FefoAllocationResult }>(
        '/inventory/fefo-allocate',
        { medicineId, quantity, reason }
      );
      return response.data.data;
    } catch (err) {
      return handleApiError(err, 'Failed to allocate FEFO stock.');
    }
  },

  // --- Supabase / Database Status ---
  async getDatabaseStatus(): Promise<{ isConfigured: boolean; isConnected: boolean; message: string }> {
    try {
      const response = await apiClient.get<{
        status: string;
        data: { isConfigured: boolean; isConnected: boolean; message: string };
      }>('/inventory/database-status');
      return response.data.data;
    } catch (err) {
      return handleApiError(err, 'Failed to check database status.');
    }
  },

  // --- Suppliers ---
  async getSuppliers(search?: string): Promise<Supplier[]> {
    try {
      const response = await apiClient.get<{ status: string; data: Supplier[] }>('/suppliers', {
        params: { search },
      });
      return response.data.data;
    } catch (err) {
      return handleApiError(err, 'Failed to fetch suppliers.');
    }
  },

  async getSupplierById(id: string): Promise<Supplier & { purchases?: Purchase[] }> {
    try {
      const response = await apiClient.get<{ status: string; data: Supplier & { purchases?: Purchase[] } }>(
        `/suppliers/${id}`
      );
      return response.data.data;
    } catch (err) {
      return handleApiError(err, 'Failed to fetch supplier details.');
    }
  },

  async createSupplier(data: {
    name: string;
    contactPerson?: string;
    phone: string;
    email?: string;
    address?: string;
  }): Promise<Supplier> {
    try {
      const response = await apiClient.post<{ status: string; data: Supplier }>('/suppliers', data);
      return response.data.data;
    } catch (err) {
      return handleApiError(err, 'Failed to create supplier.');
    }
  },

  async updateSupplier(
    id: string,
    data: {
      name?: string;
      contactPerson?: string;
      phone?: string;
      email?: string;
      address?: string;
    }
  ): Promise<Supplier> {
    try {
      const response = await apiClient.put<{ status: string; data: Supplier }>(`/suppliers/${id}`, data);
      return response.data.data;
    } catch (err) {
      return handleApiError(err, 'Failed to update supplier.');
    }
  },

  async deleteSupplier(id: string): Promise<void> {
    try {
      await apiClient.delete(`/suppliers/${id}`);
    } catch (err) {
      return handleApiError(err, 'Failed to delete supplier.');
    }
  },

  // --- Purchases ---
  async getPurchases(filter?: { supplierId?: string; date?: string }): Promise<Purchase[]> {
    try {
      const response = await apiClient.get<{ status: string; data: Purchase[] }>('/purchases', {
        params: filter,
      });
      return response.data.data;
    } catch (err) {
      return handleApiError(err, 'Failed to fetch purchases history.');
    }
  },

  async getPurchaseById(id: string): Promise<Purchase> {
    try {
      const response = await apiClient.get<{ status: string; data: Purchase }>(`/purchases/${id}`);
      return response.data.data;
    } catch (err) {
      return handleApiError(err, 'Failed to fetch purchase details.');
    }
  },

  async createPurchase(data: {
    supplierId: string;
    items: PurchaseItemInput[];
    notes?: string;
  }): Promise<Purchase> {
    try {
      const response = await apiClient.post<{ status: string; data: Purchase }>('/purchases', data);
      return response.data.data;
    } catch (err) {
      return handleApiError(err, 'Failed to record purchase.');
    }
  },

  // --- Sales ---
  async getSales(filter?: { search?: string; date?: string }): Promise<Sale[]> {
    try {
      const response = await apiClient.get<{ status: string; data: Sale[] }>('/sales', {
        params: filter,
      });
      return response.data.data;
    } catch (err) {
      return handleApiError(err, 'Failed to fetch sales history.');
    }
  },

  async getSaleById(id: string): Promise<Sale> {
    try {
      const response = await apiClient.get<{ status: string; data: Sale }>(`/sales/${id}`);
      return response.data.data;
    } catch (err) {
      return handleApiError(err, 'Failed to fetch sale details.');
    }
  },

  async createSale(data: {
    customerName?: string;
    items: { medicineId: string; quantity: number }[];
    idempotencyKey?: string;
  }): Promise<Sale> {
    try {
      const response = await apiClient.post<{
        status: string;
        message: string;
        data: Sale;
      }>('/sales', data);
      return response.data.data;
    } catch (err) {
      return handleApiError(err, 'Failed to complete sale transaction.');
    }
  },

  async recordSale(medicineId: string, quantity: number): Promise<{ sale: SaleRecord; updatedMedicine: Medicine }> {
    try {
      const response = await apiClient.post<{
        status: string;
        message: string;
        data: { sale: SaleRecord; updatedMedicine: Medicine };
      }>('/sales', { medicineId, quantity });
      return response.data.data;
    } catch (err) {
      return handleApiError(err, 'Failed to record sale.');
    }
  },

  // --- Settings ---
  async getSettings(): Promise<ShopSettings> {
    try {
      const response = await apiClient.get<{ status: string; data: ShopSettings }>('/settings');
      return response.data.data;
    } catch (err) {
      return handleApiError(err, 'Failed to fetch shop settings.');
    }
  },

  async updateSettings(settings: Partial<ShopSettings>): Promise<ShopSettings> {
    try {
      const response = await apiClient.put<{ status: string; data: ShopSettings }>('/settings', settings);
      return response.data.data;
    } catch (err) {
      return handleApiError(err, 'Failed to save shop settings.');
    }
  },
};

export default apiService;
