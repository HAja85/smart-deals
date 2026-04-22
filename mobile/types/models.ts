export interface User {
  id: number;
  name: string;
  email: string;
  role: 'consumer' | 'supplier' | 'admin';
  mobile_number?: string;
  image?: string;
}

export interface ProductInDeal {
  id: number;
  title: string;
  image?: string;
  brand: string;
  unit: string;
  category: string;
  description?: string;
  seller_name?: string;
  seller_image?: string;
}

export interface Deal {
  id: number;
  product_id?: number;
  product?: ProductInDeal;
  product_title?: string;
  product_brand?: string;
  product_image?: string;
  title?: string;
  brand?: string;
  image?: string;
  price_per_unit: number;
  actual_price?: number;
  discount_percent?: number;
  target_quantity: number;
  current_quantity: number;
  progress_percent?: number;
  status: 'Active' | 'Successful' | 'Failed' | 'Upcoming' | 'Stopped';
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
  product_image?: string;
  product_brand?: string;
  product_unit?: string;
  quantity: number;
  total_amount: number;
  price_per_unit?: number;
  actual_price?: number;
  payment_status: 'Pending' | 'Captured' | 'Cancelled' | 'Authorized';
  delivery_status?: 'Pending' | 'Shipped' | 'Delivered';
  delivery_address?: string;
  mobile_number?: string;
  created_at: string;
  paid_at?: string;
  stripe_client_secret?: string;
  stripe_payment_intent_id?: string;
  deal_status?: string;
  buyer_name?: string;
  buyer_email?: string;
  buyer_mobile?: string;
}

export interface CartItem {
  cart_item_id?: number;
  deal_id: number;
  quantity: number;
  price_per_unit: number;
  actual_price?: number;
  product_title?: string;
  product_image?: string;
  product_brand?: string;
  product_unit?: string;
  deal_status?: string;
  end_time?: string;
  is_expired?: boolean;
  line_total?: number;
  discount_percent?: number;
  progress_percent?: number;
}

export interface CartResponse {
  items: CartItem[];
  item_count: number;
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
