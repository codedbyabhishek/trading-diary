'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Currency } from './types';

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
 * Persists base currency preference to localStorage
 */
export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [baseCurrency, setBaseCurrencyState] = useState<Currency>('INR');

  /**
   * Effect: Load base currency preference from localStorage on mount
   */
  useEffect(() => {
    try {
      const saved = localStorage.getItem('trading-journal-settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.baseCurrency) {
          setBaseCurrencyState(parsed.baseCurrency);
        }
      }
    } catch (err) {
      console.error('[v0] Settings load error:', err);
    }
  }, []);

  /**
   * Update base currency and persist to localStorage
   */
  const setBaseCurrency = (currency: Currency) => {
    setBaseCurrencyState(currency);
    try {
      const current = localStorage.getItem('trading-journal-settings');
      const settings = current ? JSON.parse(current) : {};
      settings.baseCurrency = currency;
      localStorage.setItem('trading-journal-settings', JSON.stringify(settings));
    } catch (err) {
      console.error('[v0] Settings save error:', err);
    }
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
