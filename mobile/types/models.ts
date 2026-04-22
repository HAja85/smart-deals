export interface User {
  id: number;
  name: string;
  email: string;
  role: 'consumer' | 'supplier' | 'admin';
  mobile_number?: string;
  image?: string;
}

export interface Deal {
  id: number;
  product_id?: number;
  product_title?: string;
  product_brand?: string;
  product_image?: string;
  title?: string;
  brand?: string;
  image?: string;
  price_per_unit: number;
  actual_price?: number;
  target_quantity: number;
  current_quantity: number;
  status: 'Active' | 'Successful' | 'Failed';
  start_time?: string;
  end_time?: string;
  view_count?: number;
  category?: string;
}

export interface Order {
  id: number;
  order_number?: string;
  deal_id?: number;
  user_id?: number;
  product_title?: string;
  quantity: number;
  total_amount: number;
  payment_status: 'Pending' | 'Captured' | 'Cancelled' | 'Authorized';
  delivery_status?: 'Pending' | 'Shipped' | 'Delivered';
  created_at: string;
  buyer_name?: string;
}

export interface CartItem {
  deal_id: number;
  product_title?: string;
  product_brand?: string;
  price_per_unit: number;
  quantity: number;
}

export interface Cart {
  items: CartItem[];
  cart_total: number;
}

export interface Product {
  id: number;
  title: string;
  brand: string;
  category: string;
  unit: string;
  description?: string;
  image?: string;
  seller_id?: number;
  seller_name?: string;
}

export interface SignupData {
  name: string;
  email: string;
  mobile_number: string;
  password: string;
  email_otp: string;
  mobile_otp: string;
}

export interface NotificationData {
  type?: 'deal' | 'order';
  deal_id?: number;
  order_id?: number;
}

export interface ApiErrorResponse {
  response?: {
    data?: {
      detail?: string;
    };
  };
}

export function getApiError(err: unknown, fallback: string): string {
  const apiErr = err as ApiErrorResponse;
  return apiErr?.response?.data?.detail ?? fallback;
}
