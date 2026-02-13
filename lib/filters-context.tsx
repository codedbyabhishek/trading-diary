'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { TradeFilter, Trade } from './types';
import {
  getAllFromDB,
  putToDB,
  deleteFromDB,
  migrateFromLocalStorage,
  STORE_NAMES,
} from './db-service';

interface FiltersContextType {
  filters: TradeFilter[];
  addFilter: (filter: TradeFilter) => void;
  deleteFilter: (id: string) => void;
  updateFilter: (id: string, filter: TradeFilter) => void;
  applyFilter: (filter: TradeFilter, trades: Trade[]) => Trade[];
  error: string | null;
  clearError: () => void;
}

export const FiltersContext = createContext<FiltersContextType | undefined>(undefined);

/**
 * FiltersProvider - Context provider for trade filters management
 * Allows saving and applying custom filters to trades
 */
export function FiltersProvider({ children }: { children: React.ReactNode }) {
  const [filters, setFilters] = useState<TradeFilter[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Effect: Initialize filters from IndexedDB on mount
   */
  useEffect(() => {
    const initializeFilters = async () => {
      try {
        console.log('[FiltersContext] Starting initialization...');

        // Migrate from localStorage (one-time operation)
        const wasMigrated = await migrateFromLocalStorage(
          'trading-journal-filters',
          STORE_NAMES.FILTERS
        );

        if (wasMigrated) {
          console.log('[FiltersContext] Data migrated from localStorage');
          localStorage.removeItem('trading-journal-filters');
        }

        // Load all filters from IndexedDB
        console.log('[FiltersContext] Loading filters from IndexedDB...');
        const loadedFilters = await getAllFromDB<TradeFilter>(STORE_NAMES.FILTERS);
        console.log('[FiltersContext] Loaded', loadedFilters?.length || 0, 'filters');
        setFilters(loadedFilters || []);
        setError(null);
        console.log('[FiltersContext] Initialization complete');
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load filters';
        console.error('[FiltersContext] Initialization error:', message, err);
        setError(message);
      } finally {
        setIsLoading(false);
      }
    };

    initializeFilters();
  }, []);

  const addFilter = (filter: TradeFilter) => {
    try {
      if (!filter.id || !filter.name) {
        throw new Error('Invalid filter: missing required fields');
      }
      const updated = [filter, ...filters];
      setFilters(updated);
      putToDB(STORE_NAMES.FILTERS, filter).catch(err => {
        console.error('[FiltersContext] Error saving filter:', err);
        setError('Failed to save filter');
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to add filter';
      console.error('[FiltersContext] Add error:', message);
      setError(message);
    }
  };

  const deleteFilter = (id: string) => {
    try {
      const updated = filters.filter(f => f.id !== id);
      setFilters(updated);
      deleteFromDB(STORE_NAMES.FILTERS, id).catch(err => {
        console.error('[FiltersContext] Error deleting filter:', err);
        setError('Failed to delete filter');
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete filter';
      console.error('[FiltersContext] Delete error:', message);
      setError(message);
    }
  };

  const updateFilter = (id: string, updatedFilter: TradeFilter) => {
    try {
      const updated = filters.map(f => (f.id === id ? updatedFilter : f));
      setFilters(updated);
      putToDB(STORE_NAMES.FILTERS, updatedFilter).catch(err => {
        console.error('[FiltersContext] Error updating filter:', err);
        setError('Failed to update filter');
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update filter';
      console.error('[FiltersContext] Update error:', message);
      setError(message);
    }
  };

  /**
   * Apply a filter to trades array
   * Filters based on all specified criteria in the filter object
   */
  const applyFilter = (filter: TradeFilter, trades: Trade[]): Trade[] => {
    return trades.filter(trade => {
      // Date range filter
      if (filter.dateRange) {
        const tradeDate = new Date(trade.date).getTime();
        const startDate = new Date(filter.dateRange.start).getTime();
        const endDate = new Date(filter.dateRange.end).getTime();
        if (tradeDate < startDate || tradeDate > endDate) {
          return false;
        }
      }

      // Symbols filter
      if (filter.symbols && filter.symbols.length > 0) {
        if (!filter.symbols.includes(trade.symbol)) {
          return false;
        }
      }

      // Setup names filter
      if (filter.setupNames && filter.setupNames.length > 0) {
        if (!filter.setupNames.includes(trade.setupName)) {
          return false;
        }
      }

      // Trade types filter
      if (filter.tradeTypes && filter.tradeTypes.length > 0) {
        if (!filter.tradeTypes.includes(trade.tradeType)) {
          return false;
        }
      }

      // Currency filter
      if (filter.currencyFilter && filter.currencyFilter.length > 0) {
        if (!filter.currencyFilter.includes(trade.currency)) {
          return false;
        }
      }

      // P&L range filter
      if (filter.minPnL !== undefined && trade.pnl < filter.minPnL) {
        return false;
      }
      if (filter.maxPnL !== undefined && trade.pnl > filter.maxPnL) {
        return false;
      }

      // R-Factor range filter
      if (filter.minRFactor !== undefined && trade.rFactor < filter.minRFactor) {
        return false;
      }
      if (filter.maxRFactor !== undefined && trade.rFactor > filter.maxRFactor) {
        return false;
      }

      // Outcome filter (Win/Loss/Break-Even)
      if (filter.outcomeFilter && filter.outcomeFilter.length > 0) {
        const outcome = trade.pnl > 0 ? 'W' : trade.pnl < 0 ? 'L' : 'BE';
        if (!filter.outcomeFilter.includes(outcome)) {
          return false;
        }
      }

      // Rule followed filter
      if (filter.ruleFollowedOnly && !trade.ruleFollowed) {
        return false;
      }

      // Emotion tags filter
      if (filter.emotionTags && filter.emotionTags.length > 0) {
        const emotions = [trade.emotionEntry, trade.emotionExit].filter(Boolean);
        if (!emotions.some(e => filter.emotionTags?.includes(e as any))) {
          return false;
        }
      }

      // Sessions filter
      if (filter.sessions && filter.sessions.length > 0) {
        if (!filter.sessions.includes(trade.session as any)) {
          return false;
        }
      }

      return true;
    });
  };

  const clearError = () => setError(null);

  return (
    <FiltersContext.Provider
      value={{
        filters,
        addFilter,
        deleteFilter,
        updateFilter,
        applyFilter,
        error,
        clearError,
      }}
    >
      {children}
    </FiltersContext.Provider>
  );
}

export function useFilters() {
  const context = useContext(FiltersContext);
  if (!context) {
    throw new Error('useFilters must be used within a FiltersProvider');
  }
  return context;
}
