#!/usr/bin/env node
// Checks a use-cases.js file (USE_CASES + SCENARIOS) and prints the scenario count per use case.
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

let UCS = [], SCS = [];
try {
    const src = fs.readFileSync(file, 'utf8');
    if (/\bUSE_CASE_FLOWS\s*=/.test(src)) errors.push(`${file} is in the old format (USE_CASE_FLOWS); rewrite it as USE_CASES + SCENARIOS (SKILL.md, User Input)`);
    else { UCS = parseVar(src, 'USE_CASES'); SCS = parseVar(src, 'SCENARIOS'); }
} catch (e) { errors.push(`${file} is missing or not strict JSON: ${e.message}`); }

const SURFACES = ['ui', 'api', 'job'];
const count = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
const ucIds = new Set();
for (const c of UCS) {
    if (!/^UC\d+$/.test(c.id || '')) errors.push(`use case "${c.id}": id must look like UC1`);
    if (ucIds.has(c.id)) errors.push(`duplicate use case: ${c.id}`);
    ucIds.add(c.id);
    if (!c.title) errors.push(`use case ${c.id}: missing title`);
    if (!c.refs) errors.push(`use case ${c.id}: missing refs`);
}
const ids = new Set();
for (const s of SCS) {
    const name = s.id || '(no id)';
    if (ids.has(s.id)) errors.push(`duplicate scenario id: ${s.id}`);
    ids.add(s.id);
    if (s.id && !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(s.id)) errors.push(`${name}: id must be kebab-case`);
    for (const k of ['id', 'useCase', 'title', 'story', 'surface', 'when']) if (s[k] == null || s[k] === '') errors.push(`${name}: missing ${k}`);
    if (!Array.isArray(s.expect) || !s.expect.length) errors.push(`${name}: expect must be a non-empty array`);
    if (s.surface && !SURFACES.includes(s.surface)) errors.push(`${name}: surface must be one of ${SURFACES.join(', ')}`);
    if (s.useCase && !ucIds.has(s.useCase)) errors.push(`${name}: use case ${s.useCase} is not in USE_CASES`);
    const uc = UCS.find(c => c.id === s.useCase);
    if (uc && s.title && s.title.toLowerCase() === uc.title.toLowerCase()) errors.push(`${name}: title repeats its use case "${uc.title}"; name the path instead`);
    for (const k of ['state', 'scenario', 'page', 'params', 'steps', 'op', 'req']) if (k in s) errors.push(`${name}: "${k}" is mock data; it goes in mock/shared/scenario-play.js`);
}
UCS.forEach(c => { if (!SCS.some(s => s.useCase === c.id) && !c.none) errors.push(`use case ${c.id} has no scenario and no "none" sentence`); });

const perUseCase = UCS.map(c => ({ useCase: c.id, title: c.title, count: SCS.filter(s => s.useCase === c.id).length }));
const perSurface = Object.fromEntries(SURFACES.map(k => [k, SCS.filter(s => s.surface === k).length]));
if (asJson) out(JSON.stringify({ useCases: UCS.length, scenarios: SCS.length, perUseCase, perSurface, errors }, null, 2));
else {
    out(`${count(UCS.length, 'use case')}, ${count(SCS.length, 'scenario')} (${SURFACES.map(k => `${perSurface[k]} ${k}`).join(', ')})`);
    perUseCase.forEach(c => out(`  ${c.useCase} ${c.title}: ${c.count}`));
    out(errors.length ? `\n${errors.length} error(s):\n- ${errors.join('\n- ')}` : '\nNo errors.');
}
process.exit(errors.length ? 1 : 0);
