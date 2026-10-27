export * from '../types/pharmacy.js';
import {
  MedicineWithBatches,
  MedicineBatch,
  StockMovement,
  Supplier,
  Purchase,
  Sale,
  FefoAllocationResult,
  ShopSettings,
  ConfirmBillInput,
  ConfirmBillResult,
} from '../types/pharmacy.js';
import { testSupabaseConnection } from '../config/supabase.js';
import { envConfig } from '../config/env.js';
import { supabaseService } from './supabaseService.js';
import { inMemoryStore } from './inMemoryStore.js';

export class PharmacyStore {
  private dbConnected: boolean | null = null;
  private lastCheckTime: number = 0;

  /**
   * Checks whether Supabase PostgreSQL is configured and active.
   * Caches result for 5 seconds to prevent overhead.
   */
  public async isUsingSupabase(): Promise<boolean> {
    if (!envConfig.isSupabaseConfigured) {
      return false;
    }
    const now = Date.now();
    if (this.dbConnected !== null && now - this.lastCheckTime < 5000) {
      return this.dbConnected;
    }
    this.lastCheckTime = now;
    try {
      const status = await testSupabaseConnection();
      this.dbConnected = status.isConnected;
      return this.dbConnected;
    } catch {
      this.dbConnected = false;
      return false;
    }
  }

  /**
   * Backward-compatible alias for isUsingSupabase.
   */
  public async isUsingPostgres(): Promise<boolean> {
    return this.isUsingSupabase();
  }

  // ---------------------------------------------------------------------------
  // SUPPLIERS
  // ---------------------------------------------------------------------------
  public async getAllSuppliers(search?: string): Promise<Supplier[]> {
    if (await this.isUsingSupabase()) {
      return supabaseService.getAllSuppliers(search);
    }
    return inMemoryStore.getAllSuppliers(search);
  }

  public async getSupplierById(id: string): Promise<Supplier | null> {
    if (await this.isUsingSupabase()) {
      return supabaseService.getSupplierById(id);
    }
    return inMemoryStore.getSupplierById(id);
  }

  public async addSupplier(data: {
    name: string;
    contactPerson?: string;
    phone: string;
    email?: string;
    address?: string;
  }): Promise<Supplier> {
    if (await this.isUsingSupabase()) {
      return supabaseService.addSupplier(data);
    }
    return inMemoryStore.addSupplier(data);
  }

  public async updateSupplier(
    id: string,
    data: {
      name?: string;
      contactPerson?: string;
      phone?: string;
      email?: string;
      address?: string;
    }
  ): Promise<Supplier | null> {
    if (await this.isUsingSupabase()) {
      return supabaseService.updateSupplier(id, data);
    }
    return inMemoryStore.updateSupplier(id, data);
  }

  public async deleteSupplier(id: string): Promise<boolean> {
    if (await this.isUsingSupabase()) {
      return supabaseService.deleteSupplier(id);
    }
    return inMemoryStore.deleteSupplier(id);
  }

  // ---------------------------------------------------------------------------
  // PURCHASES
  // ---------------------------------------------------------------------------
  public async getAllPurchases(filter?: { supplierId?: string; date?: string }): Promise<Purchase[]> {
    if (await this.isUsingSupabase()) {
      return supabaseService.getAllPurchases(filter);
    }
    return inMemoryStore.getAllPurchases(filter);
  }

  public async getPurchaseById(id: string): Promise<Purchase | null> {
    if (await this.isUsingSupabase()) {
      return supabaseService.getPurchaseById(id);
    }
    return inMemoryStore.getPurchaseById(id);
  }

  public async createPurchase(data: {
    supplierId: string;
    items: {
      medicineId: string;
      batchNumber: string;
      quantity: number;
      purchasePrice: number;
      expiryDate: string;
      mfgDate?: string;
    }[];
    notes?: string;
  }): Promise<Purchase> {
    if (await this.isUsingSupabase()) {
      return supabaseService.createPurchase(data);
    }
    return inMemoryStore.createPurchase(data);
  }

