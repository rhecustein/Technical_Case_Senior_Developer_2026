'use client';

import { useState, FormEvent } from 'react';
import { Product, CreateProductPayload, UomType } from '../../types/product';

interface ProductFormProps {
  initial?: Product;
  onSubmit: (data: CreateProductPayload) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

const UOM_OPTIONS: UomType[] = ['PCS', 'BOX', 'DOZEN'];

export default function ProductForm({
  initial,
  onSubmit,
  onCancel,
  loading = false,
}: ProductFormProps) {
  const [form, setForm] = useState<CreateProductPayload>({
    partNumber: initial?.partNumber ?? '',
    productName: initial?.productName ?? '',
    brand: initial?.brand ?? '',
    salesPrice: initial?.salesPrice ?? 0,
    costPrice: initial?.costPrice ?? 0,
    uom: initial?.uom ?? 'PCS',
    description: initial?.description ?? '',
  });

  function set<K extends keyof CreateProductPayload>(key: K, value: CreateProductPayload[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    await onSubmit(form);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Part Number <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={form.partNumber}
            onChange={(e) => set('partNumber', e.target.value)}
            className="input-field"
            required
            disabled={!!initial}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Product Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={form.productName}
            onChange={(e) => set('productName', e.target.value)}
            className="input-field"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Brand</label>
          <input
            type="text"
            value={form.brand ?? ''}
            onChange={(e) => set('brand', e.target.value)}
            className="input-field"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">UOM</label>
          <select
            value={form.uom}
            onChange={(e) => set('uom', e.target.value as UomType)}
            className="input-field"
          >
            {UOM_OPTIONS.map((u) => (
              <option key={u} value={u}>{u}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Sales Price (IDR) <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            value={form.salesPrice}
            onChange={(e) => set('salesPrice', parseFloat(e.target.value) || 0)}
            className="input-field"
            min="0"
            step="0.01"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Cost Price (IDR) <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            value={form.costPrice}
            onChange={(e) => set('costPrice', parseFloat(e.target.value) || 0)}
            className="input-field"
            min="0"
            step="0.01"
            required
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
        <textarea
          value={form.description ?? ''}
          onChange={(e) => set('description', e.target.value)}
          className="input-field"
          rows={3}
        />
      </div>
      <div className="flex gap-3 justify-end pt-2">
        <button type="button" onClick={onCancel} className="btn-secondary">
          Cancel
        </button>
        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? (
            <>
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Saving...
            </>
          ) : (
            initial ? 'Save Changes' : 'Create Product'
          )}
        </button>
      </div>
    </form>
  );
}
