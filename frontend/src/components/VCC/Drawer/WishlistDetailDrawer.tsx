import React, { useState } from 'react';
import { 
  ChevronLeft, 
  Share2, 
  Heart, 
  Users, 
  Zap, 
  Info,
  TrendingUp,
  MessageCircle,
  CheckCircle2,
  MoreHorizontal,
  Star,
  FileText,
  ShieldCheck,
  Clock
} from 'lucide-react';
import { usePreferenceContext } from '../contexts/PreferenceContext';
import { useDrawerContext } from '../contexts/DrawerContext';

export const WishlistDetailDrawer: React.FC = () => {
    const { popDrawer, selectedProductId } = useDrawerContext();
  const { t } = usePreferenceContext();
  const [isWished, setIsWished] = useState(false);
  const [selectedImgIndex, setSelectedImgIndex] = useState(0);

  // Mock data for a wishlist item based on ID
  const item = {
    id: selectedProductId || 'w1',
    title: selectedProductId === 'w3' ? 'Sony WH-1000XM5 (Market Discovery)' : 'Modular Artisan Desk System',
    images: [
      'https://images.unsplash.com/photo-1591129841117-3adfd313e34f?auto=format&fit=crop&q=80&w=800&fm=jpg',
      'https://images.unsplash.com/photo-1544006659-f0b21f04cb1d?auto=format&fit=crop&q=80&w=800&fm=jpg',
      'https://images.unsplash.com/photo-1585298723682-7115561c51b7?auto=format&fit=crop&q=80&w=800&fm=jpg',
      'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&q=80&w=800&fm=jpg'
    ],
    description: 'This concept represents the next generation of modular workspace integration. We are investigating global manufacturing feasibility. By joining the wishlist, you help us negotiate with top-tier verified artisans to bring this to life at a fraction of retail cost.',
    longDescription: 'The Minimalist Modular Desk Organizer System is crafted from sustainable aerospace-grade aluminum and reclaimed bamboo. Its patented magnetic locking mechanism allows for over 1,000 configurations, adapting to your unique workflow. \n\nWe focus on "Human-Centric Design" — ensuring every component serves a purpose while maintaining an aesthetic that elevates your environment. \n\nProduct Specs: \n• Material: 6061 Aluminum + Bamboo \n• Connectivity: Built-in 15W Qi Wireless Charging \n• Dimensions: 450mm x 120mm Base',
    currentWishes: 1248,
    targetWishes: 2000,
    estimatedPrice: '$45 - $65',
    marketPrice: '$120.00',
    rules: [
      { title: t('product.market_rules'), content: 'We are currently in the community discovery phase to gauge real-world demand. Your "wish" helps us decide whether to move forward with mass production.' },
      { title: 'No Commitment Yet', content: 'Joining the wishlist does not require immediate payment. You are expressing interest, not placing a binding order. We will not charge you until the official C2W phase starts.' },
      { title: 'Collective Power', content: 'Once interest hits 100% (2,000 wishes), we transition to a C2W (Collective Pre-order) with locked-in factory prices significantly lower than retail.' },
      { title: 'Early Bird Priority', content: 'Wishlist members get a 24-hour head start and an additional 10% "Insight Discount" when the pre-order goes live.' },
      { title: 'Direct Notification', content: 'We will notify you immediately via VCC message once the product reaches its goal or moves to the next phase.' }
    ]
  };

  const percentage = Math.round((item.currentWishes / item.targetWishes) * 100);

  return (
    <div className="flex flex-col bg-[#F2F2F7] dark:bg-[#000000] relative pb-40">
      
      {/* 1. Main Image Gallery */}
      <div className="relative w-full aspect-square bg-gray-200 dark:bg-white/5 overflow-hidden shrink-0 shadow-inner">
        {/* Global Share Button */}
        <div className="absolute top-4 left-4 z-30 group/share">
          <button className="w-10 h-10 bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center text-white border border-white/20 shadow-xl active:scale-90 transition-all hover:bg-orange-600 hover:border-orange-400">
            <Share2 className="w-5 h-5" />
          </button>
          <div className="absolute left-12 top-1/2 -translate-y-1/2 bg-orange-600 text-white text-[10px] font-black px-2 py-1 rounded opacity-0 group-hover/share:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-lg uppercase tracking-tight">
            {t('common.share_earn')}
          </div>
        </div>

        <img 
          src={item.images[selectedImgIndex]} 
          alt="Discovery" 
          className="w-full h-full object-cover transition-all duration-700 ease-in-out" 
          crossOrigin="anonymous"
          referrerPolicy="no-referrer"
        />
        
        <div className="absolute top-4 right-4 bg-blue-600 text-white text-[11px] font-black px-3 py-1 rounded-full shadow-lg uppercase tracking-wider animate-pulse z-10">
          {t('product.discovery_mode')}
        </div>

        <div className="absolute bottom-4 right-4 bg-black/40 backdrop-blur-md text-white text-[11px] px-3 py-1 rounded-full border border-white/10 font-bold z-10">
          {selectedImgIndex + 1} / {item.images.length}
        </div>
      </div>

      {/* 2. Thumbnails */}
      <div className="flex gap-3 px-5 py-4 overflow-x-auto no-scrollbar bg-white dark:bg-[#1C1C1E] border-b border-gray-50 dark:border-white/5 shrink-0">
        {item.images.map((img, idx) => (
          <div 
            key={idx} 
            onClick={() => setSelectedImgIndex(idx)}
            className={`w-16 h-16 rounded-xl overflow-hidden border-2 shrink-0 transition-all cursor-pointer ${
              selectedImgIndex === idx ? 'border-blue-500 scale-105 shadow-lg z-10' : 'border-transparent opacity-60'
            }`}
          >
            <img 
              src={img} 
              className="w-full h-full object-cover" 
              crossOrigin="anonymous"
              referrerPolicy="no-referrer"
            />
          </div>
        ))}
      </div>

      {/* 3. Market Interest Dashboard */}
      <div className="px-5 pt-4 pb-2 relative shrink-0">
        <div className="bg-white dark:bg-[#1C1C1E] rounded-[32px] p-6 shadow-xl border border-gray-100 dark:border-white/5 space-y-5">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-500">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-[14px] font-black text-gray-900 dark:text-white uppercase tracking-tight">{t('product.market_interest')}</h3>
                <p className="text-[11px] text-gray-400 font-bold">{t('product.community_demand_radar')}</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-[24px] font-black text-blue-600 tracking-tighter leading-none">{percentage}%</div>
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{t('product.trending')}</span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="h-3.5 w-full bg-gray-100 dark:bg-white/5 rounded-full overflow-hidden relative shadow-inner">
              <div 
                className="h-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-full shadow-[0_0_15px_rgba(37,99,235,0.4)] transition-all duration-1000 ease-out" 
                style={{ width: `${percentage}%` }} 
              />
            </div>
            <div className="flex justify-between text-[12px] font-black uppercase tracking-tight">
              <span className="text-gray-400">{t('product.current_participants')}{item.currentWishes}</span>
              <span className="text-gray-900 dark:text-white">{t('product.target_participants')}{item.targetWishes}</span>
            </div>
          </div>

          <div className="bg-blue-500/5 p-4 rounded-2xl border border-blue-500/10">
            <p className="text-[12px] text-blue-700 dark:text-blue-400 font-medium leading-relaxed italic text-center">
              "We're monitoring community interest. Once we hit goal, we'll launch a collective pre-order with exclusive factory pricing."
            </p>
          </div>
        </div>
      </div>

      {/* 4. Product Content */}
      <div className="bg-white dark:bg-[#1C1C1E] p-6 space-y-6">
        <div className="space-y-2">
          <h1 className="text-[22px] font-black text-gray-900 dark:text-white leading-tight italic tracking-tight">
            {item.title}
          </h1>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[var(--wa-teal)]" />
            <span className="text-[12px] text-[var(--wa-teal)] font-black uppercase tracking-widest">{t('product.verified_concept')}</span>
            <span className="text-gray-300 dark:text-white/10 mx-1">|</span>
            <span className="text-[12px] text-gray-400 font-bold uppercase tracking-tight line-through">{item.marketPrice}</span>
            <span className="text-[14px] text-blue-600 font-black">Est. {item.estimatedPrice}</span>
          </div>
        </div>

        <div className="space-y-3 border-t border-gray-50 dark:border-white/5 pt-6">
          <h3 className="text-[13px] font-black text-gray-900 dark:text-white uppercase tracking-widest flex items-center gap-2">
            <Info className="w-4 h-4 text-blue-500" />
            {t('product.insight_design')}
          </h3>
          <p className="text-[14px] text-gray-600 dark:text-gray-400 leading-relaxed font-medium">
            {item.description}
          </p>
          <div className="bg-gray-100 dark:bg-white/5 p-4 rounded-2xl border border-gray-200 dark:border-white/10 my-4">
            <h4 className="text-[12px] font-black text-gray-900 dark:text-white uppercase mb-2">{t('product.designers_note')}:</h4>
            <p className="text-[13px] text-gray-500 dark:text-gray-400 italic leading-relaxed">
              "We noticed a gap in the market for high-quality, sustainable workspace tools. Most options are either too expensive or poorly made. This modular system aims to be the last desk organizer you'll ever need to buy."
            </p>
          </div>
          <p className="text-[14px] text-gray-600 dark:text-gray-400 leading-relaxed font-medium whitespace-pre-line">
            {item.longDescription}
          </p>
        </div>

        {/* Wishlist Rules Section */}
        <div className="space-y-4 pt-4">
          <h3 className="text-[13px] font-black text-gray-900 dark:text-white uppercase tracking-widest flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-blue-500" />
            {t('product.market_rules')}
          </h3>
          <div className="grid gap-3">
            {item.rules.map((rule, i) => (
              <div key={i} className="bg-gray-50 dark:bg-white/5 p-4 rounded-2xl border border-gray-100 dark:border-white/5 flex gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
                  <span className="text-[12px] font-black text-blue-600">{i + 1}</span>
                </div>
                <div>
                  <h4 className="text-[13px] font-black text-gray-900 dark:text-white uppercase tracking-tight mb-1">{rule.title}</h4>
                  <p className="text-[12px] text-gray-500 dark:text-gray-400 font-medium leading-snug">{rule.content}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 5. Bottom Action Bar */}
      <div className="absolute bottom-0 left-0 right-0 bg-white/80 dark:bg-[#000000]/80 backdrop-blur-3xl border-t border-white/40 dark:border-white/10 p-6 pb-12 flex gap-4 z-40 shadow-[0_-20px_50px_rgba(0,0,0,0.1)]">
        <button 
          onClick={() => setIsWished(!isWished)}
          className={`flex-1 h-16 rounded-[32px] font-semibold text-[16px] active:scale-95 transition-all flex items-center justify-center gap-3 border shadow-xl ${
            isWished 
              ? 'bg-green-500/10 text-green-600 border-green-500/20' 
              : 'bg-blue-600 text-white border-white/20 shadow-blue-500/20'
          }`}
        >
          <Heart className={`w-6 h-6 ${isWished ? 'fill-current' : ''}`} />
          {isWished ? t('product.in_wishlist') : t('product.add_to_wishlist')}
        </button>
        <button className="w-16 h-16 rounded-[32px] bg-gray-100 dark:bg-white/5 flex items-center justify-center active:scale-95 transition-all border border-white/10">
          <Share2 className="w-6 h-6 text-gray-600 dark:text-gray-400" />
        </button>
      </div>
    </div>
  );
};