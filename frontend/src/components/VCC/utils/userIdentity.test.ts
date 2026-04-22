import { describe, expect, it } from 'vitest';
import { buildAvatarFallback, formatMemberId, getDisplayName, getReferralCode } from './userIdentity';

describe('userIdentity', () => {
  it('prefers explicit user names over email prefixes', () => {
    expect(getDisplayName({
      email: 'person@example.com',
      nickname: 'Nick',
      user_nickname: 'Alt',
      first_name: 'First',
    })).toBe('Nick');

    expect(getDisplayName({
      email: 'person@example.com',
      user_nickname: 'Alt',
      first_name: 'First',
    })).toBe('Alt');
  });

  it('falls back to email prefix and guest label when needed', () => {
    expect(getDisplayName({ email: 'plain@example.com' })).toBe('plain');
    expect(getDisplayName({})).toBe('Guest');
  });

  it('builds member ids from real customer ids only', () => {
    expect(formatMemberId(9527)).toBe('0BUCK_9527');
    expect(formatMemberId(undefined)).toBeNull();
  });

  it('returns null when referral code is absent', () => {
    expect(getReferralCode({ referral_code: 'REF2026' })).toBe('REF2026');
    expect(getReferralCode({})).toBeNull();
  });

  it('builds a deterministic fallback avatar from live identity fields', () => {
    expect(buildAvatarFallback({ first_name: 'Teme', email: 'teme@example.com' })).toContain('name=Teme');
    expect(buildAvatarFallback({})).toContain('name=Guest');
  });
});
