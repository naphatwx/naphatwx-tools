#!/usr/bin/env node
// Serves the plan folder next to the running app. On each pick it runs the scenario's seed (API calls that create
// new data), signs in as the scenario's role, and returns the URL the frame opens. Commands come from live.js only.
// Usage: node live/server.mjs [--up] [--port 4000] [--allow-remote]    --up: run the pre-test (start the app, wait for health) first
import { createServer } from 'node:http';
import { readFileSync, statSync, createReadStream, existsSync } from 'node:fs';
import { join, dirname, resolve, extname, sep, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { parseEnv } from 'node:util';
import vm from 'node:vm';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..'); // the plan folder: live/ reads ../use-cases.js
const PAGE = `/${basename(HERE)}/`;
const out = (s) => process.stdout.write(s + '\n');
const err = (s) => process.stderr.write(s + '\n');
const arg = (name, d) => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : d; };
const PORT = Number(arg('--port', 4000));

// ---------------------------------------------------------------- .env: secrets you paste in; a value set in the shell wins
const SHELL_KEYS = new Set(Object.keys(process.env));
const readEnv = (file) => { try { return parseEnv(readFileSync(join(HERE, file), 'utf8')); } catch { return {}; } };
let secrets = []; // every value from .env and every credential, hidden from anything shown on the page
function loadEnv() {
    const values = readEnv('.env');
    for (const [k, v] of Object.entries(values)) if (!SHELL_KEYS.has(k)) process.env[k] = v;
    secrets = Object.values(values).filter((v) => v && v.length >= 4);
}
/** Keys in .env.example with the comment above each; "Optional" in the comment makes a key optional. */
function envKeys() {
    if (!existsSync(join(HERE, '.env.example'))) return [];
    const keys = [];
    let note = '';
    for (const line of readFileSync(join(HERE, '.env.example'), 'utf8').split('\n')) {
        const m = line.match(/^\s*([A-Za-z_][\w]*)\s*=/);
        if (m) { keys.push({ key: m[1], note, optional: /\boptional\b/i.test(note) }); note = ''; }
        else if (line.trim().startsWith('#')) note = line.replace(/^\s*#\s?/, '');
        else note = '';
    }
    return keys;
}
const missingKeys = () => envKeys().filter((k) => !k.optional && !process.env[k.key]);
const missingText = (list) => list.map((k) => `  ${k.key}${k.note ? ` — ${k.note}` : ''}`).join('\n');
const mask = (text) => secrets.reduce((t, s) => t.split(s).join('***'), String(text));

/** live.js and use-cases.js, re-read on every pick so edits apply without a restart. */
function config() {
    loadEnv();
    const ctx = vm.createContext({});
    for (const f of [join(ROOT, 'use-cases.js'), join(HERE, 'live.js')]) vm.runInContext(readFileSync(f, 'utf8'), ctx, { filename: f });
    return { cfg: vm.runInContext('LIVE_CONFIG', ctx), play: vm.runInContext('LIVE_PLAY', ctx) };
}

const { cfg } = config();
const remote = /^https?:/.test(cfg.base) ? new URL(cfg.base) : null; // null: the template's preview app
if (remote && !['localhost', '127.0.0.1', '[::1]'].includes(remote.hostname) && !process.argv.includes('--allow-remote')) {
    err(`Refusing to run seeds against ${remote.origin}: base is not local. Pass --allow-remote if this is a dev environment you own.`);
    process.exit(1);
}
// same host name as the app: cookies ignore the port, so a login cookie set here reaches the app's frame
const HOST = remote && remote.hostname === '127.0.0.1' ? '127.0.0.1' : 'localhost';
const SELF = `http://${HOST}:${PORT}`;
/** An app path as an absolute URL; the preview app's base is relative to this page. */
const appUrl = (path) => new URL(cfg.base + path, SELF + PAGE).href;

// ---------------------------------------------------------------- commands
/** Runs a shell command; resolves with exit code, stdout and combined output (last 4000 chars). */
function sh(cmd, { cwd, env = {}, timeoutSec = 120, echo = false }) {
    return new Promise((done) => {
        let output = '', stdout = '';
        const child = spawn(cmd, { cwd, shell: true, env: { ...process.env, ...env } });
        const timer = setTimeout(() => { output += `\nTimed out after ${timeoutSec}s.`; child.kill('SIGTERM'); }, timeoutSec * 1000);
        child.stdout.on('data', (d) => { stdout += d; output += d; if (echo) process.stdout.write(d); });
        child.stderr.on('data', (d) => { output += d; if (echo) process.stderr.write(d); });
        child.on('error', (e) => { output += e.message; });
        child.on('close', (code) => { clearTimeout(timer); done({ code, stdout, output: output.slice(-4000) }); });
    });
}

async function healthy(c) {
    try { return (await fetch(appUrl(c.pretest?.health || '/'), { signal: AbortSignal.timeout(3000) })).status < 500; }
    catch { return false; }
}

/** Pre-test: start the app the repo's own way, then wait until it answers. */
async function pretest() {
    const p = cfg.pretest || {};
    if (p.up) {
        out(`pre-test: ${p.up}`);
        const r = await sh(p.up, { cwd: resolve(HERE, cfg.appDir || '.'), timeoutSec: p.timeoutSec || 300, echo: true });
        if (r.code !== 0) { err(`pre-test failed (exit ${r.code}): ${p.up}`); process.exit(1); }
    }
    if (!remote) return; // the preview app is served by this server, which is not listening yet
    const end = Date.now() + (p.timeoutSec || 300) * 1000;
    while (!(await healthy(cfg))) {
        if (Date.now() > end) { err(`pre-test: ${appUrl(p.health || '/')} did not answer in ${p.timeoutSec || 300}s`); process.exit(1); }
        await new Promise((r) => setTimeout(r, 2000));
    }
    out(`pre-test: app is up at ${appUrl(p.health || '/')}`);
}

// ---------------------------------------------------------------- sign-in and API credentials
/** Signs in through the app's dev login route as `role`; returns its Set-Cookie headers. */
async function signIn(c, role) {
    const login = c.login || {};
    let r;
    if (login.type === 'post') {
        const body = JSON.parse(JSON.stringify(login.body || {}).replaceAll('{role}', role));
        r = await fetch(appUrl(login.path), { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body), redirect: 'manual' });
    } else if (login.type === 'link') {
        r = await fetch(appUrl(login.path.replace('{role}', encodeURIComponent(role)).replace('{next}', encodeURIComponent('/'))), { redirect: 'manual' });
    } else {
        throw new Error(`login type "${login.type}" cannot sign in from a script`);
    }
    if (r.status >= 400) throw new Error(`${r.status} ${(await r.text()).slice(0, 300)}`);
    return r.headers.getSetCookie();
}
const cookiePairs = (setCookies) => setCookies.map((c) => c.split(';')[0]);

