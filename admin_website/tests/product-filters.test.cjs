const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const path = require('node:path');
const root = path.join(__dirname, '..');
const compile = code => ts.transpileModule(code, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
const exported = {};
vm.runInNewContext(compile(fs.readFileSync(path.join(root, 'src/utils/adminProductFilters.ts'), 'utf8')), { exports: exported, URLSearchParams });
const source = fs.readFileSync(path.join(root, 'src/app/(admin)/products/page.tsx'), 'utf8');
const ast = ts.createSourceFile('page.tsx', source, 99, true, ts.ScriptKind.TSX);
let fetchNode;
function visit(n) { if (ts.isVariableDeclaration(n) && n.name.getText(ast) === 'fetchProducts') fetchNode = n.initializer; ts.forEachChild(n, visit); }
visit(ast);
function fixture() {
 const pending = [], state = { products: [], pages: 0, loading: false, page: 0, errors: 0 };
 const ctx = { productsRequest: {current: 0}, searchQuery: '  круассан  ', filterStore: '31', filterCategory: '7', filterStatus: 'AVAILABLE', currentPage: 0,
  ProductService: { filterProducts: (...args) => new Promise((resolve, reject) => pending.push({args, resolve, reject})) },
  setLoading: x => state.loading=x, setProducts: x => state.products=x, setTotalPages:x=>state.pages=x, setCurrentPage:x=>state.page=x,
  toast:{error:()=>state.errors++},console:{error:()=>{}} };
 const run = vm.runInNewContext(compile(`(${fetchNode.getText(ast)})`), ctx);
 return {pending, state, ctx, run};
}
test('all filters travel together; query is trimmed/encoded and all is omitted',()=>{
 const u=exported.adminProductFilterUrl({query:'  50% & ягоды ',store:'31',category:'7',status:'OUT_OF_STOCK'},2);
 const p=new URL('https://example.test'+u).searchParams;
 assert.equal(p.get('query'),'50% & ягоды'); assert.equal(p.get('storeId'),'31');assert.equal(p.get('categoryId'),'7');assert.equal(p.get('status'),'OUT_OF_STOCK');assert.equal(p.get('page'),'2');
 assert.equal(exported.adminProductFilterUrl({query:' ',store:'all',category:'all',status:'all'}),'/products/admin-filter?page=0&size=20');
});
test('late response cannot replace the latest filter results',async()=>{
 const f=fixture(), first=f.run(),second=f.run();
 f.pending[1].resolve({content:[{id:2}],totalPages:3});await second;
 f.pending[0].resolve({content:[{id:1}],totalPages:999});await first;
 assert.equal(f.state.products[0].id,2);assert.equal(f.state.pages,3);assert.equal(f.state.loading,false);
});
test('late error cannot clear newer successful results',async()=>{
 const f=fixture(),first=f.run(),second=f.run();
 f.pending[1].resolve({content:[{id:2}],totalPages:1});await second;
 f.pending[0].reject(new Error('older request'));await first;
 assert.equal(f.state.products[0].id,2);assert.equal(f.state.errors,0);
});
test('current error clears stale rows and an out-of-range page moves back',async()=>{
 const f=fixture();const first=f.run();f.pending[0].reject(new Error('failed'));await first;
 assert.equal(f.state.errors,1);assert.equal(f.state.products.length,0);
 f.ctx.currentPage=3;const second=f.run();f.pending[1].resolve({content:[],totalPages:2});await second;assert.equal(f.state.page,1);
});
