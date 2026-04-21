export type CheckinCtaVariant = 'executive' | 'premium_warm' | 'minimal_mono';
export type CheckinCtaTheme = 'light' | 'dark';

export const CHECKIN_CTA_VARIANTS: CheckinCtaVariant[] = ['executive', 'premium_warm', 'minimal_mono'];

type VariantConfig = {
  buttonClass: string;
  badgeClass: string;
  hintClass: string;
};

const base = 'w-full rounded-2xl px-4 py-3 transition-all active:scale-[0.99]';

export const getCheckinCtaVariant = (variant: CheckinCtaVariant, theme: CheckinCtaTheme): VariantConfig => {
  if (variant === 'executive') {
    return {
      buttonClass: `${base} ${theme === 'dark'
        ? 'bg-[#1B1B1D] border border-white/10 text-white shadow-[0_8px_24px_rgba(0,0,0,0.35)]'
        : 'bg-white border border-[#EAEAEA] text-[#151515] shadow-[0_6px_16px_rgba(0,0,0,0.08)]'
      }`,
      badgeClass: theme === 'dark' ? 'bg-white/10 text-white/85' : 'bg-black/5 text-black/70',
      hintClass: theme === 'dark' ? 'text-white/65' : 'text-black/55',
    };
  }
  if (variant === 'premium_warm') {
    return {
      buttonClass: `${base} text-white border border-[#F1804D]/50 bg-[linear-gradient(135deg,#FF8A53_0%,#E14B14_100%)] shadow-[0_10px_22px_rgba(225,75,20,0.30)]`,
      badgeClass: 'bg-white/15 text-white',
      hintClass: 'text-white/80',
    };
  }
  return {
    buttonClass: `${base} ${theme === 'dark'
      ? 'bg-transparent border border-white/20 text-white'
      : 'bg-transparent border border-black/20 text-black'
    }`,
    badgeClass: theme === 'dark' ? 'bg-white/10 text-white/80' : 'bg-black/5 text-black/70',
    hintClass: theme === 'dark' ? 'text-white/65' : 'text-black/55',
  };
};
