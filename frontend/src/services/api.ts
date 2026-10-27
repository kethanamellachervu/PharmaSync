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
  DashboardAnalyticsData,
  SalesAnalyticsData,
  InventoryAnalyticsData,
  PurchasesAnalyticsData,
  SalesReportRow,
  InventoryReportRow,
  ExpiryReportRow,
  PurchaseReportRow,
  InventoryAlertsData,
  FefoAllocationResult,
  ForecastOverview,
  MedicineForecastSummary,
  MedicineForecastDetail,
  ReorderRecommendation,
  ForecastSettings,
  DemandTrend,
  ReorderUrgency,
  ReviewStatus,
  ExtractedBillData,
  ConfirmBillInput,
  ConfirmBillResult,
  MlDatasetInfo,
  MlModelMetrics,
  MlForecastingFullResult,
  PurchaseRequest,
  SupplierConversation,
  SupplierMessage,
  InAppNotification,
  ProcurementSummary,
} from '../types';

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 seconds default
  headers: {
    'Content-Type': 'application/json',
  },
});

function handleApiError(err: unknown, defaultMsg: string): never {
  const error = err as AxiosError<{ message?: string }>;
  if (error.code === 'ECONNABORTED' || (error.message && error.message.includes('timeout'))) {
    throw new Error('Request timed out. The AI model or database took longer than expected to respond. Please retry.');
  }
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

  // --- AI Bill Scanning & Processing ---
  async getOcrStatus(): Promise<{
    isConfigured: boolean;
    geminiConfigured: boolean;
    openaiConfigured: boolean;
    supportedFormats?: string[];
    maxFileSizeMb?: number;
    recommendation?: string;
  }> {
    try {
      const response = await apiClient.get<{
        status: string;
        data: {
          isConfigured: boolean;
          geminiConfigured: boolean;
          openaiConfigured: boolean;
          supportedFormats?: string[];
          maxFileSizeMb?: number;
          recommendation?: string;
        };
      }>('/purchases/ocr-status');
      return response.data.data;
    } catch (err) {
      return handleApiError(err, 'Failed to fetch OCR status.');
    }
  },

  async scanBill(
    fileOrPayload: File | { fileData: string; mimeType: string; fileName: string }
  ): Promise<ExtractedBillData> {
    try {
      if (fileOrPayload instanceof File) {
        const formData = new FormData();
        formData.append('billFile', fileOrPayload);
        const response = await apiClient.post<{ status: string; data: ExtractedBillData }>(
          '/purchases/scan-bill',
          formData,
          {
            headers: { 'Content-Type': 'multipart/form-data' },
            timeout: 90000, // 90s timeout for Gemini AI image/PDF OCR analysis
          }
        );
        return response.data.data;
      } else {
        const response = await apiClient.post<{ status: string; data: ExtractedBillData }>(
          '/purchases/scan-bill',
          fileOrPayload,
          {
            timeout: 90000, // 90s timeout for Gemini AI image/PDF OCR analysis
          }
        );
        return response.data.data;
      }
    } catch (err) {
      return handleApiError(err, 'Failed to scan and extract purchase bill data.');
    }
  },

  async confirmBill(payload: ConfirmBillInput): Promise<ConfirmBillResult> {
    try {
      const response = await apiClient.post<{ status: string; data: ConfirmBillResult }>(
        '/purchases/confirm-bill',
        payload,
        {
          timeout: 60000, // 60s timeout for multi-table Supabase transactional commit
        }
      );
      return response.data.data;
    } catch (err) {
      return handleApiError(err, 'Failed to confirm and record bill purchase.');
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

  // --- Phase 4: Analytics ---
  async getDashboardAnalytics(): Promise<DashboardAnalyticsData> {
    try {
      const response = await apiClient.get<{ status: string; data: DashboardAnalyticsData }>(
        '/analytics/dashboard'
      );
      return response.data.data;
    } catch (err) {
      return handleApiError(err, 'Failed to fetch dashboard analytics.');
    }
  },

  async getSalesAnalytics(params?: {
    startDate?: string;
    endDate?: string;
    groupBy?: 'day' | 'week' | 'month';
  }): Promise<SalesAnalyticsData> {
    try {
      const response = await apiClient.get<{ status: string; data: SalesAnalyticsData }>(
        '/analytics/sales',
        { params }
      );
      return response.data.data;
    } catch (err) {
      return handleApiError(err, 'Failed to fetch sales analytics.');
    }
  },

  async getInventoryAnalytics(): Promise<InventoryAnalyticsData> {
    try {
      const response = await apiClient.get<{ status: string; data: InventoryAnalyticsData }>(
        '/analytics/inventory'
      );
      return response.data.data;
    } catch (err) {
      return handleApiError(err, 'Failed to fetch inventory analytics.');
    }
  },

  async getPurchasesAnalytics(params?: {
    startDate?: string;
    endDate?: string;
  }): Promise<PurchasesAnalyticsData> {
    try {
      const response = await apiClient.get<{ status: string; data: PurchasesAnalyticsData }>(
        '/analytics/purchases',
        { params }
      );
      return response.data.data;
    } catch (err) {
      return handleApiError(err, 'Failed to fetch purchase analytics.');
    }
  },

  // --- Phase 4: Reports ---
  async getSalesReport(params?: { startDate?: string; endDate?: string }): Promise<SalesReportRow[]> {
    try {
      const response = await apiClient.get<{ status: string; data: SalesReportRow[] }>('/reports/sales', {
        params,
      });
      return response.data.data;
    } catch (err) {
      return handleApiError(err, 'Failed to generate sales report.');
    }
  },

  async getInventoryReport(params?: {
    category?: string;
    stockStatus?: string;
  }): Promise<InventoryReportRow[]> {
    try {
      const response = await apiClient.get<{ status: string; data: InventoryReportRow[] }>(
        '/reports/inventory',
        { params }
      );
      return response.data.data;
    } catch (err) {
      return handleApiError(err, 'Failed to generate inventory report.');
    }
  },

  async getExpiryReport(params?: { status?: string }): Promise<ExpiryReportRow[]> {
    try {
      const response = await apiClient.get<{ status: string; data: ExpiryReportRow[] }>(
        '/reports/expiry',
        { params }
      );
      return response.data.data;
    } catch (err) {
      return handleApiError(err, 'Failed to generate expiry report.');
    }
  },

  async getPurchaseReport(params?: {
    supplierId?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<PurchaseReportRow[]> {
    try {
      const response = await apiClient.get<{ status: string; data: PurchaseReportRow[] }>(
        '/reports/purchases',
        { params }
      );
      return response.data.data;
    } catch (err) {
      return handleApiError(err, 'Failed to generate purchase report.');
    }
  },

  // --- Phase 5: Demand Forecasting ---
  async getForecastOverview(period?: number): Promise<ForecastOverview> {
    try {
      const response = await apiClient.get<{ status: string; data: ForecastOverview }>(
        '/forecast/overview',
        { params: { period } }
      );
      return response.data.data;
    } catch (err) {
      return handleApiError(err, 'Failed to fetch forecasting overview.');
    }
  },

  async getMedicineForecasts(params?: {
    search?: string;
    trend?: DemandTrend | 'all';
    urgency?: ReorderUrgency | 'all';
    period?: number;
  }): Promise<MedicineForecastSummary[]> {
    try {
      const response = await apiClient.get<{ status: string; total: number; data: MedicineForecastSummary[] }>(
        '/forecast/medicines',
        { params }
      );
      return response.data.data;
    } catch (err) {
      return handleApiError(err, 'Failed to fetch medicine forecasts.');
    }
  },

  async getMedicineForecastById(id: string, period?: number): Promise<MedicineForecastDetail> {
    try {
      const response = await apiClient.get<{ status: string; data: MedicineForecastDetail }>(
        `/forecast/medicines/${id}`,
        { params: { period } }
      );
      return response.data.data;
    } catch (err) {
      return handleApiError(err, `Failed to fetch forecast details for medicine.`);
    }
  },

  async getForecastSettings(): Promise<ForecastSettings> {
    try {
      const response = await apiClient.get<{ status: string; data: ForecastSettings }>('/forecast/settings');
      return response.data.data;
    } catch (err) {
      return handleApiError(err, 'Failed to fetch forecast settings.');
    }
  },

  async updateForecastSettings(settings: Partial<ForecastSettings>): Promise<ForecastSettings> {
    try {
      const response = await apiClient.put<{ status: string; data: ForecastSettings }>(
        '/forecast/settings',
        settings
      );
      return response.data.data;
    } catch (err) {
      return handleApiError(err, 'Failed to update forecast settings.');
    }
  },

  // --- Scikit-learn GradientBoostingRegressor ML Demand Forecasting ---
  async getMlPredictions(horizon: 7 | 30 = 30): Promise<MlForecastingFullResult> {
    try {
      const response = await apiClient.get<{ status: string; data: MlForecastingFullResult }>(
        '/forecast/ml-predictions',
        { params: { horizon } }
      );
      return response.data.data;
    } catch (err) {
      return handleApiError(err, 'Failed to fetch GradientBoostingRegressor ML predictions.');
    }
  },

  async getHistoricalDatasetInfo(): Promise<MlDatasetInfo> {
    try {
      const response = await apiClient.get<{ status: string; data: MlDatasetInfo }>(
        '/forecast/historical-dataset'
      );
      return response.data.data;
    } catch (err) {
      return handleApiError(err, 'Failed to fetch historical dataset metadata.');
    }
  },

  async importHistoricalCsv(): Promise<any> {
    try {
      const response = await apiClient.post<{ status: string; data: any; message?: string }>(
        '/forecast/import-historical'
      );
      return response.data;
    } catch (err) {
      return handleApiError(err, 'Failed to import historical sales CSV into Supabase.');
    }
  },

  async retrainMlModel(): Promise<any> {
    try {
      const response = await apiClient.post<{ status: string; message: string; metrics: MlModelMetrics }>(
        '/forecast/retrain'
      );
      return response.data;
    } catch (err) {
      return handleApiError(err, 'Failed to retrain GradientBoostingRegressor model.');
    }
  },

  // --- Phase 5: Smart Reordering ---
  async getReorderRecommendations(params?: {
    urgency?: ReorderUrgency | 'all';
    category?: string;
    stockStatus?: string;
    reviewStatus?: ReviewStatus | 'all';
    horizonDays?: number;
  }): Promise<ReorderRecommendation[]> {
    try {
      const response = await apiClient.get<{ status: string; total: number; data: ReorderRecommendation[] }>(
        '/reorder/recommendations',
        { params }
      );
      return response.data.data;
    } catch (err) {
      return handleApiError(err, 'Failed to fetch reorder recommendations.');
    }
  },

  async reviewReorderRecommendation(
    id: string,
    data: {
      status: ReviewStatus;
      adjustedQuantity?: number;
      notes?: string;
    }
  ): Promise<ReorderRecommendation> {
    try {
      const response = await apiClient.patch<{ status: string; data: ReorderRecommendation }>(
        `/reorder/recommendations/${id}/review`,
        data
      );
      return response.data.data;
    } catch (err) {
      return handleApiError(err, 'Failed to update review status.');
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

  // --- Procurement & Admin Approval Workflow ---
  async getPurchaseRequests(params?: { status?: string; medicineId?: string }): Promise<PurchaseRequest[]> {
    try {
      const response = await apiClient.get<{ status: string; data: PurchaseRequest[] }>('/procurement/purchase-requests', { params });
      return response.data.data;
    } catch (err) {
      return handleApiError(err, 'Failed to fetch purchase requests.');
    }
  },

  async approvePurchaseRequest(id: string, approvedBy = 'Admin (Store Manager)'): Promise<{ request: PurchaseRequest; conversation: SupplierConversation }> {
    try {
      const response = await apiClient.post<{ status: string; data: { request: PurchaseRequest; conversation: SupplierConversation } }>(
        `/procurement/purchase-requests/${id}/approve`,
        { approvedBy }
      );
      return response.data.data;
    } catch (err) {
      return handleApiError(err, 'Failed to approve purchase request.');
    }
  },

  async rejectPurchaseRequest(id: string, rejectionReason: string): Promise<PurchaseRequest> {
    try {
      const response = await apiClient.post<{ status: string; data: PurchaseRequest }>(
        `/procurement/purchase-requests/${id}/reject`,
        { rejectionReason }
      );
      return response.data.data;
    } catch (err) {
      return handleApiError(err, 'Failed to reject purchase request.');
    }
  },

  async getSupplierConversations(): Promise<SupplierConversation[]> {
    try {
      const response = await apiClient.get<{ status: string; data: SupplierConversation[] }>('/procurement/supplier-conversations');
      return response.data.data;
    } catch (err) {
      return handleApiError(err, 'Failed to fetch supplier conversations.');
    }
  },

  async getSupplierConversationById(id: string): Promise<{ conversation: SupplierConversation; messages: SupplierMessage[] }> {
    try {
      const response = await apiClient.get<{ status: string; data: { conversation: SupplierConversation; messages: SupplierMessage[] } }>(
        `/procurement/supplier-conversations/${id}`
      );
      return response.data.data;
    } catch (err) {
      return handleApiError(err, 'Failed to fetch supplier conversation details.');
    }
  },

  async sendSupplierMessage(id: string, message: string, senderType: 'supplier' | 'ai' | 'system' = 'supplier'): Promise<{ conversation: SupplierConversation; messages: SupplierMessage[] }> {
    try {
      const response = await apiClient.post<{ status: string; data: { conversation: SupplierConversation; messages: SupplierMessage[] } }>(
        `/procurement/supplier-conversations/${id}/messages`,
        { message, senderType }
      );
      return response.data.data;
    } catch (err) {
      return handleApiError(err, 'Failed to send supplier message.');
    }
  },

  async getNotifications(role?: string): Promise<InAppNotification[]> {
    try {
      const response = await apiClient.get<{ status: string; data: InAppNotification[] }>('/procurement/notifications', { params: { role } });
      return response.data.data;
    } catch (err) {
      return handleApiError(err, 'Failed to fetch notifications.');
    }
  },

  async markNotificationRead(id: string): Promise<boolean> {
    try {
      const response = await apiClient.post<{ status: string; data: { success: boolean } }>(`/procurement/notifications/${id}/read`);
      return response.data.data.success;
    } catch (err) {
      return handleApiError(err, 'Failed to mark notification read.');
    }
  },

  async getProcurementSummary(): Promise<ProcurementSummary> {
    try {
      const response = await apiClient.get<{ status: string; data: ProcurementSummary }>('/procurement/summary');
      return response.data.data;
    } catch (err) {
      return handleApiError(err, 'Failed to fetch procurement summary.');
    }
  },
};

export default apiService;
