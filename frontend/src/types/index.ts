import { LucideIcon } from 'lucide-react';

export interface MedicineBatch {
  batchNumber: string;
  quantity: number;
  expiryDate: string; // YYYY-MM-DD
}

export interface Medicine {
  id: string;
  name: string;
  category: string;
  price: number;
  minStock: number;
  batches: MedicineBatch[];
  totalStock: number;
  isLowStock: boolean;
  isNearExpiry: boolean;
  earliestExpiry: string | null;
  createdAt: string;
  updatedAt: string;
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

export interface DashboardStats {
  totalMedicines: number;
  availableStock: number;
  lowStockCount: number;
  todaySalesAmount: number;
  lowStockMedicines: {
    id: string;
    name: string;
    category: string;
    totalStock: number;
    minStock: number;
  }[];
  nearExpiryMedicines: {
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
