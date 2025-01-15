// Core API types
export * from './api/core';

// Model exports
export * from './models/user';
export * from './models/message';
export * from './models/channel';

// API request/response types
export * from './api/requests';
export * from './api/responses';

// Socket types
export * from './socket/events';

// Common types
export * from './common/props';

// AI types
export * from './ai/ai';
export * from './ai/recap';

// Component types
export * from './components/recap';

export enum ErrorCode {
  AUTHENTICATION_ERROR = "AUTHENTICATION_ERROR",
  AUTHORIZATION_ERROR = "AUTHORIZATION_ERROR",
  VALIDATION_ERROR = "VALIDATION_ERROR",
  RESOURCE_NOT_FOUND = "RESOURCE_NOT_FOUND",
  INTERNAL_ERROR = "INTERNAL_ERROR",
  RATE_LIMIT_ERROR = "RATE_LIMIT_ERROR",
}

export enum HttpStatus {
  OK = 200,
  CREATED = 201,
  NO_CONTENT = 204,
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  CONFLICT = 409,
  TOO_MANY_REQUESTS = 429,
  INTERNAL_SERVER_ERROR = 500,
}

// Search types
export type {
  SearchQueryParams,
  SearchOptions,
} from "./api/requests/search";

export type {
  SearchResponse,
  SearchResult as MessageSearchResult,
} from "./api/responses/search";
