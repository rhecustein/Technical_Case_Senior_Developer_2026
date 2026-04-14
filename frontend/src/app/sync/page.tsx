'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import Sidebar from '../../components/layout/Sidebar';
import Header from '../../components/layout/Header';
import { syncService } from '../../services/sync.service';
import { authService } from '../../services/auth.service';
import { SyncLog } from '../../types/sync-log';
import { formatDate, getErrorMessage } from '../../lib/utils';

export default function SyncPage() {
  const router = useRouter();
  const [logs, setLogs] = useState<SyncLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [loading, setLoading] = useState(true);
  const [pulling, setPulling] = useState(false);
  const [pushing, setPushing] = useState(false);

  useEffect(() => {
    if (!authService.isAuthenticated()) router.push('/login');
  }, [router]);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await syncService.getLogs(page, pageSize);
      setLogs(res.data);
      setTotal(res.total);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  async function handlePull() {
    setPulling(true);
    try {
      const res = await syncService.pullFromOdoo();
      toast.success(`Pull selesai: ${res.data.recordsSuccess} produk disinkronkan`);
      setPage(1);
      fetchLogs();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setPulling(false);
    }
  }

  async function handlePush() {
    setPushing(true);
    try {
      const res = await syncService.pushToOdoo();
      toast.success(`Push selesai: ${res.data.recordsSuccess} produk dikirim ke Odoo`);
      setPage(1);
      fetchLogs();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setPushing(false);
    }
  }

  const latestLog = logs[0];
  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="Sinkronisasi Odoo" />
        <main className="flex-1 p-6 space-y-4">

          {/* Last Sync Banner */}
          {latestLog && (
            <div className={`rounded-lg px-4 py-3 flex items-center gap-3 text-sm ${
              latestLog.status === 'SUCCESS' ? 'bg-green-50 text-green-800 border border-green-200' :
              latestLog.status === 'PARTIAL' ? 'bg-yellow-50 text-yellow-800 border border-yellow-200' :
              'bg-red-50 text-red-800 border border-red-200'
            }`}>
              <span className="font-medium">Sync Terakhir:</span>
              <span>{latestLog.direction} · {latestLog.status} · {latestLog.recordsSuccess} sukses · {latestLog.recordsFailed} gagal</span>
              <span className="text-xs opacity-70 ml-auto">{formatDate(latestLog.startedAt)}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="card p-4 flex flex-wrap gap-3">
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-gray-700">Pull dari Odoo</h3>
              <p className="text-xs text-gray-500 mt-0.5">Tarik data produk terbaru dari Odoo ke database lokal</p>
            </div>
            <div className="flex gap-2 items-center">
              <button
                onClick={handlePull}
                disabled={pulling || pushing}
                className="btn-primary"
              >
                {pulling ? (
                  <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Pulling...</>
                ) : (
                  <><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>Pull dari Odoo</>
                )}
              </button>
              <button
                onClick={handlePush}
                disabled={pulling || pushing}
                className="btn-secondary"
              >
                {pushing ? (
                  <><div className="w-4 h-4 border-2 border-gray-600 border-t-transparent rounded-full animate-spin" />Pushing...</>
                ) : (
                  <><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l4-4m0 0l4 4m-4-4v12" /></svg>Push ke Odoo</>
                )}
              </button>
            </div>
          </div>

          {/* Log Table */}
          <div className="card overflow-hidden">
            <div className="p-4 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-700">Riwayat Sinkronisasi</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    {['Arah', 'Status', 'Total', 'Sukses', 'Gagal', 'Mulai', 'Selesai', 'Durasi'].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {loading ? (
                    <tr><td colSpan={8} className="py-10 text-center text-gray-400">
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                        Memuat log...
                      </div>
                    </td></tr>
                  ) : logs.length === 0 ? (
                    <tr><td colSpan={8} className="py-10 text-center text-gray-400">Belum ada aktivitas sync</td></tr>
                  ) : logs.map((log) => {
                    const durationMs = log.finishedAt
                      ? new Date(log.finishedAt).getTime() - new Date(log.startedAt).getTime()
                      : null;
                    const duration = durationMs !== null
                      ? durationMs < 1000 ? `${durationMs}ms` : `${(durationMs / 1000).toFixed(1)}s`
                      : '—';

                    return (
                      <tr key={log.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                            log.direction === 'PULL' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                          }`}>{log.direction}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                            log.status === 'SUCCESS' ? 'bg-green-100 text-green-700' :
                            log.status === 'PARTIAL' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-red-100 text-red-700'
                          }`}>{log.status}</span>
                        </td>
                        <td className="px-4 py-3 text-gray-700">{log.recordsTotal}</td>
                        <td className="px-4 py-3 text-green-700 font-medium">{log.recordsSuccess}</td>
                        <td className="px-4 py-3">
                          <span className={log.recordsFailed > 0 ? 'text-red-600 font-medium' : 'text-gray-400'}>
                            {log.recordsFailed}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-500 text-xs">{formatDate(log.startedAt)}</td>
                        <td className="px-4 py-3 text-gray-500 text-xs">
                          {log.finishedAt ? formatDate(log.finishedAt) : '—'}
                        </td>
                        <td className="px-4 py-3 text-gray-500 text-xs">{duration}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between text-sm text-gray-600">
                <span>Total {total} log</span>
                <div className="flex gap-1">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-3 py-1 rounded border border-gray-200 disabled:opacity-40 hover:bg-gray-50"
                  >
                    ←
                  </button>
                  <span className="px-3 py-1">{page} / {totalPages}</span>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="px-3 py-1 rounded border border-gray-200 disabled:opacity-40 hover:bg-gray-50"
                  >
                    →
                  </button>
                </div>
              </div>
            )}
          </div>

        </main>
      </div>
    </div>
  );
}
