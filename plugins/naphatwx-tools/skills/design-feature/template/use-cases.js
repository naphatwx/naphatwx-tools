// The feature's use cases (user goals), each with its scenarios (one path, one result), and the spec's acceptance criteria.
// Written by the generate-use-case skill. All values are strict JSON (double quotes, no trailing commas) so a script can parse them after `var NAME = `.
// Preview data: US2 · AC4 has no api scenario on purpose, so the Acceptance criteria section shows a gap.

var USE_CASES = [
  { "id": "UC1", "title": "Create a thing", "refs": "US2 · FR-002 · FR-003", "channels": ["ui", "mcp", "api"] }
];

var SCENARIOS = [
  { "id": "create-read-only", "useCase": "UC1", "kind": "exception", "title": "Read-only user", "story": "FR-003", "surface": "ui",
    "given": "The user has things.read but not things.create (e.g. VIEWER).",
    "when": "The user opens the owner's things.",
    "expect": ["No Create button at all; the list still reads 2 rows, Second thing on top."],
    "na": { "api": "The API runs the same permission check as MCP (mcp-create-read-only)." } },
  { "id": "create-archived", "useCase": "UC1", "kind": "exception", "title": "Archived owner", "story": "US2 · AC4", "surface": "ui",
    "given": "The owner is archived (e.g. pluto, archived). The user holds things.create.",
    "when": "The user points at Create.",
    "expect": ["Create is shown unavailable; its tooltip reads \"This owner is archived. Things cannot be created.\""] },
  { "id": "mcp-create", "useCase": "UC1", "kind": "basic", "title": "Valid name over MCP", "story": "US2 · AC1", "surface": "mcp",
    "given": "The caller holds things.create.",
    "when": "A caller runs CreateThing {ownerId 1204, name \"Third thing\"}.",
    "expect": ["A thing named Third thing with status PENDING, and one audit row \"created thing #<id>\"."],
    "na": { "ui": "The preview mock has no Create dialog." } },
  { "id": "mcp-create-empty-name", "useCase": "UC1", "kind": "exception", "title": "Empty name over MCP", "story": "US2 · AC3", "surface": "mcp",
    "when": "A caller runs CreateThing {ownerId 1204, name \"\"}.",
    "expect": ["InvalidArgument \"name is required.\" — nothing is created."],
    "na": { "ui": "The preview mock has no Create dialog." } },
  { "id": "mcp-create-read-only", "useCase": "UC1", "kind": "exception", "title": "Caller without create permission", "story": "FR-003", "surface": "mcp",
    "given": "The caller has things.read but not things.create (e.g. VIEWER).",
    "when": "A caller runs CreateThing {ownerId 1204, name \"Third thing\"}.",
    "expect": ["PermissionDenied \"You need things.create to create a thing.\" — nothing is created."],
    "na": { "api": "Same check and message as MCP." } },
  { "id": "mcp-create-archived", "useCase": "UC1", "kind": "exception", "title": "Archived owner over MCP", "story": "US2 · AC4", "surface": "mcp",
    "given": "The owner is archived (e.g. pluto, owner 1204). The caller holds things.create.",
    "when": "A caller runs CreateThing {ownerId 1204, name \"Third thing\"}.",
    "expect": ["FailedPrecondition \"This owner is archived. Things cannot be created.\" — nothing is created."] },
  { "id": "create-api", "useCase": "UC1", "kind": "basic", "title": "Valid name over the API", "story": "US2 · AC1", "surface": "api",
    "given": "The caller holds things.create.",
    "when": "A caller runs CreateThing {ownerId 1204, name \"Third thing\"}.",
    "expect": ["A thing named Third thing with status PENDING, and one audit row \"created thing #<id>\"."],
    "na": { "ui": "The preview mock has no Create dialog." } },
  { "id": "create-api-empty-name", "useCase": "UC1", "kind": "exception", "title": "Empty name over the API", "story": "US2 · AC3", "surface": "api",
    "when": "A caller runs CreateThing {ownerId 1204, name \"\"}.",
    "expect": ["InvalidArgument \"name is required.\" — nothing is created."],
    "na": { "ui": "The preview mock has no Create dialog." } }
];

var ACCEPTANCE = [
  { "id": "US2 · AC1", "given": "A user who may create things", "when": "they create one with a valid name", "then": "it is created as PENDING and an audit row records it.", "channels": ["mcp", "api"], "na": { "ui": "The preview mock has no Create dialog." } },
  { "id": "US2 · AC3", "given": "A user who may create things", "when": "they create one with an empty name", "then": "it is refused with \"name is required\" and nothing is created.", "channels": ["mcp", "api"], "na": { "ui": "The preview mock has no Create dialog." } },
  { "id": "US2 · AC4", "given": "An archived owner", "when": "a user tries to create a thing", "then": "it is refused with the archived reason and nothing is created.", "channels": ["ui", "mcp", "api"] }
];
