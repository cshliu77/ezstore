import apiClient from './client';
import type { Product, PaginatedResponse } from '../types';

export const productApi = {
  list: (page = 1, pageSize = 20, search = '') =>
    apiClient.get<PaginatedResponse<Product>>('/products', {
      params: { page, page_size: pageSize, search },
    }).then(res => res.data),

  get: (id: number) =>
    apiClient.get<Product>(`/products/${id}`).then(res => res.data),

  create: (data: Partial<Product>) =>
    apiClient.post<Product>('/products', data).then(res => res.data),

  update: (id: number, data: Partial<Product>) =>
    apiClient.put<Product>(`/products/${id}`, data).then(res => res.data),

  delete: (id: number) =>
    apiClient.delete(`/products/${id}`),
};
