'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import Sidebar from '../../components/layout/Sidebar';
import Header from '../../components/layout/Header';
import { productService } from '../../services/product.service';
import { syncService } from '../../services/sync.service';
import { authService } from '../../services/auth.service';
import { SyncLog } from '../../types/sync-log';
import { formatDate, getErrorMessage } from '../../lib/utils';

interface DashboardStats {
  totalProducts: number;
  lastSync: SyncLog | null;
  recentLogs: SyncLog[];
}

export default function DashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats>({ totalProducts: 0, lastSync: null, recentLogs: [] });
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      router.push('/login');
    }
  }, [router]);

  const loadStats = useCallback(async () => {
    setLoading(true);
    try {
      const [productsRes, logsRes] = await Promise.all([
        productService.getProducts({ page: 1, pageSize: 1, sortOrder: 'DESC' }),
        syncService.getLogs(1, 5),
      ]);
      setStats({
        totalProducts: productsRes.pagination.total,
        lastSync: logsRes.data[0] ?? null,
        recentLogs: logsRes.data,
      });
    } catch {
      // Stats best-effort — don't block page
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadStats(); }, [loadStats]);

  async function handlePull() {
    setSyncing(true);
    try {
      const result = await syncService.pullFromOdoo();
      toast.success(`Sync selesai: ${result.data.recordsSuccess} produk disinkronkan`);
      loadStats();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSyncing(false);
    }
  }

  const lastSyncStatus = stats.lastSync?.status;
  const lastSyncErrors = stats.lastSync?.recordsFailed ?? 0;

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="Dashboard" />
        <main className="flex-1 p-6 space-y-6">

          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="card p-5">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Total Produk</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">
                {loading ? '—' : stats.totalProducts.toLocaleString('id-ID')}
              </p>
              <Link href="/products" className="text-xs text-blue-600 hover:underline mt-2 inline-block">
                Lihat semua →
              </Link>
            </div>

            <div className="card p-5">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Status Sync Terakhir</p>
              <p className="text-xl font-bold mt-1">
                {loading || !stats.lastSync ? (
                  <span className="text-gray-400">Belum ada</span>
                ) : (
                  <span className={
                    lastSyncStatus === 'SUCCESS' ? 'text-green-600' :
                    lastSyncStatus === 'PARTIAL' ? 'text-yellow-600' : 'text-red-600'
                  }>
                    {lastSyncStatus}
                  </span>
                )}
              </p>
              {stats.lastSync && (
                <p className="text-xs text-gray-500 mt-1">
                  {formatDate(stats.lastSync.startedAt)}
                </p>
              )}
            </div>

            <div className="card p-5">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Error Sync Terakhir</p>
              <p className={`text-3xl font-bold mt-1 ${lastSyncErrors > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {loading ? '—' : lastSyncErrors}
              </p>
              <Link href="/sync" className="text-xs text-blue-600 hover:underline mt-2 inline-block">
                Lihat log →
              </Link>
            </div>

            <div className="card p-5">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Produk Tersinkron</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">
                {loading ? '—' : (stats.lastSync?.recordsSuccess ?? 0).toLocaleString('id-ID')}
              </p>
              <p className="text-xs text-gray-500 mt-1">dari sync terakhir</p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Aksi Cepat</h3>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={handlePull}
                disabled={syncing}
                className="btn-primary"
              >
                {syncing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Sinkronisasi...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Pull dari Odoo
                  </>
                )}
              </button>
              <Link href="/products" className="btn-secondary">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
                Kelola Produk
              </Link>
              <Link href="/bulk-update" className="btn-secondary">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Bulk Update
              </Link>
            </div>
          </div>

          {/* Recent Sync Log */}
          <div className="card overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-700">Log Sync Terbaru</h3>
              <Link href="/sync" className="text-xs text-blue-600 hover:underline">Lihat semua →</Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    {['Arah', 'Status', 'Sukses', 'Gagal', 'Waktu'].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {loading ? (
                    <tr><td colSpan={5} className="py-8 text-center text-gray-400 text-sm">Memuat...</td></tr>
                  ) : stats.recentLogs.length === 0 ? (
                    <tr><td colSpan={5} className="py-8 text-center text-gray-400 text-sm">Belum ada aktivitas sync</td></tr>
                  ) : stats.recentLogs.map((log) => (
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
                      <td className="px-4 py-3 text-gray-700">{log.recordsSuccess}</td>
                      <td className="px-4 py-3 text-gray-700">{log.recordsFailed}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{formatDate(log.startedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </main>
      </div>
    </div>
  );
}
