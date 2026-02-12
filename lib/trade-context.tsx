'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Trade, Currency } from './types';
import { getExchangeRateToBase, convertToBaseCurrency } from './trade-utils';

/**
 * Context type for trade management
 * Provides access to trades and operations (add, delete, update, export, import)
 */
interface TradeContextType {
  trades: Trade[];
  addTrade: (trade: Trade) => void;
  deleteTrade: (id: string) => void;
  updateTrade: (id: string, trade: Trade) => void;
  exportJSON: () => void;
  exportCSV: () => void;
  importJSON: (file: File) => Promise<void>;
  error: string | null;
  clearError: () => void;
}

export const TradeContext = createContext<TradeContextType | undefined>(undefined);

/**
 * TradeProvider - Main context provider for managing trading journal data
 * Handles localStorage persistence and provides trade management functions
 */
export function TradeProvider({ children }: { children: React.ReactNode }) {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Migrate old trades to new format with currency support
   * - Adds currency field (defaults to INR for backwards compatibility)
   * - Adds pnlBase (P&L in base currency)
   * - Adds exchangeRate
   * - Updates isWin based on P&L (auto-derived)
   */
  const migrateTrade = (trade: any): Trade => {
    // If trade already has currency fields, return as-is
    if (trade.currency && trade.pnlBase !== undefined) {
      // Still update isWin to match P&L
      return {
        ...trade,
        isWin: trade.pnl > 0,
      };
    }
    
    // Default to INR for old trades (common for Indian traders)
    const currency: Currency = trade.currency || 'INR';
    const exchangeRate = getExchangeRateToBase(currency);
    const pnlBase = convertToBaseCurrency(trade.pnl, currency, exchangeRate);
    
    return {
      ...trade,
      currency,
      pnlBase,
      exchangeRate,
      // Auto-derive isWin from P&L
      isWin: trade.pnl > 0,
    };
  };

  /**
   * Effect: Initialize trades from localStorage on mount
   * Prevents hydration mismatch by only updating after client-side load
   * Also migrates old trades to new format with currency support
   */
  useEffect(() => {
    try {
      const saved = localStorage.getItem('trading-journal-trades');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (!Array.isArray(parsed)) {
          throw new Error('Invalid stored data format');
        }
        // Migrate old trades to new format
        const migratedTrades = parsed.map(migrateTrade);
        setTrades(migratedTrades);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load trades';
      console.error('[v0] localStorage error:', message);
      setError(message);
      // Reset storage on corruption
      localStorage.removeItem('trading-journal-trades');
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Effect: Persist trades to localStorage whenever the trades array changes
   * Skipped during initial load to avoid redundant saves
   */
  useEffect(() => {
    if (!isLoading) {
      try {
        localStorage.setItem('trading-journal-trades', JSON.stringify(trades));
        setError(null);
      } catch (err) {
        const message = 'Failed to save trades (storage might be full)';
        console.error('[v0] Storage error:', err);
        setError(message);
      }
    }
  }, [trades, isLoading]);

  const addTrade = (trade: Trade) => {
    try {
      if (!trade.id || !trade.date || !trade.symbol) {
        throw new Error('Invalid trade data: missing required fields');
      }
      setTrades(prev => [...prev, trade]);
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to add trade';
      console.error('[v0] Add trade error:', message);
      setError(message);
    }
  };

  const deleteTrade = (id: string) => {
    try {
      if (!id) throw new Error('Trade ID is required');
      setTrades(prev => prev.filter(t => t.id !== id));
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete trade';
      console.error('[v0] Delete trade error:', message);
      setError(message);
    }
  };

  const updateTrade = (id: string, updatedTrade: Trade) => {
    try {
      if (!id) throw new Error('Trade ID is required');
      if (!updatedTrade.id || !updatedTrade.date || !updatedTrade.symbol) {
        throw new Error('Invalid trade data');
      }
      setTrades(prev => prev.map(t => (t.id === id ? updatedTrade : t)));
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update trade';
      console.error('[v0] Update trade error:', message);
      setError(message);
    }
  };

  /**
   * Export trades as JSON file with error handling
   */
  const exportJSON = () => {
    try {
      if (trades.length === 0) {
        setError('No trades to export');
        return;
      }

      const data = JSON.stringify(trades, null, 2);
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `trading-journal-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to export trades';
      console.error('[v0] JSON export failed:', message);
      setError(message);
    }
  };

  /**
   * Export trades as CSV file with error handling
   * Includes currency information and auto-derived W/L
   */
  const exportCSV = () => {
    try {
      if (trades.length === 0) {
        setError('No trades to export');
        return;
      }

      const headers = ['Date', 'Day', 'Symbol', 'Type', 'Setup', 'Position', 'Currency', 'Entry', 'Exit', 'Stop Loss', 'Quantity', 'Fees', 'P&L', 'P&L (Base)', 'R-Factor', 'Outcome', 'Confidence', 'Time Frame', 'Limit', 'Exit Level'];
      const rows = trades.map(t => {
        // Derive outcome from P&L (not deprecated isWin)
        const outcome = t.pnl > 0 ? 'Win' : t.pnl < 0 ? 'Loss' : 'Break-Even';
        return [
          t.date,
          t.dayOfWeek,
          t.symbol,
          t.tradeType,
          t.setupName,
          t.position,
          t.currency || 'USD',
          t.entryPrice ? t.entryPrice.toFixed(2) : 'N/A',
          t.exitPrice ? t.exitPrice.toFixed(2) : 'N/A',
          t.stopLoss.toFixed(2),
          t.quantity,
          t.fees.toFixed(2),
          t.pnl.toFixed(2),
          t.pnlBase?.toFixed(2) || t.pnl.toFixed(2),
          t.rFactor.toFixed(2),
          outcome,
          t.confidence,
          t.timeFrame || '',
          t.limit || '',
          t.exit || '',
        ];
      });

      const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `trading-journal-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to export trades';
      console.error('[v0] CSV export failed:', message);
      setError(message);
    }
  };

  /**
   * Import trades from JSON file with validation
   * Migrates imported trades to new format with currency support
   */
  const importJSON = async (file: File) => {
    try {
      const text = await file.text();
      const imported = JSON.parse(text);

      if (!Array.isArray(imported)) {
        throw new Error('Invalid JSON format: Expected an array of trades');
      }

      // Validate trade structure
      const validTrades = imported.filter((trade: any) => {
        return trade.id && trade.date && trade.symbol && typeof trade.pnl === 'number';
      });

      if (validTrades.length === 0) {
        throw new Error('No valid trades found in file');
      }

      // Migrate imported trades to new format with currency support
      const migratedTrades = validTrades.map(migrateTrade);
      setTrades(prev => [...prev, ...migratedTrades]);
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error during import';
      console.error('[v0] JSON import failed:', message);
      setError(message);
      throw err;
    }
  };

  const clearError = () => setError(null);

  return (
    <TradeContext.Provider value={{ trades, addTrade, deleteTrade, updateTrade, exportJSON, exportCSV, importJSON, error, clearError }}>
      {children}
    </TradeContext.Provider>
  );
}

export function useTrades() {
  const context = useContext(TradeContext);
  if (!context) {
    throw new Error('useTrades must be used within a TradeProvider');
  }
  return context;
}
