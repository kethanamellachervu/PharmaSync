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
  sellingPrice: number;
  purchasePrice?: number;
  createdAt: string;
  updatedAt: string;
}

export interface MedicineWithBatches extends Medicine {
  batches: MedicineBatch[];
  usableStock: number;
  expiredStock: number;
  totalStock: number;
  totalPhysicalStock: number;
  isLowStock: boolean;
  isNearExpiry: boolean;
  isExpired: boolean;
  isOutOfStock: boolean;
  stockStatus: 'In Stock' | 'Low Stock' | 'Near Expiry' | 'Expired' | 'Out of Stock';
  earliestExpiry: string | null;
}

export interface ShopSettings {
  shopName: string;
  pharmacistName: string;
  nearExpiryDays: number;
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
  expiryDate: string;
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
  purchaseNumber: string;
  supplierId: string;
  supplierName: string;
  items: PurchaseItem[];
  totalQuantity: number;
  totalAmount: number;
  status?: 'pending' | 'received' | 'cancelled';
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
  saleNumber: string;
  customerName: string;
  items: SaleItem[];
  totalItems: number;
  totalQuantity: number;
  totalAmount: number;
  idempotencyKey?: string;
  createdAt: string;

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
  lineAmount?: number | null;
  needsVerification?: boolean;
  verificationReason?: string | null;
  sNo?: number | null;
  mfgDate?: string | null;
  expiryDate?: string | null;
  category?: string;
  unit?: string;
  confidence: 'high' | 'medium' | 'low';
  missingFields: string[];
}

export interface ExtractedBillData {
  scanId?: string;
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

// -----------------------------------------------------------------------------
// PROCUREMENT & ADMIN APPROVAL WORKFLOW TYPES
// -----------------------------------------------------------------------------
export type PurchaseRequestStatus =
  | 'PENDING_ADMIN_APPROVAL'
  | 'APPROVED'
  | 'REJECTED'
  | 'ORDER_SENT'
  | 'SUPPLIER_RESPONDED'
  | 'ORDER_CONFIRMED'
  | 'FULFILLED';

export interface PurchaseRequest {
  id: string;
  requestNumber: string;
  medicineId: string;
  medicineName: string;
  supplierId: string;
  supplierName: string;
  currentStock: number;
  forecastDemand: number;
  recommendedQuantity: number;
  priority: 'critical' | 'high' | 'medium' | 'low';
  reason: string;
  forecastExplanation?: string;
  status: PurchaseRequestStatus;
  requestDate: string;
  approvedAt?: string;
  approvedBy?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  unitPrice?: number;
  totalPrice?: number;
  expectedDelivery?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ExtractedOrderDetails {
  availableQuantity?: number;
  unitPrice?: number;
  totalPrice?: number;
  expectedDelivery?: string;
  isConfirmed?: boolean;
  missingFields?: string[];
}

export interface SupplierConversation {
  id: string;
  purchaseRequestId: string;
  supplierId: string;
  supplierName: string;
  medicineId: string;
  medicineName: string;
  requestedQuantity: number;
  orderNumber: string;
  status: 'ORDER_SENT' | 'SUPPLIER_RESPONDED' | 'ORDER_CONFIRMED';
  extractedData?: ExtractedOrderDetails;
  createdAt: string;
  updatedAt: string;
}

export interface SupplierMessage {
  id: string;
  conversationId: string;
  senderType: 'ai' | 'supplier' | 'system';
  message: string;
  messageType: 'text' | 'confirmation_summary' | 'order_request';
  extractedData?: ExtractedOrderDetails;
  createdAt: string;
}

export interface InAppNotification {
  id: string;
  recipientRole: 'admin' | 'pharmacist' | 'all';
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

