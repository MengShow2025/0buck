import axios from 'axios';
import { loadByokConfig } from './byokStorage';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // For HttpOnly cookies
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// User & Security
export const userApi = {
  getMe: () => api.get('/users/me'),
  getKycStatus: () => api.get('/users/kyc/status'),
  submitKyc: (data: any) => api.post('/users/kyc/submit', data),
  getTierStatus: () => api.get('/users/tier/status'),
  getTierRules: () => api.get('/users/tier/rules'),
  bindBackupEmail: (data: any) => api.post('/users/backup-email/bind', data),
};

export const authApi = {
  checkEmail: (email: string) => api.post('/auth/check-email', { email }),
  login: (data: any) => api.post('/auth/login', data),
  register: (data: any) => api.post('/auth/register', data),
  logout: () => api.post('/auth/logout'),
  check2fa: (email: string) => api.post('/auth/check-2fa', { email }),
  setup2fa: () => api.post('/auth/2fa/setup-authenticated'),
  enable2fa: (code: string) => api.post('/auth/2fa/enable', { code }),
  disable2fa: (code: string) => api.post('/auth/2fa/disable', { code }),
  rebindEmail: (data: any) => api.post('/auth/rebind-email', data),
  changePassword: (data: any) => api.post('/auth/change-password', data),
};

// Transaction & Rewards
export const productApi = {
  getDiscovery: () => api.get('/products/discovery'),
  getDetail: (id: number) => api.get(`/products/${id}`),
};

export const rewardApi = {
  getStatus: (userId: number) => api.get(`/rewards/status/${userId}`),
  checkin: (userId: number, planId: string) => api.post('/rewards/checkin', { user_id: userId, plan_id: planId }),
  getTransactions: (userId: number) => api.get(`/rewards/transactions/${userId}`),
  getPointsRules: () => api.get('/rewards/points/rules'),
  getPointsExchangeCatalog: () => api.get('/rewards/points/exchange-catalog'),
  awardActivityPoints: (userId: number, event: string) => api.post('/rewards/points/activity', { user_id: userId, event }),
  redeemPointsItem: (userId: number, itemCode: string, planId?: string) =>
    api.post('/rewards/points/exchange/redeem', { user_id: userId, item_code: itemCode, plan_id: planId }),
};

export const orderApi = {
  create: (data: any) => api.post('/rewards/payment/create-order', data),
  createQuote: (data: any) => api.post('/rewards/payment/quote', data),
  preCheck: (data: any) => api.post('/rewards/payment/pre-check', data),
  getDiscounts: (subtotal: number) => api.get('/rewards/payment/discounts', { params: { subtotal } }),
  evaluateDiscounts: (subtotal: number, selectedCodes: string[]) =>
    api.post('/rewards/payment/discounts/evaluate', { subtotal, selected_codes: selectedCodes }),
  getMyOrders: (limit = 100) => api.get('/rewards/orders/me', { params: { limit } }),
};

export const aiApi = {
  chat: async (content: string, context?: any) => {
    const byok = loadByokConfig();
    if (byok?.enabled && byok.provider === 'gemini' && byok.apiKey) {
      const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${byok.model}:generateContent`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-goog-api-key': byok.apiKey,
        },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: content }] }],
        }),
      });

      if (resp.ok) {
        const data = await resp.json();
        const text = data?.candidates?.[0]?.content?.parts
          ?.map((p: any) => p?.text)
          ?.filter(Boolean)
          ?.join('') ?? '';

        if (typeof text === 'string' && text.trim()) {
          return { data: { content: text, attachments: [] } };
        }
      }
    }

    return api.post(
      '/butler/chat',
      {
        messages: [{ role: 'user', content }],
        context,
      },
      {
        // Force a bounded wait so UI fallback can trigger when backend LLM stalls.
        timeout: 12000,
      }
    );
  },
  getProfile: (userId: number) => api.get(`/butler/profile/${userId}`),
};

export const addressApi = {
  list: () => api.get('/butler/addresses'),
  create: (data: {
    name: string;
    phone: string;
    country: string;
    address1: string;
    address2?: string;
    city: string;
    state: string;
    zip: string;
    isDefault?: boolean;
  }) => api.post('/butler/addresses', data),
  update: (
    addressId: string,
    data: {
      name: string;
      phone: string;
      country: string;
      address1: string;
      address2?: string;
      city: string;
      state: string;
      zip: string;
      isDefault?: boolean;
    }
  ) => api.put(`/butler/addresses/${addressId}`, data),
  remove: (addressId: string) => api.delete(`/butler/addresses/${addressId}`),
  setDefault: (addressId: string) => api.post(`/butler/addresses/${addressId}/default`),
};

export const imApi = {
  getFeishuOauthStart: () => api.get('/im/feishu/oauth/start'),
  createBindToken: (platform: 'feishu' | 'whatsapp' | 'telegram' | 'discord', ttlSeconds = 600) =>
    api.post(`/im/bind-token?platform=${platform}&ttl_seconds=${ttlSeconds}`),
  getBindings: () => api.get('/im/bindings'),
  unlink: (platform: string) => api.delete(`/im/bindings/${platform}`),
  generatePromoCard: (data: {
    card_type: 'product' | 'merchant' | 'invite';
    target_type: 'product' | 'merchant' | 'none';
    target_id?: string | number;
    platform?: 'feishu' | 'whatsapp' | 'telegram' | 'discord';
    entry_type?: string;
    share_category?: 'group_buy' | 'distribution' | 'fan_source';
  }) => api.post('/im/promo/cards/generate', data),
  sendPromoCard: (data: {
    share_token: string;
    platform: 'feishu' | 'whatsapp' | 'telegram' | 'discord';
    destination_uid?: string;
    template_id?: string;
  }) => api.post('/im/promo/cards/send', data),
  buildTemplatesFromLink: (link: string) => api.post('/im/promo/cards/from-link', { link }),
};

export default api;
