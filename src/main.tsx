import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);

// Register service workers
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // Register main PWA service worker
    navigator.serviceWorker.register('/sw.js').then(
      (registration) => {
        console.log('ServiceWorker registration successful');
        
        // Check for updates periodically
        setInterval(() => {
          registration.update();
        }, 60000); // Check every minute

        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // New service worker available, reload to activate
                if (confirm('Nova versão disponível! Recarregar agora?')) {
                  window.location.reload();
                }
              }
            });
          }
        });
      },
      (error) => {
        console.log('ServiceWorker registration failed:', error);
      }
    );

    // Register push notification service worker
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
