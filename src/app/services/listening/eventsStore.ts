export type ListeningOutcome = 'completed' | 'skipped' | 'partial';

export type ListeningSource =
  | 'search'
  | 'chart'
  | 'playlist'
  | 'favorites'
  | 'radio'
  | 'mix'
  | 'queue'
  | 'local';

export type ListeningEvent = {
  id: string;
  songKey: string;
  title: string;
  artist: string;
  artistMbid?: string;
  startedAt: number;
  listenedMs: number;
  durationMs?: number;
  outcome: ListeningOutcome;
  source: ListeningSource;
  sourceId?: string;
};

const DB_NAME = 'noir';
const STORE_NAME = 'listeningEvents';
const STARTED_AT_INDEX = 'startedAt';
const DB_VERSION = 2;
const GRAPH_CACHE_STORE = 'graphCache';
const RETENTION_MS = 2 * 365 * 24 * 60 * 60 * 1000;

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const database = request.result;
      const store = database.objectStoreNames.contains(STORE_NAME)
        ? request.transaction!.objectStore(STORE_NAME)
        : database.createObjectStore(STORE_NAME, { keyPath: 'id' });

      if (!store.indexNames.contains(STARTED_AT_INDEX)) {
        store.createIndex(STARTED_AT_INDEX, STARTED_AT_INDEX, { unique: false });
      }
      if (!database.objectStoreNames.contains(GRAPH_CACHE_STORE)) {
        database.createObjectStore(GRAPH_CACHE_STORE, { keyPath: 'key' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Could not open listening event storage'));
  });
}

function canUseIndexedDb() {
  return typeof indexedDB !== 'undefined';
}

function createEventId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `listen_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

export function createListeningEvent(
  event: Omit<ListeningEvent, 'id' | 'startedAt' | 'listenedMs' | 'outcome'>
): ListeningEvent {
  return {
    ...event,
    id: createEventId(),
    startedAt: Date.now(),
    listenedMs: 0,
    outcome: 'partial',
  };
}

export async function addListeningEvent(event: ListeningEvent): Promise<void> {
  if (!canUseIndexedDb()) return;
  const database = await openDatabase();

  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readwrite');
    transaction.objectStore(STORE_NAME).put(event);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error('Could not save listening event'));
  }).finally(() => database.close());
}

export async function updateListeningEvent(
  id: string,
  patch: Partial<Pick<ListeningEvent, 'listenedMs' | 'durationMs' | 'outcome'>>
): Promise<void> {
  if (!canUseIndexedDb()) return;
  const database = await openDatabase();

  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(id);

    request.onsuccess = () => {
      if (request.result) {
        store.put({ ...request.result, ...patch } satisfies ListeningEvent);
      }
    };
    request.onerror = () => reject(request.error ?? new Error('Could not read listening event'));
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error('Could not update listening event'));
  }).finally(() => database.close());
}

export async function getListeningEvents(): Promise<ListeningEvent[]> {
  if (!canUseIndexedDb()) return [];
  const database = await openDatabase();

  return new Promise<ListeningEvent[]>((resolve, reject) => {
    const request = database
      .transaction(STORE_NAME, 'readonly')
      .objectStore(STORE_NAME)
      .index(STARTED_AT_INDEX)
      .getAll();

    request.onsuccess = () => {
      database.close();
      resolve(request.result as ListeningEvent[]);
    };
    request.onerror = () => {
      database.close();
      reject(request.error ?? new Error('Could not read listening events'));
    };
  });
}

export async function clearListeningEvents(): Promise<void> {
  if (!canUseIndexedDb()) return;
  const database = await openDatabase();

  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readwrite');
    transaction.objectStore(STORE_NAME).clear();
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error('Could not clear listening events'));
  }).finally(() => database.close());
}

export async function pruneListeningEvents(now = Date.now()): Promise<void> {
  if (!canUseIndexedDb()) return;
  const database = await openDatabase();
  const cutoff = now - RETENTION_MS;

  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readwrite');
    const index = transaction.objectStore(STORE_NAME).index(STARTED_AT_INDEX);
    const request = index.openCursor(IDBKeyRange.upperBound(cutoff, true));

    request.onsuccess = () => {
      const cursor = request.result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      }
    };
    request.onerror = () => reject(request.error ?? new Error('Could not prune listening events'));
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error('Could not prune listening events'));
  }).finally(() => database.close());
}
