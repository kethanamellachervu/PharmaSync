import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Settings,
  X,
  PlusCircle,
  Building2,
  User,
} from 'lucide-react';
import { NavItem } from '../../types';
import { useShopSettings } from '../../context/ShopSettingsContext';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const navItems: NavItem[] = [
  { title: 'Dashboard', href: '/', icon: LayoutDashboard },
  { title: 'Inventory', href: '/inventory', icon: Package },
  { title: 'Sales', href: '/sales', icon: ShoppingCart },
  { title: 'Settings', href: '/settings', icon: Settings },
];

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { settings } = useShopSettings();

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-gray-900/40 backdrop-blur-xs lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar Panel */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-white border-r border-gray-200 flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-[#087F5B] flex items-center justify-center text-white shadow-xs shrink-0">
              <PlusCircle className="w-6 h-6 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1">
                <span className="font-bold text-base text-gray-900 tracking-tight leading-tight">
                  Pharma<span className="text-[#087F5B]">Sync</span>
                </span>
              </div>
              {/* Medical Shop Name Prominently Under Logo */}
              <p
                className="text-xs font-semibold text-[#087F5B] truncate mt-0.5"
                title={settings.shopName}
              >
                {settings.shopName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-gray-400 hover:text-gray-600 lg:hidden"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Shop Info Tag */}
        <div className="mx-4 my-3 px-3 py-2 rounded-lg bg-[#DDF5E9]/60 border border-[#087F5B]/15 flex items-center gap-2">
          <Building2 className="w-4 h-4 text-[#087F5B] shrink-0" />
          <div className="min-w-0">
            <p className="text-[11px] font-semibold text-[#087F5B] uppercase tracking-wider">
              Local Pharmacy
            </p>
            <p className="text-xs font-medium text-gray-700 truncate" title={settings.shopName}>
              {settings.shopName}
            </p>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 px-3 py-2 overflow-y-auto space-y-1">
          <p className="px-3 py-1.5 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
            Menu
          </p>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.title}
                to={item.href}
                onClick={() => {
                  if (window.innerWidth < 1024) onClose();
                }}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-[#087F5B] text-white shadow-xs'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon
                      className={`w-4 h-4 transition-colors ${
                        isActive ? 'text-white' : 'text-gray-400'
                      }`}
                    />
                    <span>{item.title}</span>
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Pharmacist Profile Footer */}
        <div className="p-4 border-t border-gray-100 bg-[#F7F9F8]/60">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[#DDF5E9] text-[#087F5B] flex items-center justify-center font-bold text-xs shrink-0">
              <User className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-gray-800 truncate">
                {settings.pharmacistName}
              </p>
              <p className="text-[11px] text-gray-500 truncate">
                Active Store Session
              </p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
