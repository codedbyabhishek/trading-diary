'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { TradeFormData } from './types';
import {
  getAllFromDB,
  putToDB,
  deleteFromDB,
  migrateFromLocalStorage,
  STORE_NAMES,
} from './db-service';

export interface TradeTemplate {
  id: string;
  name: string;
  description: string;
  symbol: string;
  setupName: string;
  tradeType: 'Intraday' | 'Swing' | 'Scalping' | 'Positional';
  position?: 'Buy' | 'Sell';
  timeFrame?: string;
  riskPercent?: number;
  plannedRTarget?: number;
  preNotes?: string;
  session?: string;
  marketCondition?: string;
  createdAt: string;
  updatedAt: string;
  usageCount: number; // Track how many trades used this template
}

interface TemplatesContextType {
  templates: TradeTemplate[];
  addTemplate: (template: TradeTemplate) => void;
  deleteTemplate: (id: string) => void;
  updateTemplate: (id: string, template: TradeTemplate) => void;
  getTemplate: (id: string) => TradeTemplate | undefined;
  incrementUsageCount: (id: string) => void;
  error: string | null;
  clearError: () => void;
}

export const TemplatesContext = createContext<TemplatesContextType | undefined>(undefined);

/**
 * TemplatesProvider - Context provider for trade templates management
 * Allows users to create reusable trade templates for quick entry
 */
export function TemplatesProvider({ children }: { children: React.ReactNode }) {
  const [templates, setTemplates] = useState<TradeTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Effect: Initialize templates from IndexedDB on mount
   */
  useEffect(() => {
    const initializeTemplates = async () => {
      try {
        console.log('[TemplatesContext] Starting initialization...');

        // Migrate from localStorage (one-time operation)
        const wasMigrated = await migrateFromLocalStorage(
          'trading-journal-templates',
          STORE_NAMES.TEMPLATES
        );

        if (wasMigrated) {
          console.log('[TemplatesContext] Data migrated from localStorage');
          localStorage.removeItem('trading-journal-templates');
        }

        // Load all templates from IndexedDB
        console.log('[TemplatesContext] Loading templates from IndexedDB...');
        const loadedTemplates = await getAllFromDB<TradeTemplate>(STORE_NAMES.TEMPLATES);
        console.log('[TemplatesContext] Loaded', loadedTemplates?.length || 0, 'templates');
        setTemplates(loadedTemplates || []);
        setError(null);
        console.log('[TemplatesContext] Initialization complete');
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load templates';
        console.error('[TemplatesContext] Initialization error:', message, err);
        setError(message);
      } finally {
        setIsLoading(false);
      }
    };

    initializeTemplates();
  }, []);

  const addTemplate = (template: TradeTemplate) => {
    try {
      if (!template.id || !template.name || !template.setupName) {
        throw new Error('Invalid template: missing required fields');
      }
      const updated = [template, ...templates];
      setTemplates(updated);
      putToDB(STORE_NAMES.TEMPLATES, template).catch(err => {
        console.error('[TemplatesContext] Error saving template:', err);
        setError('Failed to save template');
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to add template';
      console.error('[TemplatesContext] Add error:', message);
      setError(message);
    }
  };

  const deleteTemplate = (id: string) => {
    try {
      const updated = templates.filter(t => t.id !== id);
      setTemplates(updated);
      deleteFromDB(STORE_NAMES.TEMPLATES, id).catch(err => {
        console.error('[TemplatesContext] Error deleting template:', err);
        setError('Failed to delete template');
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete template';
      console.error('[TemplatesContext] Delete error:', message);
      setError(message);
    }
  };

  const updateTemplate = (id: string, updatedTemplate: TradeTemplate) => {
    try {
      const updated = templates.map(t => (t.id === id ? updatedTemplate : t));
      setTemplates(updated);
      putToDB(STORE_NAMES.TEMPLATES, updatedTemplate).catch(err => {
        console.error('[TemplatesContext] Error updating template:', err);
        setError('Failed to update template');
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update template';
      console.error('[TemplatesContext] Update error:', message);
      setError(message);
    }
  };

  const getTemplate = (id: string): TradeTemplate | undefined => {
    return templates.find(t => t.id === id);
  };

  const incrementUsageCount = (id: string) => {
    try {
      const template = templates.find(t => t.id === id);
      if (!template) throw new Error('Template not found');

      const updated = {
        ...template,
        usageCount: template.usageCount + 1,
        updatedAt: new Date().toISOString(),
      };

      updateTemplate(id, updated);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to increment usage';
      console.error('[TemplatesContext] Increment error:', message);
      setError(message);
    }
  };

  const clearError = () => setError(null);

  return (
    <TemplatesContext.Provider
      value={{
        templates,
        addTemplate,
        deleteTemplate,
        updateTemplate,
        getTemplate,
        incrementUsageCount,
        error,
        clearError,
      }}
    >
      {children}
    </TemplatesContext.Provider>
  );
}

export function useTemplates() {
  const context = useContext(TemplatesContext);
  if (!context) {
    throw new Error('useTemplates must be used within a TemplatesProvider');
  }
  return context;
}
