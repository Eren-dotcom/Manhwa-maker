// ---------------------------------------------------------------------------
// Tiny IndexedDB store for rendered panel images. localStorage would choke on
// base64 PNGs, so data URLs live here and the project JSON stays portable.
// ---------------------------------------------------------------------------

const DB_NAME = 'manhwa-maker';
const STORE = 'images';
let dbPromise: Promise<IDBDatabase | null> | null = null;

function openDb(): Promise<IDBDatabase | null> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve) => {
    if (typeof indexedDB === 'undefined') return resolve(null);
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve(null);
  });
  return dbPromise;
}

export async function putImage(key: string, dataUrl: string): Promise<void> {
  const db = await openDb();
  if (!db) return;
  await new Promise<void>((resolve) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(dataUrl, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => resolve();
  });
}

export async function getImage(key: string): Promise<string | null> {
  const db = await openDb();
  if (!db) return null;
  return new Promise((resolve) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).get(key);
    req.onsuccess = () => resolve((req.result as string) ?? null);
    req.onerror = () => resolve(null);
  });
}

export async function deleteImage(key: string): Promise<void> {
  const db = await openDb();
  if (!db) return;
  await new Promise<void>((resolve) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => resolve();
  });
}

export async function getAllImages(): Promise<Record<string, string>> {
  const db = await openDb();
  if (!db) return {};
  return new Promise((resolve) => {
    const tx = db.transaction(STORE, 'readonly');
    const store = tx.objectStore(STORE);
    const out: Record<string, string> = {};
    const req = store.openCursor();
    req.onsuccess = () => {
      const cursor = req.result;
      if (cursor) {
        out[String(cursor.key)] = cursor.value as string;
        cursor.continue();
      } else resolve(out);
    };
    req.onerror = () => resolve(out);
  });
}
