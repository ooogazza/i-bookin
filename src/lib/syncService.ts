import { getPendingInvoices, deletePendingInvoice } from './offlineStorage';
import { handleSendToAdmin as sendInvoiceToAdmin } from './invoiceUtils';
import { toast } from 'sonner';

// Sync all pending invoices
export const syncPendingInvoices = async (): Promise<void> => {
  console.log('Starting sync of pending invoices...');
  
  try {
    const pendingInvoices = await getPendingInvoices();
    
    if (pendingInvoices.length === 0) {
      console.log('No pending invoices to sync');
      return;
    }

    console.log(`Found ${pendingInvoices.length} pending invoice(s) to sync`);

    for (const pending of pendingInvoices) {
      try {
        console.log(`Syncing invoice: ${pending.id}`);
        
        // Send the invoice using the existing send function
        await sendInvoiceToAdmin(pending.invoiceData, pending.userName);
        
        // Delete from IndexedDB after successful send
        await deletePendingInvoice(pending.id);
        
        console.log(`Successfully synced and removed invoice: ${pending.id}`);
      } catch (error) {
        console.error(`Failed to sync invoice ${pending.id}:`, error);
        // Keep the invoice in storage for next sync attempt
      }
    }

    console.log('Sync completed');
  } catch (error) {
    console.error('Error during sync:', error);
  }
};

// Set up online/offline event listeners
export const setupSyncListeners = (): void => {
  window.addEventListener('online', async () => {
    console.log('Connection restored, syncing pending invoices...');
    toast.info('Connection restored. Syncing pending invoices...');
    
    try {
      await syncPendingInvoices();
      const pendingCount = (await getPendingInvoices()).length;
      
      if (pendingCount === 0) {
        toast.success('All pending invoices synced successfully!');
      }
    } catch (error) {
      console.error('Sync failed:', error);
      toast.error('Some invoices failed to sync. Will retry later.');
    }
  });

  window.addEventListener('offline', () => {
    console.log('Connection lost. Invoices will be queued for sending when online.');
    toast.warning('You are offline. Invoices will be sent when connection is restored.');
  });
};

// Initialize sync service
export const initSyncService = async (): Promise<void> => {
  setupSyncListeners();
  
  // Try to sync any pending invoices on startup if online
  if (navigator.onLine) {
    console.log('App started online, checking for pending invoices...');
    await syncPendingInvoices();
  }
};
