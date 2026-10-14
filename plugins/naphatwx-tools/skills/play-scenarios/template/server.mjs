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
const log = (text) => process.stdout.write(text + '\n');
const logError = (text) => process.stderr.write(text + '\n');
const argument = (name, fallback) => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : fallback; };
const PORT = Number(argument('--port', 4000));

// ---------------------------------------------------------------- .env: secrets you paste in; a value set in the shell wins
const SHELL_KEYS = new Set(Object.keys(process.env));
const readEnv = (file) => { try { return parseEnv(readFileSync(join(HERE, file), 'utf8')); } catch { return {}; } };
let secrets = []; // every value from .env and every credential, hidden from anything shown on the page
function loadEnv() {
    const values = readEnv('.env');
    for (const [key, value] of Object.entries(values)) if (!SHELL_KEYS.has(key)) process.env[key] = value;
    secrets = Object.values(values).filter((value) => value && value.length >= 4);
}
/** Keys in .env.example with the comment above each; "Optional" in the comment makes a key optional. */
function envKeys() {
    if (!existsSync(join(HERE, '.env.example'))) return [];
    const keys = [];
    let note = '';
    for (const line of readFileSync(join(HERE, '.env.example'), 'utf8').split('\n')) {
        const match = line.match(/^\s*([A-Za-z_][\w]*)\s*=/);
        if (match) { keys.push({ key: match[1], note, optional: /\boptional\b/i.test(note) }); note = ''; }
        else if (line.trim().startsWith('#')) note = line.replace(/^\s*#\s?/, '');
        else note = '';
    }
    return keys;
}
const missingKeys = () => envKeys().filter((entry) => !entry.optional && !process.env[entry.key]);
const missingText = (list) => list.map((entry) => `  ${entry.key}${entry.note ? ` — ${entry.note}` : ''}`).join('\n');
const mask = (text) => secrets.reduce((masked, secret) => masked.split(secret).join('***'), String(text));

/** live.js and use-cases.js, re-read on every pick so edits apply without a restart. */
function readLive() {
    loadEnv();
    const context = vm.createContext({});
    for (const file of [join(ROOT, 'use-cases.js'), join(HERE, 'live.js')]) vm.runInContext(readFileSync(file, 'utf8'), context, { filename: file });
    return { liveConfig: vm.runInContext('LIVE_CONFIG', context), livePlay: vm.runInContext('LIVE_PLAY', context) };
}

const { liveConfig: config } = readLive();
const remote = /^https?:/.test(config.base) ? new URL(config.base) : null; // null: the template's preview app
if (remote && !['localhost', '127.0.0.1', '[::1]'].includes(remote.hostname) && !process.argv.includes('--allow-remote')) {
    logError(`Refusing to run seeds against ${remote.origin}: base is not local. Pass --allow-remote if this is a dev environment you own.`);
    process.exit(1);
}
// same host name as the app: cookies ignore the port, so a login cookie set here reaches the app's frame
const HOST = remote && remote.hostname === '127.0.0.1' ? '127.0.0.1' : 'localhost';
const SELF = `http://${HOST}:${PORT}`;
/** An app path as an absolute URL; the preview app's base is relative to this page. */
const appUrl = (path) => new URL(config.base + path, SELF + PAGE).href;

// ---------------------------------------------------------------- commands
/** Runs a shell command; resolves with exit code, stdout and combined output (last 4000 chars). */
function runShell(command, { cwd, env: extraEnvironment = {}, timeoutSec = 120, echo = false }) {
    return new Promise((done) => {
        let output = '', stdout = '';
        const child = spawn(command, { cwd, shell: true, env: { ...process.env, ...extraEnvironment } });
        const timer = setTimeout(() => { output += `\nTimed out after ${timeoutSec}s.`; child.kill('SIGTERM'); }, timeoutSec * 1000);
        child.stdout.on('data', (chunk) => { stdout += chunk; output += chunk; if (echo) process.stdout.write(chunk); });
        child.stderr.on('data', (chunk) => { output += chunk; if (echo) process.stderr.write(chunk); });
        child.on('error', (error) => { output += error.message; });
        child.on('close', (code) => { clearTimeout(timer); done({ code, stdout, output: output.slice(-4000) }); });
    });
}

async function healthy(liveConfig) {
    try { return (await fetch(appUrl(liveConfig.pretest?.health || '/'), { signal: AbortSignal.timeout(3000) })).status < 500; }
    catch { return false; }
}

/** Pre-test: start the app the repo's own way, then wait until it answers. */
async function pretest() {
    const pretestConfig = config.pretest || {};
    if (pretestConfig.up) {
        log(`pre-test: ${pretestConfig.up}`);
        const result = await runShell(pretestConfig.up, { cwd: resolve(HERE, config.appDir || '.'), timeoutSec: pretestConfig.timeoutSec || 300, echo: true });
        if (result.code !== 0) { logError(`pre-test failed (exit ${result.code}): ${pretestConfig.up}`); process.exit(1); }
    }
    if (!remote) return; // the preview app is served by this server, which is not listening yet
    const deadline = Date.now() + (pretestConfig.timeoutSec || 300) * 1000;
    while (!(await healthy(config))) {
        if (Date.now() > deadline) { logError(`pre-test: ${appUrl(pretestConfig.health || '/')} did not answer in ${pretestConfig.timeoutSec || 300}s`); process.exit(1); }
        await new Promise((resolveWait) => setTimeout(resolveWait, 2000));
    }
    log(`pre-test: app is up at ${appUrl(pretestConfig.health || '/')}`);
}

// ---------------------------------------------------------------- sign-in and API credentials
/** Signs in through the app's dev login route as `role`; returns its Set-Cookie headers. */
async function signIn(liveConfig, role) {
    const login = liveConfig.login || {};
    let response;
    if (login.type === 'post') {
        const body = JSON.parse(JSON.stringify(login.body || {}).replaceAll('{role}', role));
        response = await fetch(appUrl(login.path), { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body), redirect: 'manual' });
    } else if (login.type === 'link') {
        response = await fetch(appUrl(login.path.replace('{role}', encodeURIComponent(role)).replace('{next}', encodeURIComponent('/'))), { redirect: 'manual' });
    } else {
        throw new Error(`login type "${login.type}" cannot sign in from a script`);
    }
    if (response.status >= 400) throw new Error(`${response.status} ${(await response.text()).slice(0, 300)}`);
    return response.headers.getSetCookie();
}
const cookiePairs = (setCookies) => setCookies.map((cookie) => cookie.split(';')[0]);

