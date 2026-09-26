const DB_NAME = 'elva-local-media';
const STORE_NAME = 'tracks';
const DB_VERSION = 1;

type LocalTrackRecord = {
  key: string;
  blob: Blob;
};

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
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
