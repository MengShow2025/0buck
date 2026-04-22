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
  me: () => api.get('/auth/me'),
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
  getDiscovery: (user_country?: string, page?: number) => api.get('/products/discovery', { params: { user_country, page } }),
  getDetail: (id: number) => api.get(`/products/${id}`),
};

export const rewardApi = {
  getStatus: (userId: number) => api.get(`/rewards/status/${userId}`),
  checkin: (userId: number, planId: string) => api.post('/rewards/checkin', { user_id: userId, plan_id: planId }),
  getTransactions: (userId: number) => api.get(`/rewards/transactions/${userId}`),
  getPointsTransactions: (userId: number) => api.get(`/rewards/points/transactions/${userId}`),
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
    const buildGeminiParts = () => {
      const parts: any[] = [{ text: content }];
      const mediaItems = Array.isArray(context?.media_items) ? context.media_items : [];
      const first = mediaItems[0];
      const url = String(first?.url || '');
      if (url.startsWith('data:image/')) {
        const m = url.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
        if (m) {
          parts.push({
            inline_data: {
              mime_type: m[1],
              data: m[2],
            },
          });
        }
      }
      return parts;
    };

    const byok = loadByokConfig();
    if (byok?.enabled && byok.provider === 'gemini' && byok.apiKey) {
      const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${byok.model}:generateContent`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-goog-api-key': byok.apiKey,
        },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: buildGeminiParts() }],
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
        timeout: 60000, // increased for LLM calls
      }
    );
  },
  getProfile: (userId: number) => api.get(`/butler/profile/${userId}`),
  syncProfileSettings: (payload: { active_persona_id?: string; ui_settings?: Record<string, any> }) =>
    api.post('/butler/profile/sync', payload),
  getRecommendationSettings: () => api.get('/butler/profile/recommendation'),
  setRecommendationSettings: (enabled: boolean) =>
    api.post('/butler/profile/recommendation', { enabled }),
  skipRecommendationOnce: (sessionId: string = 'global', minutes: number = 30) =>
    api.post('/butler/profile/recommendation/skip', { session_id: sessionId, minutes }),
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

export const friendsApi = {
  search: (q: string) => api.get('/friends/search', { params: { q } }),
  list: () => api.get('/friends'),
  listBlocked: () => api.get('/friends/blocked'),
  listRequests: () => api.get('/friends/requests'),
  requestAdd: (targetUserId: number, message?: string) =>
    api.post('/friends/requests', { target_user_id: targetUserId, message }),
  accept: (requestId: number) => api.post(`/friends/requests/${requestId}/accept`),
  ignore: (requestId: number) => api.post(`/friends/requests/${requestId}/ignore`),
  remove: (friendUserId: number) => api.delete(`/friends/${friendUserId}`),
  block: (friendUserId: number) => api.post(`/friends/${friendUserId}/block`),
  unblock: (friendUserId: number) => api.delete(`/friends/${friendUserId}/block`),
};

export const groupsApi = {
  bootstrapDefaults: () => api.post('/groups/bootstrap-defaults'),
  list: () => api.get('/groups'),
  detail: (groupId: number) => api.get(`/groups/${groupId}`),
  create: (data: { name: string; avatar_url?: string; group_type?: string; member_user_ids?: number[] }) =>
    api.post('/groups', data),
  members: (groupId: number) => api.get(`/groups/${groupId}/members`),
  mySettings: (groupId: number) => api.get(`/groups/${groupId}/me-settings`),
  updateMySettings: (groupId: number, data: any) => api.put(`/groups/${groupId}/me-settings`, data),
  invite: (groupId: number, userIds: number[]) => api.post(`/groups/${groupId}/members/invite`, { user_ids: userIds }),
  setRole: (groupId: number, userId: number, role: 'owner' | 'admin' | 'member') =>
    api.post(`/groups/${groupId}/members/${userId}/role`, { role }),
  removeMember: (groupId: number, userId: number) => api.delete(`/groups/${groupId}/members/${userId}`),
  updateSettings: (groupId: number, data: any) => api.patch(`/groups/${groupId}/settings`, data),
  muteAll: (groupId: number, enabled: boolean) => api.post(`/groups/${groupId}/mute-all`, { enabled }),
  muteMember: (groupId: number, userId: number, minutes: number) =>
    api.post(`/groups/${groupId}/members/${userId}/mute`, { minutes }),
  transferOwner: (groupId: number, newOwnerUserId: number) =>
    api.post(`/groups/${groupId}/transfer-owner`, { new_owner_user_id: newOwnerUserId }),
  auditLogs: (groupId: number) => api.get(`/groups/${groupId}/audit-logs`),
  pinMessage: (groupId: number, data: { message_id: string; title?: string; content?: string; sender?: string; time?: string }) =>
    api.post(`/groups/${groupId}/pin-message`, data),
  unpinMessage: (groupId: number, messageId: string) => api.delete(`/groups/${groupId}/pin-message/${messageId}`),
  setRecommendation: (groupId: number, data: { title?: string; link: string; subtitle?: string }) =>
    api.post(`/groups/${groupId}/recommendation`, data),
  clearRecommendation: (groupId: number) => api.delete(`/groups/${groupId}/recommendation`),
  leave: (groupId: number) => api.post(`/groups/${groupId}/leave`),
  dissolve: (groupId: number) => api.delete(`/groups/${groupId}`),
};

export const socialApi = {
  uploadTicket: (data: { file_name: string; mime_type: string; file_size: number }) =>
    api.post('/social/media/upload-ticket', data),
  commitMedia: (data: { cdn_url: string; mime_type?: string; width?: number; height?: number; size?: number }) =>
    api.post('/social/media/commit', data),
  createActivity: (data: { content: string; visibility: 'public' | 'friends'; media: any[] }) =>
    api.post('/social/activities', data),
  createOfficialActivity: (data: {
    content: string;
    visibility: 'public' | 'friends';
    media: any[];
    official_type: 'activity' | 'topic';
    pinned?: boolean;
  }) => api.post('/social/official/activities', data),
  listActivities: (params?: { limit?: number; offset?: number }) => api.get('/social/activities', { params }),
  pinActivity: (activityId: string, pinned: boolean) => api.put(`/social/activities/${activityId}/pin`, { pinned }),
  deleteActivity: (activityId: string) => api.delete(`/social/activities/${activityId}`),
  like: (activityId: string) => api.post(`/social/activities/${activityId}/like`),
  unlike: (activityId: string) => api.delete(`/social/activities/${activityId}/like`),
  listComments: (activityId: string) => api.get(`/social/activities/${activityId}/comments`),
  createComment: (activityId: string, content: string, parentCommentId?: string) =>
    api.post(`/social/activities/${activityId}/comments`, {
      content,
      ...(parentCommentId ? { parent_comment_id: parentCommentId } : {}),
    }),
  deleteComment: (commentId: string) => api.delete(`/social/comments/${commentId}`),
};

export const adminApi = {
  getPersonaTemplates: () => api.get('/admin/ai/persona-templates'),
  updatePersonaTemplate: (id: string, data: any) => api.post('/admin/ai/persona-templates', { id, ...data }),
  getUsageStats: () => api.get('/admin/ai/usage-stats'),
  getCandidates: (status: string = 'pending,new') => api.get(`/admin/sourcing/candidates?status=${status}`),
  updateCandidate: (id: string, data: any) => api.patch(`/admin/sourcing/candidates/${id}`, data),
  repolishCandidate: (id: string) => api.post(`/admin/sourcing/candidates/${id}/repolish`, {}, { timeout: 45000 }),
  getSyncStatus: () => api.get('/admin/products'),
  approveCandidate: (id: string) => api.post(`/admin/sourcing/candidates/${id}/approve`),
  rejectCandidate: (id: string) => api.post(`/admin/sourcing/candidates/${id}/reject`),
  getKpis: () => api.get('/admin/dashboard/kpis'),
  getBalanceSheet: () => api.get('/admin/finance/balance-sheet'),
  getOrders: (skip = 0, limit = 50) => api.get(`/admin/orders?skip=${skip}&limit=${limit}`),
};

export default api;
