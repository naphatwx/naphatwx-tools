/* Export to PDF button. Browsers have no direct PDF API, so it opens the print dialog; the page title names the file.
   addExportPdf(target, prepare) appends it to target, or floats it in the corner; await prepare() runs first. */
function addExportPdf(target, prepare) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'export-pdf no-print' + (target ? '' : ' export-pdf-float');
    b.title = 'Export PDF (pick "Save as PDF" in the print dialog)';
    b.textContent = 'Export PDF';
    b.addEventListener('click', async () => {
        if (prepare) await prepare();
        window.print();
    });
    (target || document.body).append(b);
    return b;
}