  // ---------------------------------------------------------------------------
  // SALES
  // ---------------------------------------------------------------------------
  public async getAllSales(filter?: { search?: string; date?: string }): Promise<Sale[]> {
    if (await this.isUsingSupabase()) {
      return supabaseService.getAllSales(filter);
    }
    return inMemoryStore.getAllSales(filter);
  }

  public async getSaleById(id: string): Promise<Sale | null> {
    if (await this.isUsingSupabase()) {
      return supabaseService.getSaleById(id);
    }
    return inMemoryStore.getSaleById(id);
  }

  public async createSale(data: {
    customerName?: string;
    items: {
      medicineId: string;
      quantity: number;
    }[];
    idempotencyKey?: string;
  }): Promise<Sale> {
    if (await this.isUsingSupabase()) {
      return supabaseService.createSale(data);
    }
    return inMemoryStore.createSale(data);
  }

  public async recordSale(medicineId: string, quantity: number) {
    if (await this.isUsingSupabase()) {
      return supabaseService.recordSale(medicineId, quantity);
    }
    return inMemoryStore.recordSale(medicineId, quantity);
  }

  public async getNextInvoiceNumber(): Promise<string> {
    if (await this.isUsingSupabase()) {
      return supabaseService.getNextInvoiceNumber();
    }
    return inMemoryStore.getNextInvoiceNumber();
  }

  public async getTodaySalesAmount(): Promise<number> {
    if (await this.isUsingSupabase()) {
      return supabaseService.getTodaySalesAmount();
    }
    return inMemoryStore.getTodaySalesAmount();
  }

  public async getTodayPurchaseAmount(): Promise<number> {
    if (await this.isUsingSupabase()) {
      return supabaseService.getTodayPurchaseAmount();
    }
    return inMemoryStore.getTodayPurchaseAmount();
  }

  public async getMonthSalesAmount(): Promise<number> {
    if (await this.isUsingSupabase()) {
      return supabaseService.getMonthSalesAmount();
    }
    return inMemoryStore.getMonthSalesAmount();
  }

  public async getRecentSalesTrend(days = 7): Promise<{ date: string; label: string; amount: number; count: number }[]> {
    if (await this.isUsingSupabase()) {
      return supabaseService.getRecentSalesTrend(days);
    }
    return inMemoryStore.getRecentSalesTrend(days);
  }

  public async getCategoryDistribution(): Promise<{ category: string; medicineCount: number; usableStock: number; totalValue: number }[]> {
    if (await this.isUsingSupabase()) {
      return supabaseService.getCategoryDistribution();
    }
    return inMemoryStore.getCategoryDistribution();
  }

  // ---------------------------------------------------------------------------
  // SETTINGS
  // ---------------------------------------------------------------------------
  public async getSettings(): Promise<ShopSettings> {
    if (await this.isUsingSupabase()) {
      return supabaseService.getShopSettings();
    }
    return inMemoryStore.getSettings();
  }

  public async updateSettings(newSettings: Partial<ShopSettings>): Promise<ShopSettings> {
    if (await this.isUsingSupabase()) {
      return supabaseService.updateShopSettings(newSettings);
    }
    return inMemoryStore.updateSettings(newSettings);
  }

  // ---------------------------------------------------------------------------
  // MEDICINES & BATCHES
  // ---------------------------------------------------------------------------
  public async getAllMedicines(): Promise<MedicineWithBatches[]> {
    if (await this.isUsingSupabase()) {
      return supabaseService.getAllMedicines();
    }
    return inMemoryStore.getAllMedicines();
  }

  public async getMedicineById(id: string): Promise<MedicineWithBatches | null> {
    if (await this.isUsingSupabase()) {
      return supabaseService.getMedicineById(id);
    }
    return inMemoryStore.getMedicineById(id);
  }

  public async addMedicine(data: {
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
  }): Promise<MedicineWithBatches> {
    if (await this.isUsingSupabase()) {
      return supabaseService.addMedicine(data);
    }
    return inMemoryStore.addMedicine(data);
  }

