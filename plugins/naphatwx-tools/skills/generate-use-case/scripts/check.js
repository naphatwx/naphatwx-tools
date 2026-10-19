#!/usr/bin/env node
// Checks a use-cases.js file (USE_CASES + SCENARIOS + ACCEPTANCE): fields, channel coverage, acceptance coverage, core share.
// Usage: node check.js <use-cases.js> [--json]
// Exit 1 on any error; warnings (no example, no twin on another channel, likely duplicates, over budget, too many core) keep exit 0.

const fs = require('fs');

const file = process.argv[2];
if (!file) { process.stderr.write('usage: node check.js <use-cases.js> [--json]\n'); process.exit(2); }
const asJson = process.argv.includes('--json');
const out = s => process.stdout.write(s + '\n');
const errors = [];
const warnings = [];

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

let UCS = [], SCS = [], ACS = null;
try {
    const src = fs.readFileSync(file, 'utf8');
    if (/\bUSE_CASE_FLOWS\s*=/.test(src)) errors.push(`${file} is in the old format (USE_CASE_FLOWS); rewrite it as USE_CASES + SCENARIOS (SKILL.md, User Input)`);
    else {
        UCS = parseVar(src, 'USE_CASES'); SCS = parseVar(src, 'SCENARIOS');
        if (/\bACCEPTANCE\s*=/.test(src)) ACS = parseVar(src, 'ACCEPTANCE');
    }
} catch (e) { errors.push(`${file} is missing or not strict JSON: ${e.message}`); }

const SURFACES = ['ui', 'mcp', 'api', 'job'];
// basic: the main path to the goal; alternate: another path that still reaches it; exception: the goal is not reached
const KINDS = ['basic', 'alternate', 'exception'];

