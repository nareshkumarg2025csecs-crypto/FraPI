export interface SharedPayload {
  text?: string;
  file?: {
    name: string;
    type: string;
    dataUrl?: string;
    buffer?: ArrayBuffer;
  };
}

export function openShareDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB not available'));
    }
    const req = indexedDB.open('frapi_share_db', 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('shared_items')) {
        db.createObjectStore('shared_items', { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveSharedData(data: SharedPayload): Promise<void> {
  const db = await openShareDb();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction('shared_items', 'readwrite');
    const store = tx.objectStore('shared_items');
    store.put({ id: 'latest_share', ...data, timestamp: Date.now() });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getAndClearSharedData(): Promise<SharedPayload | null> {
  try {
    const db = await openShareDb();
    return new Promise((resolve) => {
      const tx = db.transaction('shared_items', 'readwrite');
      const store = tx.objectStore('shared_items');
      const req = store.get('latest_share');
      req.onsuccess = () => {
        const result = req.result;
        if (result) {
          store.delete('latest_share');
          resolve({
            text: result.text,
            file: result.file,
          });
        } else {
          resolve(null);
        }
      };
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}
