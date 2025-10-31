import { handleSendToAdmin as originalSendToAdmin, generateInvoicePDFBase64 } from './invoiceUtils';
import { storePendingInvoice, isOnline, registerBackgroundSync } from './offlineStorage';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

// Wrapper for sending invoices with offline support
export const sendInvoiceWithOfflineSupport = async (
  invoice: any,
  userName: string
): Promise<{ success: boolean; queued?: boolean }> => {
  // Check if online
  if (!isOnline()) {
    if (import.meta.env.DEV) {
      console.log('Offline mode: Storing invoice for later sync');
    }
    
    try {
      // Build request payload with pre-generated PDF so SW can send while app is closed
      const pdfBase64 = await generateInvoicePDFBase64(invoice, userName);
      
      // Get user email from cached session (don't make API call when offline)
      let session: any = {};
      try {
        const sessionData = localStorage.getItem('sb-mmihdfqltklnybxotvdx-auth-token');
        if (sessionData) {
          session = JSON.parse(sessionData);
        }
      } catch (error) {
        if (import.meta.env.DEV) {
          console.warn('Failed to parse session from localStorage:', error);
        }
      }
      const bookedByEmail = session?.user?.email || 'unknown@example.com';

      const requestBody = {
        invoiceNumber: invoice.invoiceNumber,
        pdfBase64,
        imageUrl: invoice.imageUrl || null,
        invoiceDetails: {
          bookedBy: userName,
          bookedByEmail,
          totalValue: invoice.total,
          createdAt: new Date().toISOString(),
          notes: invoice.notes || null,
        },
        userId: session?.user?.id || null,
        gangMembers: (invoice.gangMembers || []).map((m: any) => ({
          name: m.name,
          type: m.type,
          amount: m.amount,
          email: m.email || null,
        })),
      };

      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/process-offline-invoice`;
      const apiKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;
      const headers = {
        'Content-Type': 'application/json',
        'apikey': apiKey,
        'Authorization': `Bearer ${apiKey}`,
      } as Record<string, string>;

      // Store the invoice + request details in IndexedDB
      const id = await storePendingInvoice(invoice, userName, { url, headers, body: requestBody });
      if (import.meta.env.DEV) {
        console.log('Invoice stored for offline sync:', id);
      }
      
      // Register background sync if supported
      await registerBackgroundSync('sync-invoices');
      
      toast.success('Invoice saved! It will be sent when connection is restored.', {
        duration: 5000,
      });
      
      return { success: true, queued: true };
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Failed to store invoice offline:', error);
      }
      toast.error('Failed to save invoice for offline sync');
      throw error;
    }
  }

  // If online, send immediately
  try {
    await originalSendToAdmin(invoice, userName);
    return { success: true, queued: false };
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('Failed to send invoice online:', error);
      console.log('Send failed, storing for offline sync');
    }
    
    try {
      // Build and store request so SW/background can send later
      const pdfBase64 = await generateInvoicePDFBase64(invoice, userName);
      
      // Get user email from cached session (don't make API call when offline)
      let session: any = {};
      try {
        const sessionData = localStorage.getItem('sb-mmihdfqltklnybxotvdx-auth-token');
        if (sessionData) {
          session = JSON.parse(sessionData);
        }
      } catch (parseError) {
        if (import.meta.env.DEV) {
          console.warn('Failed to parse session from localStorage:', parseError);
        }
      }
      const bookedByEmail = session?.user?.email || 'unknown@example.com';

      const requestBody = {
        invoiceNumber: invoice.invoiceNumber,
        pdfBase64,
        imageUrl: invoice.imageUrl || null,
        invoiceDetails: {
          bookedBy: userName,
          bookedByEmail,
          totalValue: invoice.total,
          createdAt: new Date().toISOString(),
          notes: invoice.notes || null,
        },
        userId: session?.user?.id || null,
        gangMembers: (invoice.gangMembers || []).map((m: any) => ({
          name: m.name,
          type: m.type,
          amount: m.amount,
          email: m.email || null,
        })),
      };

      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/process-offline-invoice`;
      const apiKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;
      const headers = {
        'Content-Type': 'application/json',
        'apikey': apiKey,
        'Authorization': `Bearer ${apiKey}`,
      } as Record<string, string>;

      const id = await storePendingInvoice(invoice, userName, { url, headers, body: requestBody });
      if (import.meta.env.DEV) {
        console.log('Invoice stored after send failure:', id);
      }
      
      await registerBackgroundSync('sync-invoices');
      
      toast.warning('Invoice saved offline. Will retry when connection improves.', {
        duration: 5000,
      });
      
      return { success: true, queued: true };
    } catch (offlineError) {
      if (import.meta.env.DEV) {
        console.error('Failed to store invoice after send failure:', offlineError);
      }
      throw error;
    }
  }
};
