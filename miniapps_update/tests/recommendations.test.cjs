const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const { runInNewContext } = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '../lib/personalization.ts'), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS } });
const box = (id, name, storeId) => ({ id, name, storeId, canReserve: true, stockQuantity: 1 });
const pastry = box(1, 'Круассан с шоколадом', 1);
const berries = box(2, 'Клубника в шоколаде', 2);
const catalog = [pastry, berries];
function setup() {
  const data = new Map();
  const user = { id: 10 };
  const exports = {};
  runInNewContext(compiled.outputText, {
    exports, window: { Telegram: { WebApp: { initDataUnsafe: { user } } } },
    localStorage: { getItem: key => data.get(key), setItem: (key, value) => data.set(key, value) },
    require: () => ({ canReserveProduct: p => p.canReserve && p.stockQuantity > 0 }),
  });
  return { api: exports, user, data, rank: (history, boxes = catalog) => Array.from(exports.rankProductsForRecommendations(boxes, () => 0, history), p => p.id) };
}
test('two accounts viewing different dishes get different new listings on the same phone', () => {
  const { api, user, rank } = setup();
  api.recordProductView(box(111, 'Клубника со сливками', 8));
  assert.deepEqual(rank(), [2, 1]);
  user.id = 20;
  assert.deepEqual(rank(), [1, 2]);
  api.recordProductView(box(112, 'Круассан с сыром', 7));
  assert.deepEqual(rank(), [1, 2]);
  user.id = 10;
  assert.deepEqual(rank(), [2, 1]);
});
test('order history and favorites personalize a new device; cancelled orders do not', () => {
  const { rank } = setup();
  const order = { createdAt: new Date().toISOString(), status: 'PICKED_UP', storeId: 9, items: [{ productId: 90, productName: 'Клубника свежая' }] };
  assert.deepEqual(rank({ orders: [order] }), [2, 1]);
  assert.deepEqual(rank({ orders: [{ ...order, status: 'CANCELLED_BY_USER' }] }), [1, 2]);
  assert.deepEqual(rank({ favorites: { products: [box(98, 'Клубника', 4)] } }), [2, 1]);
  assert.deepEqual(rank({ favorites: { stores: [{ id: 2 }] } }), [2, 1]);
});
test('a reserved favorite remains below all available boxes', () => {
  const { rank } = setup();
  const sold = { ...berries, canReserve: false, isFavorite: true };
  assert.deepEqual(rank({}, [sold, pastry]), [1, 2]);
});
test('an old shared history cannot affect a new account', () => {
  const { rank, data } = setup();
  data.set('foodsave_product_interactions_v1', JSON.stringify({ 2: { id: 2, views: 100, favorites: 90 } }));
  assert.deepEqual(rank(), [1, 2]);
});
test('matches a dish listed inside a newly published box', () => {
  const { rank } = setup();
  const mix = { ...box(3, 'Бокс №2', 12), description: 'Состав: маффин, чизкейк' };
  assert.deepEqual(rank({ favorites: { products: [box(99, 'Чизкейк', 6)] } }, [pastry, mix]), [3, 1]);
});
