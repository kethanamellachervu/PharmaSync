import { LucideIcon } from 'lucide-react';

export interface MedicineBatch {
  id: string;
  medicineId: string;
  batchNumber: string;
  quantity: number;
  mfgDate?: string;
  expiryDate: string; // YYYY-MM-DD
  createdAt: string;
  updatedAt: string;
}

export interface StockMovement {
  id: string;
  medicineId: string;
  medicineName?: string;
  batchId?: string;
  batchNumber: string;
  movementType: 'Stock Added' | 'Stock Removed' | 'Adjustment';
  quantity: number;
  reason?: string;
  createdAt: string;
}

export interface Medicine {
  id: string;
  name: string;
  genericName?: string;
  category: string;
  manufacturer?: string;
  description?: string;
  unit: string;
  minStockLevel: number;
  minStock?: number;
  sellingPrice: number;
  price?: number;
  purchasePrice?: number;
  createdAt: string;
  updatedAt: string;
  batches: MedicineBatch[];
  usableStock: number;
  expiredStock: number;
  totalStock: number; // Usable stock
  totalPhysicalStock: number;
  isLowStock: boolean;
  isNearExpiry: boolean;
  isExpired: boolean;
  isOutOfStock: boolean;
  stockStatus: 'In Stock' | 'Low Stock' | 'Near Expiry' | 'Expired' | 'Out of Stock';
  earliestExpiry: string | null;
}

export interface Supplier {
  id: string;
  name: string;
  contactPerson?: string;
  phone: string;
  email?: string;
  address?: string;
  city?: string;
  district?: string;
  state?: string;
  pincode?: string;
  productCategories?: string[];
  medicinesSupplied?: string[];
  paymentTerms?: string;
  deliveryTime?: string;
  minOrderAmount?: number;
  status?: 'Active' | 'Inactive';
  totalPurchases?: number;
  lastPurchaseDate?: string | null;
  rating?: number;
  isDemo?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PurchaseItemInput {
  medicineId: string;
  batchNumber: string;
  quantity: number;
  purchasePrice: number;
  expiryDate: string; // YYYY-MM-DD
  mfgDate?: string;
}

export interface PurchaseItem {
  id: string;
  purchaseId: string;
  medicineId: string;
  medicineName: string;
  batchId?: string;
  batchNumber: string;
  quantity: number;
  purchasePrice: number;
  subtotal: number;
  expiryDate: string;
  mfgDate?: string;
}

export interface Purchase {
  id: string;
  purchaseNumber: string; // e.g. PO-1001
  supplierId: string;
  supplierName: string;
  items: PurchaseItem[];
  totalQuantity: number;
  totalAmount: number;
  notes?: string;
  createdAt: string;
}

export interface SaleBatchAllocation {
  batchId: string;
  batchNumber: string;
  quantity: number;
  expiryDate: string;
}

export interface SaleItem {
  id: string;
  saleId: string;
  medicineId: string;
  medicineName: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  batchAllocations: SaleBatchAllocation[];
}

export interface Sale {
  id: string;
  saleNumber: string; // e.g. INV-1001
  customerName: string;
  items: SaleItem[];
  totalItems: number;
  totalQuantity: number;
  totalAmount: number;
  idempotencyKey?: string;
  createdAt: string;

