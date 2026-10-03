import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import ConnectionBadge from '../ui/ConnectionBadge';

export const DashboardLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  // Get human friendly title based on path
  const getPageTitle = (pathname: string): string => {
    switch (pathname) {
      case '/':
        return 'Pharmacy Operations Dashboard';
      case '/inventory':
        return 'Inventory Management';
      case '/sales':
        return 'Sales & Point of Sale';
      case '/suppliers':
        return 'Suppliers & Procurement';
      case '/reports':
        return 'Analytics & Reports';
      case '/forecasting':
        return 'AI Demand Forecasting';
      case '/settings':
        return 'System Settings';
      default:
        return 'Smart Pharmacy System';
    }
  };

  return (
    <div className="min-h-screen bg-pharmacy-bg text-pharmacy-text-main flex flex-col">
      {/* Sidebar Navigation */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content Area */}
      <div className="lg:pl-64 flex flex-col min-h-screen">
        <Header
          pageTitle={getPageTitle(location.pathname)}
          onOpenMobileMenu={() => setSidebarOpen(true)}
        />

        {/* Small screen status bar */}
        <div className="sm:hidden px-4 py-2 bg-gray-50 border-b border-gray-200">
          <ConnectionBadge />
        </div>

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
          <Outlet />
        </main>

        {/* Subtle Footer */}
        <footer className="py-4 px-6 border-t border-gray-200 text-center text-xs text-pharmacy-text-muted">
          Smart Pharmacy Inventory & Demand Forecasting System • Phase 1 Architecture
        </footer>
      </div>
    </div>
  );
};

export default DashboardLayout;
