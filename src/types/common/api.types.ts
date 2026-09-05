/**
 * Standard envelope for successful API responses.
 * Shape: `{ status, path, message, data, timestamp }`.
 */
export interface ApiResponse<T> {
  status: number;
  path: string;
  message: string;
  data: T;
  timestamp: string;
}

/**
 * Error envelope returned by the API on failure. Surfaced on the client as
 * an `HttpError` by the HTTP client.
 *
 * `timestamp` is optional because not every API stamps failure responses
 * the same way it stamps successes. `requestId` is set when a server-side
 * request-correlation layer generated or accepted one for the failed
 * request.
 */
export interface ApiErrorResponse {
  status: number;
  path: string;
  message: string;
  code?: string;
  errors?: Record<string, string>[];
  data?: Record<string, unknown>;
  requestId?: string;
  timestamp?: string;
}

/** Offset-based pagination metadata. */
export interface ApiPaginationMeta {
  totalItems: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
  sortBy: string;
  order: 'asc' | 'desc';
}

/** Paginated list response (offset-based). */
export interface PaginatedApiResponse<T> {
  items: T[];
  meta: ApiPaginationMeta;
}

/** Cursor-based pagination metadata. */
export interface ApiCursorMeta {
  nextCursor: string | null;
  prevCursor: string | null;
  hasMore: boolean;
  pageSize: number;
  sortBy: string;
  order: 'asc' | 'desc';
}

/** Paginated list response (cursor-based). */
export interface CursorPaginatedApiResponse<T> {
  items: T[];
  meta: ApiCursorMeta;
}

/** Query params for offset-based list endpoints. */
export interface BaseQueryParams {
  page?: number;
  size?: number;
  search?: string;
  sort?: string;
  order?: 'asc' | 'desc';
}

/** Query params for cursor-based list endpoints. */
export interface BaseCursorQueryParams {
  cursor?: string;
  size?: number;
  search?: string;
  sort?: string;
  order?: 'asc' | 'desc';
}
