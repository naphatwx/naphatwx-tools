/* Export to PDF button. Browsers have no direct PDF API, so it opens the print dialog; the page title names the file.
   addExportPdf(target, prepare) appends it to target, or to the bottom-right .float-bar (made if the page has none).
   await prepare() runs first. */
function addExportPdf(target, prepare) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'export-pdf no-print';
    if (!target) {
        target = document.querySelector('.float-bar');
        if (!target) { target = document.createElement('div'); target.className = 'float-bar no-print'; document.body.append(target); }
    }
    b.title = 'Export PDF (pick "Save as PDF" in the print dialog)';
    b.textContent = 'Export PDF';
    b.addEventListener('click', async () => {
        if (prepare) await prepare();
        window.print();
    });
    target.append(b);
    return b;
}
