#!/usr/bin/env node
// Builds the one self-contained HTML report of a run: run-data.json + ai-results*.json + review*.json, in use-cases.js order.
// Usage: node build-report.mjs <run dir> --use-cases <plan>/use-cases.js [--core] [--template <html>] [--out <html>]
// --core: a core-only run; the report keeps only core scenarios ("core": true). Core scenarios come first in each use case.
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { basename, dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2);
const option = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };
const runDirArgument = args.find((a, i) => !a.startsWith('--') && !(i > 0 && args[i - 1].startsWith('--')));
if (!runDirArgument) { process.stderr.write('usage: node build-report.mjs <run dir> --use-cases <use-cases.js> [--core] [--template <html>] [--out <html>]\n'); process.exit(2); }
const coreOnly = args.includes('--core');
const runDir = resolve(runDirArgument);
const here = dirname(fileURLToPath(import.meta.url));
const template = readFileSync(option('--template') ?? join(here, 'e2e-report-template.html'), 'utf8');
const MARKER = '/*__E2E_DATA__*/null';
if (!template.includes(MARKER)) throw new Error(`template has no ${MARKER} marker`);

const readJson = (file) => JSON.parse(readFileSync(file, 'utf8'));
const files = (pattern) => (existsSync(runDir) ? readdirSync(runDir) : []).filter((f) => pattern.test(f)).sort().map((f) => join(runDir, f));

