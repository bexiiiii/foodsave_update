// Run with node scripts/check-store-edit.cjs [path/to/stores/page.tsx].
// Exercise the real submit/validation functions without a browser or real API writes.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const filename = process.argv[2] || path.join(__dirname, '../src/app/(admin)/stores/page.tsx');
const source = ts.createSourceFile(filename, fs.readFileSync(filename, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
function extract(name) {
    let expression;
    function visit(node) {
        if (ts.isVariableDeclaration(node) && node.name.getText(source) === name) expression = node.initializer;
        ts.forEachChild(node, visit);
    }
    visit(source);
    assert.ok(expression, `${name} exists`);
    return ts.transpileModule(`(${expression.getText(source)})`, { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText;
}
const original = {
    id: 48, name: 'Test branch', phone: '+77000000001', address: 'Old address',
    email: 'branch@example.test', category: 'Bakery', openingHours: '09:00:00', closingHours: '20:00:00',
    latitude: '', longitude: '', active: true, status: 'ACTIVE', user: { email: 'owner@example.test', role: 'STORE_OWNER' },
};
const other = { ...original, id: 49 };

async function check(label, { selected = original, changes = {}, stores = [original, other], uploading = false, reject = false } = {}, expected = 'update') {
    const calls = [], alerts = [], errors = [];
    const context = vm.createContext({
        selectedStore: selected, stores, formData: { ...original, ...changes }, logoUploading: uploading,
        setValidationErrors: value => errors.push(...value), setSubmitting() {},
        toast: alert => alerts.push(alert), console: { log() {}, error() {} },
        storeApi: {
            async update(id, data) { calls.push({ type: 'update', id, data }); if (reject) throw new Error('Network failed'); },
            async create(data) { calls.push({ type: 'create', data }); },
        },
        async fetchStores() { calls.push({ type: 'refresh' }); },
        closeModal() { calls.push({ type: 'close' }); }, resetForm() {},
    });
    context.validateForm = vm.runInContext(extract('validateForm'), context);
    await vm.runInContext(extract('handleSubmit'), context)({ preventDefault() {} });
    const writes = calls.filter(call => ['update', 'create'].includes(call.type));
    if (expected === 'blocked') {
        assert.equal(writes.length, 0, label);
        assert.ok(alerts.some(alert => alert.variant === 'destructive'), label);
        assert.equal(calls.length, 0, label);
    } else {
        assert.equal(writes.length, 1, label);
        assert.equal(writes[0].type, expected, label);
        if (expected === 'update') assert.equal(writes[0].id, original.id, label);
        for (const field of ['phone', 'address', 'openingHours', 'closingHours']) {
            assert.equal(writes[0].data[field], changes[field] ?? original[field], `${label}: ${field}`);
        }
        assert.equal(calls.some(call => call.type === 'close'), !reject, label);
        assert.equal(alerts.some(alert => alert.variant === 'destructive'), reject, label);
    }
    console.log(`PASS ${label}`);
}
(async () => {
    await check('address edit with unchanged shared phone and name', { changes: { address: 'New address' } });
    await check('hours edit with unchanged shared phone and name', { changes: { openingHours: '10:00:00', closingHours: '22:00:00' } });
    await check('shared phone alone does not block', { stores: [original, { ...other, name: 'Other branch' }] });
    await check('shared name alone does not block', { stores: [original, { ...other, phone: '+77000000002' }] });
    await check('new conflicting phone still blocked', { changes: { phone: '+77000000002' }, stores: [original, { ...other, phone: '+77000000002' }] }, 'blocked');
    await check('new conflicting name still blocked', { changes: { name: 'Other' }, stores: [original, { ...other, name: 'Other' }] }, 'blocked');
    await check('create duplicate phone blocked', { selected: null, changes: { name: 'New branch' } }, 'blocked');
    await check('create duplicate name blocked', { selected: null, changes: { phone: '+77000000003' } }, 'blocked');
    await check('create unique store allowed', { selected: null, changes: { name: 'Unique', phone: '+77000000003' } }, 'create');
    await check('empty phone still blocked', { changes: { phone: '' } }, 'blocked');
    await check('empty address still blocked', { changes: { address: '' } }, 'blocked');
    await check('upload still blocks submit', { uploading: true }, 'blocked');
    await check('server failure keeps form open', { reject: true });
})().catch(error => { console.error(error); process.exitCode = 1; });
