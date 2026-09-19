import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';
const source = await readFile(
  new URL('../../public/core-storage.js', import.meta.url),
  'utf8'
);
const buildStorageOps = vm.runInNewContext(
  source.replace('export function', 'function') + '; buildStorageOps',
  { setTimeout, clearTimeout }
);

function fixture({
  openFailure,
  blocked,
  abort,
  value,
  hangOpen,
  hangTransaction,
} = {}) {
  let opens = 0;
  let closed = 0;
  const values = new Map(value === undefined ? [] : [['key', value]]);
  const db = {
    objectStoreNames: { contains: () => true },
    close: () => {
      closed++;
    },
    transaction() {
      const tx = { objectStore: () => store, abort: () => tx.onabort?.() };
      const execute = (fn) => {
        const request = {};
        queueMicrotask(() => {
          if (hangTransaction) return;
          if (abort) {
            tx.onabort?.();
            return;
          }
          request.result = fn();
          request.onsuccess?.();
          tx.oncomplete?.();
        });
        return request;
      };
      const store = {
        get: (key) => execute(() => values.get(key)),
        put: (value, key) => execute(() => values.set(key, value)),
        delete: (key) => execute(() => values.delete(key)),
      };
      return tx;
    },
  };
  const factory = {
    open() {
      opens++;
      const request = { result: db, error: new Error('open failed') };
      queueMicrotask(() => {
        if (hangOpen) return;
        if (blocked) {
          request.onblocked();
          request.onsuccess();
          return;
        }
        if (openFailure && opens === 1) request.onerror();
        else request.onsuccess();
      });
      return request;
    },
  };
  return { factory, db, opens: () => opens, closed: () => closed };
}

test('storage preserves absence and empty strings, persists a write and removes it', async () => {
  const { factory } = fixture();
  const ops = buildStorageOps(factory);
  assert.equal(await ops.storage_get('key'), null);
  await ops.storage_set('key', '');
  assert.equal(await ops.storage_get('key'), '');
  await ops.storage_set('key', 'value');
  assert.equal(await ops.storage_get('key'), 'value');
  await ops.storage_remove('key');
  assert.equal(await ops.storage_get('key'), null);
});
test('a rejected opening is retryable, never a permanently cached failed promise', async () => {
  const f = fixture({ openFailure: true });
  const ops = buildStorageOps(f.factory);
  await assert.rejects(ops.storage_get('key'), /open failed/);
  assert.equal(await ops.storage_get('key'), null);
  assert.equal(f.opens(), 2);
});
test('blocked upgrades reject clearly and close late successful handles', async () => {
  const f = fixture({ blocked: true });
  const ops = buildStorageOps(f.factory);
  await assert.rejects(ops.storage_get('key'), /blocked/);
  assert.equal(f.closed(), 1);
});
test('version changes close stale handles and allow a new connection', async () => {
  const f = fixture();
  const ops = buildStorageOps(f.factory);
  await ops.storage_get('key');
  f.db.onversionchange();
  await ops.storage_get('key');
  assert.equal(f.closed(), 1);
  assert.equal(f.opens(), 2);
});
test('aborted transactions settle rather than hang', async () => {
  const f = fixture({ abort: true });
  const ops = buildStorageOps(f.factory);
  await assert.rejects(ops.storage_set('key', 'v'), /aborted/);
});
test('open and transaction deadlines are enforced', async () => {
  for (const options of [{ hangOpen: true }, { hangTransaction: true }]) {
    const ops = buildStorageOps(fixture(options).factory, 10);
    await assert.rejects(ops.storage_get('key'), /timed out/);
  }
});
test('unavailable storage, invalid inputs and corrupted stored types are explicit failures', async () => {
  await assert.rejects(
    buildStorageOps(undefined).storage_get('key'),
    /unavailable/
  );
  const ops = buildStorageOps(fixture({ value: { corrupt: true } }).factory);
  await assert.rejects(ops.storage_get(42), /key must/);
  await assert.rejects(ops.storage_set('key', 42), /value must/);
  await assert.rejects(ops.storage_get('key'), /Corrupted/);
});
