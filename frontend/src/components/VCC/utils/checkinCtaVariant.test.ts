import { describe, expect, it } from 'vitest';
import { CHECKIN_CTA_VARIANTS, getCheckinCtaVariant } from './checkinCtaVariant';

describe('checkinCtaVariant', () => {
  it('contains three preview variants', () => {
    expect(CHECKIN_CTA_VARIANTS).toEqual(['executive', 'premium_warm', 'minimal_mono']);
  });

  it('returns style config for each variant', () => {
    const a = getCheckinCtaVariant('executive', 'light');
    const b = getCheckinCtaVariant('premium_warm', 'dark');
    const c = getCheckinCtaVariant('minimal_mono', 'light');
    expect(a.buttonClass.length).toBeGreaterThan(10);
    expect(b.badgeClass.length).toBeGreaterThan(10);
    expect(c.buttonClass).toContain('border');
  });
});
