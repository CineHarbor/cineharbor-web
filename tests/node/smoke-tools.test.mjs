import assert from 'node:assert/strict';
import test from 'node:test';
import { Cdp, findChrome } from '../../scripts/smoke-tools.mjs';
class Socket extends EventTarget {
  sent = [];
  send(value) {
    this.sent.push(JSON.parse(value));
  }
  receive(value) {
    this.dispatchEvent(
      new MessageEvent('message', { data: JSON.stringify(value) })
    );
  }
}
test('explicit browser configuration is honored and invalid configuration fails', () => {
  assert.equal(
    findChrome({ CHROME_PATH: process.execPath, PATH: '' }),
    process.execPath
  );
  assert.throws(
    () => findChrome({ CHROME_PATH: '/does-not-exist/chrome', PATH: '' }),
    /CHROME_PATH/
  );
});
test('DevTools correlates replies and propagates protocol errors', async () => {
  const socket = new Socket();
  const cdp = new Cdp(socket, 100);
  const result = cdp.send('Runtime.enable');
  socket.receive({ id: 1, result: { enabled: true } });
  assert.deepEqual(await result, { enabled: true });
  const failed = cdp.send('bad');
  socket.receive({ id: 2, error: { message: 'unsupported' } });
  await assert.rejects(failed, /unsupported/);
  assert.equal(cdp.pending.size, 0);
});
test('DevTools missing replies time out instead of hanging CI', async () => {
  const cdp = new Cdp(new Socket(), 5);
  await assert.rejects(cdp.send('Runtime.evaluate'), /timed out/);
  await assert.rejects(cdp.once('Page.loadEventFired'), /timed out/);
  assert.equal(cdp.pending.size, 0);
  assert.equal(cdp.listeners.size, 0);
});
test('DevTools close rejects pending operations and listeners', async () => {
  const socket = new Socket();
  const cdp = new Cdp(socket, 100);
  const command = cdp.send('Runtime.evaluate');
  const event = cdp.once('Page.loadEventFired');
  socket.dispatchEvent(new Event('close'));
  await assert.rejects(command, /closed/);
  await assert.rejects(event, /closed/);
});
test('one-shot DevTools listeners are removed after delivery', async () => {
  const socket = new Socket();
  const cdp = new Cdp(socket, 100);
  const event = cdp.once('Page.loadEventFired');
  socket.receive({ method: 'Page.loadEventFired', params: { timestamp: 1 } });
  assert.deepEqual(await event, { timestamp: 1 });
  assert.equal(cdp.listeners.size, 0);
});
