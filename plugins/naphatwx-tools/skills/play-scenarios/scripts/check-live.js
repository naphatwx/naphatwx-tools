#!/usr/bin/env node
// Checks live/live.js and live/.env.example against the plan's scenarios; WARN lines (tooltip steps, roles with no permissions,
// {keys} no seed returns, vague names like "that merge request") keep exit 0.
// With --run-seeds (app and server.mjs running), picks every seeded scenario twice: both must succeed, writing ones get a new URL.
// Usage: node check-live.js <live-dir> [--use-cases <file>] [--run-seeds [--server http://localhost:4000]]. Exit 1 on any error.

const fs = require('fs');
const path = require('path');
const { execFileSync, spawnSync } = require('child_process');
const { parseEnv } = require('util');

const out = s => process.stdout.write(s + '\n');
const dir = process.argv[2];
if (!dir) { process.stderr.write('usage: node check-live.js <live-dir> [--use-cases <file>] [--run-seeds [--server <url>]]\n'); process.exit(2); }
const ucArg = process.argv.indexOf('--use-cases');
const ucFile = ucArg > 0 ? process.argv[ucArg + 1] : path.join(dir, '..', 'use-cases.js');
const errors = [];
const warnings = [];

/** Parse `<NAME> = [ ... ]` or `{ ... }` as strict JSON, the way other tools read it. */
function parseVar(src, name) {
    const m = src.match(new RegExp(`\\b${name}\\s*=\\s*([\\[{])`));
    if (!m) throw new Error(`${name} not found`);
    const start = m.index + m[0].length - 1;
    let depth = 0, inStr = false;
    for (let j = start; j < src.length; j++) {
        const c = src[j];
        if (inStr) { if (c === '\\') j++; else if (c === '"') inStr = false; continue; }
        if (c === '"') inStr = true;
        else if (c === '[' || c === '{') depth++;
        else if ((c === ']' || c === '}') && --depth === 0) return JSON.parse(src.slice(start, j + 1));
    }
    throw new Error(`${name}: unclosed`);
}

// ---------------------------------------------------------------- syntax
const seedFiles = fs.existsSync(path.join(dir, 'seeds')) ? fs.readdirSync(path.join(dir, 'seeds')).filter(f => f.endsWith('.mjs')).map(f => 'seeds/' + f) : [];
for (const f of ['live.js', 'server.mjs', ...seedFiles]) {
    try { execFileSync(process.execPath, ['--check', path.join(dir, f)], { stdio: 'pipe' }); }
    catch (e) { errors.push(`syntax: ${f}: ${String(e.stderr || e.message).split('\n').slice(0, 4).join(' ').trim()}`); }
}

// ---------------------------------------------------------------- structure
/** @type {import('../use-cases.types').Scenario[]} */
let CORE = [];
let PLAY = [], CFG = {};
try { CORE = parseVar(fs.readFileSync(ucFile, 'utf8'), 'SCENARIOS'); }
catch (e) { errors.push(`${ucFile} is missing or not strict JSON (write it with the generate-use-case skill): ${e.message}`); }
try { const src = fs.readFileSync(path.join(dir, 'live.js'), 'utf8'); CFG = parseVar(src, 'LIVE_CONFIG'); PLAY = parseVar(src, 'LIVE_PLAY'); }
catch (e) { errors.push(`live.js is missing or not strict JSON: ${e.message}`); }

