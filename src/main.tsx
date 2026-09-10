import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);

import { registerSW } from 'virtual:pwa-register';

// Register service worker using vite-plugin-pwa
if ('serviceWorker' in navigator) {
  // Unregister any old service workers first to prevent caching issues on refresh
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (let registration of registrations) {
      // Don't unregister the push SW if it's separate, but unregister the main one
      if (registration.active?.scriptURL.includes('sw.js')) {
        registration.unregister();
      }
    }
  }).then(() => {
    // Register the new SW
    registerSW({ immediate: true });
  });
  
  window.addEventListener('load', () => {
    // Register push notification service worker (keep this one if custom)
    navigator.serviceWorker.register('/sw-push.js').then(
      (registration) => {
        console.log('Push ServiceWorker registration successful');
      },
      (error) => {
        console.log('Push ServiceWorker registration failed:', error);
      }
    );
  });
}
