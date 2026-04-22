import React from 'react';
import { ShieldCheck, Zap, Users, Award, ChevronLeft, CheckCircle2, ArrowRight } from 'lucide-react';
import { useCommerceContext } from '../contexts/CommerceContext';
import { usePreferenceContext } from '../contexts/PreferenceContext';
import { useDrawerContext } from '../contexts/DrawerContext';

export const TierRulesDrawer: React.FC = () => {
    const { popDrawer, pushDrawer } = useDrawerContext();
  const { t } = usePreferenceContext();
  const { userLevel, isInfluencer } = useCommerceContext();

  // Automatic Tiering Design Logic
  // Bronze: Default
  // Silver: > $200 OR 3 Fans
  // Gold: > $1000 OR 10 Fans
  // Platinum: > $5000 OR 50 Fans

  const rules = [
    {
      level: 'Bronze',
      referral: '2.0%',
      fan: '1.0%',
      desc: t('rules.bronze_desc'),
      req: t('rules.bronze_req'),
      color: 'text-orange-400',
      bg: 'bg-orange-50 dark:bg-orange-900/10'
    },
    {
      level: 'Silver',
      referral: '3.0%',
      fan: '1.5%',
      desc: t('rules.silver_desc'),
      req: t('rules.silver_req'),
      color: 'text-gray-400',
      bg: 'bg-gray-50 dark:bg-gray-900/10'
    },
    {
      level: 'Gold',
      referral: '4.0%',
      fan: '2.0%',
      desc: t('rules.gold_desc'),
      req: t('rules.gold_req'),
      color: 'text-yellow-500',
      bg: 'bg-yellow-50 dark:bg-yellow-900/10'
    },
    {
      level: 'Platinum',
      referral: '5.0%',
      fan: '3.0%',
      desc: t('rules.platinum_desc'),
      req: t('rules.platinum_req'),
      color: 'text-indigo-500',
      bg: 'bg-indigo-50 dark:bg-indigo-900/10'
    }
  ];

  return (
    <div className="flex flex-col h-full bg-[#F2F2F7] dark:bg-[#000000] overflow-y-auto no-scrollbar">
      <div className="p-4 flex flex-col gap-4 pb-32">
        {/* Header */}
        <div className="bg-white dark:bg-[#1C1C1E] p-6 rounded-[32px] shadow-sm border border-gray-100 dark:border-white/5 mb-2">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-500">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-[20px] font-black text-gray-900 dark:text-white leading-tight">{t('rules.title')}</h2>
            <p className="text-[12px] text-gray-400 font-bold uppercase tracking-widest">{t('rules.subtitle')}</p>
          </div>
        </div>
        <p className="text-[14px] text-gray-600 dark:text-gray-400 leading-relaxed font-medium">
          {t('rules.main_desc')}
        </p>
      </div>

      {/* Tier List */}
      <div className="space-y-3">
        {rules.map((rule) => (
          <div 
            key={rule.level}
            className={`p-5 rounded-[32px] border transition-all ${
              userLevel === rule.level 
                ? 'bg-white dark:bg-[#1C1C1E] border-indigo-500 shadow-lg' 
                : 'bg-white/50 dark:bg-white/5 border-gray-100 dark:border-white/5 opacity-80'
            }`}
          >
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl ${rule.bg} flex items-center justify-center ${rule.color}`}>
                  <Award className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-[16px] font-black text-gray-900 dark:text-white">{rule.level}</h3>
                  {userLevel === rule.level && (
                    <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest bg-indigo-50 px-2 py-0.5 rounded-full">
                      {t('rules.current_status')}
                    </span>
                  )}
                </div>
              </div>
              <div className="text-right">
                <div className="text-[11px] text-gray-400 font-black uppercase tracking-tighter mb-0.5">{t('fan.referral_rate')}</div>
                <div className={`text-[18px] font-black ${rule.color}`}>{rule.referral}</div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 pt-3 border-t border-gray-50 dark:border-white/5">
              <div>
                <div className="text-[10px] text-gray-400 font-black uppercase tracking-tighter mb-0.5">{t('rules.upgrade_title')}</div>
                <div className="text-[12px] font-bold text-gray-800 dark:text-gray-200">{rule.req}</div>
              </div>
              <div className="text-right">
                <div className="text-[10px] text-gray-400 font-black uppercase tracking-tighter mb-0.5">{t('rules.settlement_period')}</div>
                <div className="text-[13px] font-black text-[var(--wa-teal)]">7 {t('common.days')}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Influencer Special Section - Matches Tiered Card Layout */}
      <div 
        onClick={(e) => {
          e.stopPropagation();
          pushDrawer('influencer_apply');
        }}
        className="bg-[#1a1a1a] p-5 rounded-[32px] text-white shadow-xl relative overflow-hidden active:scale-[0.98] transition-all cursor-pointer group mb-10 z-50 border border-white/5"
      >
        <div className="absolute -right-4 -top-4 opacity-10 group-hover:scale-110 transition-transform duration-500">
          <Award className="w-32 h-32" />
        </div>
        
        <div className="relative z-10">
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-400/20 rounded-xl flex items-center justify-center text-amber-400">
                <Crown className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-[16px] font-black italic uppercase tracking-tight">{t('influencer.label')}</h3>
                <span className="text-[10px] font-black text-amber-400/80 uppercase tracking-widest bg-amber-400/10 px-2 py-0.5 rounded-full">
                  Official Partner
                </span>
              </div>
            </div>
            <div className="bg-white/10 p-2 rounded-full group-hover:bg-amber-400 group-hover:text-black transition-all">
              <ArrowRight className="w-4 h-4" />
            </div>
          </div>
          
          <p className="text-[13px] text-gray-300 font-medium leading-relaxed mb-4">
            {t('rules.influencer_desc')}
          </p>

          <div className="grid grid-cols-2 gap-4 pt-3 border-t border-white/10">
            <div>
              <div className="text-[10px] text-gray-500 font-black uppercase tracking-tighter mb-0.5">{t('rules.negotiated_rate')}</div>
              <div className="text-[15px] font-black text-amber-400">{t('fan.negotiable')}</div>
            </div>
            <div className="text-right self-end">
              <div className="inline-flex items-center gap-1 text-[11px] font-black text-amber-400 uppercase tracking-widest bg-amber-400/10 px-3 py-1.5 rounded-full border border-amber-400/20">
                {t('fan.apply_now')}
                <CheckCircle2 className="w-3 h-3" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);
};

const Crown: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
  </svg>
);