const preview = String(CFG.base || '').startsWith('preview/');
if (!preview && !/^https?:\/\//.test(CFG.base || '')) errors.push(`LIVE_CONFIG.base must be the app's origin, e.g. http://localhost:3000 (got "${CFG.base}")`);
if (!preview && !/^https?:\/\//.test(CFG.api || '')) errors.push(`LIVE_CONFIG.api must be the API origin the seeds call, e.g. http://localhost:3000/api (got "${CFG.api}")`);
if (!CFG.slug || CFG.slug.includes('<')) errors.push('LIVE_CONFIG.slug: set the feature slug');
if (!CFG.pretest || typeof CFG.pretest.health !== 'string') errors.push('LIVE_CONFIG.pretest.health: set the path that answers when the app is up');
const LOGIN = CFG.login || { type: 'none' };
if (!['none', 'link', 'post', 'manual'].includes(LOGIN.type)) errors.push(`LIVE_CONFIG.login.type must be none, link, post or manual (got "${LOGIN.type}")`);
if (LOGIN.type === 'link' && !(String(LOGIN.path).includes('{role}') && String(LOGIN.path).includes('{next}'))) errors.push('login type link: path must contain {role} and {next}');
if (LOGIN.type === 'post' && !String(LOGIN.path || '').startsWith('/')) errors.push('login type post: path must start with /');
if (['link', 'post'].includes(LOGIN.type) && !CFG.role) errors.push('LIVE_CONFIG.role: set the default role to sign in as');
if (preview) out('note: base is the template preview; point base and api at the app in a real run.');

// ---------------------------------------------------------------- secrets: .env.example lists them, .env holds them, git never sees them
let exampleSrc = '';
try { exampleSrc = fs.readFileSync(path.join(dir, '.env.example'), 'utf8'); }
catch { errors.push('.env.example is missing: list every key the play needs, with a comment saying where to get it'); }
const exampleKeys = Object.keys(parseEnv(exampleSrc));
// a key is optional when the comment line right above it says "Optional", as server.mjs reads it
const optional = new Set([...exampleSrc.matchAll(/^\s*#[^\n]*\boptional\b[^\n]*\n\s*([A-Za-z_]\w*)\s*=/gim)].map(m => m[1]));
exampleSrc.split('\n').forEach((line, i) => {
    if (/^\s*[A-Za-z_]\w*\s*=\s*\S/.test(line)) errors.push(`.env.example line ${i + 1} has a value: keep values only in .env`);
});
const A = CFG.apiAuth;
if (A) {
    if (!['header', 'command', 'login'].includes(A.type)) errors.push(`LIVE_CONFIG.apiAuth.type must be header, command or login (got "${A.type}")`);
    if (A.type === 'header' && !A.env) errors.push('apiAuth type header: set "env", the name of the key in .env (never the secret itself)');
    if (A.type === 'header' && A.env && !exampleKeys.includes(A.env)) errors.push(`apiAuth.env "${A.env}" is not listed in .env.example`);
    if (A.type === 'command' && !A.run) errors.push('apiAuth type command: set "run", a command that prints a token');
    if (A.type === 'login' && !['link', 'post'].includes(LOGIN.type)) errors.push('apiAuth type login needs login type link or post');
    if (A.type === 'login' && A.send !== 'cookie' && !A.cookie) errors.push('apiAuth type login: set "cookie" (the session cookie to send as a token) or "send": "cookie"');
}
if (/"(?:[A-Za-z0-9+_-]{32,}|eyJ[\w-]+\.[\w-]+)"/.test(JSON.stringify(CFG))) errors.push('live.js seems to hold a secret value: move it to .env and refer to it by key');
const git = spawnSync('git', ['-C', dir, 'check-ignore', '-q', '.env']);
if (git.status === 1) errors.push('.env is not git-ignored here: keep the .gitignore next to live.js (it lists .env)');
else if (git.status !== 0) out('note: not a git checkout; skipped the .env ignore check');
const envFile = (() => { try { return parseEnv(fs.readFileSync(path.join(dir, '.env'), 'utf8')); } catch { return null; } })();
const unset = exampleKeys.filter(k => !optional.has(k) && !process.env[k] && !(envFile && envFile[k]));
if (unset.length) (process.argv.includes('--run-seeds') ? errors : { push: m => out('note: ' + m) }).push(`required keys with no value yet (set them in live/.env): ${unset.join(', ')}`);

/** Keys a seed file returns in done({ values }): `values: {…}`, `Object.assign(values, {…})`, `values.k =`. A scan, not a parse. */
function valueKeys(file) {
    let src = '';
    try { src = fs.readFileSync(path.join(dir, file), 'utf8'); } catch { return null; }
    const keys = new Set([...src.matchAll(/\bvalues\.(\w+)\s*=/g)].map(m => m[1]));
    for (const m of src.matchAll(/(?:\bvalues\s*[:=]\s*|Object\.assign\(\s*values\s*,\s*)\{([^{}]*)\}/g)) {
        m[1].split(',').map(p => p.trim()).filter(p => p && !p.startsWith('...')).forEach(p => keys.add(p.match(/^['"]?(\w+)/)[1]));
    }
    return keys;
}
// a value the seed knows is written as {key}; a secret keeps its <placeholder>
const VAGUE = /\b(?:that|the newest|the latest) (?:merge request|MR|repo(?:sitory)?|branch|version|tag|project|ticket|user|owner|pipeline|build)\b(?! named\b)|<(?![^>]*(?:token|secret|password|key\b|pat\b))[^<>\n]+>|\b[a-z]+-(?:…|\.\.\.)/i;

const SURFACES = ['ui', 'mcp', 'api', 'job'];
CORE.forEach(s => { if (!PLAY.some(p => p.id === s.id)) errors.push(`scenario ${s.id}: no entry in live.js`); });
PLAY.forEach((p, i) => {
    const where = `live.js entry ${p.id || '#' + (i + 1)}`;
    const sc = CORE.find(s => s.id === p.id);
    if (!sc) { errors.push(`${where}: no scenario with this id in use-cases.js`); return; }
    if (CORE.indexOf(sc) !== i) errors.push(`${where}: out of order (use-cases.js has it at ${CORE.indexOf(sc) + 1})`);
    if (!SURFACES.includes(sc.surface)) errors.push(`scenario ${sc.id}: surface must be ${SURFACES.join(', ')} (got "${sc.surface}"); fix it with the generate-use-case skill`);
    // one scenario = one screen = one result: a path that needs another seed or screen is its own scenario
    if ('parts' in p) errors.push(`${where}: "parts" is not allowed; one entry plays one screen. Split each part into its own scenario with the generate-use-case skill`);
    if (p.skip) return;
    // ui is played by hand in the frame; mcp, api and job have no screen, so the AI plays them from a prompt
    if (sc.surface === 'ui' && p.prompt) errors.push(`${where}: surface ui is played by hand in the frame; drop the prompt`);
    if (SURFACES.includes(sc.surface) && sc.surface !== 'ui' && !p.prompt) errors.push(`${where}: surface ${sc.surface} has no screen; give it a prompt for the AI agent (or skip with a reason)`);
    if (p.prompt !== undefined && (typeof p.prompt !== 'string' || !p.prompt.trim())) errors.push(`${where}: prompt must be the text your AI agent gets`);
    if (!p.prompt && !p.seed && !String(p.url || '').startsWith('/')) errors.push(`${where}: needs a seed that prints {"url"}, a url path starting with /, or a prompt for the AI`);
    if (p.url && !String(p.url).startsWith('/')) errors.push(`${where}: url must start with / (got "${p.url}")`);
    if (p.seed && !/^node seeds\/[\w.-]+\.mjs\b/.test(p.seed)) out(`note: ${where}: seed is not a seeds/*.mjs script; fine if it calls the API and prints {"url"}`);
    if (!Array.isArray(p.steps) || !p.steps.length) errors.push(`${where}: steps missing`);
    if (p.role && !['link', 'post'].includes(LOGIN.type)) errors.push(`${where}: role needs login type link or post`);
    const steps = (p.steps || []).join(' ');
    const hover = steps.match(/\b(tooltip|hover|point at)\b/i);
    if (hover) warnings.push(`${where}: a step says "${hover[1]}"; confirm in the component that the control still has one (not inline text)`);
    const seedFile = (String(p.seed || '').match(/\bseeds\/[\w.-]+\.mjs\b/) || [])[0];
    const returned = seedFile ? valueKeys(seedFile) : null;
    for (const [what, text] of [['a step', steps], ['the prompt', p.prompt || '']]) {
        const keys = [...new Set([...text.matchAll(/\{(\w+)\}/g)].map(m => m[1]))];
        if (p.seed && returned) keys.filter(k => !returned.has(k)).forEach(k => warnings.push(`${where}: ${what} uses {${k}} but ${seedFile} returns no "${k}" in done({ values })`));
        if (!p.seed && what === 'a step') keys.forEach(k => warnings.push(`${where}: a step uses {${k}} but the scenario has no seed to return it`));
        const vague = text.match(VAGUE);
        if (vague) warnings.push(`${where}: ${what} says "${vague[0]}"; name the value: a fixed one, or a {key} the seed returns`);
    }
    if (p.role && !/\b[a-z][\w-]*(?:[.:][a-z][\w-]*)+\b/.test(steps)) warnings.push(`${where}: signs in as ${p.role} but no step names its permissions (e.g. "You are signed in as ${p.role}: has things.read, not things.create")`);
});

// ---------------------------------------------------------------- results.js: what the AI recorded for the prompt scenarios
let AI = {};
const resultsFile = path.join(dir, 'results.js');
if (fs.existsSync(resultsFile)) {
    const src = fs.readFileSync(resultsFile, 'utf8');
    try { AI = parseVar(src, 'PLAYED_RESULTS'); } catch (e) { errors.push(`results.js is not strict JSON: ${e.message}`); }
    if (/thanos_pat_\w|"(?:eyJ[\w-]+\.[\w-]+)"|Bearer [\w.-]{20,}/.test(src)) errors.push('results.js seems to hold a token: mask it in the recorded calls');
    for (const [id, r] of Object.entries(AI)) {
        if (!CORE.some(s => s.id === id)) errors.push(`results.js ${id}: no scenario with this id in use-cases.js`);
        if (!['pass', 'fail', ''].includes(r.status)) errors.push(`results.js ${id}: status must be pass, fail or "" (got "${r.status}")`);
        (r.calls || []).forEach((c, i) => {
            if (!c.lookup && !c.command && !(c.tool && (c.arguments || c.operation))) errors.push(`results.js ${id} call ${i + 1}: needs tool + arguments, command, or lookup`);
        });
    }
} else if (PLAY.some(p => p.prompt)) errors.push('results.js is missing: start it as `var PLAYED_RESULTS = {};`');
PLAY.filter(p => p.prompt && !p.skip && !AI[p.id]?.calls?.length).forEach(p => out(`note: ${p.id}: no recorded AI run in results.js yet`));

// ---------------------------------------------------------------- picks, twice each, through server.mjs (same auth and .env as playing)
const seeded = PLAY.filter(p => p.seed && !p.skip);
const seeds = [...new Set(seeded.map(p => p.seed))];
async function runSeeds() {
    const i = process.argv.indexOf('--server');
    const server = (i > 0 ? process.argv[i + 1] : 'http://localhost:4000').replace(/\/$/, '');
    for (const p of seeded) {
        const urls = [];
        for (const run of [1, 2]) {
            let r;
            try { r = await (await fetch(`${server}/__play/${p.id}`, { method: 'POST', headers: { 'X-Play': '1' } })).json(); }
            catch (e) { errors.push(`server.mjs not reachable at ${server} (start it, or pass --server): ${e.message}`); return; }
            if (!r.ok) { errors.push(`${p.id} pick ${run} failed${r.code != null ? ` (exit ${r.code})` : ''}:\n${String(r.output).trim().split('\n').slice(-10).join('\n')}`); break; }
            urls.push(r.url);
        }
        if (urls.length === 2) out(`${urls[0] === urls[1] ? 'same URL both picks (shared data: fine only for read-only scenarios)' : 'new URL each pick'}: ${p.id}  →  ${urls.join(' , ')}`);
    }
}

(async () => {
    if (process.argv.includes('--run-seeds')) await runSeeds();
    const playable = PLAY.filter(p => !p.skip).length;
    const prompts = PLAY.filter(p => p.prompt && !p.skip), aiSt = st => prompts.filter(p => AI[p.id]?.calls?.length && AI[p.id].status === st).length;
    const bySurface = SURFACES.map(k => [k, CORE.filter(s => s.surface === k).length]).filter(([, n]) => n).map(([k, n]) => `${n} ${k}`).join(', ');
    out(`scenarios: ${CORE.length} (${bySurface}) · playable live: ${playable} (by the AI: ${prompts.length}; recorded ${aiSt('pass')} pass, ${aiSt('fail')} fail, ${aiSt('')} unmarked) · skipped: ${PLAY.length - playable} · seed commands: ${seeds.length} · secret keys: ${exampleKeys.length}${process.argv.includes('--run-seeds') ? ' (each seeded scenario picked twice)' : ''}`);
    warnings.forEach(w => out('WARN ' + w));
    if (errors.length) { errors.forEach(e => out('ERROR ' + e)); process.exit(1); }
    out('OK');
})();
