import { apiClient } from './api';
import { Product, CreateProductPayload, UpdateProductPayload, BulkUpdatePayload } from '../types/product';
import { PaginatedResponse, ApiResponse } from '../types/api-response';
import { PaginationParams } from '../types/pagination';

export const productService = {
  async getProducts(params: PaginationParams): Promise<PaginatedResponse<Product>> {
    const response = await apiClient.get<PaginatedResponse<Product>>('/products', {
      params: {
        page: params.page,
        pageSize: params.pageSize,
        search: params.search,
        sortBy: params.sortBy,
        sortOrder: params.sortOrder,
      },
    });
    return response.data;
  },

  async getProduct(id: string): Promise<ApiResponse<Product>> {
    const response = await apiClient.get<ApiResponse<Product>>(`/products/${id}`);
    return response.data;
  },

  async createProduct(data: CreateProductPayload): Promise<ApiResponse<Product & { odooSynced: boolean; odooError?: string }>> {
    const response = await apiClient.post<ApiResponse<Product & { odooSynced: boolean; odooError?: string }>>('/products', data);
    return response.data;
  },

  async updateProduct(id: string, data: UpdateProductPayload): Promise<ApiResponse<Product & { odooSynced: boolean; odooError?: string }>> {
    const response = await apiClient.put<ApiResponse<Product & { odooSynced: boolean; odooError?: string }>>(`/products/${id}`, data);
    return response.data;
  },

  async deleteProduct(id: string): Promise<void> {
    await apiClient.delete(`/products/${id}`);
  },

  async bulkUpdate(payload: BulkUpdatePayload): Promise<ApiResponse<{
    updated: Product[];
    errors: Array<{ partNumber: string; error: string }>;
    summary: { total: number; success: number; failed: number };
  }>> {
    const response = await apiClient.post('/products/bulk-update', payload);
    return response.data;
  },
};
