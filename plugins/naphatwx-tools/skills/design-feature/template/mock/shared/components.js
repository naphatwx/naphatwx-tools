// The app's components as HTML-string helpers. Replace every class string with the real one,
// copied from <path to the app's component files>, and list those files here.

var UI = (function () {
    const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

    /** Date format and time zone the app uses. */
    const date = iso => new Intl.DateTimeFormat('en-GB', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(iso));

    // Button — copy base / size / variant classes from the app's Button component
    const BTN = {
        base: 'inline-flex items-center justify-center gap-2 font-medium cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap',
        sm: 'px-3 py-1.5 text-xs rounded-md', md: 'px-4 py-2 text-sm rounded-lg',
        primary: 'bg-purple-600 hover:bg-purple-700 text-white',
        neutral: 'bg-white dark:bg-transparent text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600',
    };
    const btn = (variant, size, inner, attrs = '') => `<button class="${BTN.base} ${BTN[size]} ${BTN[variant]}" ${attrs}>${inner}</button>`;
    const linkBtn = (variant, size, inner, href) => `<a class="${BTN.base} ${BTN[size]} ${BTN[variant]}" href="${href}">${inner}</a>`;

    // Status badge — one entry per status in types.ts
    const STATUS = {
        PENDING: 'text-orange-600 bg-orange-100 dark:text-orange-400 dark:bg-orange-400/20',
        READY: 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-400/20',
        FAILED: 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-400/20',
    };
    const statusBadge = s => `<span class="px-2.5 py-1 rounded-full text-xs font-bold uppercase ${STATUS[s]}">${s}</span>`;

    // Inline alert — info / warn / danger
    const TONE = { info: 'border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300', warn: 'border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-300', danger: 'border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300' };
    const note = (tone, html, extra = '') => `<div class="rounded-md border px-3 py-2 text-sm ${TONE[tone]} ${extra}">${html}</div>`;

    const skel = cls => `<div class="animate-pulse rounded bg-gray-200 dark:bg-gray-700 ${cls}"></div>`;

    const emptyState = (title, desc, action = '') => `
        <div class="flex flex-col items-center justify-center py-16 text-center">
          <div class="text-sm font-semibold mb-1">${title}</div><div class="text-xs text-gray-500 max-w-md">${desc}</div>${action ? `<div class="mt-4">${action}</div>` : ''}
        </div>`;

    const modal = (inner, max = 'max-w-2xl', onBackdrop = '') => `
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" ${onBackdrop ? `onclick="if(event.target===this){${onBackdrop}}"` : ''}>
          <div class="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full ${max} max-h-[92vh] overflow-auto">${inner}</div>
        </div>`;

    function toast(title, body) {
        const t = document.createElement('div');
        t.className = 'w-80 rounded-lg border bg-white dark:bg-gray-800 shadow-xl p-3 text-sm';
        t.innerHTML = `<div class="font-semibold">${esc(title)}</div><div class="text-xs text-gray-500 mt-0.5">${esc(body)}</div>`;
        document.getElementById('toastRoot').appendChild(t);
        setTimeout(() => t.remove(), 6000);
    }

    return { esc, date, btn, linkBtn, statusBadge, note, skel, emptyState, modal, toast };
})();
