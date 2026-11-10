const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');const vm=require('node:vm');const ts=require('typescript');
const exportsObject={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname,'../lib/catalogCategories.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,{exports:exportsObject});
const {groupCatalogCategories,matchesCatalogCategory,includeSelectedCategoryGroup}=exportsObject;
const plain=x=>JSON.parse(JSON.stringify(x));
test('one strawberry navigation item keeps both category IDs and original ordering',()=>{
 const source=[{id:2,name:'Кофейня'},{id:4,name:'Клубника в шоколаде'},{id:5,name:'Сладости'},{id:8,name:'Клубника'}];
 const grouped=plain(groupCatalogCategories(source));assert.deepEqual(grouped.map(x=>x.id),[2,4,5]);assert.deepEqual(grouped[1].categoryIds,['4','8']);assert.equal(source.length,4);assert.equal(source[1].categoryIds,undefined);
});
test('both strawberry categories match; unrelated products and similar IDs do not',()=>{
 assert.equal(matchesCatalogCategory('4,8',4),true);assert.equal(matchesCatalogCategory('4,8',8),true);assert.equal(matchesCatalogCategory('4,8',14),false);assert.equal(matchesCatalogCategory('4,8',5),false);assert.equal(matchesCatalogCategory('4',8),false);assert.equal(matchesCatalogCategory('',5),true);
});
test('group remains selectable when one category currently has no products',()=>{
 assert.deepEqual(plain(includeSelectedCategoryGroup([['4','Клубника в шоколаде'],['5','Сладости']],'4,8','Құлпынай')),[['4,8','Құлпынай'],['4','Клубника в шоколаде'],['5','Сладости']]);
});
test('unknown categories are preserved, repeated IDs deduplicate, empty data is safe',()=>{
 const rows=groupCatalogCategories([{id:8,name:' КЛУБНИКА '},{id:4,name:'Клубника в шоколаде'},{id:8,name:'Клубника'},{id:9,name:'Клубничное мороженое'}]);assert.equal(rows.length,2);assert.deepEqual(plain(rows[0].categoryIds),['8','4']);assert.deepEqual(plain(groupCatalogCategories([])),[]);assert.deepEqual(plain(includeSelectedCategoryGroup([],'4,8','Клубника')),[]);
});
