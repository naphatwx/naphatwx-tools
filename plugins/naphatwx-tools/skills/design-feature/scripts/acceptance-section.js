#!/usr/bin/env node
// Writes the "Acceptance criteria" section of overview.html from <plan>/use-cases.js (ACCEPTANCE + SCENARIOS):
// one row per criterion with the scenarios that cite it, per channel. A channel with no scenario is a gap.
// Usage: node acceptance-section.js <plan-dir> [--use-cases <file>]   (prints the coverage; exit 0 even with gaps)

const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const option = (name, fallback) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : fallback; };
const plan = args[0];
if (!plan) { process.stderr.write('usage: node acceptance-section.js <plan-dir> [--use-cases <file>]\n'); process.exit(2); }
const useCasesFile = option('--use-cases', path.join(plan, 'use-cases.js'));
const overviewPath = path.join(plan, 'overview.html');
const fail = message => { process.stderr.write(message + '\n'); process.exit(1); };

/** `<NAME> = [ ... ]` parsed as strict JSON (works for `var X =` and `export const X =`). */
function parseVariable(source, name, file) {
    const match = source.match(new RegExp(`\\b${name}\\s*=\\s*\\[`));
    if (!match) throw new Error(`${name} not found in ${file}`);
    const start = match.index + match[0].length - 1;
    let depth = 0, inString = false;
    for (let j = start; j < source.length; j++) {
        const character = source[j];
        if (inString) { if (character === '\\') j++; else if (character === '"') inString = false; continue; }
        if (character === '"') inString = true;
        else if (character === '[') depth++;
        else if (character === ']' && --depth === 0) return JSON.parse(source.slice(start, j + 1));
    }
    throw new Error(`${name}: unclosed array`);
}

/** Story refs as tokens: "US1 · AC2–4 · FR-003" → US1 · AC2, US1 · AC3, US1 · AC4, FR-003 (same as generate-use-case's check.js). */
function storyTokens(story) {
    const tokens = new Set();
    let userStory = '';
    for (const part of String(story || '').split(/\s*[·,]\s*/).filter(Boolean)) {
        const storyMatch = part.match(/^US(\d+)$/i);
        if (storyMatch) { userStory = `US${storyMatch[1]}`; continue; }
        const criterionMatch = part.match(/^AC(\d+)(?:\s*[–-]\s*(?:AC)?(\d+))?$/i);
        if (criterionMatch && userStory) { for (let n = +criterionMatch[1]; n <= +(criterionMatch[2] || criterionMatch[1]); n++) tokens.add(`${userStory} · AC${n}`); continue; }
        tokens.add(part);
    }
    if (!tokens.size && userStory) tokens.add(userStory);
    return tokens;
}

let html = fs.readFileSync(overviewPath, 'utf8');
const MARK = /(<!-- acceptance:start[^>]*-->)[\s\S]*?([ \t]*<!-- acceptance:end -->)/;
if (!MARK.test(html)) fail('No <!-- acceptance:start --> … <!-- acceptance:end --> markers in overview.html. Copy the Acceptance criteria section from the template (section 03).');

let SCENARIOS = [], ACCEPTANCE = null;
try {
    const source = fs.readFileSync(useCasesFile, 'utf8');
    SCENARIOS = parseVariable(source, 'SCENARIOS', useCasesFile);
    if (/\bACCEPTANCE\s*=/.test(source)) ACCEPTANCE = parseVariable(source, 'ACCEPTANCE', useCasesFile);
} catch (error) { fail(`${useCasesFile}: ${error.message}`); }

const escapeHtml = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#x27;' }[c]));
const plural = (count, word, pluralWord = word + 's') => `${count} ${count === 1 ? word : pluralWord}`;
const slug = id => 'ac-' + String(id).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
// "An owner" → "an owner" after "Given"; keeps acronyms ("MCP caller") as they are
const lower = text => /^[A-Z](?![A-Z0-9])/.test(text) ? text[0].toLowerCase() + text.slice(1) : text;
const ORDER = ['ui', 'mcp', 'api', 'job'];
const byOrder = (a, b) => (ORDER.indexOf(a) + 1 || 99) - (ORDER.indexOf(b) + 1 || 99);
const INDENT = '            ';

