const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const ts = require('typescript');

// Load the production TypeScript without adding a test framework or build output.
function loadTypeScript(relativePath, dependencies = {}) {
  const filename = path.join(__dirname, '..', relativePath);
  const source = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX },
    fileName: filename,
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(source, {
    module,
    exports: module.exports,
    require(name) {
      if (Object.hasOwn(dependencies, name)) return dependencies[name];
      throw new Error(`Unexpected dependency: ${name}`);
    },
  }, { filename });
  return module.exports;
}

const utils = loadTypeScript('src/utils/growthExperiments.ts');

test('preview IDs accept only losslessly represented positive decimal integers', () => {
  for (const value of ['', '0', '-1', '+1', '01', ' 1', '1 ', '1.0', '1.5', '1e3', 'Infinity', 'NaN', '9007199254740992']) {
    assert.equal(utils.parsePreviewId(value), null, value);
  }
  assert.equal(utils.parsePreviewId('1'), 1);
  assert.equal(utils.parsePreviewId('9007199254740991'), Number.MAX_SAFE_INTEGER);
});

test('ITT never turns missing data or immature groups into zero conversion', () => {
  assert.equal(utils.formatGrowthItt(null, 0, 0), 'Нет участников');
  assert.equal(utils.formatGrowthItt(null, 10, 9), 'Ожидает созревания всей группы');
  assert.equal(utils.formatGrowthItt(0.5, 10, 9), 'Ожидает созревания всей группы');
  for (const rate of [null, NaN, Infinity, -0.1, 1.1]) {
    assert.equal(utils.formatGrowthItt(rate, 10, 10), 'Недоступно');
  }
  assert.equal(utils.formatGrowthItt(0, 10, 10), '0.0%');
  assert.equal(utils.formatGrowthItt(0.5, 10, 10), '50.0%');
  assert.equal(utils.formatGrowthItt(1, 10, 10), '100.0%');
  assert.equal(utils.formatGrowthItt(0.5, 10, 11), 'Недоступно');
  assert.equal(utils.formatGrowthItt(0.5, NaN, 10), 'Недоступно');
});

test('formatters fail safely and preserve meaningful zero values', () => {
  assert.equal(utils.formatGrowthCount(0), '0');
  assert.equal(utils.formatGrowthCount(NaN), 'Недоступно');
  assert.equal(utils.formatGrowthDate(null), 'Нет');
  assert.equal(utils.formatGrowthDate('invalid'), 'Недоступно');
  assert.equal(utils.formatGrowthDate('2026-09-30T12:00:00Z', 'invalid-zone'), 'Недоступно');
  assert.notEqual(utils.formatGrowthDate('2026-09-30T12:00:00Z', 'Asia/Almaty'), 'Недоступно');
  assert.match(utils.growthReasonLabel('FUTURE_REASON'), /Неизвестная причина/);
});

test('every backend dispatch reason has a localized explanation', () => {
  const backend = fs.readFileSync(path.join(__dirname, '../../backend_foodsave/src/main/java/com/foodsave/backend/growth/GrowthDispatchPolicy.java'), 'utf8');
  const reasons = backend.match(/enum Reason\s*\{([^}]+)\}/s)[1].match(/[A-Z][A-Z_]+/g);
  assert.ok(reasons.length >= 30);
  for (const reason of reasons) assert.doesNotMatch(utils.growthReasonLabel(reason), /Неизвестная причина/, reason);
});

function serviceWith(api) {
  return loadTypeScript('src/services/growthExperiments.ts', {
    '@/services/api': { api },
    axios: { isAxiosError: (error) => error?.isAxiosError === true },
  });
}

test('service exposes only reads and non-mutating previews with controller-compatible requests', async () => {
  const calls = [];
  const api = Object.fromEntries(['get', 'post'].map((method) => [method, async (...args) => {
    calls.push({ method, args });
    return { data: [] };
  }]));
  const { growthExperimentsApi: service } = serviceWith(api);
  const signal = new AbortController().signal;
  await service.list(signal);
  await service.get('example/id', signal);
  await service.measurements('example/id', signal);
  await service.preview('example/id', 42);
  await service.dispatchPreview('example/id', 42, 7);
  assert.deepEqual(Object.keys(service).sort(), ['dispatchPreview', 'get', 'list', 'measurements', 'preview']);
  assert.deepEqual(calls.map((call) => [call.method, call.args[0]]), [
    ['get', '/admin/growth-experiments'],
    ['get', '/admin/growth-experiments/example%2Fid'],
    ['get', '/admin/growth-experiments/example%2Fid/measurements'],
    ['post', '/admin/growth-experiments/example%2Fid/preview'],
    ['post', '/admin/growth-experiments/example%2Fid/dispatch-preview'],
  ]);
  assert.equal(calls[0].args[1].params.limit, 100);
  assert.equal(calls[0].args[1].signal, signal);
  assert.equal(calls[1].args[1].signal, signal);
  assert.equal(calls[2].args[1].signal, signal);
  assert.equal(JSON.stringify(calls[3].args[1]), '{"userId":42}');
  assert.equal(JSON.stringify(calls[4].args[1]), '{"userId":42,"productId":7}');
});

test('invalid lists reject rather than rendering fabricated empty reports', async () => {
  const { growthExperimentsApi: service } = serviceWith({ get: async () => ({ data: null }) });
  await assert.rejects(service.list(), /Invalid growth API response/);
  await assert.rejects(service.measurements('id'), /Invalid growth API response/);
});

test('error notices never disclose raw server data or substitute zero metrics', () => {
  const { growthApiError } = serviceWith({});
  for (const status of [400, 401, 403, 404, 409, 500, 503]) {
    const message = growthApiError({ isAxiosError: true, response: { status, data: 'private server error' } });
    assert.ok(message.length > 20);
    assert.doesNotMatch(message, /private server error/);
  }
  assert.match(growthApiError(new Error('private server error')), /Нулевые показатели не подставлены/);
});


test('page gates the console for loading, signed-out and non-super-admin sessions', () => {
  const React = require('react');
  const { renderToStaticMarkup } = require('react-dom/server');
  let session;
  let requests = 0;
  const Page = loadTypeScript('src/app/(admin)/communications/experiments/page.tsx', {
    react: React,
    'react/jsx-runtime': require('react/jsx-runtime'),
    'next/link': { default: ({ children, ...props }) => React.createElement('a', props, children) },
    'lucide-react': { RefreshCw: () => React.createElement('span') },
    '@/contexts/AuthContext': { useAuth: () => session },
    '@/services/growthExperiments': {
      growthApiError: () => 'error',
      growthExperimentsApi: { list: () => { requests += 1; return Promise.resolve([]); } },
    },
    '@/utils/growthExperiments': utils,
  }).default;
  session = { isLoading: true, user: null };
  assert.match(renderToStaticMarkup(React.createElement(Page)), /Проверка доступа/);
  for (const role of [null, 'STORE_OWNER', 'STORE_MANAGER', 'CUSTOMER']) {
    session = { isLoading: false, user: role ? { role } : null };
    const html = renderToStaticMarkup(React.createElement(Page));
    assert.match(html, /доступен только супер-администратору/);
    assert.doesNotMatch(html, /growth-experiment/);
  }
  session = { isLoading: false, user: { role: 'SUPER_ADMIN' } };
  const html = renderToStaticMarkup(React.createElement(Page));
  assert.match(html, /Эксперименты роста: предпросмотр/);
  assert.match(html, /Загрузка экспериментов/);
  assert.equal(requests, 0, 'server rendering must not issue client requests');
});