  // Backward compatibility fields for single-item display
  medicineId?: string;
  medicineName?: string;
  quantity?: number;
  unitPrice?: number;
  batchesDeducted?: {
    batchNumber: string;
    quantity: number;
    expiryDate: string;
  }[];
}

export type SaleRecord = Sale;

export interface ShopSettings {
  shopName: string;
  pharmacistName: string;
  nearExpiryDays: number;
}

export interface InventoryAlertsData {
  lowStockMedicines: Medicine[];
  outOfStockMedicines: Medicine[];
  nearExpiryBatches: {
    medicineId: string;
    medicineName: string;
    batchId: string;
    batchNumber: string;
    quantity: number;
    expiryDate: string;
    daysRemaining: number;
    unit: string;
  }[];
  expiredBatches: {
    medicineId: string;
    medicineName: string;
    batchId: string;
    batchNumber: string;
    quantity: number;
    expiryDate: string;
    daysRemaining: number;
    unit: string;
  }[];
  summary: {
    totalMedicines: number;
    totalUsableUnits: number;
    lowStockCount: number;
    outOfStockCount: number;
    nearExpiryBatchCount: number;
    expiredBatchCount: number;
  };
}

export interface FefoAllocationResult {
  success: boolean;
  medicineId: string;
  medicineName: string;
  requestedQuantity: number;
  allocatedBatches: {
    batchId: string;
    batchNumber: string;
    quantity: number;
    expiryDate: string;
  }[];
  usableStockRemaining: number;
  error?: string;
}

export interface DashboardStats {
  totalMedicines: number;
  availableStock: number;
  lowStockCount: number;
  outOfStockCount?: number;
  nearExpiryBatchCount?: number;
  expiredBatchCount?: number;
  todaySalesAmount: number;
  todayPurchaseAmount?: number;
  monthSalesAmount?: number;
  totalSuppliers?: number;
  activeSuppliers?: number;
  pendingPurchaseOrders?: number;
  totalPurchases?: number;
  totalPurchaseAmount?: number;
  lowStockMedicines: {
    id: string;
    name: string;
    category: string;
    totalStock: number;
    minStock: number;
    unit?: string;
  }[];
  nearExpiryMedicines: {
    medicineId: string;
    medicineName: string;
    batchNumber: string;
    quantity: number;
    expiryDate: string;
    daysRemaining: number;
  }[];
  expiredMedicines?: {
    medicineId: string;
    medicineName: string;
    batchNumber: string;
    quantity: number;
    expiryDate: string;
    daysRemaining: number;
  }[];
  recentSales: SaleRecord[];
  settings: ShopSettings;
}

export interface DashboardAnalyticsData {
  metrics: {
    totalMedicines: number;
    availableStock: number;
    lowStockCount: number;
    outOfStockCount: number;
    todaySalesAmount: number;
    todayPurchaseAmount: number;
    nearExpiryBatchCount: number;
    expiredBatchCount: number;
    monthSalesAmount: number;
  };
  salesTrend7Days: {
    date: string;
    label: string;
    amount: number;
    count: number;
  }[];
  categoryDistribution: {
    category: string;
    medicineCount: number;
    usableStock: number;
    totalValue: number;
  }[];
  lowStockMedicines: {
    id: string;
    name: string;
    category: string;
    totalStock: number;
    minStock: number;
    unit?: string;
  }[];
  nearExpiryBatches: {
    medicineId: string;
    medicineName: string;
    batchId: string;
    batchNumber: string;
    quantity: number;
    expiryDate: string;
    daysRemaining: number;
    unit: string;
  }[];
  recentSales: Sale[];
  recentPurchases: Purchase[];
  settings: ShopSettings;
}

export interface SalesAnalyticsData {
  summary: {
    totalSalesAmount: number;
    totalItemsSold: number;
    totalTransactions: number;
    averageOrderValue: number;
  };
  trend: {
    date: string;
    label: string;
    totalAmount: number;
    totalItems: number;
    transactionCount: number;
  }[];
}

export interface InventoryAnalyticsData {
  summary: {
    totalMedicines: number;
    totalUsableStock: number;
    totalExpiredStock: number;
    totalInventoryValue: number;
    lowStockCount: number;
    outOfStockCount: number;
    nearExpiryBatchCount: number;
    expiredBatchCount: number;
  };
  categoryDistribution: {
    category: string;
    medicineCount: number;
    usableStock: number;
    totalValue: number;
  }[];
  lowStockMedicines: Medicine[];
  outOfStockMedicines: Medicine[];
  nearExpiryBatches: {
    medicineId: string;
    medicineName: string;
    batchId: string;
    batchNumber: string;
    quantity: number;
    expiryDate: string;
    daysRemaining: number;
    unit: string;
  }[];
  expiredBatches: {
    medicineId: string;
    medicineName: string;
    batchId: string;
    batchNumber: string;
    quantity: number;
    expiryDate: string;
    daysRemaining: number;
    unit: string;
  }[];
}

export interface PurchasesAnalyticsData {
  summary: {
    totalPurchasesCount: number;
    totalPurchaseAmount: number;
    totalUnitsPurchased: number;
  };
  purchasesBySupplier: {
    supplierId: string;
    supplierName: string;
    purchaseCount: number;
    totalAmount: number;
    totalQuantity: number;
  }[];
  timeline: {
    date: string;
    label: string;
    totalAmount: number;
    totalQuantity: number;
    count: number;
  }[];
  recentPurchases: Purchase[];
}

export interface SalesReportRow {
  saleId: string;
  date: string;
  customer: string;
  numberOfItems: number;
  totalQuantity: number;
  totalAmount: number;
}

export interface InventoryReportRow {
  medicineName: string;
  genericName: string;
  category: string;
  unit: string;
  availableStock: number;
  minStockLevel: number;
  sellingPrice: number;
  stockStatus: string;
}

export interface ExpiryReportRow {
  medicineName: string;
  category: string;
  batchNumber: string;
  batchQuantity: number;
  expiryDate: string;
  daysRemaining: number;
  expiryStatus: 'Expired' | 'Near Expiry';
}

export interface PurchaseReportRow {
  purchaseId: string;
  supplierName: string;
  date: string;
  numberOfItems: number;
  totalQuantity: number;
  totalAmount: number;
}

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
}

// ==============================================================================
// PHASE 5: DEMAND FORECASTING & SMART REORDERING TYPES
// ==============================================================================

export type ForecastHorizon = 7 | 30 | 90;
export type DemandTrend = 'increasing' | 'decreasing' | 'stable' | 'insufficient_data' | 'no_sales';
export type ReorderUrgency = 'critical' | 'high' | 'medium' | 'low';
export type ReviewStatus = 'pending' | 'reviewed' | 'dismissed';

