
import { Buffer } from 'buffer';
window.Buffer = Buffer;

import { bootstrapApplication } from '@angular/platform-browser';
import { provideZonelessChangeDetection } from '@angular/core';
import { AppComponent } from './src/app.component';

const preBootstrap = () => {
  const sanitize = (storage: Storage, storageName: string) => {
    try {
      const keys: string[] = [];
      for (let i = 0; i < storage.length; i++) {
        const key = storage.key(i);
        if (key) keys.push(key);
      }

      for (const key of keys) {
        const value = storage.getItem(key);
        if (value === 'undefined' || value === 'null') {
          console.warn(`[Pre-flight Check] Corrupted ${storageName} detected (key: "${key}"). Clearing storage to prevent crash.`);
          storage.clear();
          return; 
        }
      }
    } catch (e) {
      console.error(`[Pre-flight Check] Error sanitizing ${storageName}:`, e);
      try {
        storage.clear();
      } catch (clearError) {
        console.error(`[Pre-flight Check] Failed to clear ${storageName} after error:`, clearError);
      }
    }
  };

  sanitize(localStorage, 'localStorage');
  sanitize(sessionStorage, 'sessionStorage');
  
  bootstrapApplication(AppComponent, {
    providers: [
      provideZonelessChangeDetection()
    ]
  }).then(() => {
    // Register Service Worker
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
          .then(registration => {
            console.log('SW registered: ', registration);
          })
          .catch(registrationError => {
            console.log('SW registration failed: ', registrationError);
          });
      });
    }
  }).catch(err => console.error(err));
};

preBootstrap();


// AI Studio always uses an `index.tsx` file for all project types.