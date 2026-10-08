// Mock-only: the use cases a reviewer can play, grouped by plan flow. Each picks a scenario (shared/scenarios.js),
// the page it opens on and how to drive it. The overview's Use cases section is generated from this same file.
// Both values are strict JSON (double quotes, no trailing commas) so a script can parse them after `var NAME = `.

var USE_CASE_FLOWS = [
  { "flow": "3.1", "title": "Create a thing", "refs": "US2 · FR-002 · FR-003" }
];

var USE_CASES = [
  { "id": "create-read-only", "flow": "3.1", "title": "User without create permission", "story": "FR-003",
    "scenario": "read-only", "page": "example",
    "steps": ["Look at the toolbar."],
    "expect": ["No Create button: the app hides it without things.create.", "The list still reads."] },
  { "id": "create-archived", "flow": "3.1", "title": "Archived owner", "story": "US2 · AC4",
    "scenario": "archived", "page": "example",
    "steps": ["Hover or tab to Create."],
    "expect": ["Create is shown unavailable, with \"This owner is archived. Things cannot be created.\" in its tooltip."] },
  { "id": "create-api", "flow": "3.1", "title": "Create over the API", "story": "US2 · AC1",
    "scenario": "normal", "page": "console",
    "op": "CreateThing", "req": { "ownerId": 1204, "name": "Third thing" },
    "steps": ["Press Run.", "Set \"name\": \"\" and run again."],
    "expect": ["A Pending thing and one audit row.", "Empty name → InvalidArgument \"name is required.\""] }
];
