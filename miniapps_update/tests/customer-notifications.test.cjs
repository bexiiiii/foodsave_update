const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const ts = require('typescript');
const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../components/CustomerNotifications.tsx'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2020 } }).outputText;
const item = { id: 7, title: 'Заказ #123456 отменён', message: 'Ваш заказ отменили. Чтобы узнать почему напишите нам в поддержку', type: 'ORDER_CANCELLED_BY_STAFF', read: false, createdAt: '2026-11-09T15:00:00' };
const tick = () => new Promise(resolve => setImmediate(resolve));
function elements(n, type) { if (!n || typeof n !== 'object') return []; if (Array.isArray(n)) return n.flatMap(v => elements(v, type)); return [...(n.type === type ? [n] : []), ...elements(n.props?.children, type)]; }
function mount({ data = [item], token = 'test-token', inbox = false, fail = false } = {}) {
  let auth = token, cursor = 0, mounted = false, effects = [], interval, calls = [];
  const slots = [], exports = {}, listeners = new Map();
  const react = { useState(initial) { const i=cursor++; if (!(i in slots)) slots[i]=initial; return [slots[i], value => slots[i]=typeof value==='function'?value(slots[i]):value]; }, useEffect(fn) { if (!mounted) effects.push(fn); } };
  const window = { location: { pathname: inbox?'/notifications':'/' }, setInterval(fn) { interval=fn;return 1; }, clearInterval() {}, addEventListener(n,fn) { listeners.set(n,fn); }, removeEventListener() {}, dispatchEvent(e) { listeners.get(e.type)?.(); } };
  vm.runInNewContext(code,{exports, require:n=>n==='react'?react:n==='../lib/api'?{getAuthToken:()=>auth}:{jsx:(type,props)=>({type,props}),jsxs:(type,props)=>({type,props})},process:{env:{NEXT_PUBLIC_API_URL:'/api'}},window,document:{visibilityState:'visible',addEventListener(){},removeEventListener(){}},AbortController,Event,
    fetch:async(url,options)=>{calls.push({url,options});if(fail)throw Error('offline');if(options.method==='PUT')data=data.map(n=>({...n,read:true}));return {ok:true,json:async()=>data};}});
  const render=()=>{cursor=0;return inbox?exports.NotificationsInbox():exports.default();};render();effects.forEach(fn=>fn());mounted=true;
  return {render, exports, calls, poll:()=>interval(), setToken:v=>{auth=v;}};
}
test('cancellation notice shows exact server text and support action',async()=>{const app=mount();await tick();const node=app.render();assert.equal(node.props.role,'status');assert.equal(elements(node,'p')[0].props.children,item.message);assert.equal(elements(node,'h2')[0].props.children,item.title);});
test('read and unrelated notifications never appear as cancellation alerts',async()=>{for(const data of [[{...item,read:true}],[{...item,type:'PROMOTION'}],[]]){const app=mount({data});await tick();assert.equal(app.render(),null);}});
test('closing marks only this notification read then hides it',async()=>{const app=mount();await tick();await elements(app.render(),'button')[0].props.onClick();await tick();assert.equal(app.render(),null);const call=app.calls.find(c=>c.options.method==='PUT');assert.equal(call.url,'/api/notifications/7/read');assert.equal(call.options.headers.Authorization,'Bearer test-token');});
test('late authentication is picked up without restarting Mini App',async()=>{const app=mount({token:null});await tick();assert.equal(app.calls.length,0);app.setToken('new-token');await app.poll();assert.notEqual(app.render(),null);assert.equal(app.calls[0].options.headers.Authorization,'Bearer new-token');});
test('inbox reports failure instead of claiming there are no notifications',async()=>{const app=mount({inbox:true,fail:true});await tick();assert.ok(elements(app.render(),'div').some(n=>n.props.role==='alert'));});
test('malformed notification entries cannot become actions',()=>{const app=mount({token:null});const parsed=app.exports.parseNotifications([item,{...item,id:'7/other'},null]);assert.equal(parsed.length,1);assert.equal(parsed[0].id,7);assert.throws(()=>app.exports.parseNotifications({}));});