export interface ForecastSettings {
  defaultHorizonDays: number;
  safetyBufferDays: number;
  minDataDaysRequired: number;
  method: 'weighted_moving_average' | 'simple_moving_average' | 'trend_adjusted';
}

export interface MedicineForecastSummary {
  medicineId: string;
  medicineName: string;
  genericName?: string;
  category: string;
  unit: string;
  usableStock: number;
  expiredStock: number;
  minStockLevel: number;
  avgDailySales: number;
  predicted7DayDemand: number;
  predicted30DayDemand: number;
  predicted90DayDemand: number;
  predictedHorizonDemand: number;
  demandTrend: DemandTrend;
  trendGrowthPct: number;
  stockDepletionDays: number | null;
  urgency: ReorderUrgency;
  suggestedAction: string;
  confidence: 'high' | 'moderate' | 'low' | 'none';
  historicalDataDays: number;
  totalHistoricalUnitsSold: number;
}

export interface MedicineForecastDetail {
  summary: MedicineForecastSummary;
  medicine: Medicine;
  historicalSalesTimeline: {
    date: string;
    label: string;
    quantity: number;
  }[];
  projectedDemandTimeline: {
    date: string;
    label: string;
    forecastedDaily: number;
    cumulativeForecast: number;
    remainingStockProjected: number;
  }[];
  calculationDetails: {
    method: string;
    recent7DayAvg: number;
    previous14DayAvg: number;
    fullPeriodAvg: number;
    weightsApplied: { recent7d: number; prev14d: number; baseline: number };
    growthRatePct: number;
    safetyBufferApplied: number;
    explanation: string;
  };
  batchesBreakdown: {
    batchId: string;
    batchNumber: string;
    quantity: number;
    expiryDate: string;
    daysRemaining: number;
    isUsable: boolean;
    expiresWithinHorizon: boolean;
  }[];
}

export interface ReorderRecommendation {
  id: string;
  medicineId: string;
  medicineName: string;
  category: string;
  unit: string;
  currentUsableStock: number;
  minStockLevel: number;
  avgDailyDemand: number;
  planningHorizonDays: number;
  forecastedDemand: number;
  safetyBuffer: number;
  suggestedReorderQuantity: number;
  urgency: ReorderUrgency;
  reason: string;
  stockDepletionDays: number | null;
  sellingPrice: number;
  purchasePrice?: number;
  estimatedCost?: number;
  reviewStatus: ReviewStatus;
  adjustedQuantity?: number;
  reviewerNotes?: string;
  reviewedAt?: string;
}

export interface ForecastOverview {
  totalAnalyzed: number;
  increasingDemandCount: number;
  decreasingDemandCount: number;
  stableDemandCount: number;
  insufficientDataCount: number;
  noSalesCount: number;
  atRiskStockoutCount: number;
  totalForecasted30DayDemand: number;
  totalSuggestedReorderUnits: number;
  pendingReviewsCount: number;
  settings: ForecastSettings;
}

// -----------------------------------------------------------------------------
// BILL SCANNING & OCR EXTRACTION TYPES
// -----------------------------------------------------------------------------
export interface ExtractedBillItem {
  id: string;
  rawName: string;
  matchedMedicineId?: string | null;
  matchedMedicineName?: string | null;
  batchNumber?: string | null;
  quantity?: number | null;
  purchasePrice?: number | null;
  sellingPrice?: number | null;
  mfgDate?: string | null;
  expiryDate?: string | null;
  category?: string;
  unit?: string;
  confidence: 'high' | 'medium' | 'low';
  missingFields: string[];
}

export interface ExtractedBillData {
  supplierName?: string | null;
  matchedSupplierId?: string | null;
  invoiceNumber?: string | null;
  invoiceDate?: string | null;
  totalAmount?: number | null;
  items: ExtractedBillItem[];
  aiProviderUsed: string;
  confidence: 'high' | 'medium' | 'low';
  warnings: string[];
}

export interface ConfirmBillItemInput {
  medicineId?: string;
  isNewMedicine: boolean;
  name: string;
  genericName?: string;
  category: string;
  manufacturer?: string;
  description?: string;
  unit: string;
  minStockLevel?: number;
  sellingPrice: number;
  purchasePrice: number;
  batchNumber: string;
  quantity: number;
  mfgDate?: string;
  expiryDate: string;
}

export interface ConfirmBillInput {
  supplierId?: string;
  supplierName: string;
  supplierPhone?: string;
  supplierEmail?: string;
  supplierAddress?: string;
  invoiceNumber: string;
  invoiceDate?: string;
  notes?: string;
  items: ConfirmBillItemInput[];
}

export interface ConfirmBillResult {
  purchase: Purchase;
  newMedicinesCreated: { id: string; name: string; category: string }[];
  batchesCreated: { id: string; medicineId: string; batchNumber: string; quantity: number }[];
  totalQuantity: number;
  totalAmount: number;
}

