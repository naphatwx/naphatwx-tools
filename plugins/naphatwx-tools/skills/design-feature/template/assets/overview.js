/* theme:pdf-js:start */
/* Synced from theme/pdf.js by theme/sync.mjs. Do not edit here. */
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
/* theme:pdf-js:end */
/* theme:scenario-filter-js:start */
/* Synced from theme/scenario-filter.js by theme/sync.mjs. Do not edit here. */
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
/* theme:scenario-filter-js:end */
const root = document.documentElement;
const typing = (e) => e.target.closest("input, textarea, select, [contenteditable]");
const bare = (e) => !e.metaKey && !e.ctrlKey && !e.altKey;
const store = {
    get: (key) => { try { return localStorage.getItem(key); } catch { return null; } },
    set: (key, value) => { try { localStorage.setItem(key, value); } catch { /* private window */ } },
};

// ===== Rail: always open; the edge button or "[" hides it (remembered). On phones ☰ opens it as a drawer. =====
const rail = document.getElementById("rail");
const railEdge = document.getElementById("railEdge");
const small = matchMedia("(max-width: 880px)");
function setCollapsed(on, remember = true) {
    if (on) root.setAttribute("data-rail", "collapsed"); else root.removeAttribute("data-rail");
    const label = on ? "Show index" : "Hide index";
    railEdge.setAttribute("aria-expanded", String(!on));
    railEdge.setAttribute("aria-label", label);
    railEdge.title = label + " ( [ )";
    if (remember) store.set("plan-rail", on ? "collapsed" : "");
}
setCollapsed(store.get("plan-rail") === "collapsed", false);
const collapsed = () => root.getAttribute("data-rail") === "collapsed";
const setDrawer = (on) => on ? root.setAttribute("data-drawer", "open") : root.removeAttribute("data-drawer");
function toggleRail() { small.matches ? setDrawer(!root.hasAttribute("data-drawer")) : setCollapsed(!collapsed()); }
railEdge.addEventListener("click", toggleRail);
document.getElementById("menuBtn").addEventListener("click", () => setDrawer(true));
rail.addEventListener("click", (e) => { if (small.matches && e.target.closest("a")) setDrawer(false); });
document.addEventListener("click", (e) => {
    if (root.hasAttribute("data-drawer") && !rail.contains(e.target) && !e.target.closest("#menuBtn")) setDrawer(false);
});

// ===== Trace IDs: each refs line hides behind a "N refs" chip; a click shows it on the same line =====
document.querySelectorAll(".use-case-head > .references, .use-case-index .aside, td > .references").forEach((ids) => {
    const n = ids.textContent.split(" · ").filter((s) => s.trim()).length;
    if (!n) return;
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "references-chip";
    chip.title = "Show trace IDs";
    chip.textContent = `${n} ref${n > 1 ? "s" : ""}`;
    chip.setAttribute("aria-expanded", "false");
    chip.addEventListener("click", () => chip.setAttribute("aria-expanded", String(chip.getAttribute("aria-expanded") !== "true")));
    ids.classList.add("references-ids");
    ids.before(chip);
});

// ===== Search ("/" focuses it): filters rail links, keeps a parent visible while a child matches =====
const search = document.getElementById("railSearch");
const railLinks = [...rail.querySelectorAll(".rail-list a")];
search.addEventListener("input", () => {
    const query = search.value.toLowerCase().trim();
    railLinks.forEach(a => a.classList.toggle("hidden", !!query && !a.textContent.toLowerCase().includes(query)));
    rail.querySelectorAll(".rail-list > li").forEach(item => {
        const childMatches = [...item.querySelectorAll("ol a")].some(a => !a.classList.contains("hidden"));
        if (childMatches) item.querySelector(":scope > a").classList.remove("hidden");
    });
});
search.addEventListener("keydown", (e) => {
    if (e.key === "Enter") rail.querySelector(".rail-list a:not(.hidden)")?.click();
    if (e.key === "Escape") { search.value = ""; search.dispatchEvent(new Event("input")); search.blur(); }
});

