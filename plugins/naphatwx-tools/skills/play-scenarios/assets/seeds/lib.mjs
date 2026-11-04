// Helpers for seeds: each seed calls the app's API, creates what its scenario needs, and ends with done({ url }).
// server.mjs passes the env below, credentials included (PLAY_API_AUTH), so seed code never handles auth.
// Seeds never write to the database directly, and never print a credential.
import { randomBytes } from 'node:crypto';

const API_BASE = process.env.PLAY_API || '';
/** Headers from LIVE_CONFIG.apiAuth (header, command or login), resolved by server.mjs for this run only. */
const AUTH_HEADERS = JSON.parse(process.env.PLAY_API_AUTH || '{}');

/** Short id for this run: new entities get `<name>-<RUN>`, so every pick starts clean. */
export const RUN = Date.now().toString(36).slice(-4) + randomBytes(1).toString('hex');
export const unique = (name) => `${name}-${RUN}`;

/** One JSON call to the app's API. Throws with the status and body on any non-2xx. */
export async function api(method, path, body) {
    if (API_BASE === 'preview') return (await import('../preview/fake-api.mjs')).handle(method, path, body); // template preview only
    const response = await fetch(API_BASE + path, {
        method,
        headers: { 'content-type': 'application/json', ...AUTH_HEADERS },
        body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await response.text();
    if (!response.ok) throw new Error(`${method} ${path} → ${response.status}: ${text.slice(0, 500)}`);
    return text ? JSON.parse(text) : null;
}

/** Shared data: find by natural key, create only when missing. Returns the found or created record. */
export async function ensure(find, create) {
    return (await find()) ?? (await create());
}

/** Wait for an async state (a job, a build): call `check` until it returns a truthy value. */
export async function poll(check, { timeoutSec = 120, everyMs = 2000, what = 'condition' } = {}) {
    const deadline = Date.now() + timeoutSec * 1000;
    for (;;) {
        const value = await check();
        if (value) return value;
        if (Date.now() > deadline) fail(`timed out after ${timeoutSec}s waiting for ${what}`);
        await new Promise((resolveWait) => setTimeout(resolveWait, everyMs));
    }
}

/** Last line of output, read by server.mjs: `url`, the path the frame opens relative to LIVE_CONFIG.base, and `values`:
 *  every value made at run time that a step or prompt names as {key} ({ ownerId: 1204, ownerName: 'pluto-k3x9' }). */
export function done(result) {
    process.stdout.write(JSON.stringify(result) + '\n');
}

export function fail(message) {
    process.stderr.write(message + '\n');
    process.exit(1);
}

/** Run a seed's main and turn any thrown error into a non-zero exit with the message. */
export function run(main) {
    main().catch((error) => fail(error.stack || String(error)));
}
