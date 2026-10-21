#!/usr/bin/env node
// Checks a use-cases.js file (USE_CASES + SCENARIOS + ACCEPTANCE + MISMATCHES): fields, channel and acceptance coverage,
// core share, evidence refs (file exists, line in range) and that every quoted string in an expect line is in the code.
// Usage: node check.js <use-cases.js> [--root <repo>] [--strict] [--json]   (--strict: a source "spec" scenario is an error)

const fs = require('fs');
const path = require('path');

const file = process.argv[2];
if (!file) { process.stderr.write('usage: node check.js <use-cases.js> [--json]\n'); process.exit(2); }
const asJson = process.argv.includes('--json');
const strict = process.argv.includes('--strict');
const rootArg = process.argv.includes('--root') ? process.argv[process.argv.indexOf('--root') + 1] : null;
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

/** @type {import('../template/use-cases.types').UseCase[]} */
let UCS = [];
/** @type {import('../template/use-cases.types').Scenario[]} */
let SCS = [];
/** @type {import('../template/use-cases.types').Acceptance[] | null} */
let ACS = null;
/** @type {import('../template/use-cases.types').Mismatch[]} */
let MMS = [];
try {
    const src = fs.readFileSync(file, 'utf8');
    if (/\bUSE_CASE_FLOWS\s*=/.test(src)) errors.push(`${file} is in the old format (USE_CASE_FLOWS); rewrite it as USE_CASES + SCENARIOS (SKILL.md, User Input)`);
    else {
        UCS = parseVar(src, 'USE_CASES'); SCS = parseVar(src, 'SCENARIOS');
        if (/\bACCEPTANCE\s*=/.test(src)) ACS = parseVar(src, 'ACCEPTANCE');
        if (/\bMISMATCHES\s*=/.test(src)) MMS = parseVar(src, 'MISMATCHES');
    }
} catch (e) { errors.push(`${file} is missing or not strict JSON: ${e.message}`); }

/** Field names of one interface in template/use-cases.types.d.ts, the one source for which fields exist. */
const TYPES = fs.readFileSync(path.join(__dirname, '../template/use-cases.types.d.ts'), 'utf8');
function fieldsOf(name) {
    const body = TYPES.match(new RegExp(`interface ${name} \\{([\\s\\S]*?)\\n\\}`));
    if (!body) throw new Error(`use-cases.types.d.ts has no interface ${name}`);
    return new Set([...body[1].matchAll(/^\s+(\w+)\??:/gm)].map(m => m[1]));
}
const FIELDS = { USE_CASES: fieldsOf('UseCase'), SCENARIOS: fieldsOf('ScenarioFields'), ACCEPTANCE: fieldsOf('Acceptance'), MISMATCHES: fieldsOf('Mismatch') };
const EVIDENCE_FIELDS = fieldsOf('Evidence');
// mock fields get their own message below
const MOCK_FIELDS = ['state', 'scenario', 'page', 'params', 'steps', 'op', 'req', 'parts'];
for (const [list, entries] of [['USE_CASES', UCS], ['SCENARIOS', SCS], ['ACCEPTANCE', ACS || []], ['MISMATCHES', MMS]])
    for (const e of entries) for (const k of Object.keys(e))
        if (!FIELDS[list].has(k) && !(list === 'SCENARIOS' && MOCK_FIELDS.includes(k))) errors.push(`${e.id || '(no id)'}: unknown field "${k}" in ${list}; allowed: ${[...FIELDS[list]].join(', ')} (use-cases.types.d.ts)`);

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

