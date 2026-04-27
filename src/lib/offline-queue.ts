// src/lib/offline-queue.ts
import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { DraftBattle } from './types';

interface QueueDB extends DBSchema {
  pending: {
    key: number;
    value: { id?: number; draft: DraftBattle; queued_at: number };
    indexes: { 'by-time': number };
  };
}

let dbPromise: Promise<IDBPDatabase<QueueDB>> | null = null;

function getDb() {
  if (!dbPromise) {
    dbPromise = openDB<QueueDB>('beystadium-queue', 1, {
      upgrade(db) {
        const store = db.createObjectStore('pending', {
          keyPath: 'id',
          autoIncrement: true,
        });
        store.createIndex('by-time', 'queued_at');
      },
    });
  }
  return dbPromise;
}

export async function enqueueBattle(draft: DraftBattle) {
  const db = await getDb();
  await db.add('pending', { draft, queued_at: Date.now() });
}

export async function drainQueue(submit: (d: DraftBattle) => Promise<unknown>) {
  // No IndexedDB (e.g., jsdom test env): nothing to drain.
  if (typeof indexedDB === 'undefined') return;
  const db = await getDb();
  const all = await db.getAll('pending');
  for (const item of all) {
    try {
      await submit(item.draft);
      if (item.id !== undefined) {
        await db.delete('pending', item.id);
      }
    } catch {
      /* keep for next try */
    }
  }
}
