// Mock-only: pages and scenarios. A scenario picks an entity from data.js, the caller's permissions and upstream faults.
// Selected with ?scenario=<id>, so every state has its own link; use cases (shared/use-case-play.js) pick one each.

var Scenarios = (function () {
    // every permission an operation in fake-api.js checks; RO lacks the write ones
    const RW = ['things.read', 'things.create'];
    const RO = ['things.read'];

    /** One entry per screen under page/. `extra` = default query params for a deep link. */
    const PAGES = [
        { file: 'page/example.html', label: 'Example list', icon: 'fa-list', extra: {} },
    ];
    /** `flow` = which plan flows (sequence-diagram/NN-*) this scenario demonstrates. */
    const LIST = [
        { id: 'normal', ownerId: 1204, perms: RW, faults: {}, label: 'Normal — pluto', flow: '01 · 02', hint: 'Happy path with real-looking data.' },
        { id: 'empty', ownerId: 1310, perms: RW, faults: {}, label: 'Empty — neptune', flow: '01', hint: 'No rows yet: the empty state, not an error.' },
        { id: 'unreachable', ownerId: 1204, perms: RW, faults: { readUnavailableOnce: true }, label: 'Upstream unreachable', flow: '01', hint: 'First read fails; Retry works. Never shown as empty.' },
        { id: 'read-only', ownerId: 1204, perms: RO, faults: {}, label: 'Read-only user — pluto', flow: '02', hint: 'No things.create: Create is hidden, as the real app hides it.' },
        // `blocked` = a reason the spec says to show on an unavailable control (not a permission)
        { id: 'archived', ownerId: 1204, perms: RW, faults: {}, blocked: 'This owner is archived. Things cannot be created.', label: 'Archived owner — pluto', flow: '02', hint: 'Create is shown unavailable with the reason in its tooltip, as the spec says.' },
    ];
    const params = new URLSearchParams(location.search);
    const current = LIST.find(s => s.id === params.get('scenario')) || LIST[0];

    /** Link that keeps (or switches) the scenario. @param {string} page @param {object} [extra] */
    function href(page, extra = {}, scenarioId = current.id) {
        return `${page}?${new URLSearchParams({ scenario: scenarioId, ...extra })}`;
    }
    return { PAGES, LIST, current, params, href };
})();
