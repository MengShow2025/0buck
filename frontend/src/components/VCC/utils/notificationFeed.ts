import { classifyRewardTransaction } from './rewardCommerce';
import { normalizeOrderStatus } from './orderSummary';

type OrderInput = {
  order_id?: string | null;
  status?: string | null;
  tracking_number?: string | null;
  total_price?: number | string | null;
  currency?: string | null;
  created_at?: string | null;
};

type TransactionInput = {
  id?: string | null;
  type?: string | null;
  amount?: number | string | null;
  status?: string | null;
  order_id?: string | null;
  description?: string | null;
  created_at?: string | null;
};

export type NotificationFeedItem = {
  id: string;
  group: 'Today' | 'Yesterday' | 'This Week' | 'Earlier';
  kind: 'order' | 'reward';
  title: string;
  sub: string;
  extra?: string | null;
  drawer: 'orders' | 'reward_history' | 'wallet';
  cta: string;
  createdAt: string;
};

const toDate = (value: string | null | undefined): Date | null => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const toAmount = (value: number | string | null | undefined): number => {
  const normalized = Number(value);
  return Number.isFinite(normalized) ? normalized : 0;
};

const resolveGroup = (date: Date, now: Date): NotificationFeedItem['group'] => {
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.floor((startOfToday.getTime() - startOfDate.getTime()) / 86400000);

  if (diffDays <= 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays <= 7) return 'This Week';
  return 'Earlier';
};

export const buildNotificationsFeed = ({
  orders,
  transactions,
  now,
}: {
  orders: OrderInput[] | null | undefined;
  transactions: TransactionInput[] | null | undefined;
  now?: string;
}): NotificationFeedItem[] => {
  const referenceNow = now ? new Date(now) : new Date();
  const items: NotificationFeedItem[] = [];

  for (const order of orders || []) {
    const createdAt = toDate(order.created_at);
    if (!createdAt) continue;

    const uiStatus = normalizeOrderStatus(order.status);
    if (order.tracking_number) {
      items.push({
        id: `order-${order.order_id || createdAt.toISOString()}`,
        group: resolveGroup(createdAt, referenceNow),
        kind: 'order',
        title: 'Order shipped',
        sub: `${order.order_id || '--'} · ${order.tracking_number}`,
        extra: `Amount: ${order.currency || 'USD'} ${toAmount(order.total_price).toFixed(2)}`,
        drawer: 'orders',
        cta: 'Track package',
        createdAt: createdAt.toISOString(),
      });
      continue;
    }

    if (uiStatus === 'completed') {
      items.push({
        id: `order-complete-${order.order_id || createdAt.toISOString()}`,
        group: resolveGroup(createdAt, referenceNow),
        kind: 'order',
        title: 'Order completed',
        sub: `${order.order_id || '--'} · ${order.currency || 'USD'} ${toAmount(order.total_price).toFixed(2)}`,
        extra: null,
        drawer: 'orders',
        cta: 'View order',
        createdAt: createdAt.toISOString(),
      });
    }
  }

  for (const tx of transactions || []) {
    const createdAt = toDate(tx.created_at);
    if (!createdAt) continue;

    const amount = toAmount(tx.amount);
    if (amount <= 0) continue;

    const category = classifyRewardTransaction(tx);
    const metadata = {
      cashback: { title: 'Cash reward received', drawer: 'reward_history' as const, cta: 'View details' },
      fan: { title: 'Fan reward received', drawer: 'reward_history' as const, cta: 'View details' },
      referral: { title: 'Referral reward received', drawer: 'reward_history' as const, cta: 'View details' },
      refund: { title: 'Refund processed', drawer: 'wallet' as const, cta: 'Open wallet' },
      other: { title: 'Wallet credit received', drawer: 'wallet' as const, cta: 'Open wallet' },
      payment: null,
      withdraw: null,
    }[category];

    if (!metadata) continue;

    items.push({
      id: `tx-${tx.id || createdAt.toISOString()}`,
      group: resolveGroup(createdAt, referenceNow),
      kind: 'reward',
      title: metadata.title,
      sub: tx.description || tx.order_id || tx.status || '--',
      extra: `+$${amount.toFixed(2)}`,
      drawer: metadata.drawer,
      cta: metadata.cta,
      createdAt: createdAt.toISOString(),
    });
  }

  return items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
};