// ===== Active link on scroll: the last target whose top passed 120px; a clicked link wins until the next scroll gesture =====
const byId = new Map(railLinks.map(a => [a.getAttribute("href").slice(1), a]));
const targets = [...byId.keys()].map(id => document.getElementById(id)).filter(Boolean);
let pinnedLink = null, activeLink;
function setActive(link) {
    if (link === activeLink) return;
    activeLink = link;
    railLinks.forEach(railLink => {
        railLink.classList.toggle("active", railLink === link);
        if (railLink === link) railLink.setAttribute("aria-current", "location"); else railLink.removeAttribute("aria-current");
    });
    railTitles(); // the active link is bold, so its label may now be cut short
}
function spy() {
    if (pinnedLink) return;
    const atBottom = innerHeight + scrollY >= root.scrollHeight - 2;
    const passed = targets.filter(t => t.offsetParent && t.getBoundingClientRect().top <= 120);
    const target = atBottom ? targets[targets.length - 1] : passed[passed.length - 1] || targets[0];
    setActive(byId.get(target?.id));
}
railLinks.forEach(a => a.addEventListener("click", () => { pinnedLink = a; setActive(a); }));
["wheel", "touchstart", "keydown"].forEach(eventName => addEventListener(eventName, () => { pinnedLink = null; }, { passive: true }));
addEventListener("scroll", spy, { passive: true });
spy();

// ===== Use case views: disclosure buttons (aria-expanded), all closed at first; one panel open per use case,
// and clicking the open view's button closes it.
const useCases = [...document.querySelectorAll(".use-case")];
const viewButtons = [...document.querySelectorAll(".views button[aria-controls]")];
function selectView(button, force) {
    const open = force ?? button.getAttribute("aria-expanded") !== "true";
    button.closest(".views").querySelectorAll("button[aria-controls]").forEach(sibling => {
        const on = open && sibling === button;
        sibling.setAttribute("aria-expanded", String(on));
        const panel = document.getElementById(sibling.getAttribute("aria-controls"));
        if (!panel) return;
        const wasOpen = !panel.hidden;
        panel.hidden = !on;
        if (on && !wasOpen) { panel.classList.remove("entering"); void panel.offsetWidth; panel.classList.add("entering"); }
    });
}
viewButtons.forEach(button => {
    const panel = document.getElementById(button.getAttribute("aria-controls"));
    if (panel) panel.dataset.label = button.textContent.trim();
    button.addEventListener("click", () => selectView(button));
});
function closeViews() {
    document.querySelectorAll(".views").forEach(views => {
        const button = views.querySelector("button[aria-controls]");
        if (button) selectView(button, false);
    });
}
document.querySelectorAll(".panel").forEach(p => p.addEventListener("animationend", () => p.classList.remove("entering")));
// a link into a closed view (Acceptance criteria → #sc-<id>) opens that view first, so the browser can scroll to it
function reveal(id) {
    const target = id && document.getElementById(decodeURIComponent(id));
    const panel = target?.closest(".panel[hidden]");
    const tab = panel && document.getElementById(panel.getAttribute("aria-labelledby"));
    if (tab) selectView(tab, true);
    return target;
}
document.addEventListener("click", (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (a) reveal(a.getAttribute("href").slice(1));
});
// ===== Reload keeps what was open: views, "more" blocks, refs chips, the lightbox and the scroll spot.
// Saved per page when it closes; a different #hash (a shared link) wins over the saved spot.
const stateKey = "plan-open:" + location.pathname;
const saved = (() => { try { return JSON.parse(store.get(stateKey)) || {}; } catch { return {}; } })();
const detailsBlocks = [...document.querySelectorAll("details")];
const refsChips = [...document.querySelectorAll(".references-chip")];
const diagramBoxes = [];
(saved.views || []).forEach(id => {
    const tab = viewButtons.find(button => button.getAttribute("aria-controls") === id);
    if (tab && !tab.disabled) selectView(tab, true);
});
document.querySelectorAll(".panel.entering").forEach(panel => panel.classList.remove("entering"));
(saved.details || []).forEach(i => { if (detailsBlocks[i]) detailsBlocks[i].open = true; });
(saved.refs || []).forEach(i => refsChips[i]?.setAttribute("aria-expanded", "true"));
const restoreScroll = saved.scroll != null && location.hash === (saved.hash || "");
if (restoreScroll) history.scrollRestoration = "manual";
else if (location.hash) reveal(location.hash.slice(1))?.scrollIntoView();
addEventListener("pagehide", () => store.set(stateKey, JSON.stringify({
    views: viewButtons.filter(button => button.getAttribute("aria-expanded") === "true").map(button => button.getAttribute("aria-controls")),
    details: detailsBlocks.flatMap((block, i) => block.open ? [i] : []),
    refs: refsChips.flatMap((chip, i) => chip.getAttribute("aria-expanded") === "true" ? [i] : []),
    lightbox: lit ? diagramBoxes.indexOf(lit.box) : -1,
    hash: location.hash,
    scroll: presenting() ? null : scrollY, // presenting: the step's #hash marks the spot
})));
// the use case a 1–4 key acts on: the current slide when presenting, else the one nearest the top of the screen
function useCaseInView() {
    if (presenting()) return steps[current]?.slide.classList.contains("use-case") ? steps[current].slide : null;
    let best = null;
    for (const useCase of useCases) { if (useCase.getBoundingClientRect().top < innerHeight * 0.5) best = useCase; }
    return best && best.getBoundingClientRect().bottom > 0 ? best : null;
}

