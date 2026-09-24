// @ts-check
// Mock data in the real upstream shapes. Realistic names, ids and dates; enough rows to page.
// Keys follow the comments in types.ts MockData.

/** @type {import('./types').MockData} */
var MOCK_DATA = {
    owners: [
        { id: 1204, name: 'pluto' },
        { id: 1310, name: 'neptune' },
    ],
    things: {
        1204: [
            { id: 502, owner_id: 1204, name: 'Second thing', state: 'QUEUED', created_at: '2026-09-24T15:06:00+07:00' },
            { id: 501, owner_id: 1204, name: 'First thing', state: 'DONE', created_at: '2026-09-20T11:42:00+07:00' },
        ],
        1310: [],
    },
};
