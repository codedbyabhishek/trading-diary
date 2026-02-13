'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Currency } from './types';
import { getFromDB, putToDB, migrateFromLocalStorage, STORE_NAMES } from './db-service';

/**
 * Settings Context Type
 * Manages user preferences including base currency for analytics display
 */
interface SettingsContextType {
  baseCurrency: Currency;
  setBaseCurrency: (currency: Currency) => void;
}

export const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

/**
 * SettingsProvider - Context provider for user settings
 * Persists base currency preference to IndexedDB
 */
export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [baseCurrency, setBaseCurrencyState] = useState<Currency>('INR');

  /**
   * Effect: Load settings from IndexedDB on mount
   * Migrates from localStorage if this is the first load
   */
  useEffect(() => {
    const initializeSettings = async () => {
      try {
        // Migrate from localStorage (one-time operation)
        const wasMigrated = await migrateFromLocalStorage(
          'trading-journal-settings',
          STORE_NAMES.SETTINGS,
          (data) => ({ key: 'preferences', ...data })
        );

        if (wasMigrated) {
          console.log('[IndexedDB] Settings migrated from localStorage');
          localStorage.removeItem('trading-journal-settings');
        }

        // Load settings from IndexedDB
        const savedSettings = await getFromDB(STORE_NAMES.SETTINGS, 'preferences');
        if (savedSettings && (savedSettings as any).baseCurrency) {
          setBaseCurrencyState((savedSettings as any).baseCurrency);
        }
      } catch (err) {
        console.error('[v0] Failed to load settings:', err);
      }
    };

    initializeSettings();
  }, []);

  /**
   * Update base currency and persist to IndexedDB
   */
  const setBaseCurrency = (currency: Currency) => {
    setBaseCurrencyState(currency);
    putToDB(STORE_NAMES.SETTINGS, {
      key: 'preferences',
      baseCurrency: currency,
    }).catch(err => {
      console.error('[v0] Failed to save settings:', err);
    });
  };

  return (
    <SettingsContext.Provider value={{ baseCurrency, setBaseCurrency }}>
      {children}
    </SettingsContext.Provider>
  );
}

/**
 * Hook to use settings context
 * @throws Error if used outside of SettingsProvider
 */
export function useSettings(): SettingsContextType {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