// ===== Open all: shows every use case view stacked (remembered) =====
const openAll = document.getElementById("openAll");
function setAll(on) {
    root.setAttribute("data-all", on ? "on" : "off");
    openAll.setAttribute("aria-pressed", String(on));
    openAll.textContent = on ? "Close all" : "Open all";
    store.set("plan-all", on ? "on" : "off");
}
setAll(store.get("plan-all") === "on");
// Close all also closes views opened one by one (by a click or by Present), not only the stacked ones
openAll.addEventListener("click", () => {
    const on = root.getAttribute("data-all") !== "on";
    if (!on) closeViews();
    setAll(on);
});
// Lazy diagram frames never load off screen, so the PDF would print them empty: load them all first.
const frames = [...document.querySelectorAll("iframe.diagram-frame")];
frames.forEach(f => f.addEventListener("load", () => { f.dataset.loaded = "1"; }, { once: true }));
const loadFrames = () => Promise.all(frames.filter(f => !f.dataset.loaded).map(frame => new Promise(done => {
    frame.addEventListener("load", () => setTimeout(done, 200), { once: true }); // 200 ms: the frame posts its height
    setTimeout(done, 2000);
    frame.loading = "eager";
})));
document.getElementById("keysBtn").before(addExportPdf(document.querySelector(".tools"), loadFrames));

