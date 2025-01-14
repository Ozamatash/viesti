import { z } from 'zod';

/**
 * Standard API response wrapper
 */
export interface ApiResponse<T> {
  data: T;
  error?: ApiError;
  meta?: {
    timestamp: string;
    requestId: string;
  };
}

/**
 * API error details
 */
export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  stack?: string; // Only included in development
}

/**
 * Paginated response wrapper
 */
export interface PaginatedResponse<T> {
  data: T[];
  hasMore: boolean;
  total?: number;
  cursor?: string;
}

/**
 * Common HTTP status codes
 */
export enum HttpStatus {
  OK = 200,
  CREATED = 201,
  NO_CONTENT = 204,
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  CONFLICT = 409,
  INTERNAL_SERVER_ERROR = 500,
}

/**
 * Common error codes
 */
export enum ErrorCode {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR = 'AUTHORIZATION_ERROR',
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
  RESOURCE_CONFLICT = 'RESOURCE_CONFLICT',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
}

/**
 * API endpoint configuration
 */
export interface ApiEndpoint {
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  requiresAuth: boolean;
  rateLimit?: {
    windowMs: number;
    maxRequests: number;
  };
} 