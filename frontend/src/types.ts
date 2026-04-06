export interface Merchant {
  id: string;
  name: string;
  logo: string;
  years: number;
  location: string;
  locationCode: string;
  rating: number;
  ratingCount: number;
  isVerified: boolean;
  businessType: string;
  mainProducts: string[];
  responseTime: string;
  onTimeDeliveryRate: string;
  reorderRate: string;
  matches: string;
  factoryStats: { label: string; value: string }[];
  featuredProducts: Product[];
  mainCategoryTags: string[];
}

export type ViewType = 
  | 'explore' 
  | 'chat' 
  | 'circle' 
  | 'contacts' 
  | 'messages' 
  | 'activity' 
  | 'secure-pay'
  | 'cart'
  | 'login'
  | 'register'
  | 'checkin'
  | 'prime'
  | 'square'
  | 'product-detail'
  | 'merchant-detail'
  | 'admin'
  | 'me';

export interface Channel {
  id: string;
  title: string;
  description: string;
  creator: string;
  creatorAvatar: string;
  thumbnail: string;
  viewers: string;
  category: string;
  isLive?: boolean;
}

export interface Message {
  id: string;
  sender: 'ai' | 'user';
  text: string;
  timestamp: string;
  products?: Product[];
}

export interface Product {
  id: string;
  name: string;
  price: string;
  description: string;
  image: string;
  tag?: string;
  tagColor?: string;
  moq?: string;
  quantity?: number;
  delivery?: string;
}

export interface CartItem {
  id: string;
  name?: string;
  price?: string | number;
  image?: string;
  product: Product;
  quantity: number;
  sellerName?: string;
}

export interface SecurePayPayload {
  type?: 'single' | 'cart';
  id?: string;
  name?: string;
  price?: number;
  image?: string;
  quantity?: number;
  items?: any[];
  shippingPostalCode?: string;
  referrer_id?: string | number; // v3.4.4: Distribution referrer
  inviter_id?: string | number;  // v3.4.4: Invitation inviter
  group_share_code?: string;     // v3.4.4: Group buy join code
}

export interface Conversation {
  id: string;
  name: string;
  avatar: string;
  lastMessage: string;
  time: string;
  unread?: boolean;
  isActive?: boolean;
}
