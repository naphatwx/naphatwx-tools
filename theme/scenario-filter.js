/* Kind + Core-only filter over scenario rows. addScenarioFilter(bar, { rows, groups, storageKey }) fills bar with the buttons.
   rows: selector of the rows (data-kind = basic | alternate | exception, data-core="true" on core ones); groups: selector of the
   containers that say "No scenario matches the filter" when all their rows hide. Kinds OR together, then AND Core only. */
function addScenarioFilter(bar, options) {
    const KINDS = [['basic', 'Basic'], ['alternate', 'Alternate'], ['exception', 'Exception']];
    let state = { kinds: [], core: false };
    try {
        const saved = JSON.parse(localStorage.getItem(options.storageKey));
        if (saved) state = { kinds: (saved.kinds || []).filter(kind => KINDS.some(([id]) => id === kind)), core: !!saved.core };
    } catch { /* storage blocked: the filter starts open */ }
    const button = (label, value, title) => {
        const element = document.createElement('button');
        element.type = 'button';
        element.className = 'filter-button';
        element.textContent = label;
        element.dataset.value = value;
        if (title) element.title = title;
        return element;
    };
    const all = button('All', '');
    const kindButtons = KINDS.map(([id, label]) => button(label, id));
    const core = button('Core only', 'core', 'Core: play first');
    const kindGroup = document.createElement('div');
    kindGroup.className = 'filter-group';
    kindGroup.setAttribute('role', 'group');
    kindGroup.setAttribute('aria-label', 'Kind');
    kindGroup.innerHTML = '<span class="filter-group-label" aria-hidden="true">Kind</span><span class="filter-buttons"></span>';
    kindGroup.lastChild.append(all, ...kindButtons);
    const coreGroup = document.createElement('div');
    coreGroup.className = 'filter-group';
    coreGroup.innerHTML = '<span class="filter-buttons"></span>';
    coreGroup.lastChild.append(core);
    const count = document.createElement('span');
    count.className = 'filter-count';
    count.setAttribute('aria-live', 'polite');
    bar.classList.add('scenario-filter');
    bar.setAttribute('role', 'group');
    bar.setAttribute('aria-label', 'Filter scenarios');
    bar.replaceChildren(kindGroup, coreGroup, count);

    function apply() {
        if (state.kinds.length === KINDS.length) state.kinds = [];
        all.setAttribute('aria-pressed', String(!state.kinds.length));
        kindButtons.forEach(element => element.setAttribute('aria-pressed', String(state.kinds.includes(element.dataset.value))));
        core.setAttribute('aria-pressed', String(state.core));
        const rows = [...document.querySelectorAll(options.rows)];
        rows.forEach(row => {
            row.hidden = (state.kinds.length > 0 && !state.kinds.includes(row.dataset.kind)) || (state.core && row.dataset.core !== 'true');
        });
        count.textContent = `${rows.filter(row => !row.hidden).length} of ${rows.length}`;
        if (options.groups) document.querySelectorAll(options.groups).forEach(group => {
            const mine = rows.filter(row => group.contains(row));
            let empty = group.querySelector('.filter-empty');
            if (!empty) {
                empty = document.createElement('p');
                empty.className = 'filter-empty';
                empty.textContent = 'No scenario matches the filter';
                group.append(empty);
            }
            empty.hidden = !mine.length || mine.some(row => !row.hidden);
        });
        try { localStorage.setItem(options.storageKey, JSON.stringify(state)); } catch { /* kept for this visit only */ }
    }
    all.addEventListener('click', () => { state.kinds = []; apply(); });
    kindButtons.forEach(element => element.addEventListener('click', () => {
        const kind = element.dataset.value;
        state.kinds = state.kinds.includes(kind) ? state.kinds.filter(other => other !== kind) : [...state.kinds, kind];
        apply();
    }));
    core.addEventListener('click', () => { state.core = !state.core; apply(); });
    apply();
    return { apply };
}