// ===== Present: one step per screen. A use case gives one step per view; an API section one per RPC.
// Long steps scroll down; nothing scrolls sideways. ← → or Space step, Esc leaves.
const slides = [...document.querySelectorAll(".slide")];
const hud = document.getElementById("hud");
const hudLabel = document.getElementById("hudLabel");
const presentButton = document.getElementById("presentBtn");
const steps = slides.flatMap(slide => {
    const title = slide.dataset.title;
    const views = [...slide.querySelectorAll(".views button[aria-controls]:not(:disabled)")];
    if (views.length) return views.map(tab => ({ slide, tab, label: `${title} · ${tab.textContent.trim()}` }));
    const parts = [...slide.querySelectorAll(":scope > [data-part]")];
    if (parts.length) return [{ slide, part: null, label: title },
        ...parts.map(part => ({ slide, part, label: `${title} · ${part.dataset.part}` }))];
    return [{ slide, label: title }];
});
let current = 0;
const presenting = () => root.getAttribute("data-present") === "on";
// ===== Present fit: the step's diagram box ends at the room above the bar. Diagrams draw at 1:1
// (every label 14px), never scaled: a taller one scrolls in its box with a cue, a wider one sideways.
const fitted = new Set();
function updateCue(box) {
    const cue = box.querySelector(":scope > .more-cue");
    if (cue) cue.hidden = !fitted.has(box) || box.scrollTop + box.clientHeight >= box.scrollHeight - 4;
}
function unfit() {
    fitted.forEach(box => {
        box.style.maxHeight = "";
        box.classList.remove("fitted");
    });
    const previouslyFitted = [...fitted];
    fitted.clear();
    previouslyFitted.forEach(updateCue);
}
function fitRoom() {
    unfit();
    if (!presenting()) return;
    const room = innerHeight - hudSpace();
    const slide = steps[current].slide;
    const box = slide.querySelector(".panel:not([hidden]) .flowchart, .panel:not([hidden]) .sequence");
    if (!box) return;
    const sheetTop = parseFloat(getComputedStyle(document.getElementById("sheet")).paddingTop);
    const top = sheetTop + box.getBoundingClientRect().top - slide.getBoundingClientRect().top;
    const computedStyle = getComputedStyle(box);
    const paddingY = parseFloat(computedStyle.paddingTop) + parseFloat(computedStyle.paddingBottom) + box.clientTop * 2;
    const height = Math.max(200, Math.floor(room - top - paddingY));
    fitted.add(box);
    box.classList.add("fitted");
    box.style.maxHeight = height + paddingY + "px";
    if (!box.querySelector(":scope > .more-cue")) {
        box.insertAdjacentHTML("beforeend", '<div class="more-cue" aria-hidden="true" hidden>continues ↓</div>');
        box.addEventListener("scroll", () => updateCue(box), { passive: true });
    }
    box.scrollTop = 0;
    updateCue(box);
}
// the bar's footprint: its height plus its bottom offset; the sheet keeps 24px more below its last line
function hudSpace() {
    const space = hud.offsetHeight + parseFloat(getComputedStyle(hud).bottom);
    root.style.setProperty("--hud-space", space + "px");
    return space + 24;
}
addEventListener("resize", fitRoom);
document.querySelectorAll(".flowchart img").forEach(img => img.addEventListener("load", fitRoom));
function show(i) {
    current = Math.max(0, Math.min(steps.length - 1, i));
    const step = steps[current];
    slides.forEach(s => s.classList.toggle("current", s === step.slide));
    step.slide.querySelectorAll(".step-off").forEach(element => element.classList.remove("step-off"));
    if (step.tab) selectView(step.tab, true);
    if ("part" in step) {
        [...step.slide.children].forEach(child => {
            const off = step.part ? !child.matches("h2") && child !== step.part : child.hasAttribute("data-part");
            child.classList.toggle("step-off", off);
        });
    }
    hudLabel.textContent = `${current + 1} / ${steps.length} · ${step.label}`;
    fitRoom();
    history.replaceState(null, "", "#" + (step.part?.id || step.slide.id));
    scrollTo({ top: 0, behavior: "instant" });
}
function setPresent(on) {
    if (on) {
        // the last section whose top has passed 30% of the window: a short use case at the top still counts
        const near = slides.filter(s => s.getBoundingClientRect().top <= innerHeight * 0.3).pop() || slides[0];
        root.setAttribute("data-present", "on");
        hud.hidden = false;
        show(steps.findIndex(step => step.slide === near));
    } else {
        root.removeAttribute("data-present");
        hud.hidden = true;
        unfit();
        document.querySelectorAll(".step-off").forEach(element => element.classList.remove("step-off"));
        // back in docs, only the view of the last step stays open
        closeViews();
        if (steps[current].tab) selectView(steps[current].tab, true);
        steps[current].slide.scrollIntoView({ behavior: "instant" });
    }
    presentButton.setAttribute("aria-pressed", String(on));
}
presentButton.addEventListener("click", () => setPresent(true));
document.getElementById("prevSlide").addEventListener("click", () => show(current - 1));
document.getElementById("nextSlide").addEventListener("click", () => show(current + 1));
document.getElementById("exitPresent").addEventListener("click", () => setPresent(false));
// a view click while presenting jumps to that view's step
viewButtons.forEach(tab => tab.addEventListener("click", () => {
    if (!presenting()) return;
    const i = steps.findIndex(step => step.tab === tab);
    if (i >= 0) show(i);
}));
// a link while presenting jumps to the first step that holds the target
addEventListener("hashchange", () => {
    if (!presenting()) return;
    const target = document.getElementById(decodeURIComponent(location.hash.slice(1)));
    if (!target) return;
    // a row inside a use case view (#sc-<id>) goes to that view's step, not the use case's first one
    const panel = target.closest(".panel");
    let i = panel ? steps.findIndex(step => step.tab?.getAttribute("aria-controls") === panel.id) : -1;
    if (i < 0) i = steps.findIndex(step => (step.part || step.slide).contains(target));
    if (i >= 0 && i !== current) show(i);
    if (panel) target.scrollIntoView({ block: "center" });
});

