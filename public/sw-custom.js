// Custom service worker for background sync
self.addEventListener('sync', async (event) => {
  console.log('Background sync event triggered:', event.tag);
  
  if (event.tag === 'sync-invoices') {
    event.waitUntil(syncInvoices());
  }
});

async function syncInvoices() {
  console.log('Syncing pending invoices in background...');
  
  try {
    // Open IndexedDB
    const db = await openDB();
    const pendingInvoices = await getPendingInvoices(db);
    
    if (pendingInvoices.length === 0) {
      console.log('No pending invoices to sync');
      return;
    }
    
    console.log(`Found ${pendingInvoices.length} pending invoices`);
    
    for (const invoice of pendingInvoices) {
      try {
        // Send invoice
        await sendInvoice(invoice);
        
        // Delete from IndexedDB after success
        await deleteInvoice(db, invoice.id);
        
        console.log(`Successfully synced invoice: ${invoice.id}`);
      } catch (error) {
        console.error(`Failed to sync invoice ${invoice.id}:`, error);
      }
    }
    
    // Notify all clients about sync completion
    const clients = await self.clients.matchAll();
    
    if (clients.length > 0) {
      // App is open, notify clients
      clients.forEach(client => {
        client.postMessage({
          type: 'BACKGROUND_SYNC_SUCCESS',
          count: pendingInvoices.length
        });
      });
    } else {
      // App is closed, show notification
      await self.registration.showNotification('Invoices Sent', {
        body: `${pendingInvoices.length} invoice${pendingInvoices.length !== 1 ? 's' : ''} sent successfully!`,
        icon: '/apple-touch-icon.png',
        badge: '/favicon.png',
        tag: 'invoice-sync',
        requireInteraction: false,
        silent: false
      });
    }
    
  } catch (error) {
    console.error('Background sync failed:', error);
  }
}

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('i-bookin-offline', 1);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function getPendingInvoices(db) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['pending-invoices'], 'readonly');
    const store = transaction.objectStore('pending-invoices');
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function deleteInvoice(db, id) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['pending-invoices'], 'readwrite');
    const store = transaction.objectStore('pending-invoices');
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

async function sendInvoice(invoice) {
  // This would need to call your edge function
  // For now, we'll just log it
  console.log('Sending invoice:', invoice);
  // In production, you'd make the actual API call here
}
