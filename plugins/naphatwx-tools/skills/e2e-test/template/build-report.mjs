#!/usr/bin/env node
// Builds the one self-contained HTML report of a run: run-data.json + ai-results*.json + review*.json, in use-cases.js order.
// Usage: node build-report.mjs <run dir> --use-cases <plan>/use-cases.js [--template <html>] [--out <html>]
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { basename, dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2);
const opt = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };
const dir = args.find((a, i) => !a.startsWith('--') && !(i > 0 && args[i - 1].startsWith('--')));
if (!dir) { process.stderr.write('usage: node build-report.mjs <run dir> --use-cases <use-cases.js> [--template <html>] [--out <html>]\n'); process.exit(2); }
const runDir = resolve(dir);
const here = dirname(fileURLToPath(import.meta.url));
const template = readFileSync(opt('--template') ?? join(here, 'e2e-report-template.html'), 'utf8');
const MARKER = '/*__E2E_DATA__*/null';
if (!template.includes(MARKER)) throw new Error(`template has no ${MARKER} marker`);

const readJson = (file) => JSON.parse(readFileSync(file, 'utf8'));
const files = (re) => (existsSync(runDir) ? readdirSync(runDir) : []).filter((f) => re.test(f)).sort().map((f) => join(runDir, f));

/** `<NAME> = [ ... ]` parsed as strict JSON, the same way generate-use-case's check.js reads it. */
function parseVar(src, name) {
  const m = src.match(new RegExp(`\\b${name}\\s*=\\s*\\[`));
  if (!m) return [];
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

const ucFile = opt('--use-cases');
const ucSrc = ucFile ? readFileSync(ucFile, 'utf8') : '';
if (!ucFile) process.stderr.write('warning: no --use-cases file; the report cannot show the use case tree or not-run scenarios\n');
const USE_CASES = parseVar(ucSrc, 'USE_CASES');
const SCENARIOS = parseVar(ucSrc, 'SCENARIOS');
const scenarioById = new Map(SCENARIOS.map((s, i) => [s.id, { ...s, order: i }]));
const ucId = (v) => (/^UC\d+/.exec(String(v ?? '')) || [''])[0];

// The report is shared: hide secret-looking keys again, in case a recorder missed one.
const SECRET = /token|secret|password|passwd|cookie|authorization|api[-_]?key|session/i;
const mask = (v) => Array.isArray(v) ? v.map(mask)
  : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, SECRET.test(k) ? '***' : mask(x)])) : v;
const MIME = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' };
const embed = (rel) => {
  if (!rel || rel.startsWith('data:')) return rel || undefined;
  const p = join(runDir, rel);
  return existsSync(p) ? `data:${MIME[extname(p).toLowerCase()] || 'image/png'};base64,${readFileSync(p).toString('base64')}` : undefined;
};
const cleanStep = (s) => ({ ...s, shot: embed(s.shot), call: s.call ? { ...s.call, request: mask(s.call.request), response: mask(s.call.response) } : undefined });

// 1 Playwright run data (ui + api).
const runFile = join(runDir, 'run-data.json');
const run = existsSync(runFile) ? readJson(runFile) : { tests: [] };
const tests = new Map();
for (const t of run.tests) {
  tests.set(t.scenario ?? t.key ?? t.title, { ...t, runner: 'playwright', useCase: ucId(t.useCase), steps: t.steps.map(cleanStep), finalShot: embed(t.finalShot) });
}

// 2 AI tester results (mcp + job). A later file replaces an earlier one for the same scenario.
const OUTCOME = { passed: 'expected', failed: 'unexpected', timedOut: 'unexpected', skipped: 'skipped' };
let aiMs = 0;
for (const f of files(/^ai-results.*\.json$/)) {
  for (const t of readJson(f).tests ?? []) {
    aiMs += t.ms ?? 0;
    tests.set(t.scenario, {
      scenario: t.scenario, title: t.title ?? t.scenario, runner: 'ai', role: t.role, status: t.status, outcome: OUTCOME[t.status] ?? 'unexpected',
      ms: t.ms ?? 0, retry: 0, error: t.error, steps: (t.steps ?? []).map(cleanStep), attempts: [],
      annotations: t.status === 'skipped' ? [{ type: 'skip', description: t.reason }] : [],
    });
  }
}

// 3 Review notes, per step. A later file replaces an earlier one's notes for the same scenario.
const review = new Map();
for (const f of files(/^review.*\.json$/)) {
  const notes = readJson(f).steps ?? [];
  for (const sc of new Set(notes.map((n) => n.scenario))) review.set(sc, notes.filter((n) => n.scenario === sc));
}
for (const [sc, notes] of review) {
  const t = tests.get(sc);
  if (!t) continue;
  for (const n of notes) if (t.steps[n.step - 1]) t.steps[n.step - 1].review = { flag: n.flag, check: n.check, note: n.note };
}

// 4 One tree: use-cases.js order, then tests with no known scenario. A scenario with no result is "not run".
for (const s of SCENARIOS) if (!tests.has(s.id)) tests.set(s.id, { scenario: s.id, status: 'notrun', outcome: 'notrun', ms: 0, steps: [], attempts: [], annotations: [] });
const out = [...tests.values()].map((t, i) => {
  const s = scenarioById.get(t.scenario);
  return { ...t, title: s?.title ?? t.title, useCase: s?.useCase ?? t.useCase ?? '', surface: s?.surface ?? t.surface ?? (t.runner === 'ai' ? 'mcp' : 'ui'), scKind: s?.kind ?? t.scKind ?? '', order: s ? s.order : SCENARIOS.length + i };
}).sort((a, b) => a.order - b.order).map(({ order, key, ...t }) => t);

const failed = (t) => t.outcome === 'unexpected';
const status = out.some(failed) ? 'failed' : out.some((t) => t.status === 'notrun') ? 'incomplete' : 'passed';
const name = run.name ?? opt('--name') ?? basename(runDir);
const data = {
  name, status, startedAt: run.startedAt ?? new Date().toISOString(), ms: (run.ms ?? 0) + aiMs, baseURL: run.baseURL ?? '',
  useCases: USE_CASES.map((u) => ({ id: u.id, title: u.title })), tests: out,
};
const file = resolve(opt('--out') ?? join(runDir, `e2e-report-${basename(runDir)}.html`));
writeFileSync(file, template.replace(MARKER, () => JSON.stringify(data).replace(/</g, '\\u003c')));

// Summary for the agent's reply: per use case, passed / total, failed and not-run ids, review flags.
for (const u of [...USE_CASES, { id: '', title: 'Other tests' }]) {
  const ts = out.filter((t) => (t.useCase || '') === u.id);
  if (!ts.length) continue;
  const ids = (f) => ts.filter(f).map((t) => t.scenario).join(', ') || '-';
  const flags = ts.reduce((n, t) => n + t.steps.filter((s) => s.review && s.review.flag !== 'ok').length, 0);
  process.stdout.write(`${u.id ? u.id + ' ' : ''}${u.title}: ${ts.filter((t) => t.outcome === 'expected').length}/${ts.length} passed · failed: ${ids(failed)} · not run: ${ids((t) => t.status === 'notrun')} · review flags: ${flags}\n`);
}
process.stdout.write(`E2E report: ${file}\n`);
