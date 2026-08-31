// Gestionnaire de Stockage Résilient IndexedDB (Capacité illimitée > 1 Go) — GEBAT 360°

const DB_NAME = 'GEBAT_360_INDEXEDDB';
const DB_VERSION = 1;
const STORE_NAME = 'app_data_store';

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) {
      reject(new Error('IndexedDB non supporté par ce navigateur'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event: any) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
  });
};

export const indexedDBStorage = {
  async setItem<T>(key: string, value: T): Promise<void> {
    try {
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.put(value, key);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch (err) {
      console.warn(`⚠️ Échec écriture IndexedDB pour ${key}:`, err);
    }
  },

  async getItem<T>(key: string): Promise<T | null> {
    try {
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(key);
        req.onsuccess = () => resolve(req.result !== undefined ? (req.result as T) : null);
        req.onerror = () => reject(req.error);
      });
    } catch (err) {
      console.warn(`⚠️ Échec lecture IndexedDB pour ${key}:`, err);
      return null;
    }
  },

  async removeItem(key: string): Promise<void> {
    try {
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.delete(key);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch (err) {
      console.warn(`⚠️ Échec suppression IndexedDB pour ${key}:`, err);
    }
  }
};

let broadcastChan: BroadcastChannel | null = null;
if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
  try {
    broadcastChan = new BroadcastChannel('gebat_360_channel');
  } catch (e) {}
}

/**
 * Fonction de secours universelle pour sauvegarder sans risque de QuotaExceededError
 */
export const safeSaveToStorage = (key: string, data: any): void => {
  try {
    const jsonStr = JSON.stringify(data);
    localStorage.setItem(key, jsonStr);
  } catch (err: any) {
    if (err?.name === 'QuotaExceededError' || err?.code === 22 || String(err).includes('quota')) {
      console.warn(`⚠️ Quota LocalStorage dépassé (5Mo). Passage automatique sur IndexedDB pour [${key}]...`);
      try {
        localStorage.removeItem('gebat_debourse_sec');
      } catch (e) {}
    } else {
      console.error(`⚠️ Erreur sauvegarde [${key}]:`, err);
    }
  }

  // Toujours doubler la sauvegarde dans IndexedDB pour garantir 100% de résilience
  indexedDBStorage.setItem(key, data);

  // Dispatch d'un évènement synchrone universel & BroadcastChannel pour notifier instantanément toutes les fenêtres et profils
  if (typeof window !== 'undefined') {
    try {
      window.dispatchEvent(new CustomEvent('gebat_state_updated', { detail: { key, data } }));
      if (broadcastChan) {
        broadcastChan.postMessage({ key, timestamp: Date.now() });
      }
    } catch (e) {}
  }
};
