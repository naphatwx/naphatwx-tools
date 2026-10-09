// Preview only: an in-memory stand-in for the app's API, so the template's seeds run without an app.
// Delete preview/ in a real run. State lives in a temp file, so ids keep growing across seed runs.
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const FILE = join(tmpdir(), 'play-scenarios-preview-api.json');
const load = () => { try { return JSON.parse(readFileSync(FILE, 'utf8')); } catch { return { next: 1200, orgs: [], owners: [] }; } };

export async function handle(method, path, body) {
    const db = load();
    const save = (v) => { writeFileSync(FILE, JSON.stringify(db)); return v; };
    const url = new URL(path, 'http://preview');
    if (method === 'GET' && url.pathname === '/orgs') return { items: db.orgs.filter((o) => o.name === url.searchParams.get('name')) };
    if (method === 'POST' && url.pathname === '/orgs') return save(db.orgs[db.orgs.push({ id: ++db.next, ...body }) - 1]);
    if (method === 'POST' && url.pathname === '/owners') return save(db.owners[db.owners.push({ id: ++db.next, things: [], ...body }) - 1]);
    const things = url.pathname.match(/^\/owners\/(\d+)\/things$/);
    if (method === 'POST' && things) {
        const owner = db.owners.find((o) => o.id === Number(things[1]));
        owner.things.push({ id: ++db.next, ...body });
        return save(owner.things.at(-1));
    }
    throw new Error(`${method} ${path} → 404 (preview API)`);
}
