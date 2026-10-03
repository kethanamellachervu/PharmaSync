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

export interface SaleRecord {
  id: string;
  medicineId: string;
  medicineName: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  batchesDeducted: {
    batchNumber: string;
    quantity: number;
    expiryDate: string;
  }[];
  createdAt: string;
}

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
