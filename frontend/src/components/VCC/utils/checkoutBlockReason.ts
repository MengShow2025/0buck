type Translate = (key: string) => string;

export const CHECKOUT_BLOCK_REASONS = ['inactive', 'missing_price', 'not_published', 'unknown'] as const;
export type CheckoutBlockReason = typeof CHECKOUT_BLOCK_REASONS[number];

export function normalizeCheckoutBlockReason(reason?: string | null): CheckoutBlockReason | null {
  if (!reason) return null;
  if ((CHECKOUT_BLOCK_REASONS as readonly string[]).includes(reason)) return reason as CheckoutBlockReason;
  return null;
}

export function getCheckoutBlockReasonText(t: Translate, reason?: string | null): string {
  const normalized = normalizeCheckoutBlockReason(reason);
  if (normalized === 'inactive') return t('checkout.block_reason.inactive');
  if (normalized === 'missing_price') return t('checkout.block_reason.missing_price');
  if (normalized === 'not_published') return t('checkout.block_reason.not_published');
  if (normalized === 'unknown') return t('checkout.blocked_unavailable');
  return t('checkout.blocked_unavailable');
}

export function getCheckoutBlockedMoreItemsText(t: Translate, count: number): string {
  return t('checkout.block_reason.more_items').replace('{count}', String(Math.max(0, count)));
}

export function getCheckoutBlockReasonFromDetail(detail: string): string | null {
  if (detail.startsWith('product_inactive')) return 'inactive';
  if (detail.startsWith('invalid_product_price')) return 'missing_price';
  if (detail.startsWith('product_variant_missing')) return 'not_published';
  if (detail.startsWith('product_not_ready_for_checkout')) return 'not_published';
  return null;
}

export function getCheckoutBlockMessageFromDetail(t: Translate, detail: string): string | null {
  const reason = getCheckoutBlockReasonFromDetail(detail);
  if (!reason) return null;
  return getCheckoutBlockReasonText(t, reason);
}
