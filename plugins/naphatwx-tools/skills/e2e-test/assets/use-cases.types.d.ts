// Synced from theme/use-cases.d.ts by theme/sync.mjs. Do not edit here.
// Shape of use-cases.js (USE_CASES, SCENARIOS, ACCEPTANCE, MISMATCHES), written by the generate-use-case skill.
// generate-use-case's check.js reads the field names of the interfaces below and rejects any other field.
// Rules across entries (twins per channel, acceptance coverage, one basic per channel) stay in check.js.

/** Where a user reaches it: a screen, an MCP tool, REST / gRPC called directly, a script or job. */
export type Channel = 'ui' | 'mcp' | 'api' | 'job';
/** basic: the main path; alternate: another path that still reaches the goal; exception: the goal is not reached. */
export type Kind = 'basic' | 'alternate' | 'exception';
/** "UC1" */
export type UseCaseId = `UC${number}`;
/** "US1 · AC3" */
export type AcceptanceId = `US${number} · AC${number}`;
/** Why a channel has no twin: { "mcp": "ListThings has no status filter." }. A reachability reason cites its gate: "(apps/web/routes.ts:452)". */
export type NotApplicable = Partial<Record<Channel, string>>;
/** Repo-relative "path:line" or "path:from-to": "apps/web/lib/config/routes.ts:452". */
export type CodeRef = `${string}:${number}` | `${string}:${number}-${number}`;
/** code: traced in the code (the default); spec: no code yet, so not ready for play-scenarios or e2e-test until verified. */
export type Source = 'code' | 'spec';

/** Where the scenario's behaviour lives in the code. */
export interface Evidence {
    /** Where the actor starts on this channel: the page route, the REST route, the MCP tool's operation, the command. */
    entry: CodeRef;
    /** The check that lets the actor in, or stops them: route guard, permission map entry, button gate, validation. */
    gate: CodeRef;
    /** Where the actor's role gets (or lacks) the permission: a seed migration or role-permission row. */
    roles?: CodeRef;
    /** One per expect line, same order: the code that produces it. */
    expect: [CodeRef, ...CodeRef[]];
}

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
    /** One line each; the first is the key outcome with its example. Text in double quotes is copied from the code. */
    expect: [string, ...string[]];
    /** Left out = "code". */
    source?: Source;
    /** Required unless source is "spec". */
    evidence?: Evidence;
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

/** One place where the spec and the code disagree. The scenarios follow the code. */
export interface Mismatch {
    /** "M1", "M2", … */
    id: `M${number}`;
    /** The spec's ref: "FR-017", "US1 · AC3". */
    spec: string;
    /** What differs, both sides quoted: spec says "…"; the code returns "…". */
    differs: string;
    /** The code that shows it. */
    evidence: [CodeRef, ...CodeRef[]];
    /** The side to change: fix the spec to match the code, or fix the code to match the spec. */
    fix: 'spec' | 'code';
    /** Scenario ids that follow the code here. */
    scenarios?: string[];
}