/** Story refs as tokens: "US1 · AC2–4 · FR-003" → US1·AC2, US1·AC3, US1·AC4, FR-003. */
function storyTokens(story) {
    const out = new Set();
    let us = '';
    for (const part of String(story || '').split(/\s*[·,]\s*/).filter(Boolean)) {
        const u = part.match(/^US(\d+)$/i);
        if (u) { us = `US${u[1]}`; continue; }
        const ac = part.match(/^AC(\d+)(?:\s*[–-]\s*(?:AC)?(\d+))?$/i);
        if (ac && us) { for (let n = +ac[1]; n <= +(ac[2] || ac[1]); n++) out.add(`${us} · AC${n}`); continue; }
        out.add(part);
    }
    if (!out.size && us) out.add(us);
    return out;
}
const acTokens = (s) => [...storyTokens(s.story)].filter(t => / · AC\d+$/.test(t));
const count = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
const ucIds = new Set();
for (const c of UCS) {
    if (!/^UC\d+$/.test(c.id || '')) errors.push(`use case "${c.id}": id must look like UC1`);
    if (ucIds.has(c.id)) errors.push(`duplicate use case: ${c.id}`);
    ucIds.add(c.id);
    if (!c.title) errors.push(`use case ${c.id}: missing title`);
    if (!c.refs) errors.push(`use case ${c.id}: missing refs`);
    if (!Array.isArray(c.channels) || !c.channels.length) errors.push(`use case ${c.id}: channels must list where users reach it (${SURFACES.join(', ')})`);
    else c.channels.filter(k => !SURFACES.includes(k)).forEach(k => errors.push(`use case ${c.id}: channel "${k}" is not one of ${SURFACES.join(', ')}`));
}
const ids = new Set();
for (const s of SCS) {
    const name = s.id || '(no id)';
    if (ids.has(s.id)) errors.push(`duplicate scenario id: ${s.id}`);
    ids.add(s.id);
    if (s.id && !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(s.id)) errors.push(`${name}: id must be kebab-case`);
    for (const k of ['id', 'useCase', 'title', 'story', 'surface', 'when']) if (s[k] == null || s[k] === '') errors.push(`${name}: missing ${k}`);
    if (!Array.isArray(s.expect) || !s.expect.length) errors.push(`${name}: expect must be a non-empty array`);
    if (s.kind == null) warnings.push(`${name}: no kind; set "kind" to ${KINDS.join(', ')}`);
    else if (!KINDS.includes(s.kind)) errors.push(`${name}: kind must be one of ${KINDS.join(', ')}`);
    if (s.surface && !SURFACES.includes(s.surface)) errors.push(`${name}: surface must be one of ${SURFACES.join(', ')}`);
    if (s.core != null && typeof s.core !== 'boolean') errors.push(`${name}: core must be true, or left out`);
    if (s.kind === 'basic' && s.core !== true) errors.push(`${name}: a basic scenario is always core; set "core": true`);
    // one scenario = one screen = one result: a part with its own screen or data is its own scenario
    (Array.isArray(s.expect) ? s.expect : []).filter(line => /^\s*part\s*\d/i.test(line)).forEach(line => warnings.push(`${name}: expect line "${line.slice(0, 40)}" reads as a part; a path with its own screen or data is its own scenario (SKILL.md step 2, Split and merge)`));
    if (s.useCase && !ucIds.has(s.useCase)) errors.push(`${name}: use case ${s.useCase} is not in USE_CASES`);
    const uc = UCS.find(c => c.id === s.useCase);
    if (uc && Array.isArray(uc.channels) && s.surface && !uc.channels.includes(s.surface)) errors.push(`${name}: surface ${s.surface} is not in ${uc.id} channels; add it there or fix the surface`);
    if (s.surface === 'api' && /\bmcp\b/i.test([s.id, s.title, s.when].join(' '))) warnings.push(`${name}: surface api but it talks about MCP; MCP scenarios use surface "mcp"`);
    if (s.na != null && (typeof s.na !== 'object' || Array.isArray(s.na))) errors.push(`${name}: na must be an object { "<channel>": "why there is no twin" }`);
    if (uc && s.title && s.title.toLowerCase() === uc.title.toLowerCase()) errors.push(`${name}: title repeats its use case "${uc.title}"; name the path instead`);
    if ('parts' in s) errors.push(`${name}: "parts" is not allowed; one scenario plays one screen. Make each part its own scenario`);
    for (const k of ['state', 'scenario', 'page', 'params', 'steps', 'op', 'req']) if (k in s) errors.push(`${name}: "${k}" is mock data; it goes in mock/shared/scenario-play.js`);
}
UCS.forEach(c => { if (!SCS.some(s => s.useCase === c.id) && !c.none) errors.push(`use case ${c.id} has no scenario and no "none" sentence`); });

// Channels: every channel of a use case has a scenario, and each scenario has a twin (same story ref) on its other channels.
for (const c of UCS) {
    if (!Array.isArray(c.channels) || c.none) continue;
    const mine = SCS.filter(s => s.useCase === c.id);
    for (const k of c.channels) if (!mine.some(s => s.surface === k)) errors.push(`use case ${c.id}: channel ${k} has no scenario; add one or drop ${k} from channels`);
    for (const k of c.channels) {
        const basics = mine.filter(s => s.surface === k && s.kind === 'basic').map(s => s.id);
        if (basics.length > 1) errors.push(`use case ${c.id}: ${basics.length} basic ${k} scenarios (${basics.join(', ')}); keep one main path, mark the others alternate`);
        if (!basics.length && mine.some(s => s.surface === k && s.kind)) warnings.push(`use case ${c.id}: no basic ${k} scenario; mark its main path "kind": "basic"`);
    }
    for (const s of mine) {
        const tokens = storyTokens(s.story);
        const acs = acTokens(s);
        for (const k of c.channels) {
            if (k === s.surface || (s.na && s.na[k])) continue;
            const twin = mine.some(t => t.surface === k && (acs.length ? acTokens(t).some(x => acs.includes(x)) : [...storyTokens(t.story)].some(x => tokens.has(x))));
            if (!twin) warnings.push(`${s.id} (${s.surface}, ${s.story}): no ${k} scenario for the same story ref; add one, or set "na": { "${k}": "<why>" }`);
        }
    }
}

