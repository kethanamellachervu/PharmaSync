import React, { useState, useEffect } from 'react';
import { Save, CheckCircle2, User, Clock, Store } from 'lucide-react';
import { useShopSettings } from '../context/ShopSettingsContext';

export const SettingsPage: React.FC = () => {
  const { settings, updateSettings, isLoading } = useShopSettings();

  const [shopName, setShopName] = useState(settings.shopName);
  const [pharmacistName, setPharmacistName] = useState(settings.pharmacistName);
  const [nearExpiryDays, setNearExpiryDays] = useState(settings.nearExpiryDays.toString());
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    setShopName(settings.shopName);
    setPharmacistName(settings.pharmacistName);
    setNearExpiryDays(settings.nearExpiryDays.toString());
  }, [settings]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavedSuccess(false);

    await updateSettings({
      shopName: shopName.trim() || 'Sri Sai Medical & General Store',
      pharmacistName: pharmacistName.trim() || 'Store Pharmacist',
      nearExpiryDays: Number(nearExpiryDays) || 60,
    });

    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 4000);
  };

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-subtle">
        <h2 className="text-xl font-bold text-gray-900 tracking-tight">
          Pharmacy Store Settings
        </h2>
        <p className="text-xs text-pharmacy-text-muted mt-1">
          Configure your medical shop name, pharmacist identity, and stock alert preferences
        </p>
      </div>

      {savedSuccess && (
        <div className="p-4 rounded-xl bg-[#DDF5E9] border border-[#087F5B]/30 flex items-center gap-2.5 text-xs text-[#087F5B] font-semibold">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>Shop settings updated and synchronized across all pages!</span>
        </div>
      )}

      {/* Main Settings Form */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-subtle">
        <form onSubmit={handleSubmit} className="space-y-6 text-xs">
          {/* Shop Name Section */}
          <div className="space-y-3 pb-6 border-b border-gray-100">
            <div className="flex items-center gap-2 text-gray-900 font-bold text-sm">
              <Store className="w-4 h-4 text-[#087F5B]" />
              <span>Medical Store Branding</span>
            </div>
            <p className="text-gray-500 text-[11px]">
              This name will be displayed prominently across the dashboard, top header, and sidebar.
            </p>

            <div>
              <label className="block font-semibold text-gray-700 mb-1">
                Medical Shop Name *
              </label>
              <input
                type="text"
                required
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                placeholder="e.g. Sri Sai Medical & General Store"
                className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 text-sm font-medium focus:outline-hidden focus:ring-2 focus:ring-[#087F5B]/30 focus:border-[#087F5B]"
              />
              <span className="block text-[11px] text-gray-400 mt-1">
                Default: <strong>Sri Sai Medical & General Store</strong>
              </span>
            </div>
          </div>

          {/* Pharmacist Profile Section */}
          <div className="space-y-3 pb-6 border-b border-gray-100">
            <div className="flex items-center gap-2 text-gray-900 font-bold text-sm">
              <User className="w-4 h-4 text-[#087F5B]" />
              <span>Pharmacist / Store Admin Profile</span>
            </div>
            <p className="text-gray-500 text-[11px]">
              Neutral profile title for the currently logged-in counter user.
            </p>

            <div>
              <label className="block font-semibold text-gray-700 mb-1">
                Display Name / Role *
              </label>
              <input
                type="text"
                required
                value={pharmacistName}
                onChange={(e) => setPharmacistName(e.target.value)}
                placeholder="e.g. Store Pharmacist, Rajesh Kumar"
                className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 text-sm font-medium focus:outline-hidden focus:ring-2 focus:ring-[#087F5B]/30 focus:border-[#087F5B]"
              />
            </div>
          </div>

          {/* Expiry Alerts Section */}
          <div className="space-y-3 pb-6 border-b border-gray-100">
            <div className="flex items-center gap-2 text-gray-900 font-bold text-sm">
              <Clock className="w-4 h-4 text-[#087F5B]" />
              <span>Inventory Expiry Threshold</span>
            </div>
            <p className="text-gray-500 text-[11px]">
              Medicines expiring within this number of days will appear in the Near Expiry alerts.
            </p>

            <div className="max-w-xs">
              <label className="block font-semibold text-gray-700 mb-1">
                Near Expiry Alert Period (days) *
              </label>
              <input
                type="number"
                min="7"
                max="365"
                required
                value={nearExpiryDays}
                onChange={(e) => setNearExpiryDays(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 text-sm font-medium focus:outline-hidden focus:ring-2 focus:ring-[#087F5B]/30 focus:border-[#087F5B]"
              />
              <span className="block text-[11px] text-gray-400 mt-1">
                Standard retail pharmacy setting: 60 days
              </span>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-[#087F5B] hover:bg-[#066347] text-white font-bold text-xs shadow-xs transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{isLoading ? 'Saving Settings...' : 'Save Settings'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SettingsPage;
