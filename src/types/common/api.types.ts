export interface ApiResponse<T> {
  statusCode: number;
  path: string;
  message: string;
  data: T;
  timestamp: string;
}

export interface ApiPaginationMeta {
  totalItems: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
}

export interface PaginatedApiResponse<T> {
  items: T[];
  meta: ApiPaginationMeta;
}
