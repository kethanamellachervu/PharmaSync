import React, { useState, useEffect } from 'react';
import { Menu, Building2, User, Bell } from 'lucide-react';
import { useShopSettings } from '../../context/ShopSettingsContext';
import { apiService } from '../../services/api';
import { InAppNotification } from '../../types';

interface HeaderProps {
  pageTitle: string;
  onOpenMobileMenu: () => void;
}

export const Header: React.FC<HeaderProps> = ({ pageTitle, onOpenMobileMenu }) => {
  const { settings } = useShopSettings();
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);
  const [showNotifs, setShowNotifs] = useState(false);

  const fetchNotifs = async () => {
    try {
      const list = await apiService.getNotifications();
      setNotifications(list);
    } catch {
      // Ignore background errors
    }
  };

  useEffect(() => {
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 10000);
    return () => clearInterval(interval);
  }, []);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleMarkRead = async (id: string) => {
    try {
      await apiService.markNotificationRead(id);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    } catch {
      // Ignore
    }
  };

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

      {/* Right side: Notifications, Shop Name & Profile */}
      <div className="flex items-center gap-3 sm:gap-4">
        {/* Notifications Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowNotifs(!showNotifs)}
            className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 relative focus:outline-none"
            title="Notifications"
          >
            <Bell className="w-5 h-5 text-gray-600" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center animate-pulse">
                {unreadCount}
              </span>
            )}
          </button>

          {showNotifs && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl border border-gray-200 shadow-xl z-50 p-3 space-y-2 animate-scale-in">
              <div className="flex items-center justify-between border-b border-gray-100 pb-2 px-1">
                <span className="text-xs font-bold text-gray-900 uppercase tracking-wider">In-App Notifications</span>
                <span className="text-[10px] font-semibold text-emerald-600">{unreadCount} Unread</span>
              </div>

              <div className="max-h-64 overflow-y-auto divide-y divide-gray-100">
                {notifications.length === 0 ? (
                  <p className="text-xs text-gray-400 p-4 text-center">No notifications</p>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => handleMarkRead(n.id)}
                      className={`p-2.5 rounded-lg text-xs cursor-pointer transition-colors ${
                        n.isRead ? 'bg-white opacity-70' : 'bg-emerald-50/70 border-l-2 border-[#087F5B]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-gray-900">{n.title}</span>
                        <span className="text-[10px] text-gray-400">
                          {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-600 mt-1">{n.message}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Shop Name Header Badge */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-50 border border-gray-200 text-xs text-gray-700">
          <Building2 className="w-4 h-4 text-[#087F5B]" />
          <span className="font-semibold text-gray-800">{settings.shopName}</span>
        </div>

        {/* Pharmacist / Admin Profile */}
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
