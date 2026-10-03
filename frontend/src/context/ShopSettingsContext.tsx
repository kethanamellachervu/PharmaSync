import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { ShopSettings } from '../types';
import { apiService } from '../services/api';

interface ShopSettingsContextType {
  settings: ShopSettings;
  isLoading: boolean;
  updateSettings: (newSettings: Partial<ShopSettings>) => Promise<void>;
  refreshSettings: () => Promise<void>;
}

const defaultSettings: ShopSettings = {
  shopName: 'Sri Sai Medical & General Store',
  pharmacistName: 'Store Pharmacist',
  nearExpiryDays: 60,
};

const ShopSettingsContext = createContext<ShopSettingsContextType>({
  settings: defaultSettings,
  isLoading: false,
  updateSettings: async () => {},
  refreshSettings: async () => {},
});

export const ShopSettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<ShopSettings>(() => {
    const saved = localStorage.getItem('pharmasync_settings');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return defaultSettings;
      }
    }
    return defaultSettings;
  });
  const [isLoading, setIsLoading] = useState(false);

  const fetchSettings = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await apiService.getSettings();
      setSettings(data);
      localStorage.setItem('pharmasync_settings', JSON.stringify(data));
    } catch {
      // Backend not yet reachable or network delay; use local settings
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const updateSettings = async (newSettings: Partial<ShopSettings>) => {
    setIsLoading(true);
    try {
      const updated = await apiService.updateSettings(newSettings);
      setSettings(updated);
      localStorage.setItem('pharmasync_settings', JSON.stringify(updated));
    } catch {
      // Optimistic local update if backend fails
      const fallback = { ...settings, ...newSettings };
      setSettings(fallback);
      localStorage.setItem('pharmasync_settings', JSON.stringify(fallback));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ShopSettingsContext.Provider
      value={{
        settings,
        isLoading,
        updateSettings,
        refreshSettings: fetchSettings,
      }}
    >
      {children}
    </ShopSettingsContext.Provider>
  );
};

export const useShopSettings = () => useContext(ShopSettingsContext);
