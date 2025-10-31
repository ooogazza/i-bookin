// IndexedDB wrapper for storing pending invoices offline
const DB_NAME = 'i-bookin-offline';
const DB_VERSION = 1;
const STORE_NAME = 'pending-invoices';

interface PendingInvoice {
  id: string;
  timestamp: number;
  invoiceData: any;
  userName: string;
  type: 'send-to-admin';
  requestUrl?: string;
  requestHeaders?: Record<string, string>;
  requestBody?: any;
}

// Initialize IndexedDB
export const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };
  });
};

// Store a pending invoice
export const storePendingInvoice = async (
  invoiceData: any,
  userName: string,
  request?: { url: string; headers: Record<string, string>; body: any }
): Promise<string> => {
  const db = await initDB();
  const id = `invoice-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  const pendingInvoice: PendingInvoice = {
    id,
    timestamp: Date.now(),
    invoiceData,
    userName,
    type: 'send-to-admin',
    requestUrl: request?.url,
    requestHeaders: request?.headers,
    requestBody: request?.body,
  };

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const requestAdd = store.add(pendingInvoice);

    requestAdd.onsuccess = () => resolve(id);
    requestAdd.onerror = () => reject(requestAdd.error);
  });
};

// Get all pending invoices
export const getPendingInvoices = async (): Promise<PendingInvoice[]> => {
  const db = await initDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

// Delete a pending invoice after successful send
export const deletePendingInvoice = async (id: string): Promise<void> => {
  const db = await initDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

// Check if we're online
export const isOnline = (): boolean => {
  return navigator.onLine;
};

// Register background sync if supported
export const registerBackgroundSync = async (tag: string): Promise<void> => {
  if ('serviceWorker' in navigator && 'sync' in ServiceWorkerRegistration.prototype) {
    try {
      const registration = await navigator.serviceWorker.ready;
      await (registration as any).sync.register(tag);
      console.log('Background sync registered:', tag);
    } catch (error) {
      console.error('Background sync registration failed:', error);
    }
  } else {
    console.log('Background sync not supported');
  }
};
