// The feature's use cases (user goals), each with its scenarios (one path, one result). Written by the generate-use-case skill.
// Both values are strict JSON (double quotes, no trailing commas) so a script can parse them after `var NAME = `.
// How to play each scenario in the mock lives in mock/shared/scenario-play.js, keyed by scenario id.

var USE_CASES = [
  { "id": "UC1", "title": "Create a thing", "refs": "US2 · FR-002 · FR-003" }
];

var SCENARIOS = [
  { "id": "create-read-only", "useCase": "UC1", "title": "Read-only user", "story": "FR-003", "surface": "ui",
    "given": "The user lacks things.create.",
    "when": "The user opens the owner's things.",
    "expect": ["No Create button: the app hides it without things.create.", "The list still reads."] },
  { "id": "create-archived", "useCase": "UC1", "title": "Archived owner", "story": "US2 · AC4", "surface": "ui",
    "given": "The owner is archived.",
    "when": "The user points at Create.",
    "expect": ["Create is shown unavailable, with \"This owner is archived. Things cannot be created.\" in its tooltip."] },
  { "id": "create-api", "useCase": "UC1", "title": "Valid name over the API", "story": "US2 · AC1", "surface": "api",
    "when": "A caller runs CreateThing with a name.",
    "expect": ["A Pending thing and one audit row."] },
  { "id": "create-api-empty-name", "useCase": "UC1", "title": "Empty name over the API", "story": "US2 · AC3", "surface": "api",
    "when": "A caller runs CreateThing with an empty name.",
    "expect": ["InvalidArgument \"name is required.\" — nothing is created."] }
];
