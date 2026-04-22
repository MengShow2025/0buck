import { describe, expect, it } from 'vitest';
import { extractRewardPlans, resolveRewardUserId } from './rewardStatus';

describe('rewardStatus', () => {
  it('resolves reward user id from customer_id only', () => {
    expect(resolveRewardUserId({ customer_id: 1004908 })).toBe(1004908);
    expect(resolveRewardUserId({ id: 12, user_id: 13 })).toBeNull();
  });

  it('extracts plans from current rewards status payload', () => {
    expect(extractRewardPlans({ plans: [{ id: 'p-1' }, { id: 'p-2' }] })).toHaveLength(2);
    expect(extractRewardPlans({ plan_items: [{ id: 'legacy' }] })).toHaveLength(1);
    expect(extractRewardPlans({})).toEqual([]);
  });
});
