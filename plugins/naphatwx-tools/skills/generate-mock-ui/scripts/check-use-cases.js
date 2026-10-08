#!/usr/bin/env node
// Checks a standalone mock's use cases and runs every console (API / MCP) use case against the fake API.
// Usage: node check-use-cases.js <mock-dir> [--json]
// Exit 1 on any structural error. Console results are printed next to `expect` for you to compare.

const fs = require('fs');
const os = require('os');
const path = require('path');
const vm = require('vm');
const { execFileSync } = require('child_process');

const out = s => process.stdout.write(s + '\n');
const dir = process.argv[2];
if (!dir) { process.stderr.write('usage: node check-use-cases.js <mock-dir> [--json]\n'); process.exit(2); }
const asJson = process.argv.includes('--json');
const read = p => fs.readFileSync(path.join(dir, p), 'utf8');
const errors = [];

/** Parse `<NAME> = [ ... ]` as strict JSON, the way other tools read it. */
function parseVar(src, name) {
    const m = src.match(new RegExp(`\\b${name}\\s*=\\s*\\[`));
    if (!m) throw new Error(`${name} not found`);
    const start = m.index + m[0].length - 1;
    let depth = 0, inStr = false;
    for (let j = start; j < src.length; j++) {
        const c = src[j];
        if (inStr) { if (c === '\\') j++; else if (c === '"') inStr = false; continue; }
        if (c === '"') inStr = true;
        else if (c === '[') depth++;
        else if (c === ']' && --depth === 0) return JSON.parse(src.slice(start, j + 1));
    }
    throw new Error(`${name}: unclosed array`);
}

// ---------------------------------------------------------------- syntax: every .js file and every inline <script>
const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'uc-check-'));
for (const f of walk(dir)) {
    const rel = path.relative(dir, f);
    const scripts = f.endsWith('.js') ? [fs.readFileSync(f, 'utf8')]
        : f.endsWith('.html') ? [...fs.readFileSync(f, 'utf8').matchAll(/<script(?![^>]*\bsrc=)(?![^>]*text\/tailwindcss)[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1])
        : [];
    scripts.forEach((code, n) => {
        const t = path.join(tmp, `s${n}.js`);
        fs.writeFileSync(t, code);
        try { execFileSync(process.execPath, ['--check', t], { stdio: 'pipe' }); }
        catch (e) { errors.push(`syntax: ${rel}${f.endsWith('.html') ? ` inline script ${n + 1}` : ''}: ${String(e.stderr).split('\n').slice(1, 4).join(' ').trim()}`); }
    });
}

// ---------------------------------------------------------------- structure
let FLOWS = [], UCS = [];
try { const src = read('shared/use-cases.js'); FLOWS = parseVar(src, 'USE_CASE_FLOWS'); UCS = parseVar(src, 'USE_CASES'); }
catch (e) { errors.push(`use-cases.js is missing or not strict JSON: ${e.message}`); }

/** The mock's shared scripts in a VM, with location and storage stubbed and latency removed. */
function sandbox(scenario, uc) {
    const store = new Map();
    const ctx = {
        console, URLSearchParams, Intl, Date, Math, JSON, Promise, Object, Array, String, Number, Error,
        setTimeout: f => { Promise.resolve().then(f); return 0; }, clearTimeout() { }, setInterval() { return 0; },
        location: { search: `?scenario=${encodeURIComponent(scenario)}${uc ? `&uc=${uc}` : ''}`, pathname: '/page/console.html', hash: '' },
        sessionStorage: { getItem: k => store.has(k) ? store.get(k) : null, setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k), key: i => [...store.keys()][i], get length() { return store.size; } },
        localStorage: { getItem: () => null, setItem() { } },
        document: { documentElement: { classList: { remove() { }, toggle() { }, contains: () => true } } },
    };
    ctx.window = ctx;
    vm.createContext(ctx);
    for (const f of ['contract/rules.js', 'contract/data.js', 'shared/scenarios.js', 'shared/components.js', 'shared/fake-api.js', 'shared/use-cases.js']) {
        // top-level const/let would stay script-scoped; var makes them reachable from runInContext
        if (fs.existsSync(path.join(dir, f))) vm.runInContext(read(f).replace(/^(const|let) (\w+) =/gm, 'var $2 ='), ctx, { filename: f });
    }
    return ctx;
}

let scenarioIds = [];
try { scenarioIds = vm.runInContext('Scenarios.LIST.map(s => s.id)', sandbox('')); }
catch (e) { errors.push(`could not load the mock in a sandbox: ${e.message}`); }

const ids = new Set();
for (const u of UCS) {
    if (ids.has(u.id)) errors.push(`duplicate use-case id: ${u.id}`);
    ids.add(u.id);
    for (const k of ['id', 'flow', 'title', 'story', 'scenario', 'page', 'steps', 'expect']) if (u[k] == null || u[k] === '') errors.push(`${u.id}: missing ${k}`);
    if (!FLOWS.some(f => f.flow === u.flow)) errors.push(`${u.id}: flow ${u.flow} is not in USE_CASE_FLOWS`);
    if (scenarioIds.length && !scenarioIds.includes(u.scenario)) errors.push(`${u.id}: scenario ${u.scenario} is not in scenarios.js`);
    if (!fs.existsSync(path.join(dir, 'page', `${u.page}.html`))) errors.push(`${u.id}: page/${u.page}.html does not exist`);
    if (u.page === 'console' && (!u.op || !u.req)) errors.push(`${u.id}: console use case needs op and req`);
}
FLOWS.forEach(f => { if (!UCS.some(u => u.flow === f.flow) && !f.none) errors.push(`flow ${f.flow} has no use case and no "none" sentence`); });

// ---------------------------------------------------------------- run console use cases (first run only; later steps are manual)
(async () => {
    const runs = [];
    for (const u of UCS.filter(u => u.page === 'console' && u.op)) {
        let result;
        try {
            const ctx = sandbox(u.scenario, u.id);
            if (typeof ctx.FakeApi?.[u.op] !== 'function') { errors.push(`${u.id}: FakeApi has no operation ${u.op}`); continue; }
            ctx.__req = JSON.parse(JSON.stringify(u.req));
            result = { ok: true, value: await vm.runInContext(`FakeApi[${JSON.stringify(u.op)}](__req)`, ctx) };
        } catch (e) { result = { ok: false, value: e instanceof Error ? { error: e.message } : e }; }
        runs.push({ id: u.id, op: u.op, scenario: u.scenario, result, expect: u.expect, moreSteps: u.steps.length > 1 });
    }

    const perFlow = FLOWS.map(f => ({ flow: f.flow, title: f.title, count: UCS.filter(u => u.flow === f.flow).length }));
    if (asJson) out(JSON.stringify({ total: UCS.length, perFlow, errors, runs }, null, 2));
    else {
        out(`${UCS.length} use cases`);
        perFlow.forEach(f => out(`  ${f.flow} ${f.title}: ${f.count}`));
        out(`\nConsole runs (${runs.length}), compare each result with expect:`);
        for (const r of runs) {
            out(`\n# ${r.id} · ${r.op} · scenario ${r.scenario}${r.moreSteps ? ' (later steps not run)' : ''}`);
            out(`  ${r.result.ok ? 'OK' : 'ERROR'} ${JSON.stringify(r.result.value).slice(0, 400)}`);
            r.expect.forEach(e => out(`  expect: ${e}`));
        }
        out(errors.length ? `\n${errors.length} error(s):\n- ${errors.join('\n- ')}` : '\nNo structural errors.');
    }
    process.exit(errors.length ? 1 : 0);
})();