// Evidence: code is the source of truth. Every code scenario names its entry point, its gate and the code behind each expect line.
const SOURCES = ['code', 'spec'];
function findRoot() {
    if (rootArg) return path.resolve(rootArg);
    for (let dir = path.dirname(path.resolve(file)); ; dir = path.dirname(dir)) {
        if (fs.existsSync(path.join(dir, '.git'))) return dir;
        if (path.dirname(dir) === dir) return null;
    }
}
const ROOT = findRoot();
const lineCounts = new Map();
/** "" when the ref is fine, else why not. */
function badRef(ref) {
    const m = String(ref || '').match(/^([^:\s]+):(\d+)(?:-(\d+))?$/);
    if (!m) return `"${ref}" is not path:line or path:from-to`;
    if (path.isAbsolute(m[1]) || m[1].split('/').includes('..')) return `"${ref}" must be repo-relative`;
    if (!ROOT) return `no repo root for "${ref}"; pass --root <repo>`;
    if (!lineCounts.has(m[1])) {
        let n = null;
        try { n = fs.readFileSync(path.join(ROOT, m[1]), 'utf8').split('\n').length; } catch {}
        lineCounts.set(m[1], n);
    }
    const lines = lineCounts.get(m[1]);
    if (lines == null) return `"${ref}": file not found`;
    const from = +m[2], to = +(m[3] || m[2]);
    if (from < 1 || to < from || to > lines) return `"${ref}": line out of range (the file has ${lines} lines)`;
    return '';
}
// segments may hold Next.js route groups and params: app/(main)/[id]/page.tsx
const REF_IN_TEXT = /[\w@.][\w@.()[\]-]*(?:\/[\w@.()[\]-]+)*\.\w+:\d+(?:-\d+)?/g;
const specOnly = [];
let codeScenarios = 0, withEvidence = 0;
for (const s of SCS) {
    const name = s.id || '(no id)';
    if (s.source != null && !SOURCES.includes(s.source)) errors.push(`${name}: source must be "code" or "spec", or left out (= code)`);
    if (s.source === 'spec') specOnly.push(s.id);
    else codeScenarios++;
    for (const [k, why] of Object.entries(s.na && typeof s.na === 'object' ? s.na : {}))
        for (const ref of String(why).match(REF_IN_TEXT) || []) { const bad = badRef(ref); if (bad) errors.push(`${name}: na.${k} cites ${bad}`); }
    const ev = s.evidence;
    if (ev == null) continue;
    withEvidence++;
    if (typeof ev !== 'object' || Array.isArray(ev)) { errors.push(`${name}: evidence must be { entry, gate, roles?, expect: [...] }`); continue; }
    for (const k of Object.keys(ev)) if (!EVIDENCE_FIELDS.has(k)) errors.push(`${name}: unknown evidence field "${k}"; allowed: ${[...EVIDENCE_FIELDS].join(', ')}`);
    for (const k of ['entry', 'gate']) {
        if (!ev[k]) errors.push(`${name}: evidence.${k} is missing`);
        else { const bad = badRef(ev[k]); if (bad) errors.push(`${name}: evidence.${k} ${bad}`); }
    }
    if (ev.roles) { const bad = badRef(ev.roles); if (bad) errors.push(`${name}: evidence.roles ${bad}`); }
    const lines = Array.isArray(s.expect) ? s.expect.length : 0;
    if (!Array.isArray(ev.expect) || ev.expect.length !== lines) errors.push(`${name}: evidence.expect must hold one ref per expect line (${lines}), in order`);
    else ev.expect.forEach((ref, i) => { const bad = badRef(ref); if (bad) errors.push(`${name}: evidence.expect[${i}] ${bad}`); });
    const text = [s.title, s.given, s.when].filter(Boolean).join(' ');
    if (!ev.roles && (text.match(PERM) || []).some(p => !notPerm(p))) warnings.push(`${name}: names a permission but has no evidence.roles (the seed or role-permission row that grants or withholds it)`);
}
if (codeScenarios && !withEvidence) errors.push(`no scenario has evidence; trace each one in the code (SKILL.md step 2), or run verify mode to add it to an older file`);
else for (const s of SCS) if (s.source !== 'spec' && s.evidence == null) errors.push(`${s.id || '(no id)'}: no evidence; add entry, gate and one ref per expect line, or set "source": "spec" when the code does not exist yet`);
if (specOnly.length) (strict ? errors : warnings).push(`${specOnly.length} scenario(s) from the spec only (${specOnly.join(', ')}); run generate-use-case verify once the code exists, before play-scenarios or e2e-test use them`);

// Mismatches: the spec and the code disagree; the scenarios follow the code and the user decides which side to fix.
const mmIds = new Set();
for (const m of MMS) {
    const name = m.id || '(no id)';
    if (!/^M\d+$/.test(m.id || '')) errors.push(`mismatch "${name}": id must look like M1`);
    if (mmIds.has(m.id)) errors.push(`duplicate mismatch id: ${m.id}`);
    mmIds.add(m.id);
    for (const k of ['spec', 'differs']) if (!m[k]) errors.push(`mismatch ${name}: missing ${k}`);
    if (!['spec', 'code'].includes(m.fix)) errors.push(`mismatch ${name}: fix must be "spec" or "code"`);
    if (!Array.isArray(m.evidence) || !m.evidence.length) errors.push(`mismatch ${name}: evidence must list at least one path:line`);
    else m.evidence.forEach(ref => { const bad = badRef(ref); if (bad) errors.push(`mismatch ${name}: evidence ${bad}`); });
    for (const id of m.scenarios || []) if (!ids.has(id)) errors.push(`mismatch ${name}: scenario ${id} is not in SCENARIOS`);
}

