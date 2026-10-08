#!/usr/bin/env node
// Checks a use-cases.js file (USE_CASE_FLOWS + USE_CASES) and prints the count per flow.
// Usage: node check.js <use-cases.js> [--json]
// Exit 1 on any error.

const fs = require('fs');

const file = process.argv[2];
if (!file) { process.stderr.write('usage: node check.js <use-cases.js> [--json]\n'); process.exit(2); }
const asJson = process.argv.includes('--json');
const out = s => process.stdout.write(s + '\n');
const errors = [];

/** `<NAME> = [ ... ]` parsed as strict JSON (works for `var X =` and `export const X =`). */
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

let FLOWS = [], UCS = [];
try {
    const src = fs.readFileSync(file, 'utf8');
    FLOWS = parseVar(src, 'USE_CASE_FLOWS');
    UCS = parseVar(src, 'USE_CASES');
} catch (e) { errors.push(`${file} is missing or not strict JSON: ${e.message}`); }

const SURFACES = ['ui', 'api', 'job'];
const flowIds = new Set();
for (const f of FLOWS) {
    if (!/^3\.\d+$/.test(f.flow || '')) errors.push(`flow "${f.flow}": must look like 3.N`);
    if (flowIds.has(f.flow)) errors.push(`duplicate flow: ${f.flow}`);
    flowIds.add(f.flow);
    if (!f.title) errors.push(`flow ${f.flow}: missing title`);
}
const ids = new Set();
for (const u of UCS) {
    const name = u.id || '(no id)';
    if (ids.has(u.id)) errors.push(`duplicate use-case id: ${u.id}`);
    ids.add(u.id);
    if (u.id && !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(u.id)) errors.push(`${name}: id must be kebab-case`);
    for (const k of ['id', 'flow', 'title', 'story', 'surface', 'when']) if (u[k] == null || u[k] === '') errors.push(`${name}: missing ${k}`);
    if (!Array.isArray(u.expect) || !u.expect.length) errors.push(`${name}: expect must be a non-empty array`);
    if (u.surface && !SURFACES.includes(u.surface)) errors.push(`${name}: surface must be one of ${SURFACES.join(', ')}`);
    if (u.flow && !flowIds.has(u.flow)) errors.push(`${name}: flow ${u.flow} is not in USE_CASE_FLOWS`);
    for (const k of ['scenario', 'page', 'params', 'steps', 'op', 'req']) if (k in u) errors.push(`${name}: "${k}" is mock data; it goes in mock/shared/use-case-play.js`);
}
FLOWS.forEach(f => { if (!UCS.some(u => u.flow === f.flow) && !f.none) errors.push(`flow ${f.flow} has no use case and no "none" sentence`); });

const perFlow = FLOWS.map(f => ({ flow: f.flow, title: f.title, count: UCS.filter(u => u.flow === f.flow).length }));
const perSurface = Object.fromEntries(SURFACES.map(s => [s, UCS.filter(u => u.surface === s).length]));
if (asJson) out(JSON.stringify({ total: UCS.length, perFlow, perSurface, errors }, null, 2));
else {
    out(`${UCS.length} use cases (${SURFACES.map(s => `${perSurface[s]} ${s}`).join(', ')})`);
    perFlow.forEach(f => out(`  ${f.flow} ${f.title}: ${f.count}`));
    out(errors.length ? `\n${errors.length} error(s):\n- ${errors.join('\n- ')}` : '\nNo errors.');
}
process.exit(errors.length ? 1 : 0);
