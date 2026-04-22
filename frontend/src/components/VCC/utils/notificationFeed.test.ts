import { describe, expect, it } from 'vitest';
import { buildNotificationsFeed } from './notificationFeed';

describe('buildNotificationsFeed', () => {
  it('creates reward and order notifications from live payloads', () => {
    const items = buildNotificationsFeed({
      now: '2026-04-22T12:00:00.000Z',
      orders: [
        {
          order_id: 'ORD-1001',
          status: 'shipping',
          tracking_number: 'SF123',
          total_price: 99,
          currency: 'USD',
          created_at: '2026-04-22T09:00:00.000Z',
        },
      ],
      transactions: [
        {
          id: 'tx-1',
          type: 'cashback',
          amount: 15,
          status: 'completed',
          order_id: 'ORD-1001',
          created_at: '2026-04-22T08:00:00.000Z',
        },
      ],
    });

    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({
      group: 'Today',
      kind: 'order',
      title: 'Order shipped',
    });
    expect(items[1]).toMatchObject({
      group: 'Today',
      kind: 'reward',
      title: 'Cash reward received',
    });
  });

  it('returns empty when there is no live data', () => {
    expect(buildNotificationsFeed({ orders: [], transactions: [] })).toEqual([]);
  });
});
