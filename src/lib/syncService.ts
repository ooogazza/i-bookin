import { getPendingInvoices, deletePendingInvoice } from './offlineStorage';
import { handleSendToAdmin as sendInvoiceToAdmin } from './invoiceUtils';
import { toast } from 'sonner';

// Sync all pending invoices
export const syncPendingInvoices = async (): Promise<void> => {
  if (import.meta.env.DEV) {
    console.log('Starting sync of pending invoices...');
  }
  
  try {
    const pendingInvoices = await getPendingInvoices();
    
    if (pendingInvoices.length === 0) {
      if (import.meta.env.DEV) {
        console.log('No pending invoices to sync');
      }
      return;
    }

    if (import.meta.env.DEV) {
      console.log(`Found ${pendingInvoices.length} pending invoice(s) to sync`);
    }

    for (const pending of pendingInvoices) {
      try {
        if (import.meta.env.DEV) {
          console.log(`Syncing invoice: ${pending.id}`);
        }
        
        // Send the invoice using the existing send function
        await sendInvoiceToAdmin(pending.invoiceData, pending.userName);
        
        // Delete from IndexedDB after successful send
        await deletePendingInvoice(pending.id);
        
        if (import.meta.env.DEV) {
          console.log(`Successfully synced and removed invoice: ${pending.id}`);
        }
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error(`Failed to sync invoice ${pending.id}:`, error);
        }
        // Keep the invoice in storage for next sync attempt
      }
    }

    if (import.meta.env.DEV) {
      console.log('Sync completed');
    }
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('Error during sync:', error);
    }
  }
};

// Set up online/offline event listeners
export const setupSyncListeners = (): void => {
  window.addEventListener('online', async () => {
    if (import.meta.env.DEV) {
      console.log('Connection restored, syncing pending invoices...');
    }
    toast.info('Connection restored. Syncing pending invoices...');
    
    try {
      await syncPendingInvoices();
      const pendingCount = (await getPendingInvoices()).length;
      
      if (pendingCount === 0) {
        toast.success('All pending invoices synced successfully!');
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Sync failed:', error);
      }
      toast.error('Some invoices failed to sync. Will retry later.');
    }
  });

  window.addEventListener('offline', () => {
    if (import.meta.env.DEV) {
      console.log('Connection lost. Invoices will be queued for sending when online.');
    }
    toast.warning('You are offline. Invoices will be sent when connection is restored.');
  });
};

// Request notification permission
export const requestNotificationPermission = async (): Promise<boolean> => {
  if (!('Notification' in window)) {
    if (import.meta.env.DEV) {
      console.log('Notifications not supported');
    }
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  return false;
};

// Initialize sync service
export const initSyncService = async (): Promise<void> => {
  setupSyncListeners();
  
  // Request notification permission for background notifications
  await requestNotificationPermission();
  
  // Try to sync any pending invoices on startup if online
  if (navigator.onLine) {
    if (import.meta.env.DEV) {
      console.log('App started online, checking for pending invoices...');
    }
    await syncPendingInvoices();
  }
};
