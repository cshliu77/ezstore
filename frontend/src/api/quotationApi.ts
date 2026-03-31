import apiClient from './client';
import type { Quotation, PaginatedResponse } from '../types';

export interface QuotationCreateInput {
  customer_id: number;
  pricing_factor: number;
  notes?: string;
  items: { product_id: number; quantity: number }[];
}

export const quotationApi = {
  list: (page = 1, pageSize = 20, status = '', customerID = 0) =>
    apiClient.get<PaginatedResponse<Quotation>>('/quotations', {
      params: {
        page,
        page_size: pageSize,
        ...(status && { status }),
        ...(customerID && { customer_id: customerID }),
      },
    }).then(res => res.data),

  get: (id: number) =>
    apiClient.get<Quotation>(`/quotations/${id}`).then(res => res.data),

  create: (data: QuotationCreateInput) =>
    apiClient.post<Quotation>('/quotations', data).then(res => res.data),

  update: (id: number, data: QuotationCreateInput) =>
    apiClient.put<Quotation>(`/quotations/${id}`, data).then(res => res.data),

  publish: (id: number) =>
    apiClient.post<Quotation>(`/quotations/${id}/publish`).then(res => res.data),

  duplicate: (id: number) =>
    apiClient.post<Quotation>(`/quotations/${id}/duplicate`).then(res => res.data),

  delete: (id: number) =>
    apiClient.delete(`/quotations/${id}`),
};

export const getPricingFactor = (level: string) =>
  apiClient.get<{ level: string; pricing_factor: string }>(`/pricing-factor/${level}`)
    .then(res => res.data);
