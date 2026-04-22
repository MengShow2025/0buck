import { describe, expect, it } from 'vitest';
import {
  classifyRewardTransaction,
  summarizeRewardStatus,
  summarizeRewardTransactions,
} from './rewardCommerce';

describe('classifyRewardTransaction', () => {
  it('distinguishes fan rewards from generic referrals', () => {
    expect(
      classifyRewardTransaction({
        type: 'referral',
        description: 'Commission for Order #880001 (Ref: Fan Bond)',
      })
    ).toBe('fan');

    expect(
      classifyRewardTransaction({
        type: 'referral',
        description: 'Commission for Order #880002 (Ref: REF2026)',
      })
    ).toBe('referral');
  });
});

describe('summarizeRewardTransactions', () => {
  it('aggregates positive earnings by category', () => {
    const summary = summarizeRewardTransactions([
      { id: '1', amount: 15, type: 'cashback', description: 'Cashback stage 1' },
      { id: '2', amount: 9.5, type: 'referral', description: 'Commission for Order #2 (Ref: REF2026)' },
      { id: '3', amount: 4.25, type: 'referral', description: 'Commission for Order #3 (Ref: Fan Bond)' },
      { id: '4', amount: -20, type: 'withdraw', description: 'Withdrawal' },
    ]);

    expect(summary.lifetimeEarnings).toBe(28.75);
    expect(summary.breakdown.cashback.amount).toBe(15);
    expect(summary.breakdown.referral.amount).toBe(9.5);
    expect(summary.breakdown.fan.amount).toBe(4.25);
    expect(summary.breakdown.withdraw.amount).toBe(0);
  });
});

describe('summarizeRewardStatus', () => {
  it('derives referral identity and pending plan metrics from live status payloads', () => {
    const summary = summarizeRewardStatus({
      referral_code: 'REF-REAL',
      level: { invitees: 12 },
      plans: [
        { id: 'p1', order_id: 'ORD-1', raw_status: 'active', reward_base: 20, total_earned: 5, current_period: 4 },
        { id: 'p2', order_id: 'ORD-2', raw_status: 'failed', reward_base: 8, total_earned: 0, current_period: 1 },
        { id: 'p3', order_id: 'ORD-3', raw_status: 'completed', reward_base: 6, total_earned: 6, current_period: 20 },
      ],
    });

    expect(summary.referralCode).toBe('REF-REAL');
    expect(summary.totalFans).toBe(12);
    expect(summary.pendingCashbackAmount).toBe(23);
    expect(summary.activePlanCount).toBe(2);
    expect(summary.orderRows).toEqual([
      {
        id: 'p1',
        orderId: 'ORD-1',
        currentPeriod: 4,
        estimatedAmount: 15,
        rawStatus: 'active',
      },
      {
        id: 'p2',
        orderId: 'ORD-2',
        currentPeriod: 1,
        estimatedAmount: 8,
        rawStatus: 'failed',
      },
    ]);
  });
});