/** The headers every seed API call sends, per apiAuth.type. Values never reach a file or the page. */
async function apiHeaders(liveConfig, role) {
    const auth = liveConfig.apiAuth;
    if (!auth) return {};
    const header = auth.header || 'Authorization';
    const prefix = auth.prefix ?? (header.toLowerCase() === 'authorization' ? 'Bearer ' : '');
    if (auth.type === 'header') {
        if (!process.env[auth.env]) throw new Error(`${auth.env} is empty: set it in live/.env`);
        return { [header]: prefix + process.env[auth.env] };
    }
    if (auth.type === 'command') {
        const result = await runShell(auth.run, { cwd: resolve(HERE, liveConfig.appDir || '.'), timeoutSec: 30 });
        const token = result.stdout.trim().split('\n').pop();
        if (result.code !== 0 || !token) throw new Error(`"${auth.run}" gave no token (exit ${result.code})`);
        secrets.push(token);
        return { [header]: prefix + token };
    }
    if (auth.type === 'login') {
        const pairs = cookiePairs(await signIn(liveConfig, role));
        pairs.forEach((pair) => secrets.push(pair.slice(pair.indexOf('=') + 1)));
        if (auth.send === 'cookie') return { Cookie: pairs.join('; ') };
        const hit = pairs.find((pair) => pair.startsWith((auth.cookie || '') + '='));
        if (!hit) throw new Error(`sign-in as ${role} set no cookie "${auth.cookie}"`);
        return { [header]: prefix + decodeURIComponent(hit.slice(hit.indexOf('=') + 1)) };
    }
    throw new Error(`apiAuth.type "${auth.type}" is not header, command or login`);
}

// ---------------------------------------------------------------- one pick: seed, then sign in
let queue = Promise.resolve(); // one pick at a time: seeds and logins share the app's state
async function play(id) {
    const { liveConfig, livePlay } = readLive();
    const scenario = livePlay.find((entry) => entry.id === id && !entry.skip);
    if (!scenario) return { ok: false, output: `No playable scenario "${id}" in live.js.` };
    const missing = missingKeys();
    if (missing.length) return { ok: false, output: `Missing in live/.env (copy .env.example, then fill in):\n${missingText(missing)}` };
    const started = Date.now();
    const role = scenario.role || liveConfig.role;
    let url = scenario.url, values = {}, output = '', code = 0;
    if (scenario.seed) {
        let auth;
        try { auth = await apiHeaders(liveConfig, role); }
        catch (error) { return { ok: false, output: `API credentials (${liveConfig.apiAuth.type}) failed: ${error.message}` }; }
        const environment = { PLAY_BASE: appUrl(''), PLAY_API: liveConfig.api || '', PLAY_SCENARIO: id, PLAY_ROLE: role || '', PLAY_API_AUTH: JSON.stringify(auth) };
        ({ code, output } = await runShell(scenario.seed, { cwd: HERE, env: environment, timeoutSec: liveConfig.seedTimeoutSec || 180 }));
        log(`${code === 0 ? 'seeded' : 'SEED FAILED'} ${id} (${Date.now() - started} ms, exit ${code}): ${scenario.seed}`);
        if (code !== 0) return { ok: false, code, output };
        try { const last = JSON.parse(output.trim().split('\n').pop()); url = last.url || url; values = last.values || {}; }
        catch { return { ok: false, output: output + '\nThe seed did not end with a JSON line like {"url": "/..."}.' }; }
    }
    if (!url) return { ok: false, output: output + '\nNo URL: set "url" in live.js or print it from the seed.' };
    let cookies = [];
    if (liveConfig.login?.type === 'post') {
        try { cookies = await signIn(liveConfig, role); }
        catch (error) { return { ok: false, output: `${output}\nSign-in as ${role} failed: POST ${liveConfig.login.path} → ${error.message}` }; }
    }
    return { ok: true, url, values, ms: Date.now() - started, output, cookies };
}

