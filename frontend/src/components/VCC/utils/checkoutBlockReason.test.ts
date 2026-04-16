import { describe, it, expect, vi } from 'vitest';
import { 
  getCheckoutBlockReasonText, 
  CHECKOUT_BLOCK_REASONS 
} from './checkoutBlockReason';

describe('checkoutBlockReason', () => {
  it('translates inactive reason correctly', () => {
    const mockTranslate = vi.fn((key: string) => `translated_${key}`);
    const result = getCheckoutBlockReasonText(mockTranslate, 'inactive');
    
    expect(mockTranslate).toHaveBeenCalledWith('checkout.block_reason.inactive');
    expect(result).toBe('translated_checkout.block_reason.inactive');
  });

  it('translates unknown reason to generic fallback', () => {
    const mockTranslate = vi.fn((key: string) => `translated_${key}`);
    const result = getCheckoutBlockReasonText(mockTranslate, 'some_random_reason');
    
    expect(mockTranslate).toHaveBeenCalledWith('checkout.blocked_unavailable');
    expect(result).toBe('translated_checkout.blocked_unavailable');
  });
});