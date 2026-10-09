#!/usr/bin/env node
// Copies theme/tokens.css, base.css, pdf.css and pdf.js into every skill template between marker comments,
// so each skill folder stays self-contained (`npx skills add` installs one folder only).
// Also refreshes design-feature's preview copies of other skills' templates (see PREVIEWS).
// Usage: node theme/sync.mjs          write the blocks and preview copies
//        node theme/sync.mjs --check  fail on drift, stale previews, off-palette hex colors, or low contrast
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, dirname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SKILLS = join(ROOT, 'plugins/naphatwx-tools/skills');
const CHECK = process.argv.includes('--check');
const out = (s) => process.stdout.write(s + '\n');
const err = (s) => process.stderr.write(s + '\n');

// Mock screens and their shared code use the target app's own design system, not this theme.
const IGNORE = [/\/mock\/(page|shared|contract)\//, /\/generate-mock-ui\/template\/(page|shared|contract)\//];

const stripHeader = (css) => css.replace(/^\/\*[\s\S]*?\*\/\s*/, '').trimEnd();
// Marker name -> source file. pdf-js goes inside a <script>; the rest inside a <style> or .css file.
const SOURCES = { tokens: 'tokens.css', base: 'base.css', pdf: 'pdf.css', 'pdf-js': 'pdf.js' };
const BLOCKS = Object.fromEntries(Object.entries(SOURCES)
    .map(([name, file]) => [name, stripHeader(readFileSync(join(ROOT, 'theme', file), 'utf8'))]));

// ---- palette: every hex in tokens.css, plus pure white / black ----
function norm(h) {
    h = h.toLowerCase();
    return h.length === 4 ? '#' + [...h.slice(1)].map((c) => c + c).join('') : h;
}
const hexes = (s) => (s.match(/#[0-9a-fA-F]{3,8}\b/g) || []).map(norm);
const PALETTE = new Set([...hexes(BLOCKS.tokens), '#ffffff', '#000000']);

// ---- contrast: text tokens must read on every surface ----
const tok = Object.fromEntries([...BLOCKS.tokens.matchAll(/--([\w-]+):\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]));
function lum(hex) {
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
        .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

const problems = [];
for (const fg of ['text', 'text-2', 'text-3', 'accent', 'ok', 'warn', 'bad', 'neutral']) {
    for (const bg of ['bg', 'surface', 'surface-2', 'surface-3', 'accent-fill']) {
        const r = ratio(tok[fg], tok[bg]);
        if (r < 4.5) problems.push(`contrast: --${fg} on --${bg} is ${r.toFixed(2)}:1 (needs 4.5)`);
    }
}

// ---- walk templates ----
function* walk(dir) {
    for (const name of readdirSync(dir)) {
        const p = join(dir, name);
        if (statSync(p).isDirectory()) yield* walk(p);
        else if (/\.(html|css|svg|js)$/.test(name)) yield p;
    }
}

const MARK = /^([ \t]*)\/\* theme:([\w-]+):start \*\/[\s\S]*?\/\* theme:\2:end \*\//gm;
let synced = 0;
for (const file of walk(SKILLS)) {
    const rel = relative(ROOT, file);
    if (!rel.includes('/template/') || IGNORE.some((re) => re.test(rel))) continue;
    const src = readFileSync(file, 'utf8');

    const next = src.replace(MARK, (whole, ind, name) => {
        if (!BLOCKS[name]) { problems.push(`marker: ${rel}: unknown block theme:${name}`); return whole; }
        const body = BLOCKS[name].split('\n').map((l) => (l ? ind + l : l)).join('\n');
        return `${ind}/* theme:${name}:start */\n${ind}/* Synced from theme/${SOURCES[name]} by theme/sync.mjs. Do not edit here. */\n${body}\n${ind}/* theme:${name}:end */`;
    });
    if (next !== src) {
        synced++;
        if (CHECK) problems.push(`drift: ${rel} (run node theme/sync.mjs)`);
        else writeFileSync(file, next);
    }

    // Off-palette colors outside the synced blocks. Script files only take part in the sync.
    if (rel.endsWith('.js')) continue;
    next.replace(MARK, '').split('\n').forEach((line) => {
        for (const h of hexes(line)) {
            if (h.length === 7 && !PALETTE.has(h)) problems.push(`palette: ${rel}: ${h} is not a theme color ("${line.trim().slice(0, 80)}")`);
        }
    });
}

// ---- preview copies: design-feature's template previews files the other skills own ----
// Each [preview, source] dir pair must match file for file; the generator is the source of truth.
const DF = 'design-feature/template/';
const PREVIEWS = [
    [DF + 'mock', 'generate-mock-ui/template'],
    [DF + 'sequence-diagram', 'generate-diagram/template/sequence-diagram'],
    [DF + 'flowchart', 'generate-diagram/template/flowchart'],
    [DF + 'database/er-diagram.html', 'generate-diagram/template/er/er-diagram.html'],
];
// Preview files that differ on purpose: design-feature's own example data, or diagram-design stand-ins.
const OWN = new Set([DF + 'mock/shared/scenario-play.js', DF + 'mock/shared/states.js', DF + 'flowchart/02-example-flow.html', DF + 'sequence-diagram/02-example-flow.html']);
// Source files the preview doesn't need: the overview embeds the diagrams, not the standalone viewer.
const SOURCE_ONLY = new Set(['generate-diagram/template/sequence-diagram/index.html']);
// OWN and SOURCE_ONLY use '/'; relative() returns '\' on Windows.
const skillPath = (p) => relative(SKILLS, p).split(sep).join('/');
const filesOf = (p) => (statSync(p).isDirectory()
    ? readdirSync(p).flatMap((n) => filesOf(join(p, n)))
    : [p]);
let copied = 0;
for (const [preview, source] of PREVIEWS) {
    const [pAbs, sAbs] = [join(SKILLS, preview), join(SKILLS, source)];
    for (const s of filesOf(sAbs)) {
        const p = join(pAbs, relative(sAbs, s));
        const rel = skillPath(p);
        if (OWN.has(rel) || SOURCE_ONLY.has(skillPath(s))) continue;
        const want = readFileSync(s);
        let have = null;
        try { have = readFileSync(p); } catch {}
        if (have && want.equals(have)) continue;
        copied++;
        if (CHECK) problems.push(`preview: ${rel} differs from ${skillPath(s)} (run node theme/sync.mjs)`);
        else writeFileSync(p, want);
    }
    if (statSync(pAbs).isDirectory()) {
        for (const p of filesOf(pAbs)) {
            const rel = skillPath(p);
            let inSource = true;
            try { statSync(join(sAbs, relative(pAbs, p))); } catch { inSource = false; }
            if (!inSource && !OWN.has(rel)) problems.push(`preview: ${rel} has no source in ${source} (delete it, or list it in OWN)`);
        }
    }
}

if (!CHECK) out(`theme: ${synced} file(s) updated, ${copied} preview copy(ies) refreshed`);
if (problems.length) {
    err(problems.join('\n'));
    process.exit(CHECK ? 1 : 0);
}
if (CHECK) out('theme: all templates in sync');
