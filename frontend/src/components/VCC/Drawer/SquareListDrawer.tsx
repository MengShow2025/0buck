import React from 'react';
import { Heart, MessageSquare, Share2, Flame, TrendingUp, Users } from 'lucide-react';
import { usePreferenceContext } from '../contexts/PreferenceContext';
import { useDrawerContext } from '../contexts/DrawerContext';

export const SquareListDrawer: React.FC = () => {
    const { activeDrawer, pushDrawer } = useDrawerContext();
  const { t } = usePreferenceContext();

  if (activeDrawer === 'all_group_buy') {
    return (
      <div className="p-4 space-y-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="bg-white dark:bg-[#1C1C1E] rounded-2xl shadow-sm border border-gray-100 dark:border-white/5 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden shrink-0">
                  <img src={`https://picsum.photos/seed/list_${i}/200/200`} alt="Product" className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold whitespace-nowrap ${i % 2 === 0 ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                      {i % 2 === 0 ? t('square.c2w_tag') : t('square.wishlist_tag')}
                    </span>
                    <h4 className="text-[15px] font-bold text-gray-800 dark:text-gray-200 truncate">{t('product.name')} #{i}</h4>
                  </div>
                  <p className="text-[12px] text-gray-500 line-clamp-1">
                    {i % 2 === 0
                      ? `${t('square.c2w_prefix')}${i * 2}${t('square.launch_production')}`
                      : `${t('square.goal_met')}${i * 10} / ${t('square.goal_target')} 100`}
                  </p>
                  <div className="w-full bg-gray-100 dark:bg-white/5 h-1.5 rounded-full mt-2 overflow-hidden">
                    <div className="bg-[var(--wa-teal)] h-full transition-all duration-500" style={{ width: `${(i * 15) % 100}%` }}></div>
                  </div>
                </div>
              </div>
              <button className="text-white px-5 py-2 rounded-full text-[13px] font-semibold shadow-sm active:scale-95 transition-transform ml-2 shrink-0" style={{ background: 'linear-gradient(135deg, #FF7A3D 0%, #E8450A 100%)' }}>
                {t('square.participate')}
              </button>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (activeDrawer === 'all_fan_feeds') {
    return (
      <div className="p-4 space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white dark:bg-[#1C1C1E] rounded-2xl shadow-sm border border-gray-100 dark:border-white/5 p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center font-bold text-gray-500">U{i}</div>
                <div>
                  <div className="text-[14px] font-bold text-gray-800 dark:text-gray-200">User_Name_{i}</div>
                  <div className="text-[11px] text-gray-400">{i} {t('square.post_time_suffix')}</div>
                </div>
              </div>
              <span className="text-[11px] bg-gray-100 dark:bg-white/5 text-gray-500 px-2 py-0.5 rounded-full font-bold">
                {i % 2 === 0 ? t('square.merchant') : t('square.user_share')}
              </span>
            </div>
            <p className="text-[14px] text-gray-700 dark:text-gray-300 mb-3 leading-relaxed">
              {t('square.found_treasure')} {i}
            </p>
            <div className={`grid grid-cols-3 gap-1 mb-3`}>
              {Array.from({ length: (i % 9) + 1 }).map((_, idx) => (
                <div key={idx} className="aspect-square rounded-xl overflow-hidden border border-white/10 shadow-sm">
                  <img src={`https://picsum.photos/seed/feed_list_${i}_${idx}/400/400`} alt="Post" className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
            <div className="flex items-center gap-6 text-gray-500">
              <button className="flex items-center gap-1.5 text-[13px] hover:text-red-500 transition-colors">
                <Heart className="w-4 h-4" /> {i * 10}
              </button>
              <button className="flex items-center gap-1.5 text-[13px] hover:text-blue-500 transition-colors">
                <MessageSquare className="w-4 h-4" /> {i * 5}
              </button>
              <button 
                onClick={() => pushDrawer('share_menu')}
                className="flex items-center gap-1.5 text-[13px] ml-auto hover:text-[var(--wa-teal)] transition-colors font-bold"
              >
                <Share2 className="w-4 h-4" /> {t('square.share_action')}
              </button>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (activeDrawer === 'all_topics') {
    return (
      <div className="p-4 space-y-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="bg-white dark:bg-[#1C1C1E] p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-white/5 flex items-center justify-between active:bg-gray-50 dark:active:bg-white/5 transition-colors cursor-pointer">
            <div className="flex items-center gap-4">
              <div className="text-[18px] font-black text-gray-300 italic w-6">{i}</div>
              <div>
                <div className="text-[15px] font-bold text-gray-800 dark:text-gray-100"># {t('square.topic_must_buy')}_{i}</div>
                <div className="text-[12px] text-gray-500 mt-0.5">
                  {i * 2.4}{t('square.unit_k')} {t('square.browses')} · {i * 120} {t('square.chatting')}
                </div>
              </div>
            </div>
            <TrendingUp className="w-5 h-5 text-red-400 opacity-50" />
          </div>
        ))}
      </div>
    );
  }

  return null;
};