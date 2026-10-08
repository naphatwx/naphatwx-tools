// Fills the report templates with the example data in data/ and writes them to examples/, for the gallery.
// Run after any template or theme change: node theme/gallery/build.mjs
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const skills = join(here, '../../plugins/naphatwx-tools/skills');

const REPORTS = [
    { out: 'deploy-plan.html', template: 'deploy-plan/template/deploy-plan-template.html', marker: '/*__PLAN_DATA__*/null', data: 'deploy-plan.json' },
    { out: 'smoke-report.html', template: 'smoke-test/template/report-template.html', marker: '/*__SMOKE_DATA__*/null', data: 'smoke-report.json' },
    { out: 'e2e-report.html', template: 'e2e-test/template/e2e-report-template.html', marker: '/*__E2E_DATA__*/null', data: 'e2e-report.json' },
];

// "@screen" in the e2e data becomes a plain fake app screen, so the step viewer has something to show.
const screen = (title) => 'data:image/svg+xml,' + encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">
<rect width="1280" height="720" fill="#18191d"/><rect width="64" height="720" fill="#1f2025"/>
<rect x="96" y="40" width="420" height="28" rx="6" fill="#26282e"/>
<rect x="96" y="100" width="1144" height="48" rx="8" fill="#1f2025"/>
${Array.from({ length: 8 }, (_, i) => `<rect x="96" y="${172 + i * 56}" width="1144" height="40" rx="6" fill="${i % 2 ? '#1f2025' : '#24262c'}"/>`).join('')}
<text x="640" y="690" fill="#a3a6b0" font-family="system-ui" font-size="22" text-anchor="middle">${title.replace(/[<&]/g, '')}</text></svg>`);

function fill(value, title = '') {
    if (Array.isArray(value)) return value.map((v) => fill(v, title));
    if (value && typeof value === 'object') {
        const t = value.title ?? title;
        return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, v === '@screen' ? screen(k === 'finalShot' ? 'Page at failure' : t) : fill(v, t)]));
    }
    return value;
}

mkdirSync(join(here, 'examples'), { recursive: true });
for (const r of REPORTS) {
    const template = readFileSync(join(skills, r.template), 'utf8');
    if (!template.includes(r.marker)) throw new Error(`${r.template}: marker ${r.marker} not found`);
    const data = fill(JSON.parse(readFileSync(join(here, 'data', r.data), 'utf8')));
    const json = JSON.stringify(data).replace(/</g, '\\u003c');
    writeFileSync(join(here, 'examples', r.out), template.replace(r.marker, () => json));
    process.stdout.write(`wrote theme/gallery/examples/${r.out}\n`);
}
