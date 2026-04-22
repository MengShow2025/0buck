import React from 'react';
import { Star } from 'lucide-react';
import { usePreferenceContext } from '../contexts/PreferenceContext';

export const ReviewsDrawer: React.FC = () => {
    const { t } = usePreferenceContext();
  const stats = [
    { label: t('product.supplier_service'), value: 4.7 },
    { label: t('product.on_time_shipment'), value: 4.6 },
    { label: t('product.item_quality'), value: 4.6 },
  ];

  const reviews = [
    {
      user: 'M***',
      country: '🇳🇱',
      date: t('productdetail.feb_2_2026'),
      rating: 5,
      content: t('reviews.fast_delivery_time_and_after_s')
    },
    {
      user: 'M***',
      country: '🇳🇱',
      date: 'January 20, 2026',
      rating: 5,
      content: t('reviews.this_kbao_ai_pet_is_so_adorabl')
    },
    {
      user: 'L***n',
      country: '🇺🇸',
      date: 'December 28, 2025',
      rating: 5,
      content: t('reviews.fast_delivery_time_and_after_s')
    },
    {
      user: 'K***d',
      country: '🇺🇸',
      date: 'December 28, 2025',
      rating: 5,
      content: t('reviews.i_recently_purchased_five_pair')
    }
  ];

  return (
    <div className="bg-[#F2F2F7] dark:bg-black p-6">
      <div className="flex items-baseline gap-2 mb-6">
        <h3 className="text-[16px] font-black text-gray-900 dark:text-white uppercase tracking-tight">{t('product.store_reviews')}</h3>
        <span className="text-[14px] text-gray-400 font-bold">(65)</span>
      </div>

      <div className="flex items-center gap-8 mb-10 bg-gray-50/50 dark:bg-white/5 p-6 rounded-[32px] border border-white/10 shadow-inner">
        <div className="text-center">
          <div className="text-[40px] font-black text-gray-900 dark:text-white leading-none">4.6<span className="text-[18px] text-gray-400 opacity-50">/5.0</span></div>
          <div className="flex justify-center gap-0.5 mt-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} className="w-3.5 h-3.5 text-[var(--wa-teal)] fill-current" />
            ))}
          </div>
        </div>
        <div className="flex-1 space-y-3">
          {stats.map((stat, idx) => (
            <div key={idx} className="flex items-center gap-4">
              <span className="text-[11px] text-gray-500 w-28 font-bold leading-tight">{stat.label}</span>
              <div className="flex-1 h-1.5 bg-gray-200 dark:bg-white/5 rounded-full overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${(stat.value / 5) * 100}%`, background: 'var(--wa-teal)', boxShadow: '0 0 8px rgba(232,69,10,0.5)' }} />
              </div>
              <span className="text-[11px] text-gray-900 dark:text-white font-black">{stat.value}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-6">
        {reviews.map((review, idx) => (
          <div key={idx} className="bg-gray-50/50 dark:bg-white/5 p-5 rounded-[28px] space-y-3 border border-white/5 shadow-sm">
            <div className="flex justify-between items-start">
              <div className="flex gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className={`w-3 h-3 ${i < review.rating ? 'text-[var(--wa-teal)] fill-current' : 'text-gray-300'}`} />
                ))}
              </div>
              <span className="text-[11px] text-gray-400 font-bold">{review.date}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[12px] text-gray-900 dark:text-white font-black">{review.user}</span>
              <span className="text-[14px]">{review.country}</span>
            </div>
            <p className="text-[13px] text-gray-600 dark:text-gray-400 font-medium leading-relaxed italic">
              "{review.content}"
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};