  public async updateMedicine(
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
  ): Promise<MedicineWithBatches | null> {
    if (await this.isUsingSupabase()) {
      return supabaseService.updateMedicine(id, data);
    }
    return inMemoryStore.updateMedicine(id, data);
  }

  public async deleteMedicine(id: string): Promise<boolean> {
    if (await this.isUsingSupabase()) {
      return supabaseService.deleteMedicine(id);
    }
    return inMemoryStore.deleteMedicine(id);
  }

  public async getBatches(medicineId: string): Promise<MedicineBatch[]> {
    if (await this.isUsingSupabase()) {
      return supabaseService.getBatches(medicineId);
    }
    return inMemoryStore.getBatches(medicineId);
  }

  public async addBatch(
    medicineId: string,
    data: {
      batchNumber: string;
      quantity: number;
      mfgDate?: string;
      expiryDate: string;
      reason?: string;
    }
  ): Promise<MedicineBatch> {
    if (await this.isUsingSupabase()) {
      return supabaseService.addBatch(medicineId, data);
    }
    return inMemoryStore.addBatch(medicineId, data);
  }

  public async updateBatch(
    medicineId: string,
    batchId: string,
    data: {
      batchNumber?: string;
      quantity?: number;
      mfgDate?: string;
      expiryDate?: string;
      reason?: string;
    }
  ): Promise<MedicineBatch | null> {
    if (await this.isUsingSupabase()) {
      return supabaseService.updateBatch(medicineId, batchId, data);
    }
    return inMemoryStore.updateBatch(medicineId, batchId, data);
  }

  public async getStockMovements(
    medicineId?: string,
    limit = 50
  ): Promise<(StockMovement & { medicineName: string })[]> {
    if (await this.isUsingSupabase()) {
      return supabaseService.getStockMovements(medicineId, limit);
    }
    return inMemoryStore.getStockMovements(medicineId, limit);
  }

  public async allocateFefo(
    medicineId: string,
    requestedQuantity: number,
    reason = 'Dispensed / Sold'
  ): Promise<FefoAllocationResult> {
    if (await this.isUsingSupabase()) {
      return supabaseService.allocateFefo(medicineId, requestedQuantity, reason);
    }
    return inMemoryStore.allocateFefo(medicineId, requestedQuantity, reason);
  }

  public async getInventoryAlerts() {
    if (await this.isUsingSupabase()) {
      return supabaseService.getInventoryAlerts();
    }
    return inMemoryStore.getInventoryAlerts();
  }

  // ---------------------------------------------------------------------------
  // ANALYTICS & REPORTS
  // ---------------------------------------------------------------------------
  public async getDashboardAnalytics() {
    if (await this.isUsingSupabase()) {
      return supabaseService.getDashboardAnalytics();
    }
    return inMemoryStore.getDashboardAnalytics();
  }

  public async getSalesAnalytics(params?: { startDate?: string; endDate?: string; groupBy?: 'day' | 'week' | 'month' }) {
    if (await this.isUsingSupabase()) {
      return supabaseService.getSalesAnalytics(params);
    }
    return inMemoryStore.getSalesAnalytics(params);
  }

  public async getInventoryAnalytics() {
    if (await this.isUsingSupabase()) {
      return supabaseService.getInventoryAnalytics();
    }
    return inMemoryStore.getInventoryAnalytics();
  }

  public async getPurchaseAnalytics(params?: { startDate?: string; endDate?: string }) {
    if (await this.isUsingSupabase()) {
      return supabaseService.getPurchaseAnalytics(params);
    }
    return inMemoryStore.getPurchaseAnalytics(params);
  }

  public async getSalesReportData(params?: { startDate?: string; endDate?: string }) {
    if (await this.isUsingSupabase()) {
      return supabaseService.getSalesReportData(params);
    }
    return inMemoryStore.getSalesReportData(params);
  }

  public async getInventoryReportData(params?: { category?: string; stockStatus?: string }) {
    if (await this.isUsingSupabase()) {
      return supabaseService.getInventoryReportData(params);
    }
    return inMemoryStore.getInventoryReportData(params);
  }

