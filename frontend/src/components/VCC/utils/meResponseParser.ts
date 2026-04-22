import { UserProfile } from '../contexts/types';

type UnknownRecord = Record<string, unknown>;

const TIER_MAP: Record<string, UserProfile['user_tier']> = {
  bronze: 'Bronze',
  silver: 'Silver',
  gold: 'Gold',
  platinum: 'Platinum',
};

const normalizeTier = (value: unknown): UserProfile['user_tier'] => {
  const normalized = String(value || '').trim().toLowerCase();
  return TIER_MAP[normalized] || 'Silver';
};

const asRecord = (value: unknown): UnknownRecord | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  return value as UnknownRecord;
};

const toOptionalString = (value: unknown): string | undefined => {
  const normalized = String(value || '').trim();
  return normalized || undefined;
};

const toOptionalNumber = (value: unknown): number | null => {
  const normalized = Number(value);
  return Number.isFinite(normalized) ? normalized : null;
};

export const extractUserFromMeResponse = (payload: unknown): UserProfile | null => {
  const root = asRecord(payload);
  if (!root) return null;

  const candidate = asRecord(root.user) ?? root;
  const customerId = toOptionalNumber(candidate.customer_id);
  const email = toOptionalString(candidate.email);
  const userType = toOptionalString(candidate.user_type);

  if (customerId === null || !email || !userType) {
    return null;
  }

  return {
    customer_id: customerId,
    email,
    backup_email: toOptionalString(candidate.backup_email),
    first_name: toOptionalString(candidate.first_name),
    last_name: toOptionalString(candidate.last_name),
    nickname: toOptionalString(candidate.nickname),
    avatar_url: toOptionalString(candidate.avatar_url),
    butler_name: toOptionalString(candidate.butler_name),
    user_nickname: toOptionalString(candidate.user_nickname),
    user_tier: normalizeTier(candidate.user_tier),
    user_type: userType,
    referral_code: toOptionalString(candidate.referral_code),
    is_two_factor_enabled: Boolean(candidate.is_two_factor_enabled),
  };
};
