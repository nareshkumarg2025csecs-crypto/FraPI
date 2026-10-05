import { describe, it, expect, beforeEach } from 'vitest';
import { openDB } from 'idb';
import 'fake-indexeddb/auto';
import { getDb, DB_NAME, DB_VERSION } from './db';

describe('IndexedDB Migration & Versioning', () => {
  beforeEach(async () => {
    // Ensure clean state before test
    indexedDB.deleteDatabase(DB_NAME);
  });

  it('migrates smoothly from version 2 to current DB_VERSION without VersionError and preserves existing records', async () => {
    // 1. Simulate existing database created at version 2 with data
    const oldDb = await openDB(DB_NAME, 2, {
      upgrade(db) {
        const store = db.createObjectStore('references', { keyPath: 'id' });
        store.createIndex('normalizedVpa', 'normalizedVpa', { unique: false });
        const repStore = db.createObjectStore('reports', { keyPath: 'id' });
        repStore.createIndex('entityType', 'entityType', { unique: false });
      },
    });

    await oldDb.put('references', {
      id: 'ref_old_1',
      label: 'Test Merchant',
      vpa: 'test@upi',
      normalizedVpa: 'test@upi',
      payeeName: 'Test Merchant',
      hash: 'abc123hash',
      createdAt: 1000,
    });
    oldDb.close();

    // 2. Open DB with current getDb() implementation (version 4)
    const newDb = await getDb();

    expect(newDb.version).toBe(DB_VERSION);
    expect(newDb.objectStoreNames.contains('references')).toBe(true);
    expect(newDb.objectStoreNames.contains('reports')).toBe(true);
    expect(newDb.objectStoreNames.contains('history')).toBe(true);
    expect(newDb.objectStoreNames.contains('ocrCache')).toBe(true);
    expect(newDb.objectStoreNames.contains('meta')).toBe(true);

    // 3. Verify that old data was preserved
    const record = await newDb.get('references', 'ref_old_1');
    expect(record).toBeDefined();
    expect(record.label).toBe('Test Merchant');
  });
});
