// Browser storage host: pure core never depends on IndexedDB.
export function buildStorageOps(
  factory = globalThis.indexedDB,
  timeoutMs = 10_000
) {
  const STORE = 'kv';
  let dbPromise;
  let cachedDb;
  function openDb() {
    if (!factory) return Promise.reject(new Error('IndexedDB is unavailable'));
    if (!dbPromise) {
      const pending = new Promise((resolve, reject) => {
        let settled = false;
        const timer = setTimeout(
          () => fail(new Error('IndexedDB open timed out')),
          timeoutMs
        );
        const fail = (error) => {
          if (!settled) {
            settled = true;
            clearTimeout(timer);
            reject(error || new Error('IndexedDB open failed'));
          }
        };
        let request;
        try {
          request = factory.open('cineharbor', 1);
        } catch (error) {
          fail(error);
          return;
        }
        request.onupgradeneeded = () => {
          if (!request.result.objectStoreNames.contains(STORE))
            request.result.createObjectStore(STORE);
        };
        request.onblocked = () =>
          fail(
            new Error(
              'IndexedDB upgrade blocked; close other CineHarbor tabs and retry'
            )
          );
        request.onerror = () => fail(request.error);
        request.onsuccess = () => {
          const db = request.result;
          if (settled) {
            db.close();
            return;
          }
          settled = true;
          clearTimeout(timer);
          const invalidate = () => {
            if (cachedDb === db) {
              cachedDb = undefined;
              dbPromise = undefined;
            }
          };
          cachedDb = db;
          db.onversionchange = () => {
            invalidate();
            db.close();
          };
          db.onclose = invalidate;
          resolve(db);
        };
      });
      dbPromise = pending.catch((error) => {
        dbPromise = undefined;
        throw error;
      });
    }
    return dbPromise;
  }
  function validateKey(key) {
    if (typeof key !== 'string')
      throw new Error('Storage key must be a string');
  }
  async function transact(key, mode, operation) {
    validateKey(key);
    const db = await openDb();
    return new Promise((resolve, reject) => {
      let tx;
      let result;
      let finished = false;
      const finish = (error) => {
        if (finished) return;
        finished = true;
        clearTimeout(timer);
        if (error) reject(error);
        else resolve(result);
      };
      const timer = setTimeout(() => {
        finish(new Error('IndexedDB transaction timed out'));
        try {
          tx?.abort();
        } catch {
          /* Transaction may already have completed. */
        }
      }, timeoutMs);
      try {
        tx = db.transaction(STORE, mode);
        tx.oncomplete = () => finish();
        tx.onerror = () =>
          finish(tx.error || new Error('IndexedDB transaction failed'));
        tx.onabort = () =>
          finish(tx.error || new Error('IndexedDB transaction aborted'));
        const request = operation(tx.objectStore(STORE), key);
        request.onsuccess = () => {
          result = request.result;
        };
        request.onerror = () =>
          finish(request.error || new Error('IndexedDB request failed'));
      } catch (error) {
        finish(error);
      }
    });
  }
  return {
    storage_get: async (key) => {
      const result = await transact(key, 'readonly', (store, name) =>
        store.get(name)
      );
      if (result === undefined || result === null) return null;
      if (typeof result !== 'string')
        throw new Error('Corrupted IndexedDB value: expected a string');
      return result;
    },
    storage_set: async (key, value) => {
      if (typeof value !== 'string')
        throw new Error('Storage value must be a string');
      await transact(key, 'readwrite', (store, name) => store.put(value, name));
    },
    storage_remove: async (key) => {
      await transact(key, 'readwrite', (store, name) => store.delete(name));
    },
  };
}
