import { openDB, deleteDB, type IDBPDatabase } from 'idb';

export const DB_NAME = 'frapi_sentinel_db';
export const DB_VERSION = 5;

let dbPromise: Promise<IDBPDatabase> | null = null;

export async function getDb(): Promise<IDBPDatabase> {
  if (dbPromise) {
    return dbPromise;
  }

  dbPromise = (async () => {
    try {
      const db = await openDB(DB_NAME, DB_VERSION, {
        upgrade(db, _oldVersion, _newVersion, _transaction) {
          if (!db.objectStoreNames.contains('references')) {
            const store = db.createObjectStore('references', { keyPath: 'id' });
            store.createIndex('normalizedVpa', 'normalizedVpa', { unique: false });
          }
          if (!db.objectStoreNames.contains('reports')) {
            const store = db.createObjectStore('reports', { keyPath: 'id' });
            store.createIndex('entityType', 'entityType', { unique: false });
            store.createIndex('value', 'value', { unique: false });
          }
          if (!db.objectStoreNames.contains('history')) {
            const store = db.createObjectStore('history', { keyPath: 'id' });
            store.createIndex('timestamp', 'timestamp', { unique: false });
          }
          if (!db.objectStoreNames.contains('ocrCache')) {
            db.createObjectStore('ocrCache', { keyPath: 'key' });
          }
          if (!db.objectStoreNames.contains('meta')) {
            db.createObjectStore('meta', { keyPath: 'key' });
          }
          if (!db.objectStoreNames.contains('reputationCache')) {
            db.createObjectStore('reputationCache', { keyPath: 'hash' });
          }
        },
        blocked(currentVersion, blockedVersion) {
          console.warn(`IndexedDB open blocked: current ${currentVersion}, requested ${blockedVersion}`);
        },
        blocking(currentVersion, blockedVersion) {
          console.warn(`IndexedDB blocking higher version: current ${currentVersion}, requested ${blockedVersion}`);
        },
        terminated() {
          console.warn('IndexedDB connection terminated unexpectedly');
          dbPromise = null;
        },
      });

      db.addEventListener('versionchange', () => {
        try {
          db.close();
        } catch {
          // ignore close errors
        }
        dbPromise = null;
      });

      return db;
    } catch (err) {
      dbPromise = null;
      throw err;
    }
  })();

  return dbPromise;
}

export async function resetDatabase(): Promise<void> {
  if (dbPromise) {
    try {
      const db = await dbPromise;
      db.close();
    } catch {
      // ignore
    }
    dbPromise = null;
  }
  await deleteDB(DB_NAME);
  await getDb();
}
