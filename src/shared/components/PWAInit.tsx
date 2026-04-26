'use client';

// src/shared/components/PWAInit.tsx
// Mounts the Service Worker silently — no UI, runs once on app boot.

import { useEffect } from 'react';

export default function PWAInit() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .then((reg) => {
          console.log('[PWA] Service Worker registered, scope:', reg.scope);
        })
        .catch((err) => {
          console.warn('[PWA] Service Worker registration failed:', err);
        });
    }
  }, []);

  return null; // No UI — purely side-effect
}