/** The headers every seed API call sends, per apiAuth.type. Values never reach a file or the page. */
async function apiHeaders(c, role) {
    const a = c.apiAuth;
    if (!a) return {};
    const header = a.header || 'Authorization';
    const prefix = a.prefix ?? (header.toLowerCase() === 'authorization' ? 'Bearer ' : '');
    if (a.type === 'header') {
        if (!process.env[a.env]) throw new Error(`${a.env} is empty: set it in live/.env`);
        return { [header]: prefix + process.env[a.env] };
    }
    if (a.type === 'command') {
        const r = await sh(a.run, { cwd: resolve(HERE, c.appDir || '.'), timeoutSec: 30 });
        const token = r.stdout.trim().split('\n').pop();
        if (r.code !== 0 || !token) throw new Error(`"${a.run}" gave no token (exit ${r.code})`);
        secrets.push(token);
        return { [header]: prefix + token };
    }
    if (a.type === 'login') {
        const pairs = cookiePairs(await signIn(c, role));
        pairs.forEach((p) => secrets.push(p.slice(p.indexOf('=') + 1)));
        if (a.send === 'cookie') return { Cookie: pairs.join('; ') };
        const hit = pairs.find((p) => p.startsWith((a.cookie || '') + '='));
        if (!hit) throw new Error(`sign-in as ${role} set no cookie "${a.cookie}"`);
        return { [header]: prefix + decodeURIComponent(hit.slice(hit.indexOf('=') + 1)) };
    }
    throw new Error(`apiAuth.type "${a.type}" is not header, command or login`);
}

