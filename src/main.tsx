import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);

import { registerSW } from 'virtual:pwa-register';

// Register service worker using vite-plugin-pwa
if ('serviceWorker' in navigator) {
  registerSW({ immediate: true });
  
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