// Merge: one scenario per rule. Same use case, channel, kind and story ref (exceptions: and message) is likely one rule.
const BUDGET = 12;
const groups = new Map();
for (const s of SCS) {
    if (!s.useCase || !s.surface || !s.kind || s.kind === 'basic') continue;
    const msg = s.kind === 'exception' ? ((Array.isArray(s.expect) ? s.expect.join(' ') : '').match(/"[^"]+"/) || [''])[0] : '';
    const key = [s.useCase, s.surface, s.kind, [...storyTokens(s.story)].sort().join('|'), msg].join('\n');
    groups.set(key, [...(groups.get(key) || []), s.id]);
}
for (const list of groups.values()) if (list.length > 1) warnings.push(`${list.join(', ')}: same use case, channel, kind and story ref; merge into one scenario (SKILL.md step 2b) unless the rule or message differs`);
for (const c of UCS) for (const k of c.channels || []) {
    const n = SCS.filter(s => s.useCase === c.id && s.surface === k).length;
    if (n > BUDGET) warnings.push(`use case ${c.id}: ${n} ${k} scenarios (budget ${BUDGET}); merge variations of one rule, or split the use case`);
}

// Acceptance criteria: every channel an AC applies to has a scenario that cites it.
const acCoverage = [];
if (ACS == null) warnings.push('no ACCEPTANCE list: design-feature shows no Acceptance criteria section (SKILL.md step 2)');
else {
    const acIds = new Set();
    for (const a of ACS) {
        const name = a.id || '(no id)';
        if (!/^US\d+ · AC\d+$/.test(a.id || '')) errors.push(`acceptance "${name}": id must look like "US1 · AC2"`);
        if (acIds.has(a.id)) errors.push(`duplicate acceptance id: ${a.id}`);
        acIds.add(a.id);
        for (const k of ['given', 'then']) if (!a[k]) errors.push(`acceptance ${name}: missing ${k}`);
        if (!Array.isArray(a.channels) || !a.channels.length) { errors.push(`acceptance ${name}: channels must list where it applies`); continue; }
        const na = a.na || {};
        const row = { id: a.id, covered: {}, missing: [], na: Object.keys(na) };
        for (const k of a.channels) {
            const by = SCS.filter(s => s.surface === k && acTokens(s).includes(a.id)).map(s => s.id);
            row.covered[k] = by;
            if (!by.length) { row.missing.push(k); errors.push(`acceptance ${a.id}: no ${k} scenario cites it; add one, or move ${k} to "na" with the reason`); }
        }
        // channels of the use cases whose scenarios cite this AC: each must be listed or explained
        const ucs = new Set(SCS.filter(s => acTokens(s).includes(a.id)).map(s => s.useCase));
        const expected = [...new Set(UCS.filter(c => ucs.has(c.id)).flatMap(c => c.channels || []))];
        for (const k of expected) if (!a.channels.includes(k) && !na[k]) warnings.push(`acceptance ${a.id}: its use case has channel ${k} but the AC neither lists it nor says why in "na"`);
        acCoverage.push(row);
    }
    for (const s of SCS) for (const t of acTokens(s)) if (!acIds.has(t)) warnings.push(`${s.id}: cites ${t}, which is not in ACCEPTANCE`);
}

// Examples: a quoted message, a number or an identifier lets a reviewer tell pass from fail.
const EXAMPLE = /"[^"]+"|\d|\b[a-z]+[A-Z]\w*\b|\b\w+_\w+\b|\b[A-Z]{2,}\b|![0-9]/;
const ROLE_TALK = /\b(role|permission|not allowed|lacks?|read-only|forbidden|permissiondenied|unauthori[sz]ed|denied)\b/i;
// permission strings look like a.b(.c) or a:b; e.g. / i.e. and file names are not
const PERM = /\b[a-z][a-z0-9_-]*(?:[.:][a-z][a-z0-9_-]*)+\b/g;
const notPerm = p => /^(e\.g|i\.e)$/.test(p) || /\.(md|js|mjs|ts|json|html|sql|go|ya?ml)$/.test(p);
for (const s of SCS) {
    const name = s.id || '(no id)';
    const expect = Array.isArray(s.expect) ? s.expect.join(' ') : '';
    if (expect && !EXAMPLE.test(expect)) warnings.push(`${name}: expect has no quoted message, number or identifier; add the real example (SKILL.md step 2, Examples)`);
    const text = [s.title, s.given, s.when, expect].filter(Boolean).join(' ');
    if (ROLE_TALK.test(text) && !(text.match(PERM) || []).some(p => !notPerm(p)))
        warnings.push(`${name}: talks about a role or permission but names no permission string (e.g. "DEV: has things.read, not things.create")`);
}

