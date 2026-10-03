import axios, { AxiosError } from 'axios';
import { Medicine, SaleRecord, ShopSettings, DashboardStats } from '../types';

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 8000,
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

  // --- Inventory ---
  async getInventory(): Promise<Medicine[]> {
    try {
      const response = await apiClient.get<{ status: string; data: Medicine[] }>('/inventory');
      return response.data.data;
    } catch (err) {
      return handleApiError(err, 'Failed to fetch inventory.');
    }
  },

  async addMedicine(data: {
    name: string;
    category: string;
    price: number;
    minStock: number;
    batchNumber: string;
    quantity: number;
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
      category?: string;
      price?: number;
      minStock?: number;
      batches?: { batchNumber: string; quantity: number; expiryDate: string }[];
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

  // --- Sales ---
  async getSales(): Promise<SaleRecord[]> {
    try {
      const response = await apiClient.get<{ status: string; data: SaleRecord[] }>('/sales');
      return response.data.data;
    } catch (err) {
      return handleApiError(err, 'Failed to fetch sales history.');
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
