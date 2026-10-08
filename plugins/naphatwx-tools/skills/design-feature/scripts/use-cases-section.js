#!/usr/bin/env node
// Writes overview.html section 07 "Use cases" and every flow's "Try in the mock" line from the mock's use cases,
// so the plan never drifts from the mock. Run again after any change to use-cases.js.
// Usage: node use-cases-section.js <plan-dir> [--use-cases <file>] [--play "<url with {id} {page} {scenario}>"] [--mock <index url>]

const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const opt = (name, d) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : d; };
const plan = args[0];
if (!plan) { process.stderr.write('usage: node use-cases-section.js <plan-dir> [--use-cases <file>] [--play <url>] [--mock <url>]\n'); process.exit(2); }
const ucFile = opt('--use-cases', path.join(plan, 'mock/shared/use-cases.js'));
const play = opt('--play', 'mock/index.html#uc-{id}');
const mockIndex = opt('--mock', 'mock/index.html');
const overviewPath = path.join(plan, 'overview.html');
let html = fs.readFileSync(overviewPath, 'utf8');

/** `<NAME> = [ ... ]` parsed as strict JSON (works for `var X =` and `export const X =`). */
function parseVar(src, name) {
    const m = src.match(new RegExp(`\\b${name}\\s*=\\s*\\[`));
    if (!m) throw new Error(`${name} not found in ${ucFile}`);
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
const src = fs.readFileSync(ucFile, 'utf8');
const FLOWS = parseVar(src, 'USE_CASE_FLOWS');
const UCS = parseVar(src, 'USE_CASES');

const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#x27;' }[c]));
const nn = flow => flow.split('.')[1].padStart(2, '0');
const href = u => play.replace(/\{(id|page|scenario)\}/g, (_, k) => encodeURIComponent(u[k]));
const ext = 'target="_blank" rel="noopener"';
const ucsOf = flow => UCS.filter(u => u.flow === flow);
const plural = n => `${n} use case${n === 1 ? '' : 's'}`;

// ---------------------------------------------------------------- section 07
const I = '            ';
const flowBlock = f => {
    const ucs = ucsOf(f.flow);
    const h3 = `${I}<h3 class="group-head"><a href="#flow-${nn(f.flow)}">${esc(f.flow)}</a> ${esc(f.title)} <span class="aside">${plural(ucs.length)}</span></h3>`;
    if (!ucs.length) return `${h3}\n${I}<p class="muted">${esc(f.none || 'No use case to play.')}</p>`;
    const rows = ucs.map(u => `${I}        <tr id="uc-${esc(u.id)}"><td>${esc(u.title)}<br><span class="aside">${esc(u.expect[0] || '')}</span></td><td class="nowrap">${esc(u.story)}</td><td class="nowrap"><a href="${esc(href(u))}" ${ext}>Play ↗</a></td></tr>`);
    return `${h3}\n${I}<div class="table-wrap"><table>\n${I}    <thead><tr><th>Use case</th><th>Story</th><th></th></tr></thead><tbody>\n${rows.join('\n')}\n${I}    </tbody></table></div>`;
};
const section = `<section class="slide" id="use-cases" data-title="Use cases">
${I}<h2><span class="sec-n">07</span>Use cases <a class="side-link" href="${esc(mockIndex)}" ${ext}>Open the mock ↗</a></h2>
${I}<p class="muted">${plural(UCS.length)}, grouped by flow. <strong>Play</strong> opens the mock at that flow with the use case picked.</p>
${FLOWS.map(flowBlock).join('\n')}
        </section>`;

const secRe = /<section class="slide" id="(?:use-cases|mock)"[\s\S]*?<\/section>/;
if (!secRe.test(html)) throw new Error('section 07 (id="use-cases" or id="mock") not found in overview.html');
html = html.replace(secRe, section);
html = html.replace(/<!-- =+ 07 [A-Z ]+ =+ -->/, '<!-- ============ 07 USE CASES ============ -->');
// rail link
html = html.replace(/<a href="#(?:mock|use-cases)"><span class="n">07<\/span><span class="rail-label">[^<]*<\/span><\/a>/,
    '<a href="#use-cases"><span class="n">07</span><span class="rail-label">Use cases</span></a>');

// ---------------------------------------------------------------- "Try in the mock" line per flow
const missingFlows = [];
for (const f of FLOWS) {
    const id = `flow-${nn(f.flow)}`;
    const start = html.indexOf(`id="${id}"`);
    if (start < 0) { missingFlows.push(f.flow); continue; }
    const end = (() => { const e = html.indexOf('</section>', start); return e < 0 ? html.length : e; })();
    let block = html.slice(start, end);
    const ucs = ucsOf(f.flow);
    const line = ucs.length ? `<p class="try"><span class="aside">Try in the mock</span> ${ucs.map(u => `<a href="${esc(href(u))}" ${ext}>${esc(u.title)} ↗</a>`).join(' · ')}</p>` : '';
    if (/<p class="try">[\s\S]*?<\/p>/.test(block)) block = block.replace(/\s*<p class="try">[\s\S]*?<\/p>/, line ? `\n${I}${line}` : '');
    else if (line) block = block.replace(/(<p class="flow-line">[\s\S]*?<\/p>)/, `$1\n${I}${line}`);
    html = html.slice(0, start) + block + html.slice(end);
}

fs.writeFileSync(overviewPath, html);
process.stdout.write(`Section 07 written: ${plural(UCS.length)} in ${FLOWS.length} flows\n`);
FLOWS.forEach(f => process.stdout.write(`  ${f.flow} ${f.title}: ${ucsOf(f.flow).length}\n`));
if (missingFlows.length) { process.stderr.write(`No #flow-NN block in overview.html for flow(s): ${missingFlows.join(', ')}\n`); process.exit(1); }
