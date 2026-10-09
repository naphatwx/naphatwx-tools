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
    "when": "The user opens the owner's things.",
    "expect": ["Things show newest first, each with its status."] },
  { "id": "read-failed", "useCase": "UC1", "title": "Failed filter with no match", "story": "US1 · AC3", "surface": "ui",
    "given": "No thing has failed.",
    "when": "The user filters by Failed.",
    "expect": ["\"No things match this filter\" — not an error."] },
  { "id": "read-empty", "useCase": "UC1", "title": "Empty owner", "story": "US1 · AC2", "surface": "ui",
    "given": "The owner has no things.",
    "when": "The user opens the owner's things.",
    "expect": ["\"Nothing yet\" empty state — not an error."] },
  { "id": "read-unreachable", "useCase": "UC1", "title": "Upstream unreachable", "story": "FR-001", "surface": "ui",
    "given": "The upstream service is down.",
    "when": "The user opens the owner's things.",
    "expect": ["\"The service could not be reached. Try again.\" with Retry — never an empty list."] },
  { "id": "read-retry", "useCase": "UC1", "title": "Retry once the service is back", "story": "FR-001", "surface": "ui",
    "given": "The first read failed and the service is back.",
    "when": "The user presses Retry.",
    "expect": ["The list loads."] },
  { "id": "create-read-only", "useCase": "UC2", "title": "Read-only user", "story": "FR-003", "surface": "ui",
    "given": "The user lacks things.create.",
    "when": "The user opens the owner's things.",
    "expect": ["No Create button.", "The list still reads."] },
  { "id": "create-archived", "useCase": "UC2", "title": "Archived owner", "story": "US2 · AC4", "surface": "ui",
    "given": "The owner is archived.",
    "when": "The user points at Create.",
    "expect": ["Create is shown unavailable, with \"This owner is archived. Things cannot be created.\""] },
  { "id": "create-api", "useCase": "UC2", "title": "Valid name over the API", "story": "US2 · AC1", "surface": "api",
    "when": "A caller runs CreateThing with a name.",
    "expect": ["A Pending thing and one audit row."] },
  { "id": "create-api-empty-name", "useCase": "UC2", "title": "Empty name over the API", "story": "US2 · AC3", "surface": "api",
    "when": "A caller runs CreateThing with an empty name.",
    "expect": ["InvalidArgument \"name is required.\" — nothing is created."] },
  { "id": "backfill-skips-filled", "useCase": "UC3", "title": "Some things already have a status", "story": "FR-009", "surface": "job",
    "given": "Some things already have a status.",
    "when": "The operator runs the backfill script.",
    "expect": ["Only things with no status are updated."] },
  { "id": "backfill-rerun", "useCase": "UC3", "title": "Second run", "story": "FR-009", "surface": "job",
    "given": "The backfill already ran.",
    "when": "The operator runs it again.",
    "expect": ["Nothing changes."] }
];
