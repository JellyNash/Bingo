import type { QueuedEvent } from './types';

const DB_NAME = 'analytics-queue';
const DB_VERSION = 1;
const STORE_NAME = 'events';
const FALLBACK_KEY = 'analytics-fallback';
const MAX_FALLBACK_SIZE = 200;

export class QueueStorage {
  private db?: IDBDatabase;
  private dbPromise?: Promise<IDBDatabase>;
  private isAvailable = false;

  constructor() {
    // Check if IndexedDB is available
    if (typeof window !== 'undefined' && 'indexedDB' in window) {
      this.isAvailable = true;
    }
  }

  private async openDB(): Promise<IDBDatabase> {
    if (this.db) return this.db;
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
      try {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => {
          console.warn('[Analytics] IndexedDB open failed:', request.error);
          reject(request.error);
        };

        request.onsuccess = () => {
          this.db = request.result;
          resolve(this.db);
        };

        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
            store.createIndex('queuedAt', 'queuedAt', { unique: false });
            store.createIndex('app', 'app', { unique: false });
            store.createIndex('name', 'name', { unique: false });
          }
        };
      } catch (err) {
        console.warn('[Analytics] IndexedDB not available:', err);
        reject(err);
      }
    });

    return this.dbPromise;
  }

  async push(event: QueuedEvent): Promise<void> {
    // Try IndexedDB first
    if (this.isAvailable) {
      try {
        const db = await this.openDB();
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        
        await new Promise<void>((resolve, reject) => {
          const request = store.put(event);
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        });

        return;
      } catch (err) {
        console.warn('[Analytics] IndexedDB push failed, using fallback:', err);
      }
    }

    // Fallback to localStorage
    this.pushToFallback(event);
  }

  async drain(maxCount: number): Promise<QueuedEvent[]> {
    const events: QueuedEvent[] = [];

    // Try IndexedDB first
    if (this.isAvailable) {
      try {
        const db = await this.openDB();
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const index = store.index('queuedAt');

        await new Promise<void>((resolve, reject) => {
          const request = index.openCursor();
          
          request.onsuccess = () => {
            const cursor = request.result;
            
            if (!cursor || events.length >= maxCount) {
              resolve();
              return;
            }

            events.push(cursor.value as QueuedEvent);
            store.delete(cursor.primaryKey);
            cursor.continue();
          };

          request.onerror = () => reject(request.error);
        });

        if (events.length > 0) {
          return events;
        }
      } catch (err) {
        console.warn('[Analytics] IndexedDB drain failed, using fallback:', err);
      }
    }

    // Fallback to localStorage
    return this.drainFromFallback(maxCount);
  }

  async count(): Promise<number> {
    let total = 0;

    // Count in IndexedDB
    if (this.isAvailable) {
      try {
        const db = await this.openDB();
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        
        const count = await new Promise<number>((resolve, reject) => {
          const request = store.count();
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });
        
        total += count;
      } catch (err) {
        console.warn('[Analytics] IndexedDB count failed:', err);
      }
    }

    // Count in fallback
    total += this.countInFallback();
    
    return total;
  }

  async clear(): Promise<void> {
    // Clear IndexedDB
    if (this.isAvailable) {
      try {
        const db = await this.openDB();
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        
        await new Promise<void>((resolve, reject) => {
          const request = store.clear();
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        });
      } catch (err) {
        console.warn('[Analytics] IndexedDB clear failed:', err);
      }
    }

    // Clear fallback
    this.clearFallback();
  }

  // LocalStorage fallback methods
  private pushToFallback(event: QueuedEvent): void {
    try {
      const stored = localStorage.getItem(FALLBACK_KEY);
      const events = stored ? JSON.parse(stored) : [];
      
      events.push(event);
      
      // Maintain size limit
      while (events.length > MAX_FALLBACK_SIZE) {
        events.shift();
      }
      
      localStorage.setItem(FALLBACK_KEY, JSON.stringify(events));
    } catch (err) {
      console.error('[Analytics] LocalStorage fallback failed:', err);
    }
  }

  private drainFromFallback(maxCount: number): QueuedEvent[] {
    try {
      const stored = localStorage.getItem(FALLBACK_KEY);
      if (!stored) return [];
      
      const events = JSON.parse(stored) as QueuedEvent[];
      const drained = events.slice(0, maxCount);
      const remaining = events.slice(maxCount);
      
      if (remaining.length > 0) {
        localStorage.setItem(FALLBACK_KEY, JSON.stringify(remaining));
      } else {
        localStorage.removeItem(FALLBACK_KEY);
      }
      
      return drained;
    } catch (err) {
      console.error('[Analytics] LocalStorage drain failed:', err);
      return [];
    }
  }

  private countInFallback(): number {
    try {
      const stored = localStorage.getItem(FALLBACK_KEY);
      return stored ? JSON.parse(stored).length : 0;
    } catch {
      return 0;
    }
  }

  private clearFallback(): void {
    try {
      localStorage.removeItem(FALLBACK_KEY);
    } catch (err) {
      console.error('[Analytics] LocalStorage clear failed:', err);
    }
  }
}