export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: PaginationMeta;
}

export interface SyncResult {
  direction: 'PULL' | 'PUSH';
  status: 'SUCCESS' | 'PARTIAL' | 'FAILED';
  recordsTotal: number;
  recordsSuccess: number;
  recordsFailed: number;
  errors: Array<{ item: string; error: string }>;
}
