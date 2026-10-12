// The feature's use cases (user goals), each with its scenarios (one path, one result). Written by the generate-use-case skill.
// Both values are strict JSON (double quotes, no trailing commas) so a script can parse them after `var NAME = `.
// How to play each scenario in the mock lives in mock/shared/scenario-play.js, keyed by scenario id.

var USE_CASES = [
  { "id": "UC1", "title": "Create a thing", "refs": "US2 · FR-002 · FR-003" }
];

var SCENARIOS = [
  { "id": "create-read-only", "useCase": "UC1", "title": "Read-only user", "story": "FR-003", "surface": "ui",
    "given": "The user has things.read but not things.create (e.g. VIEWER).",
    "when": "The user opens the owner's things.",
    "expect": ["No Create button at all; the list still reads 2 rows, Second thing on top."] },
  { "id": "create-archived", "useCase": "UC1", "title": "Archived owner", "story": "US2 · AC4", "surface": "ui",
    "given": "The owner is archived (e.g. pluto, archived). The user holds things.create.",
    "when": "The user points at Create.",
    "expect": ["Create is shown unavailable; its tooltip reads \"This owner is archived. Things cannot be created.\""] },
  { "id": "create-api", "useCase": "UC1", "title": "Valid name over the API", "story": "US2 · AC1", "surface": "api",
    "given": "The caller holds things.create.",
    "when": "A caller runs CreateThing {ownerId 1204, name \"Third thing\"}.",
    "expect": ["A thing named Third thing with status PENDING, and one audit row \"created thing #<id>\"."] },
  { "id": "create-api-empty-name", "useCase": "UC1", "title": "Empty name over the API", "story": "US2 · AC3", "surface": "api",
    "when": "A caller runs CreateThing {ownerId 1204, name \"\"}.",
    "expect": ["InvalidArgument \"name is required.\" — nothing is created."] }
];
