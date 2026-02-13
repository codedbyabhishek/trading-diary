'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { TradeIdea } from './types';
import {
  getAllFromDB,
  putToDB,
  deleteFromDB,
  migrateFromLocalStorage,
  getDBSize,
  STORE_NAMES,
} from './db-service';

interface IdeasContextType {
  ideas: TradeIdea[];
  addIdea: (idea: TradeIdea) => void;
  deleteIdea: (id: string) => void;
  updateIdea: (id: string, idea: TradeIdea) => void;
  exportJSON: () => void;
  exportCSV: () => void;
  importJSON: (file: Blob) => Promise<void>;
  error: string | null;
  clearError: () => void;
}

export const IdeasContext = createContext<IdeasContextType | undefined>(undefined);

/**
 * IdeasProvider - Context provider for trade ideas management
 * Handles IndexedDB persistence with 500MB+ capacity
 */
export function IdeasProvider({ children }: { children: React.ReactNode }) {
  const [ideas, setIdeas] = useState<TradeIdea[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Effect: Initialize ideas from IndexedDB on mount
   * Migrates from localStorage if this is the first load
   */
  useEffect(() => {
    const initializeIdeas = async () => {
      try {
        console.log('[IdeasContext] Starting initialization...');
        
        // Migrate from localStorage (one-time operation)
        const wasMigrated = await migrateFromLocalStorage(
          'trading-journal-ideas',
          STORE_NAMES.IDEAS
        );

        if (wasMigrated) {
          console.log('[IdeasContext] Data migrated from localStorage');
          localStorage.removeItem('trading-journal-ideas');
        }

        // Load all ideas from IndexedDB
        console.log('[IdeasContext] Loading ideas from IndexedDB...');
        const loadedIdeas = await getAllFromDB<TradeIdea>(STORE_NAMES.IDEAS);
        console.log('[IdeasContext] Loaded', loadedIdeas?.length || 0, 'ideas');
        setIdeas(loadedIdeas || []);
        setError(null);
        console.log('[IdeasContext] Initialization complete');
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load ideas';
        console.error('[IdeasContext] Initialization error:', message, err);
        setError(message);
      } finally {
        setIsLoading(false);
      }
    };

    initializeIdeas();
  }, []);

  /**
   * Effect: Persist ideas to IndexedDB whenever the ideas array changes
   */
  useEffect(() => {
    if (!isLoading && ideas.length > 0) {
      const persistToDB = async () => {
        try {
          for (const idea of ideas) {
            await putToDB(STORE_NAMES.IDEAS, idea);
          }
          setError(null);
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Failed to persist ideas';
          console.error('[v0] Ideas persistence error:', err);
          setError(message);
        }
      };

      persistToDB();
    }
  }, [ideas, isLoading]);

  const addIdea = (idea: TradeIdea) => {
    try {
      if (!idea.id || !idea.name) {
        throw new Error('Invalid idea: missing required fields');
      }
      const updated = [idea, ...ideas];
      setIdeas(updated);
      
      // Persist to IndexedDB immediately
      putToDB(STORE_NAMES.IDEAS, idea).catch(err => {
        console.error('[v0] Failed to save idea to IndexedDB:', err);
        setError('Failed to save idea');
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to add idea';
      setError(message);
    }
  };

  const deleteIdea = (id: string) => {
    try {
      if (!id) throw new Error('Idea ID is required');
      const updated = ideas.filter(i => i.id !== id);
      setIdeas(updated);
      
      // Delete from IndexedDB immediately
      deleteFromDB(STORE_NAMES.IDEAS, id).catch(err => {
        console.error('[v0] Failed to delete idea from IndexedDB:', err);
        setError('Failed to delete idea');
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete idea';
      setError(message);
    }
  };

  const updateIdea = (id: string, updatedIdea: TradeIdea) => {
    try {
      if (!id) throw new Error('Idea ID is required');
      const updated = ideas.map(i => (i.id === id ? updatedIdea : i));
      setIdeas(updated);
      
      // Update in IndexedDB immediately
      putToDB(STORE_NAMES.IDEAS, updatedIdea).catch(err => {
        console.error('[v0] Failed to update idea in IndexedDB:', err);
        setError('Failed to update idea');
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update idea';
      setError(message);
    }
  };

  /**
   * Export ideas as JSON file with error handling
   */
  const exportJSON = () => {
    try {
      if (ideas.length === 0) {
        setError('No ideas to export');
        return;
      }

      const data = JSON.stringify(ideas, null, 2);
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `trading-ideas-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to export ideas';
      console.error('[v0] JSON export failed:', message);
      setError(message);
    }
  };

  /**
   * Export ideas as CSV file with error handling
   */
  const exportCSV = () => {
    try {
      if (ideas.length === 0) {
        setError('No ideas to export');
        return;
      }

      const headers = ['Created', 'Updated', 'Name', 'Symbol', 'Setup', 'Reasoning', 'Entry Logic', 'Exit Logic', 'Stop Loss Logic', 'Time Frame', 'Status', 'Outcome', 'Tags'];
      const rows = ideas.map(i => [
        i.createdAt,
        i.updatedAt,
        i.name,
        i.symbol || '',
        i.setup,
        i.reasoning,
        i.entryLogic,
        i.exitLogic,
        i.stopLossLogic || '',
        i.timeFrame || '',
        i.status,
        i.outcome || '',
        (i.tags || []).join(';'),
      ]);

      const csv = [headers, ...rows].map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `trading-ideas-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to export ideas';
      console.error('[v0] CSV export failed:', message);
      setError(message);
    }
  };

  const clearError = () => setError(null);

  const importJSON = async (file: Blob) => {
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);

      if (!Array.isArray(parsed)) {
        throw new Error('Invalid file format: expected an array of ideas');
      }

      // Validate each idea has required fields
      const validIdeas = parsed.every(idea => {
        return typeof idea === 'object' && 
               idea.id && 
               idea.name && 
               idea.createdAt && 
               idea.updatedAt;
      });

      if (!validIdeas) {
        throw new Error('Invalid idea data: missing required fields');
      }

      // Merge with existing ideas, avoiding duplicates by id
      const existingIds = new Set(ideas.map(i => i.id));
      const newIdeas = parsed.filter((idea: TradeIdea) => !existingIds.has(idea.id));
      const updated = [...ideas, ...newIdeas];
      setIdeas(updated);
      
      // Save all imported ideas to IndexedDB
      for (const idea of newIdeas) {
        await putToDB(STORE_NAMES.IDEAS, idea);
      }
      
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to import ideas';
      console.error('[v0] Ideas import error:', message);
      setError(message);
      throw err;
    }
  };

  return (
    <IdeasContext.Provider value={{ ideas, addIdea, deleteIdea, updateIdea, exportJSON, exportCSV, importJSON, error, clearError }}>
      {children}
    </IdeasContext.Provider>
  );
}

export function useIdeas() {
  const context = useContext(IdeasContext);
  if (!context) {
    throw new Error('useIdeas must be used within an IdeasProvider');
  }
  return context;
}