/** `<NAME> = [ ... ]` parsed as strict JSON, the same way generate-use-case's check.js reads it. */
function parseArray(source, name) {
  const match = source.match(new RegExp(`\\b${name}\\s*=\\s*\\[`));
  if (!match) return [];
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

const useCasesFile = option('--use-cases');
const useCasesSource = useCasesFile ? readFileSync(useCasesFile, 'utf8') : '';
if (!useCasesFile) process.stderr.write('warning: no --use-cases file; the report cannot show the use case tree or not-run scenarios\n');
const USE_CASES = parseArray(useCasesSource, 'USE_CASES');
const SCENARIOS = parseArray(useCasesSource, 'SCENARIOS');
const scenarioById = new Map(SCENARIOS.map((s, i) => [s.id, { ...s, order: i }]));
const useCaseId = (value) => (/^UC\d+/.exec(String(value ?? '')) || [''])[0];

// The report is shared: hide secret-looking keys again, in case a recorder missed one.
const SECRET = /token|secret|password|passwd|cookie|authorization|api[-_]?key|session/i;
const mask = (value) => Array.isArray(value) ? value.map(mask)
  : value && typeof value === 'object' ? Object.fromEntries(Object.entries(value).map(([k, x]) => [k, SECRET.test(k) ? '***' : mask(x)])) : value;
const MIME = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' };
const embed = (relativePath) => {
  if (!relativePath || relativePath.startsWith('data:')) return relativePath || undefined;
  const filePath = join(runDir, relativePath);
  return existsSync(filePath) ? `data:${MIME[extname(filePath).toLowerCase()] || 'image/png'};base64,${readFileSync(filePath).toString('base64')}` : undefined;
};
const cleanStep = (step) => ({ ...step, shot: embed(step.shot), call: step.call ? { ...step.call, request: mask(step.call.request), response: mask(step.call.response) } : undefined });

// 1 Playwright run data (ui + api).
const runFile = join(runDir, 'run-data.json');
const run = existsSync(runFile) ? readJson(runFile) : { tests: [] };
const tests = new Map();
for (const test of run.tests) {
  tests.set(test.scenario ?? test.key ?? test.title, { ...test, runner: 'playwright', useCase: useCaseId(test.useCase), steps: test.steps.map(cleanStep), finalShot: embed(test.finalShot) });
}

// 2 AI tester results (mcp + job). A later file replaces an earlier one for the same scenario.
const OUTCOME = { passed: 'expected', failed: 'unexpected', timedOut: 'unexpected', skipped: 'skipped' };
let aiDurationMs = 0;
for (const resultFile of files(/^ai-results.*\.json$/)) {
  for (const test of readJson(resultFile).tests ?? []) {
    aiDurationMs += test.ms ?? 0;
    tests.set(test.scenario, {
      scenario: test.scenario, title: test.title ?? test.scenario, runner: 'ai', role: test.role, status: test.status, outcome: OUTCOME[test.status] ?? 'unexpected',
      ms: test.ms ?? 0, retry: 0, error: test.error, steps: (test.steps ?? []).map(cleanStep), attempts: [],
      annotations: test.status === 'skipped' ? [{ type: 'skip', description: test.reason }] : [],
    });
  }
}

// 3 Review notes, per step. A later file replaces an earlier one's notes for the same scenario.
const review = new Map();
for (const reviewFile of files(/^review.*\.json$/)) {
  const notes = readJson(reviewFile).steps ?? [];
  for (const scenarioId of new Set(notes.map((n) => n.scenario))) review.set(scenarioId, notes.filter((n) => n.scenario === scenarioId));
}
for (const [scenarioId, notes] of review) {
  const test = tests.get(scenarioId);
  if (!test) continue;
  for (const note of notes) if (test.steps[note.step - 1]) test.steps[note.step - 1].review = { flag: note.flag, check: note.check, note: note.note };
}

// 4 One tree: use-cases.js order, core scenarios first in each use case, then tests with no known scenario. A scenario with no result is "not run".
for (const scenario of SCENARIOS) if (!tests.has(scenario.id) && (!coreOnly || scenario.core === true)) tests.set(scenario.id, { scenario: scenario.id, status: 'notrun', outcome: 'notrun', ms: 0, steps: [], attempts: [], annotations: [] });
const orderedTests = [...tests.values()].map((test, i) => {
  const scenario = scenarioById.get(test.scenario);
  const useCase = scenario?.useCase ?? test.useCase ?? '';
  const useCaseOrder = USE_CASES.findIndex((u) => u.id === useCase);
  return { ...test, title: scenario?.title ?? test.title, useCase, surface: scenario?.surface ?? test.surface ?? (test.runner === 'ai' ? 'mcp' : 'ui'), scKind: scenario?.kind ?? test.scKind ?? '', core: scenario?.core === true,
    useCaseOrder: useCaseOrder < 0 ? USE_CASES.length : useCaseOrder, order: scenario ? scenario.order : SCENARIOS.length + i };
}).filter((t) => !coreOnly || t.core || !scenarioById.has(t.scenario))
  .sort((a, b) => a.useCaseOrder - b.useCaseOrder || Number(b.core) - Number(a.core) || a.order - b.order).map(({ order, useCaseOrder, key, ...t }) => t);

const failed = (t) => t.outcome === 'unexpected';
const status = orderedTests.some(failed) ? 'failed' : orderedTests.some((t) => t.status === 'notrun') ? 'incomplete' : 'passed';
const name = run.name ?? option('--name') ?? basename(runDir);
const data = {
  name, status, coreOnly, startedAt: run.startedAt ?? new Date().toISOString(), ms: (run.ms ?? 0) + aiDurationMs, baseURL: run.baseURL ?? '',
  useCases: USE_CASES.map((u) => ({ id: u.id, title: u.title })), tests: orderedTests,
};
const file = resolve(option('--out') ?? join(runDir, `e2e-report-${basename(runDir)}.html`));
writeFileSync(file, template.replace(MARKER, () => JSON.stringify(data).replace(/</g, '\\u003c')));

// Summary for the agent's reply: per use case, passed / total, failed and not-run ids, review flags.
for (const useCase of [...USE_CASES, { id: '', title: 'Other tests' }]) {
  const useCaseTests = orderedTests.filter((t) => (t.useCase || '') === useCase.id);
  if (!useCaseTests.length) continue;
  const ids = (predicate) => useCaseTests.filter(predicate).map((t) => t.scenario).join(', ') || '-';
  const flags = useCaseTests.reduce((n, t) => n + t.steps.filter((s) => s.review && s.review.flag !== 'ok').length, 0);
  const coreTests = useCaseTests.filter((t) => t.core);
  process.stdout.write(`${useCase.id ? useCase.id + ' ' : ''}${useCase.title}: ${useCaseTests.filter((t) => t.outcome === 'expected').length}/${useCaseTests.length} passed · core ${coreTests.filter((t) => t.outcome === 'expected').length}/${coreTests.length} · failed: ${ids(failed)} · not run: ${ids((t) => t.status === 'notrun')} · review flags: ${flags}\n`);
}
process.stdout.write(`E2E report: ${file}\n`);
