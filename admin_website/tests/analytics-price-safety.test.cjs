const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const source=fs.readFileSync(require('node:path').join(__dirname,'../src/app/(admin)/analytics/page.tsx'),'utf8');
const ast=ts.createSourceFile('analytics.tsx',source,99,true,ts.ScriptKind.TSX),declarations=new Map();
function walk(n){if(ts.isVariableDeclaration(n)&&n.initializer)declarations.set(n.name.getText(ast),n.initializer);ts.forEachChild(n,walk)}walk(ast);
const expr=name=>declarations.get(name).getText(ast);
const callback=name=>ts.transpile('const callback='+declarations.get(name).arguments[0].getText(ast),{target:ts.ScriptTarget.ES2022})+';callback';
test('average uses issued count and turnover from the same period, including empty periods',()=>{
 const average=data=>vm.runInNewContext(expr('averageOrderValue'),{analyticsData:data,numberValue:Number});
 assert.equal(average({totalRevenue:6000,totalOrders:2}),3000);assert.equal(average({totalRevenue:0,totalOrders:0}),0);
});
test('late previous-period responses cannot replace the selected period',async()=>{
 const pending=[],context={periodRequest:{current:0},startDate:'2026-11-01',endDate:'2026-11-10',selectedStoreId:'all',resolveStoreParam:()=>undefined,setSalesLoading:()=>{},setDailySalesAnalytics:()=>{},setDailySalesOrderDetails:()=>{},toast:()=>{},console};
 let state={};context.setAnalyticsData=fn=>state=fn(state);
 context.analyticsApi={getDailySales:async()=>[],getDailySalesOrderDetails:async()=>[],getIssuedPeriod:()=>new Promise(resolve=>pending.push(resolve))};
 const fetch=vm.runInNewContext(callback('fetchDailySalesAnalytics'),context);const old=fetch(),latest=fetch({nextStartDate:'2026-11-09'});
 pending[1]({totalRevenue:100,totalOrders:1});await latest;pending[0]({totalRevenue:9000000,totalOrders:4000});await old;
 assert.equal(state.totalRevenue,100);assert.equal(state.totalOrders,1);
});
test('general lifetime metadata does not overwrite selected-period money',async()=>{
 let state={totalRevenue:120,totalOrders:1};const context={setRefreshing:()=>{},analyticsApi:{getGeneral:async()=>({totalRevenue:9000000,totalOrders:4000,totalUsers:25,totalStores:3,totalProducts:40})},setAnalyticsData:fn=>state=fn(state),hasPermission:()=>false,Permission:{ANALYTICS_READ:'a',ORDER_READ:'o'},setLoading:()=>{},toast:()=>{},console};
 await vm.runInNewContext(callback('fetchAnalytics'),context)();assert.equal(state.totalRevenue,120);assert.equal(state.totalOrders,1);assert.equal(state.totalUsers,25);
});
