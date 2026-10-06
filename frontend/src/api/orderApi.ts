import apiClient from './client';
import type { Order, PaginatedResponse } from '../types';

export interface OrderCreateInput {
  customer_id: number;
  quotation_id?: number | null;
  notes?: string;
  items: { product_id: number; unit_price: number; quantity: number }[];
}

export const orderApi = {
  list: (page = 1, pageSize = 20, status = '', customerID = 0) =>
    apiClient.get<PaginatedResponse<Order>>('/orders', {
      params: {
        page,
        page_size: pageSize,
        ...(status && { status }),
        ...(customerID && { customer_id: customerID }),
      },
    }).then(res => res.data),

  get: (id: number) =>
    apiClient.get<Order>(`/orders/${id}`).then(res => res.data),

  create: (data: OrderCreateInput) =>
    apiClient.post<Order>('/orders', data).then(res => res.data),

  update: (id: number, data: OrderCreateInput) =>
    apiClient.put<Order>(`/orders/${id}`, data).then(res => res.data),

  delete: (id: number) =>
    apiClient.delete(`/orders/${id}`),
};
