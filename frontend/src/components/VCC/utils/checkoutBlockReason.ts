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
