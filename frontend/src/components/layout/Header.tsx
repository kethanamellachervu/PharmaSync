import React from 'react';
import { Menu, Search, Bell, HelpCircle } from 'lucide-react';
import ConnectionBadge from '../ui/ConnectionBadge';

interface HeaderProps {
  pageTitle: string;
  onOpenMobileMenu: () => void;
}

export const Header: React.FC<HeaderProps> = ({ pageTitle, onOpenMobileMenu }) => {
  return (
    <header className="sticky top-0 z-30 h-16 bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-8 flex items-center justify-between">
      {/* Left side: Mobile Toggle & Page Title */}
      <div className="flex items-center gap-4">
        <button
          onClick={onOpenMobileMenu}
          className="p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 lg:hidden focus:outline-hidden"
          aria-label="Open mobile menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div>
          <h1 className="text-lg font-bold text-pharmacy-text-main tracking-tight">
            {pageTitle}
          </h1>
        </div>
      </div>

      {/* Center: Search Bar */}
      <div className="hidden md:flex items-center flex-1 max-w-md mx-6">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search medicines, batches, SKU, suppliers..."
            className="w-full pl-9 pr-4 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[#087F5B]/30 focus:border-[#087F5B] transition-colors"
          />
        </div>
      </div>

      {/* Right side: Connection Badge, Alerts, Help & Profile */}
      <div className="flex items-center gap-3 sm:gap-4">
        {/* Real-time backend status */}
        <div className="hidden sm:block">
          <ConnectionBadge />
        </div>

        {/* Notifications Icon with dot */}
        <button
          className="relative p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          title="Notifications"
          aria-label="Notifications"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white"></span>
        </button>

        {/* Help icon */}
        <button
          className="hidden md:block p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          title="Documentation & Help"
        >
          <HelpCircle className="w-4 h-4" />
        </button>

        {/* User Profile Avatar */}
        <div className="flex items-center gap-2 pl-2 border-l border-gray-200">
          <div className="w-8 h-8 rounded-full bg-[#087F5B] text-white flex items-center justify-center font-medium text-xs ring-2 ring-[#DDF5E9]">
            DR
          </div>
          <div className="hidden xl:block text-left">
            <span className="block text-xs font-semibold text-gray-800 leading-tight">
              Dr. Marcus Vance
            </span>
            <span className="block text-[11px] text-pharmacy-text-muted">
              Chief Pharmacist
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
