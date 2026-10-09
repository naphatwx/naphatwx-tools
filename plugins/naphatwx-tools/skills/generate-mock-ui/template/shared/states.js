// Mock-only: pages and mock states. A state picks an entity from data.js, the caller's permissions and upstream faults.
// Selected with ?state=<id>, so every state has its own link; scenarios (shared/scenario-play.js) pick one each.

var States = (function () {
    // every permission an operation in fake-api.js checks; RO lacks the write ones
    const RW = ['things.read', 'things.create'];
    const RO = ['things.read'];

    /** One entry per screen under page/. `extra` = default query params for a deep link. */
    const PAGES = [
        { file: 'page/example.html', label: 'Example list', icon: 'fa-list', extra: {} },
    ];
    /** `useCase` = which plan use cases (UC<n>) this state shows. */
    const LIST = [
        { id: 'normal', ownerId: 1204, perms: RW, faults: {}, label: 'Normal — pluto', useCase: 'UC1 · UC2', hint: 'Happy path with real-looking data.' },
        { id: 'empty', ownerId: 1310, perms: RW, faults: {}, label: 'Empty — neptune', useCase: 'UC1', hint: 'No rows yet: the empty state, not an error.' },
        { id: 'unreachable', ownerId: 1204, perms: RW, faults: { readUnavailableOnce: true }, label: 'Upstream unreachable', useCase: 'UC1', hint: 'First read fails; Retry works. Never shown as empty.' },
        { id: 'read-only', ownerId: 1204, perms: RO, faults: {}, label: 'Read-only user — pluto', useCase: 'UC2', hint: 'No things.create: Create is hidden, as the real app hides it.' },
        // `blocked` = a reason the spec says to show on an unavailable control (not a permission)
        { id: 'archived', ownerId: 1204, perms: RW, faults: {}, blocked: 'This owner is archived. Things cannot be created.', label: 'Archived owner — pluto', useCase: 'UC2', hint: 'Create is shown unavailable with the reason in its tooltip, as the spec says.' },
    ];
    const params = new URLSearchParams(location.search);
    const current = LIST.find(s => s.id === params.get('state')) || LIST[0];

    /** Link that keeps (or switches) the state. @param {string} page @param {object} [extra] */
    function href(page, extra = {}, stateId = current.id) {
        return `${page}?${new URLSearchParams({ state: stateId, ...extra })}`;
    }
    return { PAGES, LIST, current, params, href };
})();
