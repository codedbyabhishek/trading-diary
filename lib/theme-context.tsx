'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

/**
 * Theme type - supports light, dark, and system preference
 */
export type Theme = 'light' | 'dark' | 'system';

/**
 * Theme context type definition
 */
interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  resolvedTheme: 'light' | 'dark';
}

/**
 * Theme Context - provides theme management across the app
 */
const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

/**
 * Custom hook to use theme context
 * @throws Error if used outside ThemeProvider
 * @returns Theme context values and setters
 */
export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

/**
 * ThemeProvider - Manages theme state and persistence
 * Supports light, dark, and system preferences with localStorage persistence
 * @param children - React components to wrap
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('system');
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light');

  /**
   * Initialize theme from localStorage and system preference
   * Only runs on client to avoid hydration mismatch
   */
  useEffect(() => {
    // Get saved theme preference or default to system
    const savedTheme = (localStorage.getItem('theme-preference') as Theme) || 'system';
    setThemeState(savedTheme);

    // Resolve theme based on preference and system settings
    const resolveTheme = (themePreference: Theme): 'light' | 'dark' => {
      if (themePreference === 'system') {
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      }
      return themePreference;
    };

    const resolved = resolveTheme(savedTheme);
    setResolvedTheme(resolved);
    applyTheme(resolved, savedTheme);

    // Listen for system theme changes when using system preference
    if (savedTheme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = (e: MediaQueryListEvent) => {
        const newResolved = e.matches ? 'dark' : 'light';
        setResolvedTheme(newResolved);
        applyTheme(newResolved, 'system');
      };

      // Support both old and new addEventListener API
      if (mediaQuery.addEventListener) {
        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
      }
    }
  }, []);

  /**
   * Apply theme to DOM and trigger visual update
   * @param resolved - Resolved theme to apply ('light' or 'dark')
   * @param preference - User's theme preference
   */
  const applyTheme = (resolved: 'light' | 'dark', preference: Theme) => {
    const html = document.documentElement;

    // Remove all theme classes
    html.classList.remove('light', 'dark');

    // Add resolved theme class
    html.classList.add(resolved);

    // Set data attribute for alternative selectors
    html.setAttribute('data-theme', resolved);

    // Update meta theme-color for mobile browsers
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute(
        'content',
        resolved === 'dark' ? '#161616' : '#f8f8f8'
      );
    }

    // Emit custom event for components that need to listen
    window.dispatchEvent(
      new CustomEvent('themechange', {
        detail: { theme: resolved, preference },
      })
    );
  };

  /**
   * Update theme and persist to localStorage
   * @param newTheme - Theme to set ('light', 'dark', or 'system')
   */
  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem('theme-preference', newTheme);

    // Resolve and apply the new theme
    const resolved: 'light' | 'dark' = newTheme === 'system'
      ? window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
      : newTheme;

    setResolvedTheme(resolved);
    applyTheme(resolved, newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, resolvedTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
