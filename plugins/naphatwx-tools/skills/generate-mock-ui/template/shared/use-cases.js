// Mock-only: the use cases a reviewer can play, grouped by plan flow. Each picks a scenario (shared/scenarios.js),
// the page it opens on and how to drive it. The overview's Use cases section is generated from this same file.
// Both values are strict JSON (double quotes, no trailing commas) so a script can parse them after `var NAME = `.

var USE_CASE_FLOWS = [
  { "flow": "3.1", "title": "Read things", "refs": "US1 · FR-001" },
  { "flow": "3.2", "title": "Create a thing", "refs": "US2 · FR-002 · FR-003" },
  { "flow": "3.3", "title": "Backfill old things", "refs": "FR-009", "none": "An operator script, run once per environment. No screen to play." }
];

var USE_CASES = [
  { "id": "read-list", "flow": "3.1", "title": "Read the list", "story": "US1 · AC1",
    "scenario": "normal", "page": "example",
    "steps": ["Look at the list: newest first.", "Press Refresh."],
    "expect": ["Second thing shows as Pending, First thing as Ready."] },
  { "id": "read-failed", "flow": "3.1", "title": "Only failed things", "story": "US1 · AC3",
    "scenario": "normal", "page": "example", "params": { "status": "FAILED" },
    "steps": ["The Status filter is set to Failed."],
    "expect": ["\"No things match this filter\" — not an error."] },
  { "id": "read-empty", "flow": "3.1", "title": "Owner with no things", "story": "US1 · AC2",
    "scenario": "empty", "page": "example",
    "steps": ["Open the list of neptune."],
    "expect": ["\"Nothing yet\" empty state — not an error."] },
  { "id": "read-unreachable", "flow": "3.1", "title": "Upstream unreachable", "story": "FR-001",
    "scenario": "unreachable", "page": "example",
    "steps": ["Wait for the first read to fail.", "Press Retry."],
    "expect": ["\"The service could not be reached. Try again.\" with Retry — never an empty list.", "Retry loads the list."] },
  { "id": "create-read-only", "flow": "3.2", "title": "User without create permission", "story": "FR-003",
    "scenario": "read-only", "page": "example",
    "steps": ["Look at the toolbar."],
    "expect": ["No Create button: the app hides it without things.create.", "The list still reads."] },
  { "id": "create-archived", "flow": "3.2", "title": "Archived owner", "story": "US2 · AC4",
    "scenario": "archived", "page": "example",
    "steps": ["Hover or tab to Create."],
    "expect": ["Create is shown unavailable, with \"This owner is archived. Things cannot be created.\" in its tooltip."] },
  { "id": "create-api", "flow": "3.2", "title": "Create over the API", "story": "US2 · AC1",
    "scenario": "normal", "page": "console",
    "op": "CreateThing", "req": { "ownerId": 1204, "name": "Third thing" },
    "steps": ["Press Run.", "Set \"name\": \"\" and run again."],
    "expect": ["A Pending thing and one audit row.", "Empty name → InvalidArgument \"name is required.\""] }
];
