'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { TradingGoal, GoalType } from './types';
import {
  getAllFromDB,
  putToDB,
  deleteFromDB,
  migrateFromLocalStorage,
  STORE_NAMES,
} from './db-service';

interface GoalsContextType {
  goals: TradingGoal[];
  addGoal: (goal: TradingGoal) => void;
  deleteGoal: (id: string) => void;
  updateGoal: (id: string, goal: TradingGoal) => void;
  updateGoalProgress: (id: string, newValue: number) => void;
  markGoalComplete: (id: string) => void;
  getProgressPercentage: (goal: TradingGoal) => number;
  error: string | null;
  clearError: () => void;
}

export const GoalsContext = createContext<GoalsContextType | undefined>(undefined);

/**
 * GoalsProvider - Context provider for trading goals management
 * Handles goal tracking with IndexedDB persistence
 */
export function GoalsProvider({ children }: { children: React.ReactNode }) {
  const [goals, setGoals] = useState<TradingGoal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Effect: Initialize goals from IndexedDB on mount
   * Migrates from localStorage if this is the first load
   */
  useEffect(() => {
    const initializeGoals = async () => {
      try {
        console.log('[GoalsContext] Starting initialization...');

        // Migrate from localStorage (one-time operation)
        const wasMigrated = await migrateFromLocalStorage(
          'trading-journal-goals',
          STORE_NAMES.GOALS
        );

        if (wasMigrated) {
          console.log('[GoalsContext] Data migrated from localStorage');
          localStorage.removeItem('trading-journal-goals');
        }

        // Load all goals from IndexedDB
        console.log('[GoalsContext] Loading goals from IndexedDB...');
        const loadedGoals = await getAllFromDB<TradingGoal>(STORE_NAMES.GOALS);
        console.log('[GoalsContext] Loaded', loadedGoals?.length || 0, 'goals');
        setGoals(loadedGoals || []);
        setError(null);
        console.log('[GoalsContext] Initialization complete');
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load goals';
        console.error('[GoalsContext] Initialization error:', message, err);
        setError(message);
      } finally {
        setIsLoading(false);
      }
    };

    initializeGoals();
  }, []);

  const addGoal = (goal: TradingGoal) => {
    try {
      if (!goal.id || !goal.title) {
        throw new Error('Invalid goal: missing required fields');
      }
      const updated = [goal, ...goals];
      setGoals(updated);
      putToDB(STORE_NAMES.GOALS, goal).catch(err => {
        console.error('[GoalsContext] Error saving goal:', err);
        setError('Failed to save goal');
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to add goal';
      console.error('[GoalsContext] Add error:', message);
      setError(message);
    }
  };

  const deleteGoal = (id: string) => {
    try {
      const updated = goals.filter(g => g.id !== id);
      setGoals(updated);
      deleteFromDB(STORE_NAMES.GOALS, id).catch(err => {
        console.error('[GoalsContext] Error deleting goal:', err);
        setError('Failed to delete goal');
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete goal';
      console.error('[GoalsContext] Delete error:', message);
      setError(message);
    }
  };

  const updateGoal = (id: string, updatedGoal: TradingGoal) => {
    try {
      const updated = goals.map(g => (g.id === id ? updatedGoal : g));
      setGoals(updated);
      putToDB(STORE_NAMES.GOALS, updatedGoal).catch(err => {
        console.error('[GoalsContext] Error updating goal:', err);
        setError('Failed to update goal');
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update goal';
      console.error('[GoalsContext] Update error:', message);
      setError(message);
    }
  };

  const updateGoalProgress = (id: string, newValue: number) => {
    try {
      const goal = goals.find(g => g.id === id);
      if (!goal) throw new Error('Goal not found');

      const progress = Math.min(100, (newValue / goal.targetValue) * 100);
      const status = progress >= 100 ? 'completed' : goal.status;

      const updated = {
        ...goal,
        currentValue: newValue,
        progress,
        status: status as 'active' | 'completed' | 'failed' | 'abandoned',
        updatedAt: new Date().toISOString(),
      };

      updateGoal(id, updated);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update progress';
      console.error('[GoalsContext] Progress update error:', message);
      setError(message);
    }
  };

  const markGoalComplete = (id: string) => {
    try {
      const goal = goals.find(g => g.id === id);
      if (!goal) throw new Error('Goal not found');

      const updated = {
        ...goal,
        status: 'completed' as const,
        currentValue: goal.targetValue,
        progress: 100,
        updatedAt: new Date().toISOString(),
      };

      updateGoal(id, updated);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to mark goal complete';
      console.error('[GoalsContext] Complete error:', message);
      setError(message);
    }
  };

  const getProgressPercentage = (goal: TradingGoal): number => {
    return Math.min(100, Math.round((goal.currentValue / goal.targetValue) * 100));
  };

  const clearError = () => setError(null);

  return (
    <GoalsContext.Provider
      value={{
        goals,
        addGoal,
        deleteGoal,
        updateGoal,
        updateGoalProgress,
        markGoalComplete,
        getProgressPercentage,
        error,
        clearError,
      }}
    >
      {children}
    </GoalsContext.Provider>
  );
}

export function useGoals() {
  const context = useContext(GoalsContext);
  if (!context) {
    throw new Error('useGoals must be used within a GoalsProvider');
  }
  return context;
}
