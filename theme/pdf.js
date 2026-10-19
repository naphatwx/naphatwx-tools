/* Export to PDF button. Browsers have no direct PDF API, so it opens the print dialog; the page title names the file.
   addExportPdf(target, prepare) appends it to target, or to the bottom-right .float-bar (made if the page has none).
   await prepare() runs first. */
function addExportPdf(target, prepare) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'export-pdf no-print';
    if (!target) {
        target = document.querySelector('.float-bar');
        if (!target) { target = document.createElement('div'); target.className = 'float-bar no-print'; document.body.append(target); }
    }
    button.title = 'Export PDF (pick "Save as PDF" in the print dialog)';
    button.textContent = 'Export PDF';
    button.addEventListener('click', async () => {
        if (prepare) await prepare();
        window.print();
    });
    target.append(button);
    return button;
}
