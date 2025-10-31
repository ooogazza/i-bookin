import { registerSW } from "virtual:pwa-register";
import { initSyncService } from "@/lib/syncService";

// Initialize sync service for offline support
initSyncService();

const updateSW = registerSW({
  onNeedRefresh() {
    // Optional: show a prompt to the user
    if (confirm("New content available. Reload?")) {
      updateSW(true);
    }
  },
  onOfflineReady() {
    console.log("App ready to work offline");
  },
  onRegisteredSW(swUrl, registration) {
    if (registration) {
      // Listen for service worker messages
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'BACKGROUND_SYNC_SUCCESS') {
          console.log('Background sync completed successfully');
        }
      });
    }
  },
});
