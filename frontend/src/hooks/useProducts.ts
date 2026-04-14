'use client';

import { useState, useCallback } from 'react';
import { Product } from '../types/product';
import { PaginatedResponse } from '../types/api-response';
import { PaginationParams } from '../types/pagination';
import { productService } from '../services/product.service';
import { getErrorMessage } from '../lib/utils';

interface UseProductsReturn {
  products: Product[];
  pagination: PaginatedResponse<Product>['pagination'] | null;
  loading: boolean;
  error: string | null;
  fetchProducts: (params: PaginationParams) => Promise<void>;
}

export function useProducts(): UseProductsReturn {
  const [products, setProducts] = useState<Product[]>([]);
  const [pagination, setPagination] = useState<PaginatedResponse<Product>['pagination'] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProducts = useCallback(async (params: PaginationParams) => {
    setLoading(true);
    setError(null);
    try {
      const response = await productService.getProducts(params);
      setProducts(response.data);
      setPagination(response.pagination);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  return { products, pagination, loading, error, fetchProducts };
}