  public async getExpiryReportData(status?: 'all' | 'near_expiry' | 'expired') {
    if (await this.isUsingSupabase()) {
      return supabaseService.getExpiryReportData(status);
    }
    return inMemoryStore.getExpiryReportData(status);
  }

  public async getPurchaseReportData(params?: { supplierId?: string; startDate?: string; endDate?: string }) {
    if (await this.isUsingSupabase()) {
      return supabaseService.getPurchaseReportData(params);
    }
    return inMemoryStore.getPurchaseReportData(params);
  }

  // ---------------------------------------------------------------------------
  // AI BILL INVENTORY INTAKE & TRANSACTIONAL SAVE
  // ---------------------------------------------------------------------------
  public async confirmBillPurchase(data: ConfirmBillInput): Promise<ConfirmBillResult> {
    if (await this.isUsingSupabase()) {
      return supabaseService.confirmBillPurchase(data);
    }
    return inMemoryStore.confirmBillPurchase(data);
  }

  // ---------------------------------------------------------------------------
  // PROCUREMENT & ADMIN APPROVAL WORKFLOW
  // ---------------------------------------------------------------------------
  public async getAllPurchaseRequests(filter?: { status?: string; medicineId?: string }) {
    if (await this.isUsingSupabase()) {
      return supabaseService.getAllPurchaseRequests(filter);
    }
    return inMemoryStore.getAllPurchaseRequests(filter);
  }

  public async getPurchaseRequestById(id: string) {
    if (await this.isUsingSupabase()) {
      return supabaseService.getPurchaseRequestById(id);
    }
    return inMemoryStore.getPurchaseRequestById(id);
  }

  public async generatePurchaseRequestFromRecommendation(data: any) {
    if (await this.isUsingSupabase()) {
      return supabaseService.generatePurchaseRequestFromRecommendation(data);
    }
    return inMemoryStore.generatePurchaseRequestFromRecommendation(data);
  }

  public async approvePurchaseRequest(id: string, approvedBy?: string) {
    if (await this.isUsingSupabase()) {
      return supabaseService.approvePurchaseRequest(id, approvedBy);
    }
    return inMemoryStore.approvePurchaseRequest(id, approvedBy);
  }

  public async rejectPurchaseRequest(id: string, rejectionReason: string) {
    if (await this.isUsingSupabase()) {
      return supabaseService.rejectPurchaseRequest(id, rejectionReason);
    }
    return inMemoryStore.rejectPurchaseRequest(id, rejectionReason);
  }

  public async getSupplierConversations() {
    if (await this.isUsingSupabase()) {
      return supabaseService.getSupplierConversations();
    }
    return inMemoryStore.getSupplierConversations();
  }

  public async getSupplierConversationById(id: string) {
    if (await this.isUsingSupabase()) {
      return supabaseService.getSupplierConversationById(id);
    }
    return inMemoryStore.getSupplierConversationById(id);
  }

  public async getSupplierMessages(conversationId: string) {
    if (await this.isUsingSupabase()) {
      return supabaseService.getSupplierMessages(conversationId);
    }
    return inMemoryStore.getSupplierMessages(conversationId);
  }

  public async sendSupplierMessage(conversationId: string, messageText: string, senderType?: 'supplier' | 'ai' | 'system') {
    if (await this.isUsingSupabase()) {
      return supabaseService.sendSupplierMessage(conversationId, messageText, senderType);
    }
    return inMemoryStore.sendSupplierMessage(conversationId, messageText, senderType);
  }

  public async getNotifications(role?: string) {
    if (await this.isUsingSupabase()) {
      return supabaseService.getNotifications(role);
    }
    return inMemoryStore.getNotifications(role);
  }

  public async markNotificationRead(id: string) {
    if (await this.isUsingSupabase()) {
      return supabaseService.markNotificationRead(id);
    }
    return inMemoryStore.markNotificationRead(id);
  }

  public async getProcurementSummary() {
    if (await this.isUsingSupabase()) {
      return supabaseService.getProcurementSummary();
    }
    return inMemoryStore.getProcurementSummary();
  }
}

export const pharmacyStore = new PharmacyStore();
