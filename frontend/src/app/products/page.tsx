'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import Sidebar from '../../components/layout/Sidebar';
import Header from '../../components/layout/Header';
import Modal from '../../components/ui/Modal';
import Pagination from '../../components/ui/Pagination';
import ProductForm from '../../components/products/ProductForm';
import BulkUpdateForm from '../../components/products/BulkUpdateForm';
import SyncButton from '../../components/products/SyncButton';
import AutoSyncControl from '../../components/products/AutoSyncControl';
import { syncService } from '../../services/sync.service';
import { useProducts } from '../../hooks/useProducts';
import { usePagination } from '../../hooks/usePagination';
import { useAutoSync, SyncMode } from '../../hooks/useAutoSync';
import { productService } from '../../services/product.service';
import { authService } from '../../services/auth.service';
import { pushNotification } from '../../components/layout/Header';
import { Product, CreateProductPayload, BulkUpdateItem } from '../../types/product';
import { formatCurrency, formatDate, getErrorMessage } from '../../lib/utils';

function SortIcon({ column, sortBy, sortOrder }: { column: string; sortBy?: string; sortOrder?: string }) {
  if (sortBy !== column) return <span className="text-gray-300 ml-1">↕</span>;
  return <span className="text-blue-600 ml-1">{sortOrder === 'ASC' ? '↑' : '↓'}</span>;
}

