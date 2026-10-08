#!/usr/bin/env node
// Checks a standalone mock's play data against the plan's use cases, and runs every console (API / MCP) use case
// against the fake API. Usage: node check-use-cases.js <mock-dir> [--use-cases <file>] [--json]
// Use cases default to <mock-dir>/../use-cases.js. Exit 1 on any structural error.

const fs = require('fs');
const os = require('os');
const path = require('path');
const vm = require('vm');
const { execFileSync } = require('child_process');

const out = s => process.stdout.write(s + '\n');
const dir = process.argv[2];
if (!dir) { process.stderr.write('usage: node check-use-cases.js <mock-dir> [--use-cases <file>] [--json]\n'); process.exit(2); }
const asJson = process.argv.includes('--json');
const ucArg = process.argv.indexOf('--use-cases');
const ucFile = ucArg > 0 ? process.argv[ucArg + 1] : path.join(dir, '..', 'use-cases.js');
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
let FLOWS = [], CORE = [], PLAY = [];
try { const src = fs.readFileSync(ucFile, 'utf8'); FLOWS = parseVar(src, 'USE_CASE_FLOWS'); CORE = parseVar(src, 'USE_CASES'); }
catch (e) { errors.push(`${ucFile} is missing or not strict JSON (write it with the generate-use-case skill): ${e.message}`); }
try { PLAY = parseVar(read('shared/use-case-play.js'), 'USE_CASE_PLAY'); }
catch (e) { errors.push(`shared/use-case-play.js is missing or not strict JSON: ${e.message}`); }
// The merged view the pages see: each use case plus its play entry.
const UCS = CORE.map(u => ({ ...u, ...(PLAY.find(p => p.id === u.id) || { skip: 'No play entry.' }) }));

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
    const files = ['contract/rules.js', 'contract/data.js', 'shared/scenarios.js', 'shared/components.js', 'shared/fake-api.js'].map(f => path.join(dir, f))
        .concat(ucFile, path.join(dir, 'shared/use-case-play.js'));
    for (const f of files) {
        // top-level const/let would stay script-scoped; var makes them reachable from runInContext
        if (fs.existsSync(f)) vm.runInContext(fs.readFileSync(f, 'utf8').replace(/^(const|let) (\w+) =/gm, 'var $2 ='), ctx, { filename: path.relative(dir, f) });
    }
    return ctx;
}

let scenarioIds = [];
try { scenarioIds = vm.runInContext('Scenarios.LIST.map(s => s.id)', sandbox('')); }
catch (e) { errors.push(`could not load the mock in a sandbox: ${e.message}`); }

const ids = new Set();
for (const u of CORE) {
    if (ids.has(u.id)) errors.push(`duplicate use-case id: ${u.id}`);
    ids.add(u.id);
    if (!FLOWS.some(f => f.flow === u.flow)) errors.push(`${u.id}: flow ${u.flow} is not in USE_CASE_FLOWS`);
}
const playIds = new Set();
for (const p of PLAY) {
    if (playIds.has(p.id)) errors.push(`duplicate play entry: ${p.id}`);
    playIds.add(p.id);
    if (!ids.has(p.id)) errors.push(`play entry ${p.id} matches no use case in use-cases.js`);
}
for (const u of UCS) {
    if (!playIds.has(u.id)) { errors.push(`${u.id}: no play entry; add one, or one with "skip" and why`); continue; }
    if (u.skip) continue;
    for (const k of ['scenario', 'page', 'steps']) if (u[k] == null || u[k] === '') errors.push(`${u.id}: missing ${k}`);
    if (scenarioIds.length && !scenarioIds.includes(u.scenario)) errors.push(`${u.id}: scenario ${u.scenario} is not in scenarios.js`);
    if (!fs.existsSync(path.join(dir, 'page', `${u.page}.html`))) errors.push(`${u.id}: page/${u.page}.html does not exist`);
    if (u.page === 'console' && (!u.op || !u.req)) errors.push(`${u.id}: console use case needs op and req`);
}
FLOWS.forEach(f => { if (!CORE.some(u => u.flow === f.flow) && !f.none) errors.push(`flow ${f.flow} has no use case and no "none" sentence`); });

// ---------------------------------------------------------------- run console use cases (first run only; later steps are manual)
(async () => {
    const runs = [];
    for (const u of UCS.filter(u => !u.skip && u.page === 'console' && u.op)) {
        let result;
        try {
            const ctx = sandbox(u.scenario, u.id);
            if (typeof ctx.FakeApi?.[u.op] !== 'function') { errors.push(`${u.id}: FakeApi has no operation ${u.op}`); continue; }
            ctx.__req = JSON.parse(JSON.stringify(u.req));
            result = { ok: true, value: await vm.runInContext(`FakeApi[${JSON.stringify(u.op)}](__req)`, ctx) };
        } catch (e) { result = { ok: false, value: e instanceof Error ? { error: e.message } : e }; }
        runs.push({ id: u.id, op: u.op, scenario: u.scenario, result, expect: u.expect, moreSteps: u.steps.length > 1 });
    }

    const inFlow = f => UCS.filter(u => u.flow === f.flow);
    const perFlow = FLOWS.map(f => ({ flow: f.flow, title: f.title, count: inFlow(f).length, playable: inFlow(f).filter(u => !u.skip).length }));
    const playable = UCS.filter(u => !u.skip).length;
    if (asJson) out(JSON.stringify({ total: UCS.length, playable, perFlow, errors, runs }, null, 2));
    else {
        out(`${UCS.length} use cases, ${playable} playable in the mock`);
        perFlow.forEach(f => out(`  ${f.flow} ${f.title}: ${f.count} (${f.playable} playable)`));
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
