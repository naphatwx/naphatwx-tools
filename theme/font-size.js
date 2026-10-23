/* Text size picker: three "A" buttons (small / medium / large), saved in localStorage so every page opens at the same size.
   addFontSize(target) appends it to target, or to the bottom-right .float-bar (made if the page has none). Returns the picker.
   Call it before addExportPdf, so Export PDF stays last. Embedded diagram frames follow the host page's choice live. */
const FONT_SIZE_KEY = 'naphatwx-font-size';
function applyFontSize(size) {
    if (size === 'small' || size === 'large') document.documentElement.dataset.fs = size;
    else delete document.documentElement.dataset.fs;
    document.querySelectorAll('.fs-btn').forEach((button) => {
        const on = button.dataset.size === (size === 'small' || size === 'large' ? size : 'medium');
        button.classList.toggle('active', on);
        button.setAttribute('aria-pressed', String(on));
    });
}
try { applyFontSize(localStorage.getItem(FONT_SIZE_KEY)); } catch {}
addEventListener('storage', (event) => { if (event.key === FONT_SIZE_KEY) applyFontSize(event.newValue); });
function addFontSize(target) {
    if (!target) {
        target = document.querySelector('.float-bar');
        if (!target) { target = document.createElement('div'); target.className = 'float-bar no-print'; document.body.append(target); }
    }
    const picker = document.createElement('div');
    picker.className = 'fs-picker no-print';
    picker.setAttribute('role', 'group');
    picker.setAttribute('aria-label', 'Text size');
    for (const [size, label] of [['small', 'Small'], ['medium', 'Medium'], ['large', 'Large']]) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'fs-btn';
        button.dataset.size = size;
        button.title = label + ' text';
        button.setAttribute('aria-label', label + ' text');
        button.textContent = 'A';
        button.addEventListener('click', () => {
            applyFontSize(size);
            try { localStorage.setItem(FONT_SIZE_KEY, size); } catch {}
        });
        picker.append(button);
    }
    target.append(picker);
    applyFontSize(document.documentElement.dataset.fs);
    return picker;
}
