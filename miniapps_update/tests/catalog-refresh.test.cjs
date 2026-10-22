const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const sourceRoot = process.env.CATALOG_SOURCE_ROOT || path.resolve(__dirname, '..');
function load(relativePath, globals = {}) {
  const exports = {};
  const source = fs.readFileSync(path.join(sourceRoot, relativePath), 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  vm.runInNewContext(compiled, {
    exports, process: { env: { NODE_ENV: 'test' } }, console, Intl, Date, ...globals,
  });
  return exports;
}

test('zero/missing/negative stock is hidden even when availability flags are stale', () => {
  const api = load('lib/api.ts');
  const product = {
    id: 12397, stockQuantity: 1, status: 'AVAILABLE', active: true,
    canReserve: true, isAvailable: true, availabilityState: 'AVAILABLE',
    createdAt: '2099-01-01T12:00:00',
  };
  for (const stockQuantity of [0, -1, undefined, null]) {
    for (const guard of [api.isProductDisplayableInMiniApp, api.isProductVisibleInMiniApp, api.canReserveProduct]) {
      assert.equal(guard({ ...product, stockQuantity }), false);
    }
  }
  assert.equal(api.isProductDisplayableInMiniApp(product), true);
  assert.equal(api.isProductDisplayableInMiniApp({ ...product, active: false }), false);
  assert.equal(api.isProductDisplayableInMiniApp({ ...product, status: 'EXPIRED' }), false);
});

test('open catalogue refreshes, coalesces events, pauses hidden/offline and cleans up', async () => {
  const win = new EventTarget();
  const doc = new EventTarget();
  doc.visibilityState = 'visible';
  const navigator = { onLine: true };
  let tick;
  let cleared = false;
  let now = 0;
  win.setInterval = (fn, ms) => { tick = fn; assert.equal(ms, 30_000); return 7; };
  win.clearInterval = (id) => { assert.equal(id, 7); cleared = true; };
  const { subscribeToCatalogRefresh } = load('lib/catalogRefresh.ts', {
    window: win, document: doc, navigator, Date: { now: () => now },
  });
  let calls = 0;
  let finish;
  const stop = subscribeToCatalogRefresh(() => {
    calls++;
    return new Promise((resolve) => { finish = resolve; });
  });
  const first = tick();
  assert.equal(calls, 1);
  now += 30_000;
  await tick();
  assert.equal(calls, 1, 'slow request must not overlap');
  finish();
  await first;
  doc.visibilityState = 'hidden';
  await tick();
  assert.equal(calls, 1);
  doc.visibilityState = 'visible';
  doc.dispatchEvent(new Event('visibilitychange'));
  win.dispatchEvent(new Event('focus'));
  assert.equal(calls, 2, 'returning to app refreshes once');
  finish();
  await Promise.resolve();
  win.dispatchEvent(new Event('focus'));
  assert.equal(calls, 2, 'adjacent foreground events are coalesced');
  navigator.onLine = false;
  now += 30_000;
  await tick();
  assert.equal(calls, 2);
  navigator.onLine = true;
  win.dispatchEvent(new Event('online'));
  assert.equal(calls, 3);
  finish();
  await Promise.resolve();
  stop();
  now += 30_000;
  win.dispatchEvent(new Event('focus'));
  doc.dispatchEvent(new Event('visibilitychange'));
  await tick();
  assert.equal(calls, 3);
  assert.equal(cleared, true);
});

test('transient refresh failure permits a later retry', async () => {
  const win = new EventTarget();
  const doc = new EventTarget();
  doc.visibilityState = 'visible';
  let tick;
  let now = 0;
  win.setInterval = (fn) => { tick = fn; return 1; };
  win.clearInterval = () => {};
  const { subscribeToCatalogRefresh } = load('lib/catalogRefresh.ts', {
    window: win, document: doc, navigator: { onLine: true }, Date: { now: () => now },
    console: { error() {} },
  });
  let calls = 0;
  const stop = subscribeToCatalogRefresh(async () => {
    if (++calls === 1) throw new Error('temporary outage');
  });
  await tick();
  now += 30_000;
  await tick();
  assert.equal(calls, 2);
  stop();
});
