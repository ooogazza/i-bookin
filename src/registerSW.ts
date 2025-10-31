import { registerSW } from "virtual:pwa-register";
import { initSyncService } from "@/lib/syncService";
import { playSuccessSound } from "@/lib/soundUtils";
import { toast } from "sonner";

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
          const count = event.data.count || 0;
          
          // Play success sound
          playSuccessSound();
          
          // Show toast notification
          toast.success(`${count} invoice${count !== 1 ? 's' : ''} sent successfully!`);
        }
      });
    }
  },
});
