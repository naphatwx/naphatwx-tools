#!/usr/bin/env node
// Checks a standalone mock's play data against the plan's scenarios, and runs every console (API / MCP) scenario
// against the fake API. Usage: node check-scenarios.js <mock-dir> [--use-cases <file>] [--json]
// Scenarios come from <mock-dir>/../use-cases.js by default. Exit 1 on any structural error.

const fs = require('fs');
const os = require('os');
const path = require('path');
const vm = require('vm');
const { execFileSync } = require('child_process');

const out = s => process.stdout.write(s + '\n');
const dir = process.argv[2];
if (!dir) { process.stderr.write('usage: node check-scenarios.js <mock-dir> [--use-cases <file>] [--json]\n'); process.exit(2); }
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
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sc-check-'));
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
let USE_CASES = [], CORE = [], PLAY = [];
try { const src = fs.readFileSync(ucFile, 'utf8'); USE_CASES = parseVar(src, 'USE_CASES'); CORE = parseVar(src, 'SCENARIOS'); }
catch (e) { errors.push(`${ucFile} is missing, not strict JSON or in the old format (write it with the generate-use-case skill): ${e.message}`); }
try { PLAY = parseVar(read('shared/scenario-play.js'), 'SCENARIO_PLAY'); }
catch (e) { errors.push(`shared/scenario-play.js is missing or not strict JSON: ${e.message}`); }
// The merged view the pages see: each scenario plus its play entry.
const SCS = CORE.map(s => ({ ...s, ...(PLAY.find(p => p.id === s.id) || { skip: 'No play entry.' }) }));

/** The mock's shared scripts in a VM, with location and storage stubbed and latency removed. */
function sandbox(state, sc) {
    const store = new Map();
    const ctx = {
        console, URLSearchParams, Intl, Date, Math, JSON, Promise, Object, Array, String, Number, Error,
        setTimeout: f => { Promise.resolve().then(f); return 0; }, clearTimeout() { }, setInterval() { return 0; },
        location: { search: `?state=${encodeURIComponent(state)}${sc ? `&sc=${sc}` : ''}`, pathname: '/page/console.html', hash: '' },
        sessionStorage: { getItem: k => store.has(k) ? store.get(k) : null, setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k), key: i => [...store.keys()][i], get length() { return store.size; } },
        localStorage: { getItem: () => null, setItem() { } },
        document: { documentElement: { classList: { remove() { }, toggle() { }, contains: () => true } } },
    };
    ctx.window = ctx;
    vm.createContext(ctx);
    const files = ['contract/rules.js', 'contract/data.js', 'shared/states.js', 'shared/components.js', 'shared/fake-api.js'].map(f => path.join(dir, f))
        .concat(ucFile, path.join(dir, 'shared/scenario-play.js'));
    for (const f of files) {
        // top-level const/let would stay script-scoped; var makes them reachable from runInContext
        if (fs.existsSync(f)) vm.runInContext(fs.readFileSync(f, 'utf8').replace(/^(const|let) (\w+) =/gm, 'var $2 ='), ctx, { filename: path.relative(dir, f) });
    }
    return ctx;
}

let stateIds = [];
try { stateIds = vm.runInContext('States.LIST.map(s => s.id)', sandbox('')); }
catch (e) { errors.push(`could not load the mock in a sandbox: ${e.message}`); }

const ids = new Set();
for (const s of CORE) {
    if (ids.has(s.id)) errors.push(`duplicate scenario id: ${s.id}`);
    ids.add(s.id);
    if (!USE_CASES.some(c => c.id === s.useCase)) errors.push(`${s.id}: use case ${s.useCase} is not in USE_CASES`);
}
const playIds = new Set();
for (const p of PLAY) {
    if (playIds.has(p.id)) errors.push(`duplicate play entry: ${p.id}`);
    playIds.add(p.id);
    if (!ids.has(p.id)) errors.push(`play entry ${p.id} matches no scenario in use-cases.js`);
}
for (const s of SCS) {
    if (!playIds.has(s.id)) { errors.push(`${s.id}: no play entry; add one, or one with "skip" and why`); continue; }
    if (s.skip) continue;
    for (const k of ['state', 'page', 'steps']) if (s[k] == null || s[k] === '') errors.push(`${s.id}: missing ${k}`);
    if (stateIds.length && !stateIds.includes(s.state)) errors.push(`${s.id}: state ${s.state} is not in states.js`);
    if (!fs.existsSync(path.join(dir, 'page', `${s.page}.html`))) errors.push(`${s.id}: page/${s.page}.html does not exist`);
    if (s.page === 'console' && (!s.op || !s.req)) errors.push(`${s.id}: console scenario needs op and req`);
}
USE_CASES.forEach(c => { if (!CORE.some(s => s.useCase === c.id) && !c.none) errors.push(`use case ${c.id} has no scenario and no "none" sentence`); });

// ---------------------------------------------------------------- run console scenarios (first run only; later steps are manual)
(async () => {
    const runs = [];
    for (const s of SCS.filter(s => !s.skip && s.page === 'console' && s.op)) {
        let result;
        try {
            const ctx = sandbox(s.state, s.id);
            if (typeof ctx.FakeApi?.[s.op] !== 'function') { errors.push(`${s.id}: FakeApi has no operation ${s.op}`); continue; }
            ctx.__req = JSON.parse(JSON.stringify(s.req));
            result = { ok: true, value: await vm.runInContext(`FakeApi[${JSON.stringify(s.op)}](__req)`, ctx) };
        } catch (e) { result = { ok: false, value: e instanceof Error ? { error: e.message } : e }; }
        runs.push({ id: s.id, op: s.op, state: s.state, result, expect: s.expect, moreSteps: s.steps.length > 1 });
    }

    const inUseCase = c => SCS.filter(s => s.useCase === c.id);
    const perUseCase = USE_CASES.map(c => ({ useCase: c.id, title: c.title, count: inUseCase(c).length, playable: inUseCase(c).filter(s => !s.skip).length }));
    const playable = SCS.filter(s => !s.skip).length;
    if (asJson) out(JSON.stringify({ scenarios: SCS.length, playable, perUseCase, errors, runs }, null, 2));
    else {
        out(`${SCS.length} scenarios, ${playable} playable in the mock`);
        perUseCase.forEach(c => out(`  ${c.useCase} ${c.title}: ${c.count} (${c.playable} playable)`));
        out(`\nConsole runs (${runs.length}), compare each result with expect:`);
        for (const r of runs) {
            out(`\n# ${r.id} · ${r.op} · state ${r.state}${r.moreSteps ? ' (later steps not run)' : ''}`);
            out(`  ${r.result.ok ? 'OK' : 'ERROR'} ${JSON.stringify(r.result.value).slice(0, 400)}`);
            r.expect.forEach(e => out(`  expect: ${e}`));
        }
        out(errors.length ? `\n${errors.length} error(s):\n- ${errors.join('\n- ')}` : '\nNo structural errors.');
    }
    process.exit(errors.length ? 1 : 0);
})();
