// @ts-check
// <Feature> rules the real implementation must keep. The fake API runs these same functions.
// Classic script (no modules) so it works from file://; exposes the global `Rules`.

/** @typedef {import('./types').ThingStatus} ThingStatus */
/** @typedef {import('./types').UpstreamThingRow} UpstreamThingRow */
/** @typedef {import('./types').ThingResponse} ThingResponse */
/** @typedef {import('./types').CreateThingRequest} CreateThingRequest */
/** @typedef {import('./types').ApiError} ApiError */

var Rules = (function () {
    const MAX_LIMIT = 200;

    /** Upstream state → API status. One entry per upstream value; nothing invented. */
    /** @type {Record<UpstreamThingRow['state'], ThingStatus>} */
    const STATUS_MAP = { QUEUED: 'PENDING', DONE: 'READY', ERROR: 'FAILED' };

    /** Map one upstream row to the API response (the spec's field mapping table). */
    /** @param {UpstreamThingRow} row @returns {ThingResponse} */
    function toResponse(row) {
        return { id: row.id, name: row.name, status: STATUS_MAP[row.state], createdAt: new Date(row.created_at).toISOString() };
    }

    /** @param {CreateThingRequest} r @returns {string | null} error text, or null when valid */
    function validateCreate(r) {
        if (!r.name.trim()) return 'name is required.';
        return null;
    }

    /** @type {ApiError} */
    const UNREACHABLE = { code: 'Unavailable', message: 'The service could not be reached. Try again.' };

    // Screen texts, copied verbatim from the app (or the spec while there is no code)
    const NAME_REQUIRED = 'Name is required.';
    const ARCHIVED = 'This owner is archived. Things cannot be created.';
    /** @param {string} name */
    const created = name => `${name} was created.`;

    return { MAX_LIMIT, STATUS_MAP, toResponse, validateCreate, UNREACHABLE, NAME_REQUIRED, ARCHIVED, created };
})();
