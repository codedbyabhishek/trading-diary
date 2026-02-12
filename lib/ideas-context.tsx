'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { TradeIdea } from './types';

interface IdeasContextType {
  ideas: TradeIdea[];
  addIdea: (idea: TradeIdea) => void;
  deleteIdea: (id: string) => void;
  updateIdea: (id: string, idea: TradeIdea) => void;
  exportJSON: () => void;
  exportCSV: () => void;
  error: string | null;
  clearError: () => void;
}

export const IdeasContext = createContext<IdeasContextType | undefined>(undefined);

const STORAGE_KEY = 'trading-journal-ideas';

export function IdeasProvider({ children }: { children: React.ReactNode }) {
  const [ideas, setIdeas] = useState<TradeIdea[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (!Array.isArray(parsed)) {
          throw new Error('Invalid stored ideas data');
        }
        setIdeas(parsed);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load ideas';
      console.error('[v0] Ideas load error:', message);
      setError(message);
      localStorage.removeItem(STORAGE_KEY);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isLoading) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(ideas));
        setError(null);
      } catch (err) {
        const message = 'Failed to save ideas (storage might be full)';
        console.error('[v0] Ideas storage error:', err);
        setError(message);
      }
    }
  }, [ideas, isLoading]);

  const addIdea = (idea: TradeIdea) => {
    try {
      if (!idea.id || !idea.name) {
        throw new Error('Invalid idea: missing required fields');
      }
      setIdeas(prev => [idea, ...prev]);
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to add idea';
      setError(message);
    }
  };

  const deleteIdea = (id: string) => {
    try {
      if (!id) throw new Error('Idea ID is required');
      setIdeas(prev => prev.filter(i => i.id !== id));
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete idea';
      setError(message);
    }
  };

  const updateIdea = (id: string, updatedIdea: TradeIdea) => {
    try {
      if (!id) throw new Error('Idea ID is required');
      setIdeas(prev => prev.map(i => (i.id === id ? updatedIdea : i)));
      setError(null);
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

  return (
    <IdeasContext.Provider value={{ ideas, addIdea, deleteIdea, updateIdea, exportJSON, exportCSV, error, clearError }}>
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
