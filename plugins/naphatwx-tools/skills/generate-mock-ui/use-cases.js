// Preview data for template/ only (its pages load ../use-cases.js). A real mock reads <plan>/use-cases.js from generate-use-case.
// Both values are strict JSON (double quotes, no trailing commas) so a script can parse them after `var NAME = `.
// How to play each one in the mock lives in mock/shared/use-case-play.js, keyed by id.

var USE_CASE_FLOWS = [
  { "flow": "3.1", "title": "Read things", "refs": "US1 · FR-001" },
  { "flow": "3.2", "title": "Create a thing", "refs": "US2 · FR-002 · FR-003" },
  { "flow": "3.3", "title": "Backfill old things", "refs": "FR-009" }
];

var USE_CASES = [
  { "id": "read-list", "flow": "3.1", "title": "Read the list", "story": "US1 · AC1", "surface": "ui",
    "when": "The user opens the owner's things.",
    "expect": ["Things show newest first, each with its status."] },
  { "id": "read-failed", "flow": "3.1", "title": "Only failed things", "story": "US1 · AC3", "surface": "ui",
    "given": "No thing has failed.",
    "when": "The user filters by Failed.",
    "expect": ["\"No things match this filter\" — not an error."] },
  { "id": "read-empty", "flow": "3.1", "title": "Owner with no things", "story": "US1 · AC2", "surface": "ui",
    "given": "The owner has no things.",
    "when": "The user opens the owner's things.",
    "expect": ["\"Nothing yet\" empty state — not an error."] },
  { "id": "read-unreachable", "flow": "3.1", "title": "Upstream unreachable", "story": "FR-001", "surface": "ui",
    "given": "The upstream service is down.",
    "when": "The user opens the owner's things, then presses Retry once it is back.",
    "expect": ["\"The service could not be reached. Try again.\" with Retry — never an empty list.", "Retry loads the list."] },
  { "id": "create-read-only", "flow": "3.2", "title": "User without create permission", "story": "FR-003", "surface": "ui",
    "given": "The user lacks things.create.",
    "when": "The user opens the owner's things.",
    "expect": ["No Create button.", "The list still reads."] },
  { "id": "create-archived", "flow": "3.2", "title": "Archived owner", "story": "US2 · AC4", "surface": "ui",
    "given": "The owner is archived.",
    "when": "The user points at Create.",
    "expect": ["Create is shown unavailable, with \"This owner is archived. Things cannot be created.\""] },
  { "id": "create-api", "flow": "3.2", "title": "Create over the API", "story": "US2 · AC1", "surface": "api",
    "when": "A caller runs CreateThing with a name, then with an empty name.",
    "expect": ["A Pending thing and one audit row.", "Empty name → InvalidArgument \"name is required.\""] },
  { "id": "backfill-skips-filled", "flow": "3.3", "title": "Backfill skips filled rows", "story": "FR-009", "surface": "job",
    "given": "Some things already have a status.",
    "when": "The operator runs the backfill script.",
    "expect": ["Only things with no status are updated.", "A second run changes nothing."] }
];
