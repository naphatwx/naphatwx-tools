// @ts-check
// The feature's use cases (user goals), each with its scenarios (one path, one result), and the spec's acceptance criteria.
// One scenario = one screen = one result. "core": true marks the ones to play first: every basic, plus the main alternates and the errors users hit most.
// Written by the generate-use-case skill. All values are strict JSON (double quotes, no trailing commas) so a script can parse them after `var NAME = `.
// Every skill that plays or tests the feature (mock, play, e2e) reads this file and shows the same tree: use case → scenarios, in this order.

/** @type {import("./use-cases.types").UseCase[]} */
var USE_CASES = [
  { "id": "UC1", "title": "Read things", "refs": "US1 · FR-001", "channels": ["ui", "mcp"] },
  { "id": "UC2", "title": "Create a thing", "refs": "US2 · FR-002 · FR-003", "channels": ["ui", "mcp"] },
  { "id": "UC3", "title": "Backfill old things", "refs": "FR-009", "channels": ["job"] }
];

/** @type {import("./use-cases.types").Scenario[]} */
var SCENARIOS = [
  { "id": "read-list", "useCase": "UC1", "kind": "basic", "core": true, "title": "Newest first", "story": "US1 · AC1", "surface": "ui",
    "given": "The owner has 2 things (e.g. pluto: Second thing from 24 Sep, First thing from 20 Sep). The user holds things.read.",
    "when": "The user opens the owner's things.",
    "expect": ["2 rows, newest first: Second thing PENDING, then First thing READY."] },
  { "id": "read-failed", "useCase": "UC1", "kind": "alternate", "title": "Failed filter with no match", "story": "US1 · AC3", "surface": "ui",
    "given": "No thing has failed (e.g. pluto: one PENDING, one READY).",
    "when": "The user filters by Failed.",
    "expect": ["\"No things match this filter\" — not an error."],
    "na": { "mcp": "ListThings has no status filter; an MCP caller reads each row's status (mcp-list)." } },
  { "id": "read-empty", "useCase": "UC1", "kind": "alternate", "title": "Empty owner", "story": "US1 · AC2", "surface": "ui",
    "given": "The owner has no things (e.g. neptune).",
    "when": "The user opens the owner's things.",
    "expect": ["\"Nothing yet\" with \"No things have been created.\" — not an error."] },
  { "id": "read-unreachable", "useCase": "UC1", "kind": "exception", "title": "Upstream unreachable", "story": "FR-001", "surface": "ui",
    "given": "The upstream service is down.",
    "when": "The user opens the owner's things.",
    "expect": ["\"Could not load\" with \"The service could not be reached. Try again.\" and Retry — never an empty list."] },
  { "id": "read-retry", "useCase": "UC1", "kind": "alternate", "title": "Retry once the service is back", "story": "FR-001", "surface": "ui",
    "given": "The first read failed and the service is back.",
    "when": "The user presses Retry.",
    "expect": ["The list loads: 2 rows, Second thing on top."] },
  { "id": "mcp-list", "useCase": "UC1", "kind": "basic", "core": true, "title": "List things over MCP", "story": "US1 · AC1", "surface": "mcp",
    "given": "The caller holds things.read. The owner has 2 things (e.g. pluto, owner 1204).",
    "when": "A caller runs ListThings {ownerId 1204}.",
    "expect": ["2 things, newest first: Second thing PENDING, then First thing READY."] },
  { "id": "mcp-list-empty", "useCase": "UC1", "kind": "alternate", "title": "Empty owner over MCP", "story": "US1 · AC2", "surface": "mcp",
    "given": "The owner has no things (e.g. neptune, owner 1301).",
    "when": "A caller runs ListThings {ownerId 1301}.",
    "expect": ["things: [], total 0 — not an error."] },
  { "id": "mcp-list-unreachable", "useCase": "UC1", "kind": "exception", "title": "Upstream unreachable over MCP", "story": "FR-001", "surface": "mcp",
    "given": "The upstream service is down.",
    "when": "A caller runs ListThings {ownerId 1204}.",
    "expect": ["Unavailable \"The service could not be reached. Try again.\" — never an empty list."] },
  { "id": "create-thing", "useCase": "UC2", "kind": "basic", "core": true, "title": "Valid name", "story": "US2 · AC1", "surface": "ui",
    "given": "The user holds things.create (e.g. MANAGER_DEV).",
    "when": "The user creates a thing named Third thing.",
    "expect": ["Toast: \"Third thing was created.\"; Third thing tops the list as PENDING."] },
  { "id": "create-empty-name", "useCase": "UC2", "kind": "exception", "title": "Empty name", "story": "US2 · AC3", "surface": "ui",
    "when": "The user presses Create with the name empty.",
    "expect": ["Under the name field: \"Name is required.\" — nothing is created."] },
  { "id": "create-read-only", "useCase": "UC2", "kind": "exception", "title": "Read-only user", "story": "FR-003", "surface": "ui",
    "given": "The user has things.read but not things.create (e.g. VIEWER).",
    "when": "The user opens the owner's things.",
    "expect": ["No Create button at all; the list still reads 2 rows, Second thing on top."] },
  { "id": "create-archived", "useCase": "UC2", "kind": "exception", "title": "Archived owner", "story": "US2 · AC4", "surface": "ui",
    "given": "The owner is archived (e.g. pluto, archived). The user holds things.create.",
    "when": "The user opens the owner's things.",
    "expect": ["Create is disabled; under it: \"This owner is archived. Things cannot be created.\""] },
  { "id": "mcp-create", "useCase": "UC2", "kind": "basic", "core": true, "title": "Valid name over MCP", "story": "US2 · AC1", "surface": "mcp",
    "given": "The caller holds things.create.",
    "when": "A caller runs CreateThing {ownerId 1204, name \"Third thing\"}.",
    "expect": ["A thing named Third thing with status PENDING, and one audit row \"created thing #<id>\"."] },
  { "id": "mcp-create-empty-name", "useCase": "UC2", "kind": "exception", "title": "Empty name over MCP", "story": "US2 · AC3", "surface": "mcp",
    "when": "A caller runs CreateThing {ownerId 1204, name \"\"}.",
    "expect": ["InvalidArgument \"name is required.\" — nothing is created."] },
  { "id": "mcp-create-read-only", "useCase": "UC2", "kind": "exception", "title": "Caller without create permission", "story": "FR-003", "surface": "mcp",
    "given": "The caller has things.read but not things.create (e.g. VIEWER).",
    "when": "A caller runs CreateThing {ownerId 1204, name \"Third thing\"}.",
    "expect": ["PermissionDenied \"You need things.create to create a thing.\" — nothing is created."] },
  { "id": "mcp-create-archived", "useCase": "UC2", "kind": "exception", "title": "Archived owner over MCP", "story": "US2 · AC4", "surface": "mcp",
    "given": "The owner is archived (e.g. pluto, owner 1204). The caller holds things.create.",
    "when": "A caller runs CreateThing {ownerId 1204, name \"Third thing\"}.",
    "expect": ["FailedPrecondition \"This owner is archived. Things cannot be created.\" — nothing is created."] },
  { "id": "backfill-skips-filled", "useCase": "UC3", "kind": "basic", "core": true, "title": "Some things already have a status", "story": "FR-009", "surface": "job",
    "given": "Some things already have a status (e.g. 2 of 3 rows).",
    "when": "The operator runs the backfill script.",
    "expect": ["Only the 1 thing with no status is updated; the script prints \"backfill: updated=1 skipped=2\"."] },
  { "id": "backfill-rerun", "useCase": "UC3", "kind": "alternate", "title": "Second run", "story": "FR-009", "surface": "job",
    "given": "The backfill already ran.",
    "when": "The operator runs it again.",
    "expect": ["Nothing changes; the script prints \"backfill: updated=0 skipped=3\"."] }
];

/** @type {import("./use-cases.types").Acceptance[]} */
var ACCEPTANCE = [
  { "id": "US1 · AC1", "given": "An owner with things", "when": "a user with read permission opens its things", "then": "they are listed newest first, each with its status.", "channels": ["ui", "mcp"] },
  { "id": "US1 · AC2", "given": "An owner with no things", "when": "its things are opened", "then": "an empty state says none were created; it is not an error.", "channels": ["ui", "mcp"] },
  { "id": "US1 · AC3", "given": "No thing has failed", "when": "the user filters by Failed", "then": "the list says nothing matches; it is not an error.", "channels": ["ui"], "na": { "mcp": "ListThings has no status filter." } },
  { "id": "US2 · AC1", "given": "A user who may create things", "when": "they create one with a valid name", "then": "it is created as PENDING and an audit row records it.", "channels": ["ui", "mcp"] },
  { "id": "US2 · AC3", "given": "A user who may create things", "when": "they create one with an empty name", "then": "it is refused with \"name is required\" and nothing is created.", "channels": ["ui", "mcp"] },
  { "id": "US2 · AC4", "given": "An archived owner", "when": "a user tries to create a thing", "then": "it is refused with the archived reason and nothing is created.", "channels": ["ui", "mcp"] }
];
