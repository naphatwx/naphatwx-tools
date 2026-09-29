// Contract for <feature>: the shapes the real implementation uses.
// Mirrors <path to proto / OpenAPI / data model in the target repo>.
// Reference only: pages never load this file; data.js and rules.js are type-checked against it.

// ---------------------------------------------------------------- enums (as the API sends them)

export type ThingStatus = 'PENDING' | 'READY' | 'FAILED';

// ---------------------------------------------------------------- new operations (one request/response pair each)

export interface GetThingsRequest {
  ownerId: number;
  /** 1-based. */
  page: number;
  limit: number;
  status?: ThingStatus;
}

export interface ThingResponse {
  id: number;
  name: string;
  status: ThingStatus;
  /** RFC3339. */
  createdAt: string;
}

export interface GetThingsResponse {
  entities: ThingResponse[];
  totalPages: number;
  page: number;
  limit: number;
}

export interface CreateThingRequest {
  ownerId: number;
  name: string;
}

// ---------------------------------------------------------------- errors as the client sees them

export type ErrorCode = 'InvalidArgument' | 'NotFound' | 'AlreadyExists' | 'PermissionDenied' | 'FailedPrecondition' | 'Internal' | 'Unavailable';

export interface ApiError {
  code: ErrorCode;
  /** User-facing reason. */
  message: string;
  /** Set when a write timed out and may still have happened. */
  outcomeUnknown?: boolean;
}

// ---------------------------------------------------------------- existing rows the mock reads (subset)

export interface Owner {
  id: number;
  name: string;
}

// ---------------------------------------------------------------- upstream wire shapes (only if the feature calls another system)

/** Raw upstream row, before the service maps it to ThingResponse. */
export interface UpstreamThingRow {
  id: number;
  owner_id: number;
  name: string;
  state: 'QUEUED' | 'DONE' | 'ERROR';
  created_at: string;
}

/** Everything data.js serves. */
export interface MockData {
  owners: Owner[];
  /** keyed by owner id, newest first. */
  things: Record<number, UpstreamThingRow[]>;
}
