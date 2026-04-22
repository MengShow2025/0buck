import { describe, expect, it } from 'vitest';
import { findOrderSummary, matchesOrderSearch, normalizeOrderStatus } from './orderSummary';

const ORDERS = [
  { order_id: 'ORD-1', status: 'paid', tracking_number: null },
  { order_id: 'ORD-2', status: 'refunding', tracking_number: 'YT123' },
];

describe('orderSummary', () => {
  it('normalizes backend statuses for UI grouping', () => {
    expect(normalizeOrderStatus('shipping')).toBe('shipped');
    expect(normalizeOrderStatus('delivered')).toBe('completed');
    expect(normalizeOrderStatus('refunding')).toBe('refunding');
  });

  it('finds selected orders by order id', () => {
    expect(findOrderSummary(ORDERS, 'ORD-2')).toMatchObject({ order_id: 'ORD-2' });
    expect(findOrderSummary(ORDERS, 'missing')).toBeNull();
  });

  it('matches order search against id and tracking number', () => {
    expect(matchesOrderSearch(ORDERS[1], 'ord-2')).toBe(true);
    expect(matchesOrderSearch(ORDERS[1], 'yt123')).toBe(true);
    expect(matchesOrderSearch(ORDERS[0], 'yt123')).toBe(false);
  });
});