// ---------------------------------------------------------------- static files under the plan folder
const CONTENT_TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.ts': 'text/plain' };
function serveFile(urlPath, response) {
    const path = decodeURIComponent(urlPath);
    // .env, .git and every other dotfile stay private: this folder holds pasted secrets
    if (path.split('/').some((segment) => segment.startsWith('.'))) { response.writeHead(404).end('Not found'); return; }
    const file = resolve(ROOT, '.' + path);
    if (file !== ROOT && !file.startsWith(ROOT + sep)) { response.writeHead(403).end(); return; }
    let target = file;
    try { if (statSync(target).isDirectory()) target = join(target, 'index.html'); statSync(target); }
    catch { response.writeHead(404).end('Not found'); return; }
    response.writeHead(200, { 'Content-Type': (CONTENT_TYPES[extname(target)] || 'application/octet-stream') + '; charset=utf-8', 'Cache-Control': 'no-store' });
    createReadStream(target).pipe(response);
}

const json = (response, status, body, headers = {}) => response.writeHead(status, { 'Content-Type': 'application/json', ...headers }).end(JSON.stringify(body));

if (process.argv.includes('--up')) await pretest();
createServer(async (request, response) => {
    const url = new URL(request.url, SELF);
    if (url.pathname.startsWith('/__')) {
        // a custom header forces a CORS preflight, which this server never answers: other sites can't trigger a pick
        if (request.headers['x-play'] !== '1') { response.writeHead(403).end(); return; }
        if (url.pathname === '/__status') {
            const { liveConfig } = readLive();
            json(response, 200, { up: await healthy(liveConfig), health: appUrl(liveConfig.pretest?.health || '/'), start: liveConfig.pretest?.up || '', missing: missingKeys().map((entry) => entry.key) });
            return;
        }
        const playMatch = url.pathname.match(/^\/__play\/([\w.-]+)$/);
        if (playMatch && request.method === 'POST') {
            const job = () => play(playMatch[1]).catch((error) => ({ ok: false, output: error.stack || String(error) }));
            const { cookies, ...body } = await (queue = queue.then(job, job));
            if (body.output) body.output = mask(body.output);
            json(response, 200, body, cookies?.length ? { 'Set-Cookie': cookies } : {});
            return;
        }
        response.writeHead(404).end();
        return;
    }
    if (request.method !== 'GET' && request.method !== 'HEAD') { response.writeHead(405).end(); return; }
    if (url.pathname === '/') { response.writeHead(302, { Location: PAGE }).end(); return; }
    serveFile(url.pathname, response);
}).listen(PORT, HOST, async () => {
    log(`Play: ${SELF}${PAGE}`);
    const missing = missingKeys();
    if (missing.length) logError(`Missing in live/.env (copy .env.example to .env, then fill in):\n${missingText(missing)}`);
    if (!remote) return;
    // the app must allow framing, or every frame stays blank
    try {
        const response = await fetch(config.base, { redirect: 'manual' });
        const frameOptions = response.headers.get('x-frame-options');
        const frameAncestors = (response.headers.get('content-security-policy') || '').match(/frame-ancestors[^;]*/);
        if (frameOptions) logError(`Warning: ${config.base} sends X-Frame-Options: ${frameOptions}. Frames stay blank; drop it in dev.`);
        if (frameAncestors) logError(`Warning: ${config.base} sends CSP ${frameAncestors[0]}. Allow ${SELF} in dev.`);
    } catch (error) {
        logError(`Warning: ${config.base} did not answer (${error.cause?.code || error.message}). Start it, or run with --up.`);
    }
});
