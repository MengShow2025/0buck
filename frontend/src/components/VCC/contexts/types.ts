export type Theme = 'light' | 'dark' | 'system';
export type Language = 'en' | 'zh';
export type Currency = 'AUTO' | string; // Use string to support all world currencies dynamically
export type DrawerType = 'none' | 'lounge' | 'square' | 'prime' | 'wallet' | 'fans' | 'product_detail' | 'checkout' | 'orders' | 'address' | 'service' | 'me' | 'cart' | 'all_group_buy' | 'all_fan_feeds' | 'all_topics' | 'chat_room' | 'notification' | 'contacts' | 'my_feeds' | 'user_profile' 
  | 'share_menu' 
  | 'key_attributes'
  | 'product_reviews'
  | 'supplier_analysis'
  | 'coupons'
  | 'auth'
  | 'wishlist_detail'
  | 'new_friends'
  | 'blacklist'
  | 'settings'
  | 'group_buy_detail'
  | 'order_detail'
  | 'order_tracking'
  | 'influencer_apply'
  | 'leaderboard'
  | 'reward_history'
  | 'fan_center'
  | 'checkin_hub'
  | 'points_history'
  | 'points_exchange'
  | 'withdraw'
  | 'api_model_add'
  | 'vouchers'
  | 'personal_info'
  | 'security'
  | 'verification'
  | 'change_password'
  | 'tier_rules'
  | 'google_2fa'
  | 'email_bind_new'
  | 'BackupEmail'
  | 'dual_verification'
  | 'wallet_history'
  | 'ai_persona'
  | 'scan';

export interface UserProfile {
  customer_id: number;
  email: string;
  backup_email?: string;
  first_name?: string;
  last_name?: string;
  nickname?: string;
  avatar_url?: string;
  butler_name?: string;
  user_nickname?: string;
  ai_identity_mode?: string;
  user_tier: 'Bronze' | 'Silver' | 'Gold' | 'Platinum';
  user_type: string;
  referral_code?: string;
  is_two_factor_enabled: boolean;
}

export interface ChatContext {
  id: string;
  name: string;
  type: 'private' | 'group' | 'topic' | 'group_buy';
  avatar?: string;
  memberCount?: number;
  isOfficial?: boolean;
}
