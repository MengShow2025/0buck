import { describe, expect, it } from 'vitest';
import { extractUserFromMeResponse } from '../AppContext';

describe('extractUserFromMeResponse', () => {
  it('supports wrapped /users/me payload', () => {
    const payload = {
      status: 'success',
      user: { customer_id: 101, email: 'u@example.com' },
    };
    expect(extractUserFromMeResponse(payload)?.customer_id).toBe(101);
  });

  it('supports plain /users/me payload', () => {
    const payload = { customer_id: 202, email: 'u2@example.com' };
    expect(extractUserFromMeResponse(payload)?.customer_id).toBe(202);
  });
});
