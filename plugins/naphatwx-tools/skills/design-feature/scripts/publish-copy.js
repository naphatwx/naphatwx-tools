#!/usr/bin/env node
// Makes a copy of a plan folder that works as a claude.ai Artifact, and prints the publish arguments.
// Inside claude.ai a target="_blank" link opens the artifact's frame URL, which is refused, and the entry page is
// served as index.html — so the copy drops target/rel and points every link to overview.html at index.html.
// Usage: node publish-copy.js <plan-dir> <copy-dir>   (prints file_path, root and files for the Artifact publish)

const fs = require('fs');
const path = require('path');

const [plan, copy] = process.argv.slice(2);
if (!plan || !copy) { process.stderr.write('usage: node publish-copy.js <plan-dir> <copy-dir>\n'); process.exit(2); }
if (path.resolve(copy).startsWith(path.resolve(plan) + path.sep) || path.resolve(copy) === path.resolve(plan)) {
    process.stderr.write('copy-dir must be outside the plan folder\n'); process.exit(2);
}

const SKIP = new Set(['.parts', '.DS_Store', 'node_modules']);
const walk = d => fs.readdirSync(d, { withFileTypes: true }).filter(e => !SKIP.has(e.name))
    .flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);

fs.rmSync(copy, { recursive: true, force: true });
const files = {};
let stripped = 0, relinked = 0;
for (const f of walk(plan)) {
    const rel = path.relative(plan, f).split(path.sep).join('/');
    const dest = rel === 'overview.html' ? 'index.html' : rel;
    const target = path.join(copy, dest);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    if (/\.(html|js)$/.test(f)) {
        let s = fs.readFileSync(f, 'utf8');
        s = s.replace(/\s+target="_blank"/g, () => (stripped++, '')).replace(/\s+rel="noopener(?: noreferrer)?"/g, '');
        // links back to the entry page: ../overview.html, ../../overview.html, overview.html#x
        s = s.replace(/((?:\.\.\/)*)overview\.html/g, (_, up) => (relinked++, `${up}index.html`));
        fs.writeFileSync(target, s);
    } else fs.copyFileSync(f, target);
    if (dest !== 'index.html') files[dest] = dest.endsWith('.ts') ? { from: dest, contentType: 'text/plain' } : dest;
}

process.stdout.write(JSON.stringify({ file_path: path.join(copy, 'index.html'), root: copy, files, stripped, relinked, count: Object.keys(files).length + 1 }, null, 2) + '\n');
