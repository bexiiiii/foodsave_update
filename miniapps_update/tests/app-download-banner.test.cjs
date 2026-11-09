const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const source = fs.readFileSync(path.join(__dirname, '../components/AppDownloadBanner.tsx'), 'utf8');
const code = ts.transpileModule(source, { compilerOptions: {
  module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2020,
} }).outputText;
const week = 7 * 24 * 60 * 60 * 1000;
const key = 'foodsave.appDownloadBanner.dismissedUntil.v1';

function mount({ ua = '', platform = '', touch = 0, tg, now = 1000000000, saved = new Map(), blocked = false } = {}) {
  const slots = [], effects = [], exports = {};
  let cursor = 0, mounted = false;
  const storage = {
    getItem: (k) => { if (blocked) throw Error('disabled'); return saved.get(k) ?? null; },
    setItem: (k, v) => { if (blocked) throw Error('disabled'); saved.set(k, v); },
  };
  const react = {
    useState: (initial) => {
      const index = cursor++;
      if (!(index in slots)) slots[index] = initial;
      return [slots[index], value => { slots[index] = value; }];
    },
    useEffect: fn => { if (!mounted) effects.push(fn); },
  };
  const jsx = (type, props) => ({ type, props });
  vm.runInNewContext(code, {
    exports, require: name => name === 'react' ? react : { jsx, jsxs: jsx },
    window: { localStorage: storage, sessionStorage: storage, Telegram: tg ? { WebApp: tg } : undefined,
      addEventListener() {}, removeEventListener() {} },
    navigator: { userAgent: ua, platform, maxTouchPoints: touch },
    Date: { now: () => now },
  });
  const render = () => { cursor = 0; return exports.default(); };
  assert.equal(render(), null, 'initial render must match server rendering');
  effects.forEach(fn => fn()); mounted = true;
  return { render, exports, saved };
}

function elements(node, type) {
  if (!node || typeof node !== 'object') return [];
  if (Array.isArray(node)) return node.flatMap(n => elements(n, type));
  return [...(node.type === type ? [node] : []), ...elements(node.props?.children, type)];
}

test('iPhone, iPad desktop mode and Telegram iOS select App Store', () => {
  for (const config of [{ ua: 'iPhone' }, { ua: 'Macintosh', platform: 'MacIntel', touch: 5 }, { tg: { platform: 'ios' } }]) {
    const links = elements(mount(config).render(), 'a');
    assert.equal(links.length, 1);
    assert.equal(links[0].props.href, 'https://apps.apple.com/kz/app/foodsave/id6809133516');
    assert.equal(elements(links[0], 'span')[0].props.children, 'App Store');
  }
});

test('Android selects Google Play; desktop keeps both choices', () => {
  for (const config of [{ ua: 'Mozilla Android 15' }, { tg: { platform: 'android' } }]) {
    const links = elements(mount(config).render(), 'a');
    assert.equal(links.length, 1);
    assert.equal(links[0].props.href, 'https://play.google.com/store/apps/details?id=com.foodsave.kz');
  }
  assert.equal(elements(mount({ platform: 'MacIntel' }).render(), 'a').length, 2);
});

test('dismissal hides immediately, survives remount and expires after seven days', () => {
  const now = 1000000000, saved = new Map(), app = mount({ now, saved });
  elements(app.render(), 'button')[0].props.onClick();
  assert.equal(app.render(), null);
  assert.equal(saved.get(key), String(now + week));
  assert.equal(mount({ now: now + week - 1, saved }).render(), null);
  assert.ok(mount({ now: now + week, saved }).render());
});

test('invalid saved value and blocked storage cannot break the banner or close button', () => {
  assert.ok(mount({ saved: new Map([[key, 'invalid']]) }).render());
  const app = mount({ blocked: true });
  elements(app.render(), 'button')[0].props.onClick();
  assert.equal(app.render(), null);
});

test('Telegram opens the selected store; failed or absent bridge keeps native link', () => {
  let opened, prevented = false;
  const tg = { platform: 'ios', openLink(url) { opened = url; } };
  const link = elements(mount({ tg }).render(), 'a')[0];
  link.props.onClick({ currentTarget: { href: link.props.href }, preventDefault() { prevented = true; } });
  assert.equal(opened, link.props.href); assert.equal(prevented, true);
  for (const tg of [undefined, { openLink() { throw Error('bridge failure'); } }]) {
    let prevented = false;
    const link = elements(mount({ tg }).render(), 'a')[0];
    link.props.onClick({ currentTarget: { href: link.props.href }, preventDefault() { prevented = true; } });
    assert.equal(prevented, false);
    assert.equal(link.props.target, '_blank');
  }
});
