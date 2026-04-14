import { apiClient } from './api';
import { ApiResponse, SyncResult } from '../types/api-response';
import { SyncLog } from '../types/sync-log';
import { pushNotification } from '../components/layout/Header';

function recordSyncTime() {
  const now = new Date().toISOString();
  localStorage.setItem('lastSyncAt', now);
  window.dispatchEvent(new StorageEvent('storage', { key: 'lastSyncAt', newValue: now }));
}

export const syncService = {
  async pullFromOdoo(): Promise<ApiResponse<SyncResult>> {
    const response = await apiClient.post<ApiResponse<SyncResult>>('/sync/pull');
    recordSyncTime();
    const r = response.data.data;
    pushNotification({
      type: r.status === 'SUCCESS' ? 'sync' : r.status === 'PARTIAL' ? 'info' : 'error',
      title: r.status === 'SUCCESS' ? 'Pull dari Odoo berhasil' : r.status === 'PARTIAL' ? 'Pull selesai (sebagian)' : 'Pull dari Odoo gagal',
      message: `${r.recordsSuccess} produk disinkronkan${r.recordsFailed > 0 ? `, ${r.recordsFailed} gagal` : ''}`,
    });
    return response.data;
  },

  async pushToOdoo(): Promise<ApiResponse<SyncResult>> {
    const response = await apiClient.post<ApiResponse<SyncResult>>('/sync/push');
    recordSyncTime();
    const r = response.data.data;
    pushNotification({
      type: r.status === 'SUCCESS' ? 'success' : r.status === 'PARTIAL' ? 'info' : 'error',
      title: r.status === 'SUCCESS' ? 'Push ke Odoo berhasil' : r.status === 'PARTIAL' ? 'Push selesai (sebagian)' : 'Push ke Odoo gagal',
      message: `${r.recordsSuccess} produk dikirim ke Odoo${r.recordsFailed > 0 ? `, ${r.recordsFailed} gagal` : ''}`,
    });
    return response.data;
  },

  async getLogs(page = 1, pageSize = 20): Promise<{
    data: SyncLog[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }> {
    const response = await apiClient.get<{
      success: boolean;
      data: { data: SyncLog[]; total: number; page: number; pageSize: number; totalPages: number };
    }>('/sync/logs', { params: { page, pageSize } });
    // TransformInterceptor wraps: { success, data: { data, total, ... } }
    return response.data.data;
  },
};
