// Mock-only: pages and scenarios. A scenario picks an entity from data.js and optional upstream faults.
// Selected with ?scenario=<id>, so every state has its own link (the plan's "Try it" cards use them).

var Scenarios = (function () {
    /** One entry per screen under page/. `extra` = default query params for a deep link. */
    const PAGES = [
        { file: 'page/example.html', label: 'Example list', icon: 'fa-list', extra: {} },
    ];
    /** `flow` = which plan flows (sequence-diagram/NN-*.js) this scenario demonstrates. */
    const LIST = [
        { id: 'normal', ownerId: 1204, faults: {}, label: 'Normal — pluto', flow: '01', hint: 'Happy path with real-looking data.' },
        { id: 'empty', ownerId: 1310, faults: {}, label: 'Empty — neptune', flow: '01', hint: 'No rows yet: the empty state, not an error.' },
        { id: 'unreachable', ownerId: 1204, faults: { readUnavailableOnce: true }, label: 'Upstream unreachable', flow: '01', hint: 'First read fails; Retry works. Never shown as empty.' },
    ];
    const params = new URLSearchParams(location.search);
    const current = LIST.find(s => s.id === params.get('scenario')) || LIST[0];

    /** Link that keeps (or switches) the scenario. @param {string} page @param {object} [extra] */
    function href(page, extra = {}, scenarioId = current.id) {
        return `${page}?${new URLSearchParams({ scenario: scenarioId, ...extra })}`;
    }
    return { PAGES, LIST, current, params, href };
})();
