const DB_NAME = 'noir-local-media';
const LEGACY_DB_NAME = 'elva-local-media';
const STORE_NAME = 'tracks';
const DB_VERSION = 1;

type LocalTrackRecord = {
  key: string;
  blob: Blob;
};

/** Opens the old database only if it exists (aborts the upgrade so none gets created). */
function openLegacy(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    const request = indexedDB.open(LEGACY_DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      if (event.oldVersion === 0) request.transaction?.abort();
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(null);
    request.onblocked = () => resolve(null);
  });
}

/** Copies saved local files from the old Elva database into the NOIR one, then removes it. */
async function migrateLegacyDatabase(): Promise<void> {
  try {
    const legacy = await openLegacy();
    if (!legacy) return;
    const records = await new Promise<LocalTrackRecord[]>((resolve, reject) => {
      if (!legacy.objectStoreNames.contains(STORE_NAME)) return resolve([]);
      const request = legacy.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).getAll();
      request.onsuccess = () => resolve(request.result as LocalTrackRecord[]);
      request.onerror = () => reject(request.error);
    });
    legacy.close();
    if (records.length > 0) {
      const next = await openNamed(DB_NAME);
      await new Promise<void>((resolve, reject) => {
        const tx = next.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        for (const record of records) store.put(record);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      }).finally(() => next.close());
    }
    indexedDB.deleteDatabase(LEGACY_DB_NAME);
  } catch (e) {
    console.warn('Local media migration skipped:', e);
  }
}

let migration: Promise<void> | null = null;

async function openDatabase(): Promise<IDBDatabase> {
  migration ??= migrateLegacyDatabase();
  await migration;
  return openNamed(DB_NAME);
}

function openNamed(name: string): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(name, DB_VERSION);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE_NAME, { keyPath: 'key' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Could not open local media storage'));
  });
}

export async function saveLocalTrack(key: string, file: Blob): Promise<void> {
  if (typeof indexedDB === 'undefined') return;
  const database = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readwrite');
    transaction.objectStore(STORE_NAME).put({ key, blob: file } satisfies LocalTrackRecord);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error('Could not save local track'));
  }).finally(() => database.close());
}

export async function restoreLocalTrack(key: string): Promise<string | null> {
  if (typeof indexedDB === 'undefined') return null;
  const database = await openDatabase();
  return new Promise<string | null>((resolve, reject) => {
    const request = database.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).get(key);
    request.onsuccess = () => {
      const record = request.result as LocalTrackRecord | undefined;
      database.close();
      resolve(record?.blob ? URL.createObjectURL(record.blob) : null);
    };
    request.onerror = () => {
      database.close();
      reject(request.error ?? new Error('Could not restore local track'));
    };
  });
}
