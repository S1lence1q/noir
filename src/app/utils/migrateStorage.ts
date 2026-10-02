/**
 * One-time rename of persisted data from the old Elva prefix to NOIR.
 * Imported first in main.tsx so it runs before any module reads storage.
 * Never overwrites a value that already exists under the new name.
 */
const OLD_PREFIX = 'elva_';
const NEW_PREFIX = 'noir_';

function migrateStorage(storage: Storage): void {
  const oldKeys: string[] = [];
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i);
    if (key && key.startsWith(OLD_PREFIX)) oldKeys.push(key);
  }
  for (const oldKey of oldKeys) {
    const newKey = NEW_PREFIX + oldKey.slice(OLD_PREFIX.length);
    const value = storage.getItem(oldKey);
    if (value !== null && storage.getItem(newKey) === null) storage.setItem(newKey, value);
    storage.removeItem(oldKey);
  }
}

for (const get of [() => localStorage, () => sessionStorage]) {
  try {
    migrateStorage(get());
  } catch (e) {
    console.warn('Storage migration skipped:', e);
  }
}