export default function ProductsPage() {
  const router = useRouter();
  const { products, pagination, loading, error, fetchProducts } = useProducts();
  const { params, setPage, setPageSize, setSearch, setSortBy } = usePagination();

  const [showCreate, setShowCreate] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [showBulkUpdate, setShowBulkUpdate] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<Product | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [globalTotal, setGlobalTotal] = useState<number | null>(null);

  // Auth guard
  useEffect(() => {
    if (!authService.isAuthenticated()) {
      router.push('/login');
    }
  }, [router]);

  // Fetch global total (unfiltered) once on mount and after mutations
  const refreshGlobalTotal = useCallback(async () => {
    try {
      const res = await productService.getProducts({ page: 1, pageSize: 1 });
      setGlobalTotal(res.pagination.total);
    } catch { /* ignore */ }
  }, []);

  // Fetch paginated list — runs on every param change (search, page, sort)
  const refresh = useCallback(() => {
    fetchProducts(params);
  }, [fetchProducts, params]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Global total: fetch once on mount, and explicitly after mutations
  useEffect(() => {
    refreshGlobalTotal();
  }, [refreshGlobalTotal]);

  // Auto sync — initialized after refresh/refreshGlobalTotal are stable
  const autoSyncHandler = useCallback(async (mode: SyncMode) => {
    try {
      if (mode === 'pull' || mode === 'both') await syncService.pullFromOdoo();
      if (mode === 'push' || mode === 'both') await syncService.pushToOdoo();
      refresh();
      refreshGlobalTotal();
    } catch { /* errors notified via pushNotification inside syncService */ }
  }, [refresh, refreshGlobalTotal]);

  const autoSync = useAutoSync({ onSync: autoSyncHandler });

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput, setSearch]);

  async function handleCreate(data: CreateProductPayload) {
    setSubmitting(true);
    try {
      const result = await productService.createProduct(data);
      toast.success('Product created');
      setShowCreate(false);
      refresh();
      refreshGlobalTotal();
      if (result.data.odooError) {
        pushNotification({
          type: 'error',
          title: 'Gagal Sync ke Odoo',
          message: `${result.data.partNumber}: ${result.data.odooError}`,
        });
      } else if (result.data.odooSynced) {
        pushNotification({
          type: 'success',
          title: 'Tersinkron ke Odoo',
          message: `Produk ${result.data.partNumber} berhasil disinkronkan ke Odoo.`,
        });
      }
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUpdate(data: CreateProductPayload) {
    if (!editProduct) return;
    setSubmitting(true);
    try {
      const result = await productService.updateProduct(editProduct.id, data);
      toast.success('Product updated');
      setEditProduct(null);
      refresh();
      if (result.data.odooError) {
        pushNotification({
          type: 'error',
          title: 'Gagal Sync ke Odoo',
          message: `${result.data.partNumber}: ${result.data.odooError}`,
        });
      } else if (result.data.odooSynced) {
        pushNotification({
          type: 'success',
          title: 'Tersinkron ke Odoo',
          message: `Produk ${result.data.partNumber} berhasil diperbarui di Odoo.`,
        });
      }
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(product: Product) {
    setSubmitting(true);
    try {
      await productService.deleteProduct(product.id);
      toast.success('Product deleted');
      setDeleteConfirm(null);
      refresh();
      refreshGlobalTotal();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleBulkUpdate(updates: BulkUpdateItem[]) {
    setSubmitting(true);
    try {
      const result = await productService.bulkUpdate({ updates });
      const { summary } = result.data;
      toast.success(
        `Bulk update: ${summary.success} updated, ${summary.failed} failed`,
      );
      setShowBulkUpdate(false);
      refresh();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  function exportCsv() {
    const header = 'part_number,product_name,brand,sales_price,cost_price,uom,last_synced_at';
    const rows = products.map((p) =>
      [p.partNumber, p.productName, p.brand || '', p.salesPrice, p.costPrice, p.uom, p.lastSyncedAt || ''].join(','),
    );
    const blob = new Blob([header + '\n' + rows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `products_page${params.page}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleSort(column: string) {
    const newOrder =
      params.sortBy === column && params.sortOrder === 'ASC' ? 'DESC' : 'ASC';
    setSortBy(column, newOrder);
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="Products" />

        <main className="flex-1 p-6 space-y-4">
          {/* Count Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Produk */}
            <div className="card p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium">Total Produk</p>
                <p className="text-2xl font-bold text-gray-900 leading-tight">
                  {globalTotal !== null ? globalTotal.toLocaleString('id-ID') : <span className="text-gray-300 text-lg">—</span>}
                </p>
              </div>
            </div>

            {/* Hasil Filter */}
            <div className="card p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" />
                </svg>
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium">
                  {params.search ? 'Hasil Pencarian' : 'Halaman Ini'}
                </p>
                <p className="text-2xl font-bold text-gray-900 leading-tight">
                  {pagination
                    ? params.search
                      ? pagination.total.toLocaleString('id-ID')
                      : products.length.toLocaleString('id-ID')
                    : <span className="text-gray-300 text-lg">—</span>}
                </p>
                {params.search && pagination && (
                  <p className="text-[10px] text-purple-500 mt-0.5">dari {globalTotal ?? '?'} total</p>
                )}
              </div>
            </div>

            {/* Tersinkron Odoo */}
            <div className="card p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium">Tersinkron Odoo</p>
                <p className="text-2xl font-bold text-gray-900 leading-tight">
                  {products.length > 0
                    ? products.filter((p) => p.lastSyncedAt).length
                    : <span className="text-gray-300 text-lg">—</span>}
                </p>
                {products.length > 0 && (
                  <p className="text-[10px] text-gray-400 mt-0.5">dari {products.length} di halaman ini</p>
                )}
              </div>
            </div>

            {/* Belum Sync */}
            <div className="card p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium">Belum Tersinkron</p>
                <p className="text-2xl font-bold text-gray-900 leading-tight">
                  {products.length > 0
                    ? products.filter((p) => !p.lastSyncedAt).length
                    : <span className="text-gray-300 text-lg">—</span>}
                </p>
                {products.length > 0 && (
                  <p className="text-[10px] text-gray-400 mt-0.5">dari {products.length} di halaman ini</p>
                )}
              </div>
            </div>
          </div>

          {/* Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search by part number or name..."
                className="input-field w-72"
              />
            </div>
            <div className="flex items-center gap-2">
              <AutoSyncControl
                enabled={autoSync.enabled}
                intervalMinutes={autoSync.intervalMinutes}
                mode={autoSync.mode}
                countdown={autoSync.countdown}
                syncing={autoSync.syncing}
                onToggle={autoSync.toggle}
                onIntervalChange={autoSync.setIntervalMinutes}
                onModeChange={autoSync.setMode}
                onSyncNow={autoSync.triggerNow}
              />
              <SyncButton onSyncComplete={refresh} />
              <button
                onClick={() => setShowBulkUpdate(true)}
                className="btn-secondary"
                disabled={products.length === 0}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Bulk Update
              </button>
              <button
                onClick={() => exportCsv()}
                disabled={products.length === 0}
                className="btn-secondary"
                title="Export current page as CSV"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Export CSV
              </button>
              <button onClick={() => setShowCreate(true)} className="btn-primary">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Product
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="card overflow-hidden">
            {error && (
              <div className="p-4 bg-red-50 text-red-700 text-sm border-b border-red-100">
                Error: {error}
              </div>
            )}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    {[
                      { key: 'partNumber', label: 'Part Number' },
                      { key: 'productName', label: 'Product Name' },
                      { key: 'brand', label: 'Brand' },
                      { key: 'salesPrice', label: 'Sales Price' },
                      { key: 'costPrice', label: 'Cost Price' },
                      { key: 'uom', label: 'UOM' },
                      { key: 'lastSyncedAt', label: 'Last Synced' },
                    ].map((col) => (
                      <th
                        key={col.key}
                        className="px-4 py-3 text-left font-medium text-gray-600 cursor-pointer hover:bg-gray-100 whitespace-nowrap"
                        onClick={() => handleSort(col.key)}
                      >
                        {col.label}
                        <SortIcon column={col.key} sortBy={params.sortBy} sortOrder={params.sortOrder} />
                      </th>
                    ))}
                    <th className="px-4 py-3 text-right font-medium text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody className={`divide-y divide-gray-100 transition-opacity duration-150 ${loading ? 'opacity-50' : 'opacity-100'}`}>
                  {loading && products.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-gray-400">
                        <div className="flex flex-col items-center gap-2">
                          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                          Loading products...
                        </div>
                      </td>
                    </tr>
                  ) : products.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-gray-400">
                        No products found.{' '}
                        <button
                          onClick={() => setShowCreate(true)}
                          className="text-blue-600 hover:underline"
                        >
                          Add the first one
                        </button>{' '}
                        or{' '}
                        <span className="text-blue-600">Pull from Odoo</span>.
                      </td>
                    </tr>
                  ) : (
                    products.map((product) => (
                      <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 font-mono text-xs text-gray-800">
                          {product.partNumber}
                        </td>
                        <td className="px-4 py-3 font-medium text-gray-900">
                          <Link href={`/products/${product.id}`} className="hover:text-blue-600 hover:underline">
                            {product.productName}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-gray-600">{product.brand || '—'}</td>
                        <td className="px-4 py-3 text-gray-900">
                          {formatCurrency(product.salesPrice)}
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {formatCurrency(product.costPrice)}
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">
                            {product.uom}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-500 text-xs">
                          {formatDate(product.lastSyncedAt)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <Link
                              href={`/products/${product.id}`}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                              title="View detail"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                            </Link>
                            <button
                              onClick={() => setEditProduct(product)}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50"
                              title="Edit"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => setDeleteConfirm(product)}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50"
                              title="Delete"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {pagination && (
              <Pagination
                page={pagination.page}
                pageSize={pagination.pageSize}
                total={pagination.total}
                totalPages={pagination.totalPages}
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
              />
            )}
          </div>
        </main>
      </div>

      {/* Create Modal */}
      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Add Product" size="lg">
        <ProductForm
          onSubmit={handleCreate}
          onCancel={() => setShowCreate(false)}
          loading={submitting}
        />
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={!!editProduct}
        onClose={() => setEditProduct(null)}
        title="Edit Product"
        size="lg"
      >
        {editProduct && (
          <ProductForm
            initial={editProduct}
            onSubmit={handleUpdate}
            onCancel={() => setEditProduct(null)}
            loading={submitting}
          />
        )}
      </Modal>

      {/* Bulk Update Modal */}
      <Modal
        isOpen={showBulkUpdate}
        onClose={() => setShowBulkUpdate(false)}
        title="Bulk Update Products"
        size="xl"
      >
        <BulkUpdateForm
          products={products}
          onSubmit={handleBulkUpdate}
          onCancel={() => setShowBulkUpdate(false)}
          loading={submitting}
        />
      </Modal>

      {/* Delete Confirm Modal */}
      <Modal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="Delete Product"
        size="sm"
      >
        {deleteConfirm && (
          <div className="space-y-4">
            <p className="text-gray-700">
              Are you sure you want to delete{' '}
              <strong>{deleteConfirm.productName}</strong> ({deleteConfirm.partNumber})?
              This cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                disabled={submitting}
                className="btn-danger"
              >
                {submitting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
