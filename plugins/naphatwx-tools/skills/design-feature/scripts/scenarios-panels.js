#!/usr/bin/env node
// Writes every use case's "Scenarios (N)" view (4th button + panel) in overview.html from <plan>/use-cases.js, with Play
// links from the mock's play file (none → no links). Rows get id="sc-<id>", the targets of the Acceptance criteria links.
// Also writes the Core legend and the Kind + Core-only filter bar under the Use cases heading (overview.js fills the bar).
// Usage: node scenarios-panels.js <plan-dir> [--use-cases <file>] [--play-file <file>] [--play "<url with {id} {page} {state}>"] [--mock <index url>]

const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const option = (name, fallback) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : fallback; };
const plan = args[0];
if (!plan) { process.stderr.write('usage: node scenarios-panels.js <plan-dir> [--use-cases <file>] [--play-file <file>] [--play <url>] [--mock <url>]\n'); process.exit(2); }
const useCasesFile = option('--use-cases', path.join(plan, 'use-cases.js'));
const playFile = option('--play-file', path.join(plan, 'mock/shared/scenario-play.js'));
const play = option('--play', 'mock/index.html#sc-{id}');
const mockIndex = option('--mock', 'mock/index.html');
const overviewPath = path.join(plan, 'overview.html');
let html = fs.readFileSync(overviewPath, 'utf8');
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
const source = fs.readFileSync(useCasesFile, 'utf8');
// Plans made before the use case / scenario split group "use cases" under flows (3.N); they need a rebuild, not a patch.
if (/\bUSE_CASE_FLOWS\s*=/.test(source) || /id="flows"/.test(html))
    fail('Old plan layout (flows 3.N). Re-run the generate-use-case skill, then rebuild overview.html from the template.');
/** @type {import('../template/use-cases.types').UseCase[]} */
const USE_CASES = parseVariable(source, 'USE_CASES', useCasesFile);
/** @type {import('../template/use-cases.types').Scenario[]} */
const CORE = parseVariable(source, 'SCENARIOS', useCasesFile);
const hasMock = fs.existsSync(playFile);
const PLAY = hasMock ? parseVariable(fs.readFileSync(playFile, 'utf8'), 'SCENARIO_PLAY', playFile) : [];
const SCENARIOS = CORE.map(s => ({ ...s, ...(PLAY.find(p => p.id === s.id) || { skip: 'no mock' }) }));
// same rule as the mock's isPlayable: only a ui scenario with a play entry opens a screen
const playable = scenario => hasMock && !scenario.skip && (scenario.surface || 'ui') === 'ui';

const escapeHtml = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#x27;' }[c]));
const twoDigitNumber = useCaseId => useCaseId.slice(2).padStart(2, '0');
const href = scenario => play.replace(/\{(id|page|state)\}/g, (_, key) => encodeURIComponent(scenario[key]));
const newTabAttributes = 'target="_blank" rel="noopener"';
const scenariosOf = useCaseId => SCENARIOS.filter(s => s.useCase === useCaseId);
const playCell = scenario => playable(scenario) ? `<a href="${escapeHtml(href(scenario))}" ${newTabAttributes}>Play ↗</a>`
    : !hasMock ? '' : `<span class="aside">${(scenario.surface || 'ui') === 'ui' ? 'not in the mock' : 'No mock'}</span>`;
const plural = (count, word) => `${count} ${word}${count === 1 ? '' : 's'}`;
// channel tag (ui / mcp / api / job), title + kind + story chip, first expect line, the gate, then one muted line per "na" reason
const notApplicableLines = scenario => scenario.na && typeof scenario.na === 'object' ? Object.entries(scenario.na).map(([channel, why]) => `<br><span class="aside not-applicable">${escapeHtml(channel)} n/a: ${escapeHtml(why)}</span>`).join('') : '';
// the gate in the code that lets the actor in or stops them; a spec-only scenario says it is not traced yet
const evidenceLine = scenario => scenario.source === 'spec' ? '<br><span class="aside not-applicable">from the spec: not traced in the code yet</span>'
    : scenario.evidence && scenario.evidence.gate ? `<br><span class="aside not-applicable">gate: <code>${escapeHtml(scenario.evidence.gate)}</code></span>` : '';
const kindTag = scenario => scenario.kind ? `<span class="scenario-kind ${escapeHtml(scenario.kind)}">${escapeHtml(scenario.kind)}</span>` : '';
const isCore = scenario => scenario.core === true;
const corePill = scenario => isCore(scenario) ? '<span class="core-pill" title="Core: play first">Core</span>' : '';
const scenarioCell = scenario => `${scenario.surface ? `<span class="channel-tag">${escapeHtml(scenario.surface)}</span> ` : ''}<span class="scenario-name">${escapeHtml(scenario.title)}</span>${kindTag(scenario)}${corePill(scenario)} <span class="references">${escapeHtml(scenario.story)}</span>`
    + `<br><span class="aside">${escapeHtml((scenario.expect || [])[0] || '')}</span>${evidenceLine(scenario)}${notApplicableLines(scenario)}`;

