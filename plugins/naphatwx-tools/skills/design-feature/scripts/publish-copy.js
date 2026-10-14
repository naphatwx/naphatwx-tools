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
const walk = directory => fs.readdirSync(directory, { withFileTypes: true }).filter(entry => !SKIP.has(entry.name))
    .flatMap(entry => entry.isDirectory() ? walk(path.join(directory, entry.name)) : [path.join(directory, entry.name)]);

fs.rmSync(copy, { recursive: true, force: true });
const files = {};
let stripped = 0, relinked = 0;
for (const file of walk(plan)) {
    const relativePath = path.relative(plan, file).split(path.sep).join('/');
    const destination = relativePath === 'overview.html' ? 'index.html' : relativePath;
    const target = path.join(copy, destination);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    if (/\.(html|js)$/.test(file)) {
        let content = fs.readFileSync(file, 'utf8');
        content = content.replace(/\s+target="_blank"/g, () => (stripped++, '')).replace(/\s+rel="noopener(?: noreferrer)?"/g, '');
        // links back to the entry page: ../overview.html, ../../overview.html, overview.html#x
        content = content.replace(/((?:\.\.\/)*)overview\.html/g, (_, parentSteps) => (relinked++, `${parentSteps}index.html`));
        fs.writeFileSync(target, content);
    } else fs.copyFileSync(file, target);
    if (destination !== 'index.html') files[destination] = destination.endsWith('.ts') ? { from: destination, contentType: 'text/plain' } : destination;
}

process.stdout.write(JSON.stringify({ file_path: path.join(copy, 'index.html'), root: copy, files, stripped, relinked, count: Object.keys(files).length + 1 }, null, 2) + '\n');
