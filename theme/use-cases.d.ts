// Shape of use-cases.js (USE_CASES, SCENARIOS, ACCEPTANCE), written by the generate-use-case skill.
// generate-use-case's check.js reads the field names of the three interfaces below and rejects any other field.
// Rules across entries (twins per channel, acceptance coverage, one basic per channel) stay in check.js.

/** Where a user reaches it: a screen, an MCP tool, REST / gRPC called directly, a script or job. */
export type Channel = 'ui' | 'mcp' | 'api' | 'job';
/** basic: the main path; alternate: another path that still reaches the goal; exception: the goal is not reached. */
export type Kind = 'basic' | 'alternate' | 'exception';
/** "UC1" */
export type UseCaseId = `UC${number}`;
/** "US1 · AC3" */
export type AcceptanceId = `US${number} · AC${number}`;
/** Why a channel has no twin: { "mcp": "ListThings has no status filter." } */
export type NotApplicable = Partial<Record<Channel, string>>;

export interface UseCase {
    id: UseCaseId;
    /** Verb + object ("Cut a new version"), the same everywhere. */
    title: string;
    /** User story + requirement ids, joined by " · ". */
    refs: string;
    channels: [Channel, ...Channel[]];
    /** Only for a use case with no scenario: one sentence saying why. */
    none?: string;
}

export interface ScenarioFields {
    /** Kebab-case, unique; an mcp twin starts with "mcp-". */
    id: string;
    useCase: UseCaseId;
    /** The path or its result; never the use case title again. */
    title: string;
    kind: Kind;
    /** Play first. Every basic has it; leave it out for the rest. */
    core?: boolean;
    /** "US1 · AC2–4", or the FR / decision id. Twins on other channels cite the same ref. */
    story: string;
    /** Must be in its use case's channels. */
    surface: Channel;
    na?: NotApplicable;
    /** Start state with an example ("The owner is archived (e.g. pluto, owner 1204)."). */
    given?: string;
    when: string;
    /** One line each; the first is the key outcome with its example. */
    expect: [string, ...string[]];
}

/** A basic scenario is always core. */
export type Scenario = ScenarioFields & ({ kind: 'basic'; core: true } | { kind: 'alternate' | 'exception' });

export interface Acceptance {
    id: AcceptanceId;
    given: string;
    /** May be empty. */
    when: string;
    then: string;
    channels: [Channel, ...Channel[]];
    na?: NotApplicable;
}
