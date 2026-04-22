import { describe, expect, it } from 'vitest';
import { extractUserFromMeResponse } from './meResponseParser';

describe('extractUserFromMeResponse', () => {
  it('supports wrapped /auth/me payload', () => {
    const payload = {
      status: 'success',
      user: {
        customer_id: 101,
        email: 'u@example.com',
        first_name: 'User',
        user_type: 'customer',
        referral_code: 'REF101',
      },
    };
    expect(extractUserFromMeResponse(payload)).toMatchObject({
      customer_id: 101,
      email: 'u@example.com',
      first_name: 'User',
      user_type: 'customer',
      referral_code: 'REF101',
      user_tier: 'Silver',
      is_two_factor_enabled: false,
    });
  });

  it('supports plain /users/me payload', () => {
    const payload = {
      customer_id: 202,
      email: 'u2@example.com',
      user_tier: 'gold',
      is_two_factor_enabled: true,
      referral_code: 'REF202',
      avatar_url: 'https://cdn.example.com/avatar.png',
      user_type: 'admin',
    };
    expect(extractUserFromMeResponse(payload)).toMatchObject({
      customer_id: 202,
      email: 'u2@example.com',
      user_tier: 'Gold',
      is_two_factor_enabled: true,
      referral_code: 'REF202',
      avatar_url: 'https://cdn.example.com/avatar.png',
      user_type: 'admin',
    });
  });

  it('returns null for malformed payloads', () => {
    expect(extractUserFromMeResponse({ status: 'success' })).toBeNull();
  });
});
