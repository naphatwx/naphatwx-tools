#!/usr/bin/env node
// Writes the "Acceptance criteria" section of overview.html from <plan>/use-cases.js (ACCEPTANCE + SCENARIOS):
// one row per criterion with the scenarios that cite it, per channel. A channel with no scenario is a gap.
// Usage: node acceptance-section.js <plan-dir> [--use-cases <file>]   (prints the coverage; exit 0 even with gaps)

const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const opt = (name, d) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : d; };
const plan = args[0];
if (!plan) { process.stderr.write('usage: node acceptance-section.js <plan-dir> [--use-cases <file>]\n'); process.exit(2); }
const ucFile = opt('--use-cases', path.join(plan, 'use-cases.js'));
const overviewPath = path.join(plan, 'overview.html');
const fail = msg => { process.stderr.write(msg + '\n'); process.exit(1); };

/** `<NAME> = [ ... ]` parsed as strict JSON (works for `var X =` and `export const X =`). */
function parseVar(src, name, file) {
    const m = src.match(new RegExp(`\\b${name}\\s*=\\s*\\[`));
    if (!m) throw new Error(`${name} not found in ${file}`);
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

/** Story refs as tokens: "US1 · AC2–4 · FR-003" → US1 · AC2, US1 · AC3, US1 · AC4, FR-003 (same as generate-use-case's check.js). */
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

let html = fs.readFileSync(overviewPath, 'utf8');
const MARK = /(<!-- acceptance:start[^>]*-->)[\s\S]*?([ \t]*<!-- acceptance:end -->)/;
if (!MARK.test(html)) fail('No <!-- acceptance:start --> … <!-- acceptance:end --> markers in overview.html. Copy the Acceptance criteria section from the template (section 03).');

let SCS = [], ACS = null;
try {
    const src = fs.readFileSync(ucFile, 'utf8');
    SCS = parseVar(src, 'SCENARIOS', ucFile);
    if (/\bACCEPTANCE\s*=/.test(src)) ACS = parseVar(src, 'ACCEPTANCE', ucFile);
} catch (e) { fail(`${ucFile}: ${e.message}`); }

const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#x27;' }[c]));
const plural = (n, w, p = w + 's') => `${n} ${n === 1 ? w : p}`;
const slug = id => 'ac-' + String(id).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
// "An owner" → "an owner" after "Given"; keeps acronyms ("MCP caller") as they are
const lower = s => /^[A-Z](?![A-Z0-9])/.test(s) ? s[0].toLowerCase() + s.slice(1) : s;
const ORDER = ['ui', 'mcp', 'api', 'job'];
const byOrder = (a, b) => (ORDER.indexOf(a) + 1 || 99) - (ORDER.indexOf(b) + 1 || 99);
const I = '            ';

const rows = (ACS || []).map(a => {
    const citing = SCS.filter(s => storyTokens(s.story).has(a.id));
    const na = a.na || {};
    const listed = Array.isArray(a.channels) ? a.channels : [];
    // listed channels first, then any other channel a scenario covers anyway
    const extra = [...new Set(citing.map(s => s.surface))].filter(k => !listed.includes(k) && !na[k]).sort(byOrder);
    const lines = [...listed, ...extra].map(k => ({ k, by: citing.filter(s => s.surface === k) }));
    const naList = Object.entries(na).filter(([k]) => !lines.some(l => l.k === k));
    return { a, lines, naList, gaps: lines.filter(l => !l.by.length).map(l => l.k) };
});
const gaps = rows.reduce((n, r) => n + r.gaps.length, 0);
const full = rows.filter(r => !r.gaps.length).length;
const naCount = rows.reduce((n, r) => n + r.naList.length, 0);
const summary = [plural(rows.length, 'criterion', 'criteria'), `${full} covered on every channel`,
    gaps ? plural(gaps, 'gap') : 'no gaps', ...(naCount ? [`${naCount} n/a`] : [])].join(' · ');

let body;
if (ACS == null) body = `${I}<p class="muted">use-cases.js has no acceptance criteria list. Re-run the generate-use-case skill to add it from the spec.</p>`;
else if (!ACS.length) body = `${I}<p class="muted">No acceptance criteria: the source has no Given / When / Then. The generate-use-case skill lists them when the spec has them.</p>`;
else {
    const gwt = a => [['Given', a.given], ['when', a.when], ['then', a.then]].filter(([, t]) => t)
        .map(([k, t]) => `<strong>${k}</strong> ${esc(lower(t))}`).join(', ');
    const link = s => `<a href="#sc-${esc(s.id)}" title="${esc(`${s.useCase} · ${s.title}`)}">${esc(s.id)}</a>`;
    const line = ({ k, by }) => by.length
        ? `<li><span class="ch-tag">${esc(k)}</span><span>${by.map(link).join(' · ')}</span></li>`
        : `<li><span class="ch-tag gap">${esc(k)}</span><span class="ac-gap">gap: no ${esc(k)} scenario cites it</span></li>`;
    const naLine = ([k, why]) => `<li><span class="ch-tag">${esc(k)}</span><span class="aside na">n/a: ${esc(why)}</span></li>`;
    const tr = r => `${I}        <tr id="${slug(r.a.id)}"><td><strong class="nowrap">${esc(r.a.id)}</strong><br>${gwt(r.a)}</td>`
        + `<td><ul class="ac-cover">${[...r.lines.map(line), ...r.naList.map(naLine)].join('')}</ul></td></tr>`;
    body = [`${I}<p class="muted">${esc(summary)}</p>`,
        `${I}<div class="table-wrap"><table class="ac-table">`,
        `${I}    <thead><tr><th>Criterion</th><th>Scenarios that cite it, by channel</th></tr></thead><tbody>`,
        ...rows.map(tr),
        `${I}    </tbody></table></div>`].join('\n');
}
html = html.replace(MARK, (_, start, end) => `${start}\n${body}\n${end}`);
fs.writeFileSync(overviewPath, html);

const out = s => process.stdout.write(s + '\n');
if (ACS == null) out('Acceptance criteria: none (use-cases.js has no ACCEPTANCE list)');
else if (!ACS.length) out('Acceptance criteria: none (ACCEPTANCE is empty)');
else {
    out(`Acceptance criteria written: ${summary}`);
    rows.forEach(r => out(`  ${r.a.id}  ${[...r.lines.map(l => `${l.k}: ${l.by.length ? l.by.map(s => s.id).join(', ') : 'GAP'}`),
        ...r.naList.map(([k]) => `${k}: n/a`)].join(' · ')}`));
}