// Core = play first: every basic, plus the main alternates and the errors users hit most. Aim for 15–25% of all scenarios.
const CORE_MAX = 0.3;
const coreCount = list => list.filter(s => s.core === true).length;
const coreShare = SCS.length ? coreCount(SCS) / SCS.length : 0;
if (coreShare > CORE_MAX) warnings.push(`${coreCount(SCS)} of ${SCS.length} scenarios are core (${Math.round(coreShare * 100)}%, aim 15–25%); keep core for every basic, the main alternates and the errors users hit most`);

const bySurface = list => Object.fromEntries(SURFACES.map(k => [k, list.filter(s => s.surface === k).length]));
const surfaceText = o => SURFACES.filter(k => o[k]).map(k => `${o[k]} ${k}`).join(', ');
const byKind = list => Object.fromEntries(KINDS.map(k => [k, list.filter(s => s.kind === k).length]));
const perUseCase = UCS.map(c => {
    const l = SCS.filter(s => s.useCase === c.id);
    return { useCase: c.id, title: c.title, channels: c.channels || [], count: l.length, perSurface: bySurface(l), core: coreCount(l), corePerSurface: bySurface(l.filter(s => s.core === true)) };
});
const perSurface = bySurface(SCS);
const perKind = byKind(SCS);
const acceptance = ACS == null ? null : { total: acCoverage.length, fullyCovered: acCoverage.filter(r => !r.missing.length).length, rows: acCoverage };
const core = { total: coreCount(SCS), percent: Math.round(coreShare * 100), ids: SCS.filter(s => s.core === true).map(s => s.id) };
if (asJson) out(JSON.stringify({ useCases: UCS.length, scenarios: SCS.length, perUseCase, perSurface, perKind, core, acceptance, errors, warnings }, null, 2));
else {
    out(`${count(UCS.length, 'use case')}, ${count(SCS.length, 'scenario')} (${surfaceText(perSurface)}; ${KINDS.map(k => `${perKind[k]} ${k}`).join(', ')}); ${core.total} core (${core.percent}%)`);
    perUseCase.forEach(c => out(`  ${c.useCase} ${c.title} [${c.channels.join(', ')}]: ${c.count} (${surfaceText(c.perSurface)}) · core ${c.core}${c.core ? ` (${surfaceText(c.corePerSurface)})` : ''}`));
    if (acceptance) out(`${acceptance.total} acceptance criteri${acceptance.total === 1 ? 'on' : 'a'}: ${acceptance.fullyCovered} covered on every channel`);
    if (warnings.length) out(`\n${warnings.length} warning(s):\n- ${warnings.join('\n- ')}`);
    out(errors.length ? `\n${errors.length} error(s):\n- ${errors.join('\n- ')}` : '\nNo errors.');
}
process.exit(errors.length ? 1 : 0);
