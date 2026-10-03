import React from 'react';
import { Plus, ShoppingCart, Package } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useShopSettings } from '../../context/ShopSettingsContext';

interface WelcomeBannerProps {
  onOpenAddMedicine?: () => void;
}

export const WelcomeBanner: React.FC<WelcomeBannerProps> = ({ onOpenAddMedicine }) => {
  const { settings } = useShopSettings();
  const navigate = useNavigate();

  const currentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-subtle mb-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <div>
          <div className="text-xs font-semibold text-[#087F5B] uppercase tracking-wider mb-1">
            {currentDate}
          </div>
          {/* Prominent Medical Shop Name */}
          <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
            Welcome to <span className="text-[#087F5B]">{settings.shopName}</span>
          </h2>
          <p className="text-sm text-pharmacy-text-muted mt-1.5">
            Practical inventory and sales management for your daily retail pharmacy counter.
          </p>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => {
              if (onOpenAddMedicine) {
                onOpenAddMedicine();
              } else {
                navigate('/inventory');
              }
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#087F5B] hover:bg-[#066347] text-white text-xs font-semibold shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add Medicine</span>
          </button>

          <button
            onClick={() => navigate('/sales')}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#DDF5E9] hover:bg-[#c9eedc] text-[#087F5B] text-xs font-semibold transition-colors"
          >
            <ShoppingCart className="w-4 h-4" />
            <span>Record Sale</span>
          </button>

          <button
            onClick={() => navigate('/inventory')}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold transition-colors"
          >
            <Package className="w-4 h-4" />
            <span>View Inventory</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default WelcomeBanner;
