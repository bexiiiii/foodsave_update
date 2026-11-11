const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const { runInNewContext } = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../lib/catalogSearch.ts'), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } });
const api = {};
runInNewContext(compiled.outputText, { exports: api });
const products = [{ id: 1, name: 'Круассан с сёмгой', storeName: 'Coffi' }];
const stores = [{ id: 9, name: 'Пекарня', address: 'Төле би' }];
const search = query => api.searchCatalog(query, products, stores);

test('matches partial and out-of-order words across name and branch', () => {
  assert.equal(search(' COFFI семг ').products[0].id, 1);
  assert.equal(search('би төле').stores[0].id, 9);
});
test('allows a missing, extra, swapped or replaced letter including in a prefix', () => {
  for (const query of ['круасан', 'круасссан', 'куроссан', 'курассан', 'круосса']) {
    if (query === 'куроссан') assert.equal(search(query).products.length, 0);
    else assert.equal(search(query).products[0]?.id, 1, query);
  }
});
test('short unrelated words and punctuation yield no matches', () => {
  assert.equal(search('сыр').products.length, 0);
  assert.equal(search('...').stores.length, 0);
  assert.equal(search('  ').products, products);
});
test('exact matches precede typo matches', () => {
  const result = api.searchCatalog('бокс', [{ name: 'Бакс' }, { name: 'Бокс' }], []);
  assert.equal(result.products[0].name, 'Бокс');
});
