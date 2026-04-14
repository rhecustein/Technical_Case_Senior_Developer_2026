'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import toast from 'react-hot-toast';
import Sidebar from '../../../components/layout/Sidebar';
import Header from '../../../components/layout/Header';
import Modal from '../../../components/ui/Modal';
import ProductForm from '../../../components/products/ProductForm';
import { productService } from '../../../services/product.service';
import { authService } from '../../../services/auth.service';
import { Product, CreateProductPayload } from '../../../types/product';
import { formatCurrency, formatDate, getErrorMessage } from '../../../lib/utils';

export default function ProductDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params['id'] as string;

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [showEdit, setShowEdit] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      router.push('/login');
    }
  }, [router]);

  const fetchProduct = useCallback(async () => {
    setLoading(true);
    try {
      const res = await productService.getProduct(id);
      setProduct(res.data);
    } catch (err) {
      toast.error(getErrorMessage(err));
      router.push('/products');
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => { fetchProduct(); }, [fetchProduct]);

  async function handleUpdate(data: CreateProductPayload) {
    if (!product) return;
    setSubmitting(true);
    try {
      await productService.updateProduct(product.id, data);
      toast.success('Produk berhasil diperbarui');
      setShowEdit(false);
      fetchProduct();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Header title="Detail Produk" />
          <main className="flex-1 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </main>
        </div>
      </div>
    );
  }

  if (!product) return null;

  const fields: Array<{ label: string; value: string }> = [
    { label: 'Part Number', value: product.partNumber },
    { label: 'Nama Produk', value: product.productName },
    { label: 'Brand', value: product.brand || '—' },
    { label: 'Harga Jual', value: formatCurrency(product.salesPrice) },
    { label: 'Harga Pokok', value: formatCurrency(product.costPrice) },
    { label: 'UOM', value: product.uom },
    { label: 'Deskripsi', value: product.description || '—' },
    { label: 'Odoo Product ID', value: product.odooProductId ? String(product.odooProductId) : '—' },
    { label: 'Terakhir Sinkron', value: product.lastSyncedAt ? formatDate(product.lastSyncedAt) : 'Belum pernah' },
    { label: 'Dibuat', value: formatDate(product.createdAt) },
    { label: 'Diperbarui', value: formatDate(product.updatedAt) },
  ];

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="Detail Produk" />
        <main className="flex-1 p-6 space-y-4 max-w-3xl">

          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <button onClick={() => router.push('/products')} className="hover:text-blue-600">
              Produk
            </button>
            <span>/</span>
            <span className="text-gray-800 font-medium font-mono">{product.partNumber}</span>
          </div>

          {/* Card */}
          <div className="card p-6 space-y-5">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-xl font-bold text-gray-900">{product.productName}</h1>
                <p className="text-sm text-gray-500 font-mono mt-0.5">{product.partNumber}</p>
              </div>
              <button
                onClick={() => setShowEdit(true)}
                className="btn-primary"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Edit
              </button>
            </div>

            <div className="border-t border-gray-100 pt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {fields.map((f) => (
                <div key={f.label}>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">{f.label}</p>
                  <p className="text-sm text-gray-900 mt-0.5 font-medium">{f.value}</p>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={() => router.push('/products')}
            className="btn-secondary text-sm"
          >
            ← Kembali ke Daftar Produk
          </button>
        </main>
      </div>

      <Modal isOpen={showEdit} onClose={() => setShowEdit(false)} title="Edit Produk" size="lg">
        <ProductForm
          initial={product}
          onSubmit={handleUpdate}
          onCancel={() => setShowEdit(false)}
          loading={submitting}
        />
      </Modal>
    </div>
  );
}
