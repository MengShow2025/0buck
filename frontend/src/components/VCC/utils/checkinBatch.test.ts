import { describe, expect, it } from 'vitest';
import { resolveCheckinBatchState, runMockBatchCheckin } from './checkinBatch';

describe('resolveCheckinBatchState', () => {
  it('returns done when already checked in today', () => {
    expect(resolveCheckinBatchState({ hasCheckedInToday: true, signableCount: 3, totalCount: 3 })).toBe('done');
  });

  it('returns disabled when no signable orders', () => {
    expect(resolveCheckinBatchState({ hasCheckedInToday: false, signableCount: 0, totalCount: 3 })).toBe('disabled');
  });

  it('returns partial when some orders are blocked', () => {
    expect(resolveCheckinBatchState({ hasCheckedInToday: false, signableCount: 2, totalCount: 3 })).toBe('partial');
  });

  it('returns ready when all orders are signable', () => {
    expect(resolveCheckinBatchState({ hasCheckedInToday: false, signableCount: 3, totalCount: 3 })).toBe('ready');
  });
});

describe('runMockBatchCheckin', () => {
  it('creates partial success summary with per-order results', () => {
    const result = runMockBatchCheckin([
      { id: '1', signable: true, estAmount: '10.00' },
      { id: '2', signable: false, estAmount: '20.00' },
    ]);
    expect(result.successCount).toBe(1);
    expect(result.failedCount).toBe(1);
    expect(result.realizedAmount).toBe('10.00');
    expect(result.rows[1].status).toBe('failed');
  });
});
