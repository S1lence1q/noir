const DB_NAME = 'noir';
const DB_VERSION = 2;
const GRAPH_STORE = 'graphCache';
const LISTENING_STORE = 'listeningEvents';
const STARTED_AT_INDEX = 'startedAt';

type GraphCacheRecord = {
  key: string;
  value: unknown;
  expiresAt: number;
};

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const database = request.result;
      const transaction = request.transaction;
      if (!transaction) return;

      if (!database.objectStoreNames.contains(LISTENING_STORE)) {
        const listeningStore = database.createObjectStore(LISTENING_STORE, { keyPath: 'id' });
        listeningStore.createIndex(STARTED_AT_INDEX, STARTED_AT_INDEX, { unique: false });
      } else {
        const listeningStore = transaction.objectStore(LISTENING_STORE);
        if (!listeningStore.indexNames.contains(STARTED_AT_INDEX)) {
          listeningStore.createIndex(STARTED_AT_INDEX, STARTED_AT_INDEX, { unique: false });
        }
      }

      if (!database.objectStoreNames.contains(GRAPH_STORE)) {
        database.createObjectStore(GRAPH_STORE, { keyPath: 'key' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Could not open graph cache'));
  });
}

function canUseIndexedDb() {
  return typeof indexedDB !== 'undefined';
}

export async function getGraphCache<T>(key: string): Promise<T | null> {
  if (!canUseIndexedDb()) return null;
  const database = await openDatabase();

  return new Promise<T | null>((resolve, reject) => {
    const transaction = database.transaction(GRAPH_STORE, 'readwrite');
    const store = transaction.objectStore(GRAPH_STORE);
    const request = store.get(key);

    request.onsuccess = () => {
      const record = request.result as GraphCacheRecord | undefined;
      if (!record || record.expiresAt <= Date.now()) {
        if (record) store.delete(key);
        resolve(null);
        return;
      }
      resolve(record.value as T);
    };
    request.onerror = () => reject(request.error ?? new Error('Could not read graph cache'));
    transaction.oncomplete = () => database.close();
    transaction.onerror = () => {
      database.close();
      reject(transaction.error ?? new Error('Could not read graph cache'));
    };
  });
}

export async function setGraphCache<T>(key: string, value: T, ttlMs: number): Promise<void> {
  if (!canUseIndexedDb()) return;
  const database = await openDatabase();

  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(GRAPH_STORE, 'readwrite');
    transaction.objectStore(GRAPH_STORE).put({
      key,
      value,
      expiresAt: Date.now() + ttlMs,
    } satisfies GraphCacheRecord);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error('Could not write graph cache'));
  }).finally(() => database.close());
}
