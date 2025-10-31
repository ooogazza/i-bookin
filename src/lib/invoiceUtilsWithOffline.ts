import { handleSendToAdmin as originalSendToAdmin } from './invoiceUtils';
import { storePendingInvoice, isOnline, registerBackgroundSync } from './offlineStorage';
import { toast } from 'sonner';

// Wrapper for sending invoices with offline support
export const sendInvoiceWithOfflineSupport = async (
  invoice: any,
  userName: string
): Promise<{ success: boolean; queued?: boolean }> => {
  // Check if online
  if (!isOnline()) {
    console.log('Offline mode: Storing invoice for later sync');
    
    try {
      // Store the invoice in IndexedDB
      const id = await storePendingInvoice(invoice, userName);
      console.log('Invoice stored for offline sync:', id);
      
      // Register background sync if supported
      await registerBackgroundSync('sync-invoices');
      
      toast.success('Invoice saved! It will be sent when connection is restored.', {
        duration: 5000,
      });
      
      return { success: true, queued: true };
    } catch (error) {
      console.error('Failed to store invoice offline:', error);
      toast.error('Failed to save invoice for offline sync');
      throw error;
    }
  }

  // If online, send immediately
  try {
    await originalSendToAdmin(invoice, userName);
    return { success: true, queued: false };
  } catch (error) {
    console.error('Failed to send invoice online:', error);
    
    // If sending fails, store for later
    console.log('Send failed, storing for offline sync');
    try {
      const id = await storePendingInvoice(invoice, userName);
      console.log('Invoice stored after send failure:', id);
      
      await registerBackgroundSync('sync-invoices');
      
      toast.warning('Invoice saved offline. Will retry when connection improves.', {
        duration: 5000,
      });
      
      return { success: true, queued: true };
    } catch (offlineError) {
      console.error('Failed to store invoice after send failure:', offlineError);
      throw error;
    }
  }
};