// ---------------------------------------------------------------- one pick: seed, then sign in
let queue = Promise.resolve(); // one pick at a time: seeds and logins share the app's state
async function play(id) {
    const { cfg: c, play: list } = config();
    const sc = list.find((p) => p.id === id && !p.skip);
    if (!sc) return { ok: false, output: `No playable scenario "${id}" in live.js.` };
    const missing = missingKeys();
    if (missing.length) return { ok: false, output: `Missing in live/.env (copy .env.example, then fill in):\n${missingText(missing)}` };
    const started = Date.now();
    const role = sc.role || c.role;
    let url = sc.url, output = '', code = 0;
    if (sc.seed) {
        let auth;
        try { auth = await apiHeaders(c, role); }
        catch (e) { return { ok: false, output: `API credentials (${c.apiAuth.type}) failed: ${e.message}` }; }
        const env = { PLAY_BASE: appUrl(''), PLAY_API: c.api || '', PLAY_SCENARIO: id, PLAY_ROLE: role || '', PLAY_API_AUTH: JSON.stringify(auth) };
        ({ code, output } = await sh(sc.seed, { cwd: HERE, env, timeoutSec: c.seedTimeoutSec || 180 }));
        out(`${code === 0 ? 'seeded' : 'SEED FAILED'} ${id} (${Date.now() - started} ms, exit ${code}): ${sc.seed}`);
        if (code !== 0) return { ok: false, code, output };
        try { url = JSON.parse(output.trim().split('\n').pop()).url || url; }
        catch { return { ok: false, output: output + '\nThe seed did not end with a JSON line like {"url": "/..."}.' }; }
    }
    if (!url) return { ok: false, output: output + '\nNo URL: set "url" in live.js or print it from the seed.' };
    let cookies = [];
    if (c.login?.type === 'post') {
        try { cookies = await signIn(c, role); }
        catch (e) { return { ok: false, output: `${output}\nSign-in as ${role} failed: POST ${c.login.path} → ${e.message}` }; }
    }
    return { ok: true, url, ms: Date.now() - started, output, cookies };
}

// ---------------------------------------------------------------- static files under the plan folder
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.ts': 'text/plain' };
function serveFile(urlPath, res) {
    const path = decodeURIComponent(urlPath);
    // .env, .git and every other dotfile stay private: this folder holds pasted secrets
    if (path.split('/').some((seg) => seg.startsWith('.'))) { res.writeHead(404).end('Not found'); return; }
    const file = resolve(ROOT, '.' + path);
    if (file !== ROOT && !file.startsWith(ROOT + sep)) { res.writeHead(403).end(); return; }
    let target = file;
    try { if (statSync(target).isDirectory()) target = join(target, 'index.html'); statSync(target); }
    catch { res.writeHead(404).end('Not found'); return; }
    res.writeHead(200, { 'Content-Type': (TYPES[extname(target)] || 'application/octet-stream') + '; charset=utf-8', 'Cache-Control': 'no-store' });
    createReadStream(target).pipe(res);
}

const json = (res, status, body, headers = {}) => res.writeHead(status, { 'Content-Type': 'application/json', ...headers }).end(JSON.stringify(body));

if (process.argv.includes('--up')) await pretest();
createServer(async (req, res) => {
    const url = new URL(req.url, SELF);
    if (url.pathname.startsWith('/__')) {
        // a custom header forces a CORS preflight, which this server never answers: other sites can't trigger a pick
        if (req.headers['x-play'] !== '1') { res.writeHead(403).end(); return; }
        if (url.pathname === '/__status') {
            const c = config().cfg;
            json(res, 200, { up: await healthy(c), health: appUrl(c.pretest?.health || '/'), start: c.pretest?.up || '', missing: missingKeys().map((k) => k.key) });
            return;
        }
        const pick = url.pathname.match(/^\/__play\/([\w.-]+)$/);
        if (pick && req.method === 'POST') {
            const job = () => play(pick[1]).catch((e) => ({ ok: false, output: e.stack || String(e) }));
            const { cookies, ...body } = await (queue = queue.then(job, job));
            if (body.output) body.output = mask(body.output);
            json(res, 200, body, cookies?.length ? { 'Set-Cookie': cookies } : {});
            return;
        }
        res.writeHead(404).end();
        return;
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405).end(); return; }
    if (url.pathname === '/') { res.writeHead(302, { Location: PAGE }).end(); return; }
    serveFile(url.pathname, res);
}).listen(PORT, HOST, async () => {
    out(`Play: ${SELF}${PAGE}`);
    const missing = missingKeys();
    if (missing.length) err(`Missing in live/.env (copy .env.example to .env, then fill in):\n${missingText(missing)}`);
    if (!remote) return;
    // the app must allow framing, or every frame stays blank
    try {
        const r = await fetch(cfg.base, { redirect: 'manual' });
        const xfo = r.headers.get('x-frame-options');
        const fa = (r.headers.get('content-security-policy') || '').match(/frame-ancestors[^;]*/);
        if (xfo) err(`Warning: ${cfg.base} sends X-Frame-Options: ${xfo}. Frames stay blank; drop it in dev.`);
        if (fa) err(`Warning: ${cfg.base} sends CSP ${fa[0]}. Allow ${SELF} in dev.`);
    } catch (e) {
        err(`Warning: ${cfg.base} did not answer (${e.cause?.code || e.message}). Start it, or run with --up.`);
    }
});