// ===== Shortcut sheet ( ? ) =====
const keys = document.getElementById("keys");
const keysButton = document.getElementById("keysBtn");
function openKeys() { if (!keys.open) keys.showModal(); keys.querySelector(".keys-close").focus(); }
keysButton.addEventListener("click", openKeys);
keys.querySelector(".keys-close").addEventListener("click", () => keys.close());
keys.addEventListener("click", (e) => { if (e.target === keys) keys.close(); });

// ===== Keys =====
document.addEventListener("keydown", (e) => {
    if (typing(e) || !bare(e) || document.querySelector("dialog[open]")) return;
    const key = e.key;
    if (key === "[") { toggleRail(); return; }
    if (key === "/") { e.preventDefault(); small.matches ? setDrawer(true) : setCollapsed(false); search.focus(); return; }
    if (key === "p" || key === "P") { setPresent(!presenting()); return; }
    if (key === "?") { openKeys(); return; }
    if (["1", "2", "3", "4"].includes(key)) {
        const tab = useCaseInView()?.querySelectorAll(".views button[aria-controls]")[+key - 1];
        if (!tab || tab.disabled) return;
        selectView(tab);
        const panel = document.getElementById(tab.getAttribute("aria-controls"));
        // the key opened a panel away from the focus, so take the focus into it
        if (!presenting() && panel && !panel.hidden) panel.focus({ preventScroll: true });
        return;
    }
    if (!presenting()) return;
    if (key === "Escape") setPresent(false);
    else if (key === "ArrowRight" || key === "PageDown" || (key === " " && !e.shiftKey)) { e.preventDefault(); show(current + 1); }
    else if (key === "ArrowLeft" || key === "PageUp" || (key === " " && e.shiftKey)) { e.preventDefault(); show(current - 1); }
});

// ===== Fit each diagram-design iframe to the height its file posts (works on file://) =====
addEventListener("message", (e) => {
    if (!e.data || e.data.type !== "diagram-height") return;
    const frame = [...document.querySelectorAll(".diagram-frame")].find(f => f.contentWindow === e.source);
    if (!frame) return;
    frame.style.height = Math.ceil(e.data.height) + "px";
    if (e.data.width) frame.dataset.w = Math.ceil(e.data.width);
    if (lit?.stage.contains(frame)) fitLitFrame();
    const box = frame.closest(".flowchart, .sequence");
    if (box) updateCue(box);
});

// ===== Diagram zoom: with Zoom on, wheel zooms at the cursor and drag pans; ⛶ opens a lightbox where zoom always works =====
const zoomToggle = document.getElementById("zoomToggle");
const zooms = [];
const zoomOn = () => root.getAttribute("data-zoom") === "on";
function setZoom(on) {
    root.setAttribute("data-zoom", on ? "on" : "off");
    zoomToggle.setAttribute("aria-pressed", String(on));
    store.set("plan-zoom", on ? "on" : "off");
    if (!on) zooms.forEach(z => z.reset());
    // zoom pans with a drag instead of the box's sideways scroll
    else document.querySelectorAll(".zoomable").forEach(box => { box.scrollLeft = 0; });
}
setZoom(store.get("plan-zoom") === "on");
zoomToggle.addEventListener("click", () => setZoom(!zoomOn()));

