#!/usr/bin/env node
// Copies the theme/ blocks (tokens, base, pdf, diff, report, scenario, page-head, seq, scrollbar, pdf.js, diagram scripts) into skill templates between marker comments,
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
const print = (text) => process.stdout.write(text + '\n');
const printError = (text) => process.stderr.write(text + '\n');

// Mock screens and their shared code use the target app's own design system, not this theme.
const IGNORE = [/\/mock\/(page|shared|contract)\//, /\/generate-mock-ui\/template\/(page|shared|contract)\//];

// CRLF to LF: a Windows checkout has CRLF sources, and a bare '\r' line would get indented.
const stripHeader = (css) => css.replace(/\r\n/g, '\n').replace(/^\/\*[\s\S]*?\*\/\s*/, '').trimEnd();
// Marker name -> source file. The *-js blocks go inside a <script> or .js file; the rest inside a <style> or .css file.
const SOURCES = {
    tokens: 'tokens.css', base: 'base.css', pdf: 'pdf.css', 'pdf-js': 'pdf.js', diff: 'diff.css', report: 'report.css', scenario: 'scenario.css', scrollbar: 'scrollbar.css', 'page-head': 'page-head.css', seq: 'seq.css',
    'diagram-labels-js': 'diagram-labels.js', 'diagram-embed-js': 'diagram-embed.js',
    'scenario-filter': 'scenario-filter.css', 'scenario-filter-js': 'scenario-filter.js',
};
const BLOCKS = Object.fromEntries(Object.entries(SOURCES)
    .map(([name, file]) => [name, stripHeader(readFileSync(join(ROOT, 'theme', file), 'utf8'))]));

// ---- palette: every hex in tokens.css, plus pure white / black ----
function normalizeHex(hex) {
    hex = hex.toLowerCase();
    return hex.length === 4 ? '#' + [...hex.slice(1)].map((digit) => digit + digit).join('') : hex;
}
const hexes = (text) => (text.match(/#[0-9a-fA-F]{3,8}\b/g) || []).map(normalizeHex);
const PALETTE = new Set([...hexes(BLOCKS.tokens), '#ffffff', '#000000']);

// ---- contrast: text tokens must read on every surface ----
const tokens = Object.fromEntries([...BLOCKS.tokens.matchAll(/--([\w-]+):\s*([^;]+);/g)].map((match) => [match[1], match[2].trim()]));
function luminance(hex) {
    const [red, green, blue] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
        .map((channel) => (channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4));
    return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}
const contrastRatio = (a, b) => { const [lighter, darker] = [luminance(a), luminance(b)].sort((p, q) => q - p); return (lighter + 0.05) / (darker + 0.05); };

const problems = [];
for (const foreground of ['text', 'text-2', 'text-3', 'accent', 'ok', 'warn', 'bad', 'neutral']) {
    for (const background of ['bg', 'surface', 'surface-2', 'surface-3', 'hover', 'accent-fill']) {
        const ratio = contrastRatio(tokens[foreground], tokens[background]);
        if (ratio < 4.5) problems.push(`contrast: --${foreground} on --${background} is ${ratio.toFixed(2)}:1 (needs 4.5)`);
    }
}

// ---- walk templates ----
function* walk(dir) {
    for (const name of readdirSync(dir)) {
        const path = join(dir, name);
        if (statSync(path).isDirectory()) yield* walk(path);
        else if (/\.(html|css|svg|js)$/.test(name)) yield path;
    }
}

const MARK = /^([ \t]*)\/\* theme:([\w-]+):start \*\/[\s\S]*?\/\* theme:\2:end \*\//gm;
let synced = 0;
for (const file of walk(SKILLS)) {
    const relativePath = relative(ROOT, file).split(sep).join('/');
    if (!relativePath.includes('/template/') || IGNORE.some((pattern) => pattern.test(relativePath))) continue;
    const source = readFileSync(file, 'utf8');

    const next = source.replace(MARK, (whole, indent, name) => {
        if (!BLOCKS[name]) { problems.push(`marker: ${relativePath}: unknown block theme:${name}`); return whole; }
        const body = BLOCKS[name].split('\n').map((line) => (line ? indent + line : line)).join('\n');
        return `${indent}/* theme:${name}:start */\n${indent}/* Synced from theme/${SOURCES[name]} by theme/sync.mjs. Do not edit here. */\n${body}\n${indent}/* theme:${name}:end */`;
    });
    if (next !== source) {
        synced++;
        if (CHECK) problems.push(`drift: ${relativePath} (run node theme/sync.mjs)`);
        else writeFileSync(file, next);
    }

    // Off-palette colors outside the synced blocks. Script files only take part in the sync.
    if (relativePath.endsWith('.js')) continue;
    next.replace(MARK, '').split('\n').forEach((line) => {
        for (const hex of hexes(line)) {
            if (hex.length === 7 && !PALETTE.has(hex)) problems.push(`palette: ${relativePath}: ${hex} is not a theme color ("${line.trim().slice(0, 80)}")`);
        }
    });
}

// ---- preview copies: design-feature's template previews files the other skills own ----
// Each [preview, source] dir pair must match file for file; the generator is the source of truth.
const DESIGN_FEATURE = 'design-feature/template/';
const PREVIEWS = [
    [DESIGN_FEATURE + 'mock', 'generate-mock-ui/template'],
    [DESIGN_FEATURE + 'sequence-diagram', 'generate-diagram/template/sequence-diagram'],
    [DESIGN_FEATURE + 'flowchart', 'generate-diagram/template/flowchart'],
    [DESIGN_FEATURE + 'database/er-diagram.html', 'generate-diagram/template/er/er-diagram.html'],
];
// Preview files that differ on purpose: design-feature's own example data, or diagram-design stand-ins.
const OWN = new Set([DESIGN_FEATURE + 'mock/shared/scenario-play.js', DESIGN_FEATURE + 'mock/shared/states.js', DESIGN_FEATURE + 'flowchart/02-example-flow.html', DESIGN_FEATURE + 'sequence-diagram/02-example-flow.html']);
// Source files the preview doesn't need: the overview embeds the diagrams, not the standalone viewer.
const SOURCE_ONLY = new Set(['generate-diagram/template/sequence-diagram/index.html']);
// OWN and SOURCE_ONLY use '/'; relative() returns '\' on Windows.
const skillPath = (path) => relative(SKILLS, path).split(sep).join('/');
const filesOf = (path) => (statSync(path).isDirectory()
    ? readdirSync(path).flatMap((name) => filesOf(join(path, name)))
    : [path]);
let copied = 0;
for (const [preview, source] of PREVIEWS) {
    const [previewRoot, sourceRoot] = [join(SKILLS, preview), join(SKILLS, source)];
    for (const sourceFile of filesOf(sourceRoot)) {
        const previewFile = join(previewRoot, relative(sourceRoot, sourceFile));
        const previewName = skillPath(previewFile);
        if (OWN.has(previewName) || SOURCE_ONLY.has(skillPath(sourceFile))) continue;
        const want = readFileSync(sourceFile);
        let have = null;
        try { have = readFileSync(previewFile); } catch {}
        if (have && want.equals(have)) continue;
        copied++;
        if (CHECK) problems.push(`preview: ${previewName} differs from ${skillPath(sourceFile)} (run node theme/sync.mjs)`);
        else writeFileSync(previewFile, want);
    }
    if (statSync(previewRoot).isDirectory()) {
        for (const previewFile of filesOf(previewRoot)) {
            const previewName = skillPath(previewFile);
            let inSource = true;
            try { statSync(join(sourceRoot, relative(previewRoot, previewFile))); } catch { inSource = false; }
            if (!inSource && !OWN.has(previewName)) problems.push(`preview: ${previewName} has no source in ${source} (delete it, or list it in OWN)`);
        }
    }
}

if (!CHECK) print(`theme: ${synced} file(s) updated, ${copied} preview copy(ies) refreshed`);
if (problems.length) {
    printError(problems.join('\n'));
    process.exit(CHECK ? 1 : 0);
}
if (CHECK) print('theme: all templates in sync');
