import { Suspense, lazy, FC } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import DashboardLayout from './components/layout/DashboardLayout';
import ErrorBoundary from './components/ui/ErrorBoundary';

// Dynamic code-splitting for performance
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const AdminDashboardPage = lazy(() => import('./pages/AdminDashboardPage'));
const SupplierMessagesPage = lazy(() => import('./pages/SupplierMessagesPage'));
const InventoryPage = lazy(() => import('./pages/InventoryPage'));
const SalesPage = lazy(() => import('./pages/SalesPage'));
const SuppliersPage = lazy(() => import('./pages/SuppliersPage'));
const PurchasesPage = lazy(() => import('./pages/PurchasesPage'));
const ReportsPage = lazy(() => import('./pages/ReportsPage'));
const ForecastingPage = lazy(() => import('./pages/ForecastingPage'));
const ReorderPage = lazy(() => import('./pages/ReorderPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));

const PageLoader = () => (
  <div className="min-h-[50vh] flex flex-col items-center justify-center p-8 text-slate-500">
    <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin mb-3" />
    <p className="text-sm font-medium">Loading page...</p>
  </div>
);

export const App: FC = () => {

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<DashboardLayout />}>
              <Route index element={<DashboardPage />} />
              <Route path="admin" element={<AdminDashboardPage />} />
              <Route path="supplier-messages" element={<SupplierMessagesPage />} />
              <Route path="inventory" element={<InventoryPage />} />
              <Route path="sales" element={<SalesPage />} />
              <Route path="suppliers" element={<SuppliersPage />} />
              <Route path="purchases" element={<PurchasesPage />} />
              <Route path="reports" element={<ReportsPage />} />
              <Route path="forecasting" element={<ForecastingPage />} />
              <Route path="reorder" element={<ReorderPage />} />
              <Route path="settings" element={<SettingsPage />} />

              {/* Any other route redirects to Dashboard */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </Suspense>
      </BrowserRouter>
    </ErrorBoundary>
  );
};

export default App;

