// The feature's use cases, grouped by plan flow. Written by the generate-use-case skill; other tools only read it.
// Both values are strict JSON (double quotes, no trailing commas) so a script can parse them after `var NAME = `.
// How to play each one in the mock lives in mock/shared/use-case-play.js, keyed by id.

var USE_CASE_FLOWS = [
  { "flow": "3.1", "title": "Create a thing", "refs": "US2 · FR-002 · FR-003" }
];

var USE_CASES = [
  { "id": "create-read-only", "flow": "3.1", "title": "User without create permission", "story": "FR-003", "surface": "ui",
    "given": "The user lacks things.create.",
    "when": "The user opens the owner's things.",
    "expect": ["No Create button: the app hides it without things.create.", "The list still reads."] },
  { "id": "create-archived", "flow": "3.1", "title": "Archived owner", "story": "US2 · AC4", "surface": "ui",
    "given": "The owner is archived.",
    "when": "The user points at Create.",
    "expect": ["Create is shown unavailable, with \"This owner is archived. Things cannot be created.\" in its tooltip."] },
  { "id": "create-api", "flow": "3.1", "title": "Create over the API", "story": "US2 · AC1", "surface": "api",
    "when": "A caller runs CreateThing with a name, then with an empty name.",
    "expect": ["A Pending thing and one audit row.", "Empty name → InvalidArgument \"name is required.\""] }
];