const rows = (ACCEPTANCE || []).map(criterion => {
    const citing = SCENARIOS.filter(s => storyTokens(s.story).has(criterion.id));
    const notApplicable = criterion.na || {};
    const listed = Array.isArray(criterion.channels) ? criterion.channels : [];
    // listed channels first, then any other channel a scenario covers anyway
    const extra = [...new Set(citing.map(s => s.surface))].filter(channel => !listed.includes(channel) && !notApplicable[channel]).sort(byOrder);
    const lines = [...listed, ...extra].map(channel => ({ channel, by: citing.filter(s => s.surface === channel) }));
    const notApplicableList = Object.entries(notApplicable).filter(([channel]) => !lines.some(line => line.channel === channel));
    return { criterion, lines, notApplicableList, gaps: lines.filter(line => !line.by.length).map(line => line.channel) };
});
const gaps = rows.reduce((n, r) => n + r.gaps.length, 0);
const fullyCovered = rows.filter(r => !r.gaps.length).length;
const notApplicableCount = rows.reduce((n, r) => n + r.notApplicableList.length, 0);
const summary = [plural(rows.length, 'criterion', 'criteria'), `${fullyCovered} covered on every channel`,
    gaps ? plural(gaps, 'gap') : 'no gaps', ...(notApplicableCount ? [`${notApplicableCount} n/a`] : [])].join(' · ');

let body;
if (ACCEPTANCE == null) body = `${INDENT}<p class="muted">use-cases.js has no acceptance criteria list. Re-run the generate-use-case skill to add it from the spec.</p>`;
else if (!ACCEPTANCE.length) body = `${INDENT}<p class="muted">No acceptance criteria: the source has no Given / When / Then. The generate-use-case skill lists them when the spec has them.</p>`;
else {
    const givenWhenThen = criterion => [['Given', criterion.given], ['when', criterion.when], ['then', criterion.then]].filter(([, text]) => text)
        .map(([word, text]) => `<strong>${word}</strong> ${escapeHtml(lower(text))}`).join(', ');
    const link = scenario => `<a href="#sc-${escapeHtml(scenario.id)}" title="${escapeHtml(`${scenario.useCase} · ${scenario.title}`)}">${escapeHtml(scenario.id)}</a>`;
    const line = ({ channel, by }) => by.length
        ? `<li><span class="channel-tag">${escapeHtml(channel)}</span><span>${by.map(link).join(' · ')}</span></li>`
        : `<li><span class="channel-tag gap">${escapeHtml(channel)}</span><span class="acceptance-gap">gap: no ${escapeHtml(channel)} scenario cites it</span></li>`;
    const notApplicableLine = ([channel, why]) => `<li><span class="channel-tag">${escapeHtml(channel)}</span><span class="aside not-applicable">n/a: ${escapeHtml(why)}</span></li>`;
    const tableRow = row => `${INDENT}        <tr id="${slug(row.criterion.id)}"><td><strong class="nowrap">${escapeHtml(row.criterion.id)}</strong><br>${givenWhenThen(row.criterion)}</td>`
        + `<td><ul class="acceptance-cover">${[...row.lines.map(line), ...row.notApplicableList.map(notApplicableLine)].join('')}</ul></td></tr>`;
    body = [`${INDENT}<p class="muted">${escapeHtml(summary)}</p>`,
        `${INDENT}<div class="table-wrap"><table class="acceptance-table">`,
        `${INDENT}    <thead><tr><th>Criterion</th><th>Scenarios that cite it, by channel</th></tr></thead><tbody>`,
        ...rows.map(tableRow),
        `${INDENT}    </tbody></table></div>`].join('\n');
}
html = html.replace(MARK, (_, start, end) => `${start}\n${body}\n${end}`);
fs.writeFileSync(overviewPath, html);

const print = text => process.stdout.write(text + '\n');
if (ACCEPTANCE == null) print('Acceptance criteria: none (use-cases.js has no ACCEPTANCE list)');
else if (!ACCEPTANCE.length) print('Acceptance criteria: none (ACCEPTANCE is empty)');
else {
    print(`Acceptance criteria written: ${summary}`);
    rows.forEach(row => print(`  ${row.criterion.id}  ${[...row.lines.map(line => `${line.channel}: ${line.by.length ? line.by.map(s => s.id).join(', ') : 'GAP'}`),
        ...row.notApplicableList.map(([channel]) => `${channel}: n/a`)].join(' · ')}`));
}