// Strings: every quoted text in a code scenario's expect is in the code. A value in the quote (a number, ALL_CAPS, a
// kebab or dotted name) matches any value or placeholder there, so "Version 2.3.3-1 was created." finds `Version ${v} was created.`.
// Text built at run time passes when it fills a format string at the line's evidence ("your role %s cannot %s. %s").
const SKIP_FILE = /(^|\/)(specs|docs|node_modules|vendor|dist|build|coverage|e2e|__tests__|\.git)\/|\.(md|mdx|txt|lock|svg|png|jpe?g|gif|ico|pdf|woff2?|map)$|[._-](test|spec)\.\w+$|_test\.go$|\.feature$|\.pb\.go$|_pb\.\w+$|\.min\.js$|(^|\/)package-lock\.json$/;
const isValue = w => /\d/.test(w) || /^[A-Z][A-Z0-9_]+$/.test(w) || /^[a-z0-9]+(?:-[a-z0-9]+)+$/.test(w) || /^[a-z]\w*(?:\.\w+)+$/.test(w);
const esc = x => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const HOLE = '(?:%[-+# 0-9.]*[a-zA-Z]|\\$\\{[^}]{1,80}\\}|\\{\\{[^}]{1,80}\\}\\}|\\{[^{}\\n]{1,80}\\}';
const WILD = `${HOLE}|[^\\s"'\`<>]{1,80}?)`;
const WILD_RUN = `${HOLE}|[^"'\`<>\\n]{1,160}?)`;
/** The quote as a regex: words as they are, values as wildcards (a run of values is one); null when it is only values. */
function quoteRegex(q) {
    let words = 0;
    const parts = [];
    for (const chunk of q.trim().split(/\s+/)) {
        const m = chunk.match(/^([^A-Za-z0-9_]*)(.*?)([^A-Za-z0-9_]*)$/);
        const value = m[2] && isValue(m[2]);
        if (m[2] && !value) words++;
        if (value && parts.length && parts[parts.length - 1].value) { parts[parts.length - 1] = { value: true, re: WILD_RUN }; continue; }
        parts.push(value ? { value: true, re: esc(m[1]) + WILD + esc(m[3]) } : { value: false, re: esc(chunk) });
    }
    return words ? new RegExp(parts.map(p => p.re).join('\\s+')) : null;
}
/** Joins "a " + "b" concatenations so a message split over lines reads as one literal. */
const joinConcat = text => text.replace(/["'`]\s*\+\s*["'`]/g, '');
/** Does the quote fill a format string near this ref? */
function fillsFormat(q, ref) {
    const m = String(ref || '').match(/^([^:\s]+):(\d+)(?:-(\d+))?$/);
    if (!m || !ROOT) return false;
    let lines;
    try { lines = fs.readFileSync(path.join(ROOT, m[1]), 'utf8').split('\n'); } catch { return false; }
    const near = joinConcat(lines.slice(Math.max(0, +m[2] - 4), +(m[3] || m[2]) + 3).join('\n'));
    for (const lit of near.match(/"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'|`[^`]*`/g) || []) {
        const body = lit.slice(1, -1);
        const holes = body.split(/%[-+# 0-9.]*[a-zA-Z]|\$\{[^}]*\}|\{\w*\}/);
        if (holes.length < 2 || holes.join('').replace(/\W/g, '').length < 8) continue;
        if (new RegExp('^\\s*' + holes.map(h => esc(h.trim()).replace(/\s+/g, '\\s+')).join('\\s*(.+?)\\s*') + '\\s*$').test(q.trim())) return true;
    }
    return false;
}
const quotes = new Map(); // quote → [{ id, ref }]
for (const s of SCS) if (s.source !== 'spec') (Array.isArray(s.expect) ? s.expect : []).forEach((line, i) => {
    for (const m of String(line).matchAll(/"([^"]{2,})"/g))
        quotes.set(m[1], [...(quotes.get(m[1]) || []), { id: s.id, ref: s.evidence && Array.isArray(s.evidence.expect) ? s.evidence.expect[i] : null }]);
});
const strings = { checked: quotes.size, missing: [] };
if (quotes.size && ROOT) {
    const pending = new Map([...quotes.keys()].map(q => {
        const re = quoteRegex(q);
        // the longest plain word, to skip files fast
        const key = (q.split(/\s+/).map(c => c.replace(/^\W+|\W+$/g, '')).filter(w => w && !isValue(w)).sort((a, b) => b.length - a.length)[0]) || q;
        return [q, { re, key }];
    }));
    let list = [];
    try { list = require('child_process').execFileSync('git', ['-C', ROOT, 'ls-files', '-z'], { encoding: 'utf8', maxBuffer: 1 << 28 }).split('\0').filter(Boolean); }
    catch { const walk = d => fs.readdirSync(path.join(ROOT, d), { withFileTypes: true }).flatMap(e => e.isDirectory() ? (SKIP_FILE.test(`${d}${e.name}/`) ? [] : walk(`${d}${e.name}/`)) : [`${d}${e.name}`]); list = walk(''); }
    const own = path.relative(ROOT, path.dirname(path.resolve(file)));
    for (const rel of list) {
        if (!pending.size) break;
        if (SKIP_FILE.test(rel) || (own && rel.startsWith(own + '/'))) continue;
        let text;
        try { if (fs.statSync(path.join(ROOT, rel)).size > 2e6) continue; text = fs.readFileSync(path.join(ROOT, rel), 'utf8'); } catch { continue; }
        if (text.includes('\0')) continue;
        let joined = null;
        for (const [q, { re, key }] of pending) {
            if (!text.includes(key)) continue;
            if (joined == null) joined = joinConcat(text);
            if (re ? re.test(joined) : joined.includes(q)) pending.delete(q);
        }
    }
    for (const q of pending.keys()) {
        if (quotes.get(q).every(({ ref }) => fillsFormat(q, ref))) continue;
        strings.missing.push(q);
        errors.push(`${[...new Set(quotes.get(q).map(x => x.id))].join(', ')}: "${q.length > 90 ? q.slice(0, 90) + '…' : q}" is not in the code; copy the text the code shows (spec text that differs goes in MISMATCHES), and write user input and example values without quotes`);
    }
} else if (quotes.size) errors.push('no repo root to check quoted strings against; pass --root <repo>');

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
const evidence = { code: codeScenarios, withEvidence, specOnly, strings };
const mismatches = MMS.map(m => ({ id: m.id, spec: m.spec, fix: m.fix, differs: m.differs, evidence: m.evidence, scenarios: m.scenarios || [] }));
if (asJson) out(JSON.stringify({ useCases: UCS.length, scenarios: SCS.length, perUseCase, perSurface, perKind, core, acceptance, evidence, mismatches, errors, warnings }, null, 2));
else {
    out(`${count(UCS.length, 'use case')}, ${count(SCS.length, 'scenario')} (${surfaceText(perSurface)}; ${KINDS.map(k => `${perKind[k]} ${k}`).join(', ')}); ${core.total} core (${core.percent}%)`);
    perUseCase.forEach(c => out(`  ${c.useCase} ${c.title} [${c.channels.join(', ')}]: ${c.count} (${surfaceText(c.perSurface)}) · core ${c.core}${c.core ? ` (${surfaceText(c.corePerSurface)})` : ''}`));
    if (acceptance) out(`${acceptance.total} acceptance criteri${acceptance.total === 1 ? 'on' : 'a'}: ${acceptance.fullyCovered} covered on every channel`);
    out(`evidence: ${withEvidence} of ${SCS.length} scenarios; ${specOnly.length} from the spec only; ${strings.checked - strings.missing.length} of ${strings.checked} quoted strings found in the code`);
    out(`${MMS.length} mismatch${MMS.length === 1 ? '' : 'es'} between spec and code${MMS.length ? ':' : ''}`);
    MMS.forEach(m => out(`  ${m.id} ${m.spec} (fix the ${m.fix}): ${m.differs}`));
    if (warnings.length) out(`\n${warnings.length} warning(s):\n- ${warnings.join('\n- ')}`);
    out(errors.length ? `\n${errors.length} error(s):\n- ${errors.join('\n- ')}` : '\nNo errors.');
}
process.exit(errors.length ? 1 : 0);
