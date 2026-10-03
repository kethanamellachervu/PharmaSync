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

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
}
