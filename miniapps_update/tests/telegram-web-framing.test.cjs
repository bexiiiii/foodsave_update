const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const { NextRequest } = require('next/server');
const source = fs.readFileSync(path.join(__dirname, '../middleware.ts'), 'utf8');
const code = ts.transpileModule(source, { compilerOptions: {
  module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020,
} }).outputText;
const compiled = { exports: {} };
vm.runInNewContext(code, { exports: compiled.exports, require, console: { log() {} } });
const request = (url = '/', headers = {}) => new NextRequest('https://miniapp.foodsave.kz' + url, { headers });

test('Telegram Web can frame pages without the conflicting same-origin-only header', () => {
  for (const route of ['/', '/profile', '/orders', '/details/14257']) {
    const result = compiled.exports.middleware(request(route, { referer: 'https://web.telegram.org/a/' }));
    assert.equal(result.status, 200);
    assert.equal(result.headers.get('x-frame-options'), null);
    assert.equal(result.headers.get('content-security-policy'), "frame-ancestors 'self' https://web.telegram.org");
  }
});

test('an untrusted referrer cannot expand the fixed frame allowlist', () => {
  const result = compiled.exports.middleware(request('/', { referer: 'https://untrusted.example/', origin: 'https://untrusted.example' }));
  const ancestors = result.headers.get('content-security-policy').split(/\s+/).slice(1);
  assert.deepEqual(ancestors, ["'self'", 'https://web.telegram.org']);
  assert.equal(result.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(result.headers.get('referrer-policy'), 'strict-origin-when-cross-origin');
  assert.equal(result.headers.get('permissions-policy'), 'camera=(), microphone=(), geolocation=(self)');
});

test('HTML responses remain uncached and sensitive paths remain blocked', () => {
  const result = compiled.exports.middleware(request('/', { accept: 'text/html' }));
  assert.match(result.headers.get('cache-control'), /no-store/);
  assert.equal(compiled.exports.middleware(request('/.env')).status, 404);
  assert.equal(compiled.exports.middleware(request('/.git/config')).status, 403);
});
