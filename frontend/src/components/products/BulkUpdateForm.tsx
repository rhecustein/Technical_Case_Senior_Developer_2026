'use client';

import { useState } from 'react';
import { Product, BulkUpdateItem, UomType } from '../../types/product';
import { cn } from '../../lib/utils';

interface BulkUpdateFormProps {
  products: Product[];
  onSubmit: (updates: BulkUpdateItem[]) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

type EditableField = 'productName' | 'brand' | 'salesPrice' | 'costPrice' | 'uom' | 'description';

const FIELDS: { key: EditableField; label: string }[] = [
  { key: 'productName', label: 'Product Name' },
  { key: 'brand', label: 'Brand' },
  { key: 'salesPrice', label: 'Sales Price' },
  { key: 'costPrice', label: 'Cost Price' },
  { key: 'uom', label: 'UOM' },
  { key: 'description', label: 'Description' },
];

export default function BulkUpdateForm({
  products,
  onSubmit,
  onCancel,
  loading = false,
}: BulkUpdateFormProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedFields, setSelectedFields] = useState<Set<EditableField>>(new Set());
  const [fieldValues, setFieldValues] = useState<Partial<Record<EditableField, string>>>({});

  function toggleProduct(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selectedIds.size === products.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(products.map((p) => p.id)));
    }
  }

  function toggleField(field: EditableField) {
    setSelectedFields((prev) => {
      const next = new Set(prev);
      next.has(field) ? next.delete(field) : next.add(field);
      return next;
    });
  }

  async function handleSubmit() {
    const selectedProducts = products.filter((p) => selectedIds.has(p.id));
    const updates: BulkUpdateItem[] = selectedProducts.map((p) => {
      const item: BulkUpdateItem = { partNumber: p.partNumber };
      const mutable = item as unknown as Record<string, unknown>;
      for (const field of Array.from(selectedFields)) {
        const val = fieldValues[field];
        if (val !== undefined && val !== '') {
          if (field === 'salesPrice' || field === 'costPrice') {
            mutable[field] = parseFloat(val) || 0;
          } else if (field === 'uom') {
            mutable[field] = val as UomType;
          } else {
            mutable[field] = val;
          }
        }
      }
      return item;
    });

    if (updates.length === 0) return;
    await onSubmit(updates);
  }

  return (
    <div className="space-y-6">
      {/* Step 1: Select products */}
      <div>
        <h4 className="text-sm font-semibold text-gray-700 mb-2">
          Step 1: Select products to update ({selectedIds.size} selected)
        </h4>
        <div className="border border-gray-200 rounded-lg overflow-hidden max-h-52 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="w-10 px-3 py-2">
                  <input
                    type="checkbox"
                    checked={selectedIds.size === products.length && products.length > 0}
                    onChange={toggleAll}
                    className="rounded"
                  />
                </th>
                <th className="px-3 py-2 text-left font-medium text-gray-600">Part Number</th>
                <th className="px-3 py-2 text-left font-medium text-gray-600">Product Name</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {products.map((p) => (
                <tr
                  key={p.id}
                  className={cn(
                    'cursor-pointer hover:bg-gray-50',
                    selectedIds.has(p.id) && 'bg-blue-50',
                  )}
                  onClick={() => toggleProduct(p.id)}
                >
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(p.id)}
                      onChange={() => toggleProduct(p.id)}
                      className="rounded"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </td>
                  <td className="px-3 py-2 font-mono text-xs">{p.partNumber}</td>
                  <td className="px-3 py-2">{p.productName}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Step 2: Choose fields + values */}
      <div>
        <h4 className="text-sm font-semibold text-gray-700 mb-2">
          Step 2: Choose fields to update
        </h4>
        <div className="space-y-2">
          {FIELDS.map((f) => (
            <div key={f.key} className="flex items-center gap-3">
              <input
                type="checkbox"
                id={`field-${f.key}`}
                checked={selectedFields.has(f.key)}
                onChange={() => toggleField(f.key)}
                className="rounded"
              />
              <label htmlFor={`field-${f.key}`} className="w-32 text-sm text-gray-700">
                {f.label}
              </label>
              {selectedFields.has(f.key) && (
                f.key === 'uom' ? (
                  <select
                    value={fieldValues[f.key] ?? ''}
                    onChange={(e) =>
                      setFieldValues((v) => ({ ...v, [f.key]: e.target.value }))
                    }
                    className="input-field max-w-xs"
                  >
                    <option value="">Select UOM</option>
                    <option value="PCS">PCS</option>
                    <option value="BOX">BOX</option>
                    <option value="DOZEN">DOZEN</option>
                  </select>
                ) : (
                  <input
                    type={
                      f.key === 'salesPrice' || f.key === 'costPrice' ? 'number' : 'text'
                    }
                    value={fieldValues[f.key] ?? ''}
                    onChange={(e) =>
                      setFieldValues((v) => ({ ...v, [f.key]: e.target.value }))
                    }
                    className="input-field max-w-xs"
                    placeholder={`New ${f.label}`}
                    min={f.key === 'salesPrice' || f.key === 'costPrice' ? '0' : undefined}
                    step={f.key === 'salesPrice' || f.key === 'costPrice' ? '0.01' : undefined}
                  />
                )
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Summary */}
      {selectedIds.size > 0 && selectedFields.size > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
          Will update <strong>{selectedIds.size}</strong> product(s) — fields:{' '}
          <strong>{Array.from(selectedFields).join(', ')}</strong>
        </div>
      )}

      <div className="flex gap-3 justify-end">
        <button type="button" onClick={onCancel} className="btn-secondary">
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={loading || selectedIds.size === 0 || selectedFields.size === 0}
          className="btn-primary"
        >
          {loading ? (
            <>
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Updating...
            </>
          ) : (
            `Update ${selectedIds.size} Product(s)`
          )}
        </button>
      </div>
    </div>
  );
}
