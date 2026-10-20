/* Search + Status / Type / Kind / Core filter over scenario rows. addScenarioFilter(anchor, options) puts the sticky bar in anchor's place.
   Rows carry data-surface (ui | api | mcp | job), data-kind (basic | alternate | exception), data-core="true", data-status.
   options: rows, groups (containers that say "No scenario matches the filter"), storageKey, statuses ([[value, label]]),
   status(row) and flag(row) (computed per row), title (selector the search reads and marks), sort ({ label, run(on) }), after(). */
function addScenarioFilter(anchor, options) {
    const TYPES = [['ui', 'UI'], ['api', 'API'], ['mcp', 'MCP'], ['job', 'JOB']];
    const KINDS = [['basic', 'Basic'], ['alternate', 'Alternate'], ['exception', 'Exception']];
    const ICON_SEARCH = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>';
    const ICON_X = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>';
    const make = (html) => { const template = document.createElement('template'); template.innerHTML = html.trim(); return template.content.firstChild; };
    const titleOf = (row) => (options.title && row.querySelector(options.title)) || row.querySelector('.scenario-name, .title') || row;
    const read = (row) => ({
        status: options.status ? options.status(row) : row.dataset.status,
        type: row.dataset.surface, kind: row.dataset.kind, core: row.dataset.core === 'true',
        flag: options.flag && options.flag(row) ? 'yes' : 'no',
        text: titleOf(row).textContent.toLowerCase(),
    });
    const data = new Map();
    const readAll = () => document.querySelectorAll(options.rows).forEach((row) => { row.classList.add('filter-target'); data.set(row, read(row)); });
    readAll();
    const present = (key, list) => list.filter(([value]) => [...data.values()].some((row) => row[key] === value));
    const groups = [options.statuses && ['status', 'Status', options.statuses], ['type', 'Type', present('type', TYPES)], ['kind', 'Kind', present('kind', KINDS)]]
        .filter((group) => group && group[2].length > 1);
    if (options.flag) groups.push(['flag', 'Review', [['yes', 'Has review flags']]]);
    const hasCore = [...data.values()].some((row) => row.core);

    let state = { status: [], type: [], kind: [], flag: [], core: false, q: '' };
    try {
        const saved = JSON.parse(localStorage.getItem(options.storageKey));
        if (saved) groups.forEach(([key, , items]) => { state[key] = (saved[key] || []).filter((value) => items.some(([id]) => id === value)); });
        if (saved) { state.core = hasCore && !!saved.core; state.q = typeof saved.q === 'string' ? saved.q : ''; }
    } catch { /* storage blocked: the filter starts open */ }

    const match = (row, skip) => groups.every(([key]) => key === skip || !state[key].length || state[key].includes(row[key]))
        && (skip === 'core' || !state.core || row.core) && (!state.q || row.text.includes(state.q));
    // a count is what you would get by picking it, with the other choices kept
    const countOf = (key, value) => [...data.values()].filter((row) => match(row, key) && (key === 'core' ? row.core : row[key] === value)).length;
    const active = () => [...groups.flatMap(([key, , items]) => state[key].map((value) => ({ key, value, label: items.find(([id]) => id === value)[1] }))),
        ...(state.core ? [{ key: 'core', label: 'Core only' }] : [])];
    const toggle = (key, value) => {
        if (key === 'core') state.core = !state.core;
        else state[key] = state[key].includes(value) ? state[key].filter((other) => other !== value) : [...state[key], value];
        apply();
    };

    const wrap = make('<div class="scenario-filter no-print"></div>');
    const dock = make('<div class="filter-dock" role="search" aria-label="Filter scenarios"></div>');
    wrap.append(dock);
    anchor.replaceWith(wrap);
    const bar = make('<div class="filter-bar"></div>');
    const field = make(`<label class="filter-search">${ICON_SEARCH}<span class="filter-chips"></span><input type="search" placeholder="Filter scenarios" aria-label="Filter scenarios by title"><kbd class="filter-key" title="Press / to search">/</kbd></label>`);
    const input = field.querySelector('input');
    const chips = field.querySelector('.filter-chips');
    const count = make('<span class="filter-count" aria-live="polite"></span>');
    const clear = make('<button type="button" class="filter-action filter-clear" hidden>Clear</button>');
    bar.append(field, make('<span class="filter-sep"></span>'), count, clear);
    if (options.sort) {
        const sort = make(`<button type="button" class="filter-action" aria-pressed="false">${options.sort.label}</button>`);
        sort.onclick = () => { const on = sort.getAttribute('aria-pressed') !== 'true'; sort.setAttribute('aria-pressed', String(on)); options.sort.run(on); };
        bar.append(make('<span class="filter-sep"></span>'), sort);
    }
    const panel = make('<div class="filter-panel"><div><div class="filter-groups"></div></div></div>');
    const list = panel.querySelector('.filter-groups');
    const buttons = [];
    const addGroup = (key, label, items) => {
        const group = make(`<div class="filter-group" role="group" aria-label="${label}"><span class="filter-group-label" aria-hidden="true">${label}</span><div class="filter-options"></div></div>`);
        items.forEach(([value, text]) => {
            const button = make(`<button type="button" class="filter-option">${text}<span class="n"></span></button>`);
            button.onclick = () => toggle(key, value);
            group.lastChild.append(button);
            buttons.push([key, value, button]);
        });
        list.append(group);
    };
    groups.forEach(([key, label, items]) => addGroup(key, label, items));
    if (hasCore) addGroup('core', 'Core', [['', 'Core only']]);
    dock.append(bar, panel);

    input.value = state.q;
    input.addEventListener('input', () => { state.q = input.value.trim().toLowerCase(); apply(); });
    input.addEventListener('focus', () => dock.classList.add('open'));
    input.addEventListener('keydown', (event) => {
        if (event.key === 'Backspace' && !input.value) { const last = active().pop(); if (last) toggle(last.key, last.value); }
    });
    clear.onclick = () => { groups.forEach(([key]) => { state[key] = []; }); state.core = false; state.q = ''; input.value = ''; apply(); };
    // the panel floats over the rows, so a click outside or Escape closes it
    document.addEventListener('click', (event) => { if (!dock.contains(event.target)) dock.classList.remove('open'); });
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && dock.classList.contains('open')) { dock.classList.remove('open'); input.blur(); }
        if (event.key === '/' && !/^(input|textarea|select)$/i.test(document.activeElement.tagName) && !document.activeElement.isContentEditable) { event.preventDefault(); input.focus(); }
    });

    function mark(row) {
        const title = titleOf(row);
        title.querySelectorAll('mark.filter-mark').forEach((old) => old.replaceWith(old.textContent));
        title.normalize();
        if (!state.q) return;
        const walker = document.createTreeWalker(title, NodeFilter.SHOW_TEXT);
        const hits = [];
        while (walker.nextNode()) { const at = walker.currentNode.data.toLowerCase().indexOf(state.q); if (at >= 0) hits.push([walker.currentNode, at]); }
        hits.forEach(([node, at]) => {
            const hit = node.splitText(at);
            hit.splitText(state.q.length);
            const element = document.createElement('mark');
            element.className = 'filter-mark';
            element.textContent = hit.data;
            hit.replaceWith(element);
        });
    }

    function apply() {
        readAll();
        let shown = 0;
        data.forEach((row, element) => { element.hidden = !match(row); if (!element.hidden) shown++; mark(element); });
        count.textContent = `${shown} of ${data.size}`;
        buttons.forEach(([key, value, button]) => {
            const total = countOf(key, value);
            button.setAttribute('aria-pressed', String(key === 'core' ? state.core : state[key].includes(value)));
            button.querySelector('.n').textContent = total;
            button.classList.toggle('zero', !total);
        });
        chips.replaceChildren(...active().map(({ key, value, label }) => {
            const chip = make(`<button type="button" class="filter-chip" aria-label="Remove ${label}">${label}${ICON_X}</button>`);
            chip.onclick = (event) => { event.preventDefault(); toggle(key, value); };
            return chip;
        }));
        clear.hidden = !active().length && !state.q;
        if (options.groups) document.querySelectorAll(options.groups).forEach((group) => {
            const mine = [...data.keys()].filter((element) => group.contains(element));
            let empty = group.querySelector(':scope > .filter-empty');
            if (!empty) { empty = make('<p class="filter-empty">No scenario matches the filter</p>'); group.append(empty); }
            empty.hidden = !mine.length || mine.some((element) => !element.hidden);
        });
        if (options.after) options.after();
        try { localStorage.setItem(options.storageKey, JSON.stringify(state)); } catch { /* kept for this visit only */ }
    }
    apply();
    return { apply };
}
