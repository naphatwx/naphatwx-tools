#!/usr/bin/env node
// Checks a standalone mock against the plan's scenarios (<mock-dir>/../use-cases.js): every ui scenario has one play
// entry with a real state and page; mcp / api / job scenarios have none (they show as "No mock"). Syntax-checks all scripts.
// Usage: node check-scenarios.js <mock-dir> [--use-cases <file>] [--json]. Exit 1 on any error.

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
const SCS = CORE.map(s => ({ ...s, ...(PLAY.find(p => p.id === s.id) || {}) }));

/** states.js in a VM (location stubbed), for its state ids. */
function stateIdsOf() {
    const ctx = { URLSearchParams, location: { search: '', pathname: '/page/x.html', hash: '' } };
    vm.createContext(ctx);
    for (const f of ['contract/rules.js', 'shared/states.js']) {
        // top-level const/let would stay script-scoped; var makes them reachable from runInContext
        vm.runInContext(read(f).replace(/^(const|let) (\w+) =/gm, 'var $2 ='), ctx, { filename: f });
    }
    return vm.runInContext('States.LIST.map(s => s.id)', ctx);
}

let stateIds = [];
try { stateIds = stateIdsOf(); }
catch (e) { errors.push(`could not load shared/states.js: ${e.message}`); }

const SURFACES = ['ui', 'mcp', 'api', 'job'];
const ids = new Set();
for (const s of CORE) {
    if (ids.has(s.id)) errors.push(`duplicate scenario id: ${s.id}`);
    ids.add(s.id);
    if (!USE_CASES.some(c => c.id === s.useCase)) errors.push(`${s.id}: use case ${s.useCase} is not in USE_CASES`);
    if (!SURFACES.includes(s.surface)) errors.push(`${s.id}: surface "${s.surface}" is not one of ${SURFACES.join(' | ')}`);
}
const playIds = new Set();
for (const p of PLAY) {
    if (playIds.has(p.id)) errors.push(`duplicate play entry: ${p.id}`);
    playIds.add(p.id);
    if (!ids.has(p.id)) errors.push(`play entry ${p.id} matches no scenario in use-cases.js`);
    // one scenario = one screen = one result: a path that needs another state or data is its own scenario
    if ('parts' in p) errors.push(`play entry ${p.id}: "parts" is not allowed; one entry plays one state. Split each part into its own scenario with the generate-use-case skill`);
    if (p.state != null && typeof p.state !== 'string') errors.push(`play entry ${p.id}: state must be one state id`);
    if (p.params != null && (typeof p.params !== 'object' || Array.isArray(p.params))) errors.push(`play entry ${p.id}: params must be one object of query params`);
}
for (const s of SCS) {
    if (s.surface !== 'ui') {
        if (playIds.has(s.id)) errors.push(`${s.id}: a ${s.surface} scenario has no mock; remove its play entry`);
        continue;
    }
    if (!playIds.has(s.id)) { errors.push(`${s.id}: ui scenario with no play entry; add one`); continue; }
    for (const k of ['state', 'page', 'steps']) if (s[k] == null || s[k] === '' || (k === 'steps' && !s[k].length)) errors.push(`${s.id}: missing ${k}`);
    if (stateIds.length && !stateIds.includes(s.state)) errors.push(`${s.id}: state ${s.state} is not in states.js`);
    if (!fs.existsSync(path.join(dir, 'page', `${s.page}.html`))) errors.push(`${s.id}: page/${s.page}.html does not exist`);
}
USE_CASES.forEach(c => { if (!CORE.some(s => s.useCase === c.id) && !c.none) errors.push(`use case ${c.id} has no scenario and no "none" sentence`); });

// ---------------------------------------------------------------- counts: every scenario is in the tree; ui ones play
const played = s => s.surface === 'ui' && playIds.has(s.id);
const inUseCase = c => SCS.filter(s => s.useCase === c.id);
const perUseCase = USE_CASES.map(c => ({ useCase: c.id, title: c.title, count: inUseCase(c).length, playable: inUseCase(c).filter(played).length }));
const playable = SCS.filter(played).length;
if (asJson) out(JSON.stringify({ scenarios: SCS.length, playable, noMock: SCS.length - playable, perUseCase, errors }, null, 2));
else {
    out(`${SCS.length} scenarios, ${playable} playable in the mock, ${SCS.length - playable} shown as No mock`);
    perUseCase.forEach(c => out(`  ${c.useCase} ${c.title}: ${c.count} (${c.playable} playable)`));
    out(errors.length ? `\n${errors.length} error(s):\n- ${errors.join('\n- ')}` : '\nNo errors.');
}
process.exit(errors.length ? 1 : 0);
