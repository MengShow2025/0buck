export interface Product {
  id: string;
  shopify_id?: string;
  title: string;
  price: number;
  original_price?: number;
  images: string[];
  description?: string;
  category?: string;
  is_reward_eligible?: boolean;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  type: 'text' | 'image' | 'products';
  products?: Product[];
  timestamp: Date;
}

export interface User {
  id: string;
  name: string;
  wallet_balance: number;
  level: 'Silver' | 'Gold' | 'Platinum';
}
