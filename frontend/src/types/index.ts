import { LucideIcon } from 'lucide-react';

export interface HealthCheckResponse {
  status: 'success' | 'error';
  message: string;
  timestamp: string;
  environment: string;
  supabase: {
    configured: boolean;
    status: string;
  };
}

export interface StatMetric {
  id: string;
  title: string;
  value: string | number;
  change: string;
  isPositive: boolean;
  timeframe: string;
  iconName: string;
}

export interface LowStockAlert {
  id: string;
  medicineName: string;
  dosage: string;
  category: string;
  currentStock: number;
  minThreshold: number;
  unit: string;
  status: 'critical' | 'warning';
}

export interface NearExpiryAlert {
  id: string;
  medicineName: string;
  batchNumber: string;
  quantity: number;
  expiryDate: string;
  daysRemaining: number;
  status: 'critical' | 'warning';
}

export interface RecentActivityItem {
  id: string;
  type: 'sale' | 'restock' | 'adjustment' | 'supplier_order';
  title: string;
  description: string;
  timestamp: string;
  amount?: string;
  status: 'completed' | 'pending' | 'in_progress';
}

export interface WeeklySalesPoint {
  day: string;
  sales: number;
  prescriptions: number;
}

export interface CategoryDistributionPoint {
  name: string;
  value: number;
  color: string;
}

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
  isPlaceholder?: boolean;
}
