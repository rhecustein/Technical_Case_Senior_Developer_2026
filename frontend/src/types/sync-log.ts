export interface SyncLog {
  id: string;
  direction: 'PULL' | 'PUSH';
  status: 'SUCCESS' | 'PARTIAL' | 'FAILED';
  recordsTotal: number;
  recordsSuccess: number;
  recordsFailed: number;
  errorDetails: Array<{ item?: string; error: string }> | null;
  startedAt: string;
  finishedAt: string | null;
  createdAt: string;
}
