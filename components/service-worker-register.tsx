'use client';

import { useEffect } from 'react';
import { initOfflineSync } from '@/lib/offline-sync';

export function ServiceWorkerRegister() {
  useEffect(() => {
    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .then((registration) => {
          console.log('[PWA] Service Worker registered:', registration);
        })
        .catch((error) => {
          console.error('[PWA] Service Worker registration failed:', error);
        });
    }

    // Initialize offline sync
    initOfflineSync().catch(err => {
      console.error('[PWA] Offline sync init failed:', err);
    });

    // Handle app install prompt
    let deferredPrompt: any;
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPrompt = e;
      // UI for "Install" button would be shown here
    });

    window.addEventListener('appinstalled', () => {
      console.log('[PWA] App installed');
      deferredPrompt = null;
    });
  }, []);

  return null;
}
