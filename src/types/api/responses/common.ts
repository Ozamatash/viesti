import { ErrorCode } from "~/types";

export interface ApiError {
  code: ErrorCode;
  message: string;
  details?: Record<string, unknown>;
}

export interface ApiResponse {
  error?: ApiError;
}

export interface PaginatedApiResponse<T> extends ApiResponse {
  data: {
    data: T[];
    hasMore: boolean;
    total?: number;
  };
} 