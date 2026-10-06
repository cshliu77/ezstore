export interface Customer {
  id: number;
  name: string;
  tax_id: string;
  contact_name: string;
  contact_phone: string;
  contact_email: string;
  address: string;
  level: 'vip' | 'standard' | 'new';
  credit_score: number;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: number;
  product_number: string;
  name: string;
  description: string;
  cost: string;
  list_price: string;
  inventory: number;
  supplier: string;
  created_at: string;
  updated_at: string;
}

export interface QuotationItem {
  id?: number;
  product_id: number;
  product_name: string;
  product_cost: string;
  list_price: string;
  unit_price: string;
  quantity: number;
  subtotal: string;
}

export interface Quotation {
  id: number;
  quotation_number: string;
  customer_id: number;
  customer?: Customer;
  customer_level: string;
  pricing_factor: string;
  total_price: string;
  profit_amount: string;
  profit_rate: string;
  status: 'draft' | 'published';
  notes: string;
  items: QuotationItem[];
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id?: number;
  product_id: number;
  product_name: string;
  unit_price: string;
  quantity: number;
  subtotal: string;
}

export interface Order {
  id: number;
  order_number: string;
  customer_id: number;
  customer?: Customer;
  quotation_id?: number;
  total_price: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  notes: string;
  items: OrderItem[];
  created_at: string;
  updated_at: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  page_size: number;
}
