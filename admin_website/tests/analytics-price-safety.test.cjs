const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const source = fs.readFileSync(require('node:path').join(__dirname, '../src/app/(admin)/analytics/page.tsx'), 'utf8');
const ast = ts.createSourceFile('analytics.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const declarations = new Map();
function walk(node) {
  if (ts.isVariableDeclaration(node) && ['pricedOrders', 'averageOrderValue'].includes(node.name.getText(ast))) declarations.set(node.name.getText(ast), node.initializer.getText(ast));
  ts.forEachChild(node, walk);
}
walk(ast);
function average(orders) {
  return vm.runInNewContext(`const pricedOrders = ${declarations.get('pricedOrders')}; ${declarations.get('averageOrderValue')}`, { dailySalesOrderDetails: orders });
}
test('average excludes suspect totals from both numerator and denominator', () => {
  const orders = [{ orderTotal: 2500 }, { orderTotal: 3500 }, { orderTotal: 77074403678.4 }];
  assert.equal(average(orders), 3000);
  assert.equal(orders[2].orderTotal, 77074403678.4);
});
test('empty, null and invalid totals cannot inflate or corrupt the average', () => {
  assert.equal(average([]), 0);
  assert.equal(average([{ orderTotal: null }, { orderTotal: 'NaN' }, { orderTotal: -1 }]), 0);
  assert.equal(average([{ orderTotal: '1000000' }, { orderTotal: 0 }]), 500000);
});
