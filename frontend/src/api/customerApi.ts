import apiClient from './client';
import type { Customer, PaginatedResponse } from '../types';

export const customerApi = {
  list: (page = 1, pageSize = 20, search = '') =>
    apiClient.get<PaginatedResponse<Customer>>('/customers', {
      params: { page, page_size: pageSize, search },
    }).then(res => res.data),

  get: (id: number) =>
    apiClient.get<Customer>(`/customers/${id}`).then(res => res.data),

  create: (data: Partial<Customer>) =>
    apiClient.post<Customer>('/customers', data).then(res => res.data),

  update: (id: number, data: Partial<Customer>) =>
    apiClient.put<Customer>(`/customers/${id}`, data).then(res => res.data),

  delete: (id: number) =>
    apiClient.delete(`/customers/${id}`),
};
