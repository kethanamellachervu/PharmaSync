import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Truck,
  BarChart3,
  TrendingUp,
  Settings,
  X,
  Crosshair,
  ShieldCheck,
} from 'lucide-react';
import { NavItem } from '../../types';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const navItems: NavItem[] = [
  { title: 'Dashboard', href: '/', icon: LayoutDashboard },
  { title: 'Inventory', href: '/inventory', icon: Package, badge: 'Phase 2', isPlaceholder: true },
  { title: 'Sales', href: '/sales', icon: ShoppingCart, badge: 'Phase 3', isPlaceholder: true },
  { title: 'Suppliers', href: '/suppliers', icon: Truck, badge: 'Phase 3', isPlaceholder: true },
  { title: 'Reports', href: '/reports', icon: BarChart3, badge: 'Phase 4', isPlaceholder: true },
  { title: 'Forecasting', href: '/forecasting', icon: TrendingUp, badge: 'Phase 5', isPlaceholder: true },
  { title: 'Settings', href: '/settings', icon: Settings, badge: 'Phase 6', isPlaceholder: true },
];

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-gray-900/50 backdrop-blur-xs lg:hidden"
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
        <div className="h-16 px-6 flex items-center justify-between border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-[#087F5B] flex items-center justify-center text-white shadow-sm shadow-[#087F5B]/30">
              <Crosshair className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-bold text-lg text-gray-900 tracking-tight leading-tight block">
                Pharma<span className="text-[#087F5B]">Sync</span>
              </span>
              <span className="text-[10px] text-pharmacy-text-muted font-medium tracking-wide uppercase block -mt-0.5">
                Smart Management
              </span>
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

        {/* System Phase Indicator */}
        <div className="mx-4 my-3 px-3 py-2 rounded-lg bg-[#DDF5E9]/60 border border-[#087F5B]/15 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-[#087F5B] shrink-0" />
          <div className="text-xs">
            <p className="font-semibold text-[#087F5B]">Phase 1 Active</p>
            <p className="text-[11px] text-gray-600">Architecture & UI Ready</p>
          </div>
        </div>

        {/* Navigation Section */}
        <div className="flex-1 px-3 py-2 overflow-y-auto space-y-1">
          <p className="px-3 py-1.5 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
            Main Menu
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
                  `group flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-[#087F5B] text-white shadow-xs'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <div className="flex items-center gap-3">
                      <Icon
                        className={`w-4 h-4 transition-colors ${
                          isActive
                            ? 'text-white'
                            : 'text-gray-400 group-hover:text-gray-600'
                        }`}
                      />
                      <span>{item.title}</span>
                    </div>
                    {item.badge && (
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                          isActive
                            ? 'bg-white/20 text-white'
                            : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            );
          })}
        </div>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-gray-100 bg-[#F7F9F8]/50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-emerald-100 text-[#087F5B] flex items-center justify-center font-bold text-xs">
              AD
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-gray-800 truncate">
                Central Apothecary
              </p>
              <p className="text-[11px] text-pharmacy-text-muted truncate">
                Admin Console
              </p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
