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
function mount({ data = [item], token = 'test-token', inbox = false, fail = false, telegram } = {}) {
  let auth = token, cursor = 0, mounted = false, effects = [], interval, calls = [];
  const slots = [], exports = {}, listeners = new Map();
  const react = { useState(initial) { const i=cursor++; if (!(i in slots)) slots[i]=initial; return [slots[i], value => slots[i]=typeof value==='function'?value(slots[i]):value]; }, useEffect(fn) { if (!mounted) effects.push(fn); } };
  const window = { location: { pathname: inbox?'/notifications':'/' }, setInterval(fn) { interval=fn;return 1; }, clearInterval() {}, addEventListener(n,fn) { listeners.set(n,fn); }, removeEventListener() {}, dispatchEvent(e) { listeners.get(e.type)?.(); } };
  if (telegram) window.Telegram = {WebApp: telegram};
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

function supportLink(node) {
  if (!node || typeof node !== 'object') return null;
  if (Array.isArray(node)) return node.map(supportLink).find(Boolean);
  if (typeof node.type === 'function') return supportLink(node.type(node.props));
  if (node.type === 'a' && node.props.href === 'https://t.me/FoodSave_kz') return node;
  return supportLink(node.props?.children);
}
test('support opens the personal chat then closes the covering Mini App in popup and inbox', async () => {
  for (const inbox of [false,true]) {
    const calls=[];
    const app=mount({inbox,telegram:{initData:'signed-test-data',openTelegramLink:url=>calls.push(['open',url]),close:()=>calls.push(['close'])}});
    await tick();
    const link=supportLink(app.render());
    assert.ok(link);
    link.props.onClick({preventDefault:()=>calls.push(['preventDefault'])});
    assert.deepEqual(calls,[['open','https://t.me/FoodSave_kz'],['preventDefault'],['close']]);
    assert.equal(app.calls.filter(c=>c.options.method==='PUT').length,0);
  }
});
test('support preserves a normal link outside Telegram, without SDK, and when opening fails', async () => {
  for (const telegram of [undefined,{initData:'',openTelegramLink:()=>{throw Error('inactive bridge');}},{initData:'test'},{initData:'test',openTelegramLink:()=>{throw Error('unsupported');},close:()=>{throw Error('must not close');}}]) {
    const app=mount({inbox:true,telegram});await tick();
    const link=supportLink(app.render());let prevented=false;
    link.props.onClick({preventDefault:()=>{prevented=true;}});
    assert.equal(prevented,false);assert.equal(link.props.href,'https://t.me/FoodSave_kz');assert.equal(link.props.target,'_blank');
  }
});
test('an unavailable close method does not open a duplicate chat', async () => {
  for (const close of [undefined,()=>{throw Error('close unavailable');}]) {
    let opened=0,prevented=false;
    const app=mount({telegram:{initData:'test',openTelegramLink:()=>opened++,close}});await tick();
    assert.doesNotThrow(()=>supportLink(app.render()).props.onClick({preventDefault:()=>{prevented=true;}}));
    assert.equal(opened,1);assert.equal(prevented,true);
  }
});
test('inbox read action marks the selected notification and keeps its support link',async()=>{
  const app=mount({inbox:true});await tick();
  const button=elements(app.render(),'button').find(b=>b.props.children==='Прочитано');assert.ok(button);
  await button.props.onClick();await tick();
  assert.ok(app.calls.some(c=>c.url==='/api/notifications/7/read'&&c.options.method==='PUT'));
  assert.equal(elements(app.render(),'button').some(b=>b.props.children==='Прочитано'),false);
  assert.ok(supportLink(app.render()));
});
