/* Page tools: a text size picker, then Export PDF. Browsers have no direct PDF API, so Export PDF opens the print dialog.
   addExportPdf(target, prepare, { fontSize }) appends both to target, or to the bottom-right .float-bar (made if the page has none).
   await prepare() runs before printing. { fontSize: false } skips the picker (diagrams are 1:1, slides are sized in vw). */
const FONT_SIZES = { small: 'body 14px, meta and code 12px', medium: 'body 16px, meta and code 14px' };
const FONT_SIZE_KEY = 'naphatwx-font-size';
// The sizes live in base.css (html[data-font-size]): small overrides --fs-body, --fs-meta and --fs-code.
function setFontSize(size) {
    if (!FONT_SIZES[size]) size = 'medium';
    document.documentElement.dataset.fontSize = size;
    document.querySelectorAll('.font-size-button').forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.size === size)));
}
function addFontSizePicker(target) {
    const group = document.createElement('div');
    group.className = 'font-size-picker no-print';
    group.setAttribute('role', 'group');
    group.setAttribute('aria-label', 'Text size');
    for (const [size, sizes] of Object.entries(FONT_SIZES)) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'font-size-button';
        button.dataset.size = size;
        button.textContent = 'A';
        button.title = `${size[0].toUpperCase()}${size.slice(1)} text (${sizes})`;
        button.setAttribute('aria-label', button.title);
        button.addEventListener('click', () => {
            setFontSize(size);
            try { localStorage.setItem(FONT_SIZE_KEY, size); } catch { /* kept for this visit only */ }
        });
        group.append(button);
    }
    target.append(group);
    let saved = null;
    try { saved = localStorage.getItem(FONT_SIZE_KEY); } catch {}
    setFontSize(saved);
    // Another open page (or a framed mock) changed the size: follow it.
    window.addEventListener('storage', (event) => { if (event.key === FONT_SIZE_KEY) setFontSize(event.newValue); });
    return group;
}
function addExportPdf(target, prepare, options = {}) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'export-pdf no-print';
    if (!target) {
        target = document.querySelector('.float-bar');
        if (!target) { target = document.createElement('div'); target.className = 'float-bar no-print'; document.body.append(target); }
    }
    if (options.fontSize !== false && !document.querySelector('.font-size-picker')) addFontSizePicker(target);
    button.title = 'Export PDF (pick "Save as PDF" in the print dialog)';
    button.textContent = 'Export PDF';
    button.addEventListener('click', async () => {
        if (prepare) await prepare();
        window.print();
    });
    target.append(button);
    return button;
}
