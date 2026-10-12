// Preview data for template/ only (its index loads ../use-cases.js). A real run reads <plan>/use-cases.js from generate-use-case.
// Both values are strict JSON (double quotes, no trailing commas) so a script can parse them after `var NAME = `.
// How to play each scenario on the running app lives in live/live.js, keyed by scenario id.

var USE_CASES = [
  { "id": "UC1", "title": "Read things", "refs": "US1 · FR-001" },
  { "id": "UC2", "title": "Create a thing", "refs": "US2 · FR-002 · FR-003" },
  { "id": "UC3", "title": "Backfill old things", "refs": "FR-009" }
];

var SCENARIOS = [
  { "id": "read-list", "useCase": "UC1", "title": "Newest first", "story": "US1 · AC1", "surface": "ui",
    "given": "The owner has 3 things (e.g. the new pluto-<run>: First thing READY, Second thing FAILED, Third thing PENDING). The user holds things.read.",
    "when": "The user opens the owner's things.",
    "expect": ["3 rows, newest first: Third thing PENDING, Second thing FAILED, First thing READY."] },
  { "id": "read-failed", "useCase": "UC1", "title": "Failed filter", "story": "US1 · AC3", "surface": "ui",
    "given": "One thing has failed (e.g. Second thing).",
    "when": "The user filters by Failed.",
    "expect": ["1 row: Second thing FAILED."] },
  { "id": "read-empty", "useCase": "UC1", "title": "Empty owner", "story": "US1 · AC2", "surface": "ui",
    "given": "The owner has no things (e.g. neptune).",
    "when": "The user opens the owner's things.",
    "expect": ["\"Nothing yet\" with \"No things have been created.\" — not an error."] },
  { "id": "read-unreachable", "useCase": "UC1", "title": "Upstream unreachable", "story": "FR-001", "surface": "ui",
    "given": "The upstream service is down.",
    "when": "The user opens the owner's things.",
    "expect": ["\"Could not load\" with \"The service could not be reached. Try again.\" and Retry — never an empty list."] },
  { "id": "read-retry", "useCase": "UC1", "title": "Retry once the service is back", "story": "FR-001", "surface": "ui",
    "given": "The first read failed and the service is back.",
    "when": "The user presses Retry.",
    "expect": ["The list loads: 3 rows, Third thing on top."] },
  { "id": "create-read-only", "useCase": "UC2", "title": "Read-only user", "story": "FR-003", "surface": "ui",
    "given": "The user has things.read but not things.create (e.g. VIEWER).",
    "when": "The user opens the owner's things.",
    "expect": ["No Create button at all; the list still reads 3 rows, Third thing on top."] },
  { "id": "create-archived", "useCase": "UC2", "title": "Archived owner", "story": "US2 · AC4", "surface": "ui",
    "given": "The owner is archived (e.g. the new pluto-<run>, archived). The user holds things.create.",
    "when": "The user points at Create.",
    "expect": ["Create is shown unavailable; its tooltip reads \"This owner is archived. Things cannot be created.\""] },
  { "id": "create-api", "useCase": "UC2", "title": "Valid name over the API", "story": "US2 · AC1", "surface": "api",
    "given": "The caller holds things.create.",
    "when": "A caller runs CreateThing {ownerId 1204, name \"Third thing\"}.",
    "expect": ["A thing named Third thing with status PENDING, and one audit row \"created thing #<id>\"."] },
  { "id": "create-api-empty-name", "useCase": "UC2", "title": "Empty name over the API", "story": "US2 · AC3", "surface": "api",
    "when": "A caller runs CreateThing {ownerId 1204, name \"\"}.",
    "expect": ["InvalidArgument \"name is required.\" — nothing is created."] },
  { "id": "backfill-skips-filled", "useCase": "UC3", "title": "Some things already have a status", "story": "FR-009", "surface": "job",
    "given": "Some things already have a status (e.g. 2 of 3 rows).",
    "when": "The operator runs the backfill script.",
    "expect": ["Only the 1 thing with no status is updated; the script prints \"backfill: updated=1 skipped=2\"."] },
  { "id": "backfill-rerun", "useCase": "UC3", "title": "Second run", "story": "FR-009", "surface": "job",
    "given": "The backfill already ran.",
    "when": "The operator runs it again.",
    "expect": ["Nothing changes; the script prints \"backfill: updated=0 skipped=3\"."] }
];