function makeZoomable(box) {
    const stage = document.createElement("div");
    stage.className = "zoom-stage";
    stage.append(...box.childNodes);
    box.append(stage);
    box.classList.add("zoomable");
    if (stage.querySelector("iframe")) box.insertAdjacentHTML("beforeend", '<div class="zoom-shield"></div>');
    box.insertAdjacentHTML("beforeend", '<div class="zoom-tools"><button type="button" class="zoom-reset" title="Reset zoom"></button><button type="button" class="zoom-full" title="Open in lightbox" aria-label="Open diagram in lightbox">⛶</button></div>');
    const resetButton = box.querySelector(".zoom-reset");
    const active = () => box.classList.contains("in-lightbox") || (zoomOn() && !presenting());
    let scale = 1, x = 0, y = 0;
    const paint = () => {
        stage.style.transform = scale === 1 && !x && !y ? "" : `translate(${x}px, ${y}px) scale(${scale})`;
        resetButton.textContent = `↺ ${Math.round(scale * 100)}%`;
    };
    const reset = () => { scale = 1; x = 0; y = 0; paint(); };
    paint();
    box.addEventListener("wheel", (e) => {
        if (!active()) return;
        e.preventDefault();
        const rect = box.getBoundingClientRect();
        const pointerX = e.clientX - rect.left - box.clientLeft - stage.offsetLeft;
        const pointerY = e.clientY - rect.top - box.clientTop - stage.offsetTop;
        const next = Math.min(5, Math.max(0.5, scale * Math.exp(-e.deltaY * 0.0015)));
        x = pointerX - (pointerX - x) * next / scale;
        y = pointerY - (pointerY - y) * next / scale;
        scale = next;
        paint();
    }, { passive: false });
    stage.querySelectorAll("img").forEach(img => { img.draggable = false; });
    let drag = null;
    box.addEventListener("pointerdown", (e) => {
        if (!active() || e.button !== 0 || e.target.closest(".zoom-tools")) return;
        drag = { id: e.pointerId, startX: e.clientX - x, startY: e.clientY - y };
        box.setPointerCapture(e.pointerId);
        box.classList.add("panning");
    });
    box.addEventListener("pointermove", (e) => {
        if (!drag || e.pointerId !== drag.id) return;
        x = e.clientX - drag.startX; y = e.clientY - drag.startY; paint();
    });
    const endDrag = () => { drag = null; box.classList.remove("panning"); };
    box.addEventListener("pointerup", endDrag);
    box.addEventListener("pointercancel", endDrag);
    resetButton.addEventListener("click", reset);
    box.querySelector(".zoom-full").addEventListener("click", () => openLightbox(box, stage, reset));
    zooms.push({ reset });
}

