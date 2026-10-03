import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import {
  Package,
  ShoppingCart,
  Truck,
  BarChart3,
  TrendingUp,
  Settings,
  ArrowLeft,
  Calendar,
  Layers,
  CheckCircle2,
} from 'lucide-react';

interface PageMeta {
  title: string;
  phase: string;
  description: string;
  features: string[];
  icon: React.ElementType;
}

const pageMetadataMap: Record<string, PageMeta> = {
  '/inventory': {
    title: 'Medicine Inventory & Batch Management',
    phase: 'Phase 2',
    description:
      'Comprehensive pharmaceutical catalog, batch tracking, expiry date monitors, safety stock thresholds, and barcode/QR cataloging.',
    features: [
      'Medicine catalog with dosage, manufacturer, and generic names',
      'Batch-level tracking with manufacture and expiration timestamps',
      'Threshold monitoring with automated reorder triggers',
      'Real-time inventory adjustment & audit logs',
    ],
    icon: Package,
  },
  '/sales': {
    title: 'Point of Sale & Prescription Dispensing',
    phase: 'Phase 3',
    description:
      'Seamless counter checkout, customer prescription records, automated stock deduction, and invoice generation.',
    features: [
      'Prescription and OTC checkout cart',
      'Automated batch deduction based on FEFO (First-Expired, First-Out)',
      'Digital receipts and itemized billing',
      'Customer prescription history lookup',
    ],
    icon: ShoppingCart,
  },
  '/suppliers': {
    title: 'Suppliers & Purchase Order Management',
    phase: 'Phase 3',
    description:
      'Vendor directories, supplier contract prices, purchase requisition flows, and incoming batch acceptance.',
    features: [
      'Supplier contact directory and payment terms',
      'Automated Purchase Order (PO) generation',
      'Goods receipt and batch ingestion verification',
      'Supplier fulfillment rating and lead time metrics',
    ],
    icon: Truck,
  },
  '/reports': {
    title: 'Pharmacy Analytics & Financial Reporting',
    phase: 'Phase 4',
    description:
      'In-depth profit margin reports, turnover ratios, expired wastage analysis, and regulatory compliance logs.',
    features: [
      'Revenue, COGS, and gross margin analytics',
      'Fast-moving vs slow-moving stock analysis',
      'Expired and damaged medication write-off logs',
      'Exportable CSV and PDF compliance reports',
    ],
    icon: BarChart3,
  },
  '/forecasting': {
    title: 'AI-Powered Demand Forecasting & Smart Reordering',
    phase: 'Phase 5',
    description:
      'Predictive machine learning models for seasonal disease spikes, lead-time buffers, and dynamic reorder quantities.',
    features: [
      'Seasonal demand trend forecasting',
      'Epidemic & weather spike correlation analysis',
      'Dynamic Safety Stock (SS) and Economic Order Quantity (EOQ)',
      'Automated restock recommendations',
    ],
    icon: TrendingUp,
  },
  '/settings': {
    title: 'System Settings & Pharmacy Configuration',
    phase: 'Phase 6',
    description:
      'Multi-user role access controls, notification webhooks, tax rates, and Supabase database connection preferences.',
    features: [
      'Staff account roles (Pharmacist, Cashier, Inventory Manager, Admin)',
      'System-wide low stock alert thresholds',
      'Supabase database and backup configurations',
      'Audit logging and security preferences',
    ],
    icon: Settings,
  },
};

export const PlaceholderPage: React.FC = () => {
  const location = useLocation();
  const meta = pageMetadataMap[location.pathname] || {
    title: 'Upcoming Module',
    phase: 'Upcoming Phase',
    description: 'This feature is slated for an upcoming development phase.',
    features: ['Modular architecture in place', 'Backend routes prepared'],
    icon: Layers,
  };

  const Icon = meta.icon;

  return (
    <div className="space-y-6">
      {/* Top back button */}
      <div className="flex items-center justify-between">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-xs font-semibold text-gray-500 hover:text-[#087F5B] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Dashboard</span>
        </Link>
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#DDF5E9] text-[#087F5B] text-xs font-semibold">
          <Calendar className="w-3.5 h-3.5" />
          Scheduled for {meta.phase}
        </span>
      </div>

      {/* Main Feature Card */}
      <div className="bg-white border border-gray-100 rounded-2xl p-8 shadow-subtle">
        <div className="max-w-2xl">
          <div className="w-12 h-12 rounded-xl bg-[#DDF5E9] text-[#087F5B] flex items-center justify-center mb-5">
            <Icon className="w-6 h-6" />
          </div>

          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">
            {meta.title}
          </h2>

          <p className="mt-3 text-sm text-pharmacy-text-muted leading-relaxed">
            {meta.description}
          </p>

          <div className="mt-8 pt-6 border-t border-gray-100">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
              Key Capabilities Planned for {meta.phase}
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {meta.features.map((feature, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-2.5 p-3 rounded-lg bg-gray-50/70 border border-gray-100"
                >
                  <CheckCircle2 className="w-4 h-4 text-[#087F5B] shrink-0 mt-0.5" />
                  <span className="text-xs text-gray-700 font-medium leading-snug">
                    {feature}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Phase 1 note */}
          <div className="mt-8 p-4 rounded-xl bg-[#F7F9F8] border border-gray-200 flex items-center justify-between">
            <div className="text-xs text-pharmacy-text-muted">
              Current Status: <span className="font-semibold text-gray-800">Phase 1 (Architecture & UI Shell)</span>
            </div>
            <Link
              to="/"
              className="text-xs font-semibold text-[#087F5B] hover:underline"
            >
              Return to Live Dashboard →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlaceholderPage;
