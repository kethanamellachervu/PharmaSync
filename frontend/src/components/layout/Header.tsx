import React from 'react';
import { Menu, Building2, User } from 'lucide-react';
import { useShopSettings } from '../../context/ShopSettingsContext';

interface HeaderProps {
  pageTitle: string;
  onOpenMobileMenu: () => void;
}

export const Header: React.FC<HeaderProps> = ({ pageTitle, onOpenMobileMenu }) => {
  const { settings } = useShopSettings();

  return (
    <header className="sticky top-0 z-30 h-16 bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-8 flex items-center justify-between">
      {/* Left side: Mobile Toggle & Page Title */}
      <div className="flex items-center gap-3 sm:gap-4 min-w-0">
        <button
          onClick={onOpenMobileMenu}
          className="p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 lg:hidden focus:outline-hidden"
          aria-label="Open mobile menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="min-w-0">
          <h1 className="text-base sm:text-lg font-bold text-gray-900 tracking-tight truncate">
            {pageTitle}
          </h1>
        </div>
      </div>

      {/* Right side: Medical Shop Name & Pharmacist Profile */}
      <div className="flex items-center gap-3 sm:gap-5">
        {/* Shop Name Header Badge */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-50 border border-gray-200 text-xs text-gray-700">
          <Building2 className="w-4 h-4 text-[#087F5B]" />
          <span className="font-semibold text-gray-800">{settings.shopName}</span>
        </div>

        {/* Pharmacist Profile */}
        <div className="flex items-center gap-2 pl-3 border-l border-gray-200">
          <div className="w-8 h-8 rounded-full bg-[#087F5B] text-white flex items-center justify-center font-medium text-xs ring-2 ring-[#DDF5E9]">
            <User className="w-4 h-4" />
          </div>
          <div className="hidden sm:block text-left">
            <span className="block text-xs font-semibold text-gray-800 leading-tight">
              {settings.pharmacistName}
            </span>
            <span className="block text-[11px] text-gray-500">
              Pharmacist / Admin
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
