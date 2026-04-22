export type OrderSummary = {
  order_id?: string;
  status?: string;
  tracking_number?: string | null;
  [key: string]: unknown;
};

export const normalizeOrderStatus = (status: string | null | undefined): string => {
  const normalized = String(status || '').trim().toLowerCase();
  if (normalized === 'shipping' || normalized === 'in_transit') return 'shipped';
  if (normalized === 'delivered') return 'completed';
  return normalized || 'paid';
};

export const findOrderSummary = (orders: OrderSummary[], orderId: string | null | undefined): OrderSummary | null => {
  const target = String(orderId || '').trim();
  if (!target) return null;
  return orders.find((order) => String(order.order_id || '') === target) || null;
};

export const matchesOrderSearch = (order: OrderSummary, query: string): boolean => {
  const normalized = String(query || '').trim().toLowerCase();
  if (!normalized) return true;

  return [order.order_id, order.tracking_number]
    .map((value) => String(value || '').toLowerCase())
    .some((value) => value.includes(normalized));
};
