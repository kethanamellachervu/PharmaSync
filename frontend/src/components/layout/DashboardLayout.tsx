import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import { ShopSettingsProvider, useShopSettings } from '../../context/ShopSettingsContext';

const LayoutContent: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const { settings } = useShopSettings();

  const getPageTitle = (pathname: string): string => {
    switch (pathname) {
      case '/':
        return 'Pharmacy Dashboard';
      case '/inventory':
        return 'Medicine Inventory';
      case '/sales':
        return 'Point of Sale & Billing';
      case '/settings':
        return 'Pharmacy Settings';
      default:
        return 'PharmaSync';
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

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
          <Outlet />
        </main>

        {/* Simple Footer */}
        <footer className="py-4 px-6 border-t border-gray-200 text-center text-xs text-pharmacy-text-muted">
          {settings.shopName} • PharmaSync Inventory System
        </footer>
      </div>
    </div>
  );
};

export const DashboardLayout: React.FC = () => {
  return (
    <ShopSettingsProvider>
      <LayoutContent />
    </ShopSettingsProvider>
  );
};

export default DashboardLayout;