const lightbox = document.createElement("dialog");
lightbox.className = "lightbox";
lightbox.innerHTML = '<button type="button" class="lightbox-close" title="Close (Esc)" aria-label="Close diagram">✕</button><p class="lightbox-caption"></p>';
let lit = null;
function caption(box) {
    const section = box.closest(".slide");
    const title = section?.querySelector("h2, h3")?.textContent.replace(/^(UC\d+|[\d.]+)/, "").trim() || "";
    const kind = box.closest(".panel")?.dataset.label || "";
    return [title, kind].filter(Boolean).join(" — ");
}
function openLightbox(box, stage, reset) {
    const opener = document.activeElement;
    // the drawing's own ratio: at 1:1 it can be narrower than the stage
    const art = (stage.querySelector(":scope > svg, :scope > img") || stage).getBoundingClientRect();
    const ratio = art.height / art.width || 1;
    const spot = document.createElement("div");
    spot.style.height = box.offsetHeight + "px";
    lightbox.querySelector(".lightbox-caption").textContent = caption(box);
    box.replaceWith(spot);
    lightbox.insertBefore(box, lightbox.querySelector(".lightbox-caption"));
    box.classList.add("in-lightbox");
    reset();
    lit = { box, stage, spot, reset, opener };
    lightbox.setAttribute("aria-label", caption(box) || "Diagram");
    lightbox.showModal();
    lightbox.querySelector(".lightbox-close").focus();
    if (litFrame()) return fitLitFrame();
    const { roomWidth, roomHeight } = room(box);
    stage.style.width = Math.min(roomWidth, roomHeight / ratio) + "px";
}
function room(box) {
    const computedStyle = getComputedStyle(box);
    return {
        roomWidth: box.clientWidth - parseFloat(computedStyle.paddingLeft) - parseFloat(computedStyle.paddingRight),
        roomHeight: box.clientHeight - parseFloat(computedStyle.paddingTop) - parseFloat(computedStyle.paddingBottom),
    };
}
// a diagram-design iframe can't be measured from here (file://), so it posts its drawing's width:
// the frame lays out at that width (nothing scrolls inside) and is scaled whole to fit the room
const litFrame = () => lit?.stage.querySelector(":scope > iframe.diagram-frame[data-w]");
function fitLitFrame() {
    const frame = litFrame();
    if (!frame) return;
    const width = +frame.dataset.w, height = parseFloat(frame.style.height) || frame.offsetHeight;
    const { roomWidth, roomHeight } = room(lit.box);
    const scale = Math.min(roomWidth / width, roomHeight / height);
    Object.assign(frame.style, { width: width + "px", transform: `scale(${scale})`, transformOrigin: "0 0" });
    Object.assign(lit.stage.style, { width: width * scale + "px", height: height * scale + "px" });
}
lightbox.addEventListener("close", () => {
    if (!lit) return;
    const { box, stage, spot, reset, opener } = lit;
    lit = null;
    box.classList.remove("in-lightbox");
    stage.style.width = stage.style.height = "";
    const frame = stage.querySelector(":scope > iframe.diagram-frame");
    if (frame) Object.assign(frame.style, { width: "", transform: "", transformOrigin: "" });
    spot.replaceWith(box);
    reset();
    if (opener?.isConnected) opener.focus({ preventScroll: true });
});
lightbox.querySelector(".lightbox-close").addEventListener("click", () => lightbox.close());
lightbox.addEventListener("click", (e) => { if (e.target === lightbox) lightbox.close(); });

// a rail label cut short by the ellipsis shows in full on hover
function railTitles() {
    rail.querySelectorAll(".rail-label").forEach(label => {
        const link = label.closest("a") || label;
        if (label.scrollWidth > label.clientWidth) link.title = label.textContent.trim(); else link.removeAttribute("title");
    });
}
addEventListener("resize", railTitles);

document.addEventListener("DOMContentLoaded", () => {
    document.body.append(lightbox);
    railTitles();
    diagramBoxes.push(...document.querySelectorAll(".flowchart, .sequence"));
    diagramBoxes.forEach(makeZoomable);
    // sequence diagrams have drawn by now, so section offsets are final
    if (restoreScroll) scrollTo({ top: saved.scroll, behavior: "instant" });
    const litBox = diagramBoxes[saved.lightbox];
    if (litBox?.offsetParent) litBox.querySelector(".zoom-full").click();
    spy();
});

// ===== Scenarios: Kind + Core-only filter over every use case's Scenarios view (bar and rows written by scenarios-panels.js) =====
const scenarioFilterBar = document.getElementById("scenario-filter");
if (scenarioFilterBar) addScenarioFilter(scenarioFilterBar, { rows: "tr[data-kind]", groups: '.panel[id$="-sc"]', title: ".scenario-name", storageKey: "plan-scenario-filter:" + location.pathname });