// ---------------------------------------------------------------- "Open the mock" link on the Use cases heading
html = html.replace(/(<section class="slide" id="use-cases"[^>]*>\s*<h2>[\s\S]*?)(?: <a class="side-link"[^>]*>[^<]*<\/a>)?<\/h2>/,
    (_, h2) => `${h2}${hasMock ? ` <a class="side-link" href="${escapeHtml(mockIndex)}" ${newTabAttributes}>Open the mock ↗</a>` : ''}</h2>`);

// ---------------------------------------------------------------- search + Type / Kind / Core filter bar under the heading
const FILTER_START = '<!-- scenario-filter: generated by scripts/scenarios-panels.js -->', FILTER_END = '<!-- /scenario-filter -->';
html = html.replace(new RegExp(`\\s*${FILTER_START}[\\s\\S]*?${FILTER_END}`), '');
if (SCENARIOS.length) html = html.replace(/(<section class="slide" id="use-cases"[^>]*>\s*<h2>[\s\S]*?<\/h2>)/, (_, head) => `${head}
            ${FILTER_START}
            <div id="scenario-filter"></div>
            ${FILTER_END}`);

// ---------------------------------------------------------------- "Scenarios" view per use case
const INDENT = '            ';
const panelOf = (useCase, id) => {
    const scenarios = scenariosOf(useCase.id);
    const open = `<div class="panel" role="region" tabindex="-1" id="${id}" aria-labelledby="${id}-tab" hidden>`;
    const note = `${INDENT}    <!-- Generated by scripts/scenarios-panels.js from use-cases.js${hasMock ? ' and the mock\'s play file' : ''}. Don't hand-edit. -->`;
    if (!scenarios.length) return `${open}\n${note}\n${INDENT}    <p class="muted">${escapeHtml(useCase.none || 'No scenario for this use case.')}</p>\n${INDENT}</div>`;
    const rows = scenarios.map(s => `${INDENT}            <tr id="sc-${escapeHtml(s.id)}" data-surface="${escapeHtml(s.surface || '')}" data-kind="${escapeHtml(s.kind || '')}" data-core="${isCore(s)}"><td>${scenarioCell(s)}</td>${hasMock ? `<td class="nowrap">${playCell(s)}</td>` : ''}</tr>`);
    return `${open}\n${note}\n${INDENT}    <div class="table-wrap"><table>\n${INDENT}        <thead><tr><th>Scenario</th>${hasMock ? '<th></th>' : ''}</tr></thead><tbody>\n${rows.join('\n')}\n${INDENT}        </tbody></table></div>\n${INDENT}</div>`;
};
const missing = [];
for (const useCase of USE_CASES) {
    const id = `uc-${twoDigitNumber(useCase.id)}-sc`;
    const start = html.indexOf(`id="uc-${twoDigitNumber(useCase.id)}"`);
    if (start < 0) { missing.push(useCase.id); continue; }
    const end = (() => { const index = html.indexOf('</section>', start); return index < 0 ? html.length : index; })();
    let block = html.slice(start, end).replace(/\s*$/, '');
    // the panel is always the block's last child, so cut from it to the end
    const oldPanel = block.search(new RegExp(`\\s*<div class="panel"[^>]*id="${id}"`));
    if (oldPanel >= 0) block = block.slice(0, oldPanel);
    block = block.replace(new RegExp(`\\n[ \\t]*<button[^>]*id="${id}-tab"[^>]*>[^<]*</button>`), '');
    const button = `<button type="button" aria-expanded="false" aria-controls="${id}" id="${id}-tab">Scenarios (${scenariosOf(useCase.id).length})</button>`;
    block = block.replace(/(<div class="views"[\s\S]*?)(\n[ \t]*<\/div>)/, `$1\n${INDENT}    ${button}$2`);
    block += `\n${INDENT}${panelOf(useCase, id)}\n        `;
    html = html.slice(0, start) + block + html.slice(end);
}

fs.writeFileSync(overviewPath, html);
process.stdout.write(`Scenarios written into the use cases: ${plural(SCENARIOS.length, 'scenario')} (${SCENARIOS.filter(isCore).length} core) in ${plural(USE_CASES.length, 'use case')}, ${hasMock ? `${SCENARIOS.filter(playable).length} playable in the mock` : 'no mock'}\n`);
USE_CASES.forEach(useCase => process.stdout.write(`  ${useCase.id} ${useCase.title}: ${scenariosOf(useCase.id).length} (${scenariosOf(useCase.id).filter(isCore).length} core)${hasMock ? ` (${scenariosOf(useCase.id).filter(playable).length} playable)` : ''}\n`));
if (missing.length) fail(`No #uc-NN block in overview.html for use case(s): ${missing.join(', ')}`);
