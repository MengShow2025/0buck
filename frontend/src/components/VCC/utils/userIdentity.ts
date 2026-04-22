import type { UserProfile } from '../contexts/types';

type PartialUserIdentity = Partial<UserProfile> | null | undefined;

const clean = (value: unknown): string => String(value || '').trim();

export const getDisplayName = (user: PartialUserIdentity): string => {
  const name = clean(user?.nickname) || clean(user?.user_nickname) || clean(user?.first_name);
  if (name) return name;

  const email = clean(user?.email);
  if (email.includes('@')) {
    return email.split('@')[0];
  }

  return 'Guest';
};

export const buildAvatarFallback = (user: PartialUserIdentity): string => {
  const name = getDisplayName(user);
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=e5e7eb&color=374151&size=128`;
};

export const formatMemberId = (customerId: number | string | null | undefined): string | null => {
  const normalized = Number(customerId);
  if (!Number.isFinite(normalized)) {
    return null;
  }
  return `0BUCK_${Math.trunc(normalized)}`;
};

export const getReferralCode = (user: PartialUserIdentity): string | null => {
  const code = clean(user?.referral_code);
  return code || null;
};
