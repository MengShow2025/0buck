type Translate = (key: string) => string;

export function getCheckoutBlockReasonText(t: Translate, reason?: string | null): string {
  if (reason === 'inactive') return t('checkout.block_reason.inactive');
  if (reason === 'missing_price') return t('checkout.block_reason.missing_price');
  if (reason === 'not_published') return t('checkout.block_reason.not_published');
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
