import React, { useEffect, useMemo, useState } from 'react';
import { Target, Users, Trophy, ChevronRight, ShieldCheck, Share2, Award, Zap, Copy, QrCode, Calendar, ChevronDown, ChevronUp, Star, HelpCircle } from 'lucide-react';
import { useCommerceContext } from '../contexts/CommerceContext';
import { usePreferenceContext } from '../contexts/PreferenceContext';
import { useDrawerContext } from '../contexts/DrawerContext';
import { imApi } from '../../../services/api';
import { useSessionContext } from '../contexts/SessionContext';
import { rewardApi } from '../../../services/api';
import { summarizeRewardStatus, summarizeRewardTransactions } from '../utils/rewardCommerce';

export const FanCenterDrawer: React.FC = () => {
  const { pushDrawer } = useDrawerContext();
  const { t } = usePreferenceContext();
  const { userLevel, isInfluencer, influencerRatios } = useCommerceContext();
  const { user } = useSessionContext();
  const [isRatesExpanded, setIsRatesExpanded] = useState(false);
  const [statusPayload, setStatusPayload] = useState<any>(null);

  useEffect(() => {
    const fetchStatus = async () => {
      if (!user?.customer_id) {
        setStatusPayload(null);
        return;
      }

      try {
        const response = await rewardApi.getStatus(user.customer_id);
        setStatusPayload(response.data ?? null);
      } catch {
        setStatusPayload(null);
      }
    };

    fetchStatus();
  }, [user?.customer_id]);

  // Define ratios for each level
  const levelRatios = {
    Bronze: { referral: 0.02, fan: 0.01 },
    Silver: { referral: 0.03, fan: 0.015 },
    Gold: { referral: 0.04, fan: 0.02 },
    Platinum: { referral: 0.05, fan: 0.03 },
  };

  const currentRatios = isInfluencer && influencerRatios 
    ? influencerRatios 
    : levelRatios[userLevel as keyof typeof levelRatios];

  const statusSummary = useMemo(() => summarizeRewardStatus(statusPayload), [statusPayload]);
  const transactionSummary = useMemo(
    () => summarizeRewardTransactions(statusPayload?.transactions),
    [statusPayload]
  );

  const rewardStats = {
    totalFans: statusSummary.totalFans,
    totalEarned: transactionSummary.lifetimeEarnings.toFixed(2),
    referralCode: statusSummary.referralCode || user?.referral_code || '--',
    userLevel: isInfluencer ? t('influencer.label') : `${userLevel} Member`,
    referralRate: `${(currentRatios.referral * 100).toFixed(1)}%`,
    fanRate: `${(currentRatios.fan * 100).toFixed(1)}%`,
    rebateSummary: {
      totalPendingAmount: statusSummary.pendingCashbackAmount.toFixed(2),
      activeOrdersCount: statusSummary.activePlanCount
    },
    breakdown: [
      { label: t('fan.fan_reward'), amount: transactionSummary.breakdown.fan.amount.toFixed(2), count: transactionSummary.breakdown.fan.count, icon: Users, color: 'text-purple-500', bg: 'bg-purple-50' },
      { label: t('fan.referral_reward'), amount: transactionSummary.breakdown.referral.amount.toFixed(2), count: transactionSummary.breakdown.referral.count, icon: Zap, color: 'text-blue-500', bg: 'bg-blue-50' },
      { label: t('fan.cashback_amount'), amount: transactionSummary.breakdown.cashback.amount.toFixed(2), count: transactionSummary.breakdown.cashback.count, icon: Target, color: 'text-emerald-500', bg: 'bg-emerald-50' }
    ]
  };

  const handleOpenCheckinHub = () => {
    pushDrawer('checkin_hub');
  };

  const handleCopy = async () => {
    try {
      const resp = await imApi.generatePromoCard({
        card_type: 'invite',
        target_type: 'none',
        share_category: 'fan_source',
        entry_type: 'fan_register_share',
      });
      const link = resp.data?.universal_link || resp.data?.link || resp.data?.short_link;
      if (link) {
        await navigator.clipboard.writeText(String(link));
        alert(t('fan.referral_copied'));
      } else {
        await navigator.clipboard.writeText(rewardStats.referralCode);
        alert(t('fan.referral_copied'));
      }
    } catch (_e) {
      await navigator.clipboard.writeText(rewardStats.referralCode);
      alert(t('fan.referral_copied'));
    }
  };

  const handleGenerateQR = () => {
    pushDrawer('share_menu');
  };

  return (
    <div className="flex flex-col h-full bg-[#F2F2F7] dark:bg-[#000000] p-4 gap-4 pb-32 overflow-y-auto no-scrollbar">
      {/* Check-in moved to dedicated hub */}
      <div className="bg-white dark:bg-[#1C1C1E] rounded-[28px] p-5 border border-gray-100 dark:border-white/10 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h4 className="text-[12px] font-black text-gray-400 uppercase tracking-widest">{t('title.checkin_hub')}</h4>
            <div className="text-[24px] font-black text-gray-900 dark:text-white mt-1">
              ${rewardStats.rebateSummary.totalPendingAmount}
            </div>
            <p className="text-[12px] text-gray-500 dark:text-white/65 mt-1">{rewardStats.rebateSummary.activeOrdersCount} active plan(s)</p>
          </div>
          <Calendar className="w-10 h-10 text-[var(--wa-teal)]/70" />
        </div>
        <button
          onClick={handleOpenCheckinHub}
          className="mt-4 w-full rounded-2xl px-4 py-3 bg-[linear-gradient(135deg,#FF8A53_0%,#E14B14_100%)] text-white font-semibold text-[15px] flex items-center justify-between active:scale-[0.99] transition-all shadow-[0_10px_22px_rgba(225,75,20,0.28)]"
        >
          <span>{t('fan.check_in_all')}</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* 2. My Referral Identity & Reward Rates */}
      <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-[32px] p-6 text-white shadow-xl relative transition-all">
        <div className="absolute -right-6 -bottom-6 opacity-10 pointer-events-none">
          <Share2 className="w-32 h-32" />
        </div>
        
        <div className="relative z-10 flex justify-between items-start mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h4 className="text-[13px] font-black uppercase tracking-widest opacity-80">{t('fan.referral_reward')}</h4>
              <button 
                onClick={() => setIsRatesExpanded(!isRatesExpanded)}
                className="bg-white/20 hover:bg-white/30 px-2 py-0.5 rounded-full text-[9px] font-black uppercase flex items-center gap-1 active:scale-95 transition-all"
              >
                <span>{rewardStats.userLevel}</span>
                {isRatesExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            </div>
            <div className="text-[32px] font-black leading-none tracking-tighter">{rewardStats.referralCode}</div>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={handleCopy}
              className="bg-white/20 backdrop-blur-md p-2.5 rounded-2xl border border-white/20 active:scale-90 transition-all"
            >
              <Copy className="w-5 h-5" />
            </button>
            <button 
              onClick={handleGenerateQR}
              className="bg-white/20 backdrop-blur-md p-2.5 rounded-2xl border border-white/20 active:scale-90 transition-all"
            >
              <QrCode className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Dynamic Reward Rates Board */}
        <div className="relative z-10 bg-white/10 backdrop-blur-md rounded-2xl border border-white/10 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between border-b border-white/10 p-4">
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4" />
              <span className="text-[12px] font-black uppercase">{t('fan.reward_rates')}</span>
            </div>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                pushDrawer('tier_rules');
              }}
              className="flex items-center gap-1.5 bg-white/20 px-3 py-1.5 rounded-full active:scale-95 transition-all group"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span className="text-[10px] font-black uppercase tracking-widest">{t('fan.rule_details')}</span>
              <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
          
          <div className="p-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/10 rounded-xl p-3 border border-white/10">
                <div className="text-[10px] opacity-60 font-black uppercase tracking-widest mb-1">{t('fan.referral_rate')}</div>
                <div className="text-[20px] font-black">{rewardStats.referralRate}</div>
              </div>
              <div className="bg-white/10 rounded-xl p-3 border border-white/10">
                <div className="text-[10px] opacity-60 font-black uppercase tracking-widest mb-1">{t('fan.fan_rate')}</div>
                <div className="text-[20px] font-black">{rewardStats.fanRate}</div>
              </div>
            </div>

            {isRatesExpanded && (
              <div className="space-y-3 pt-2 animate-in fade-in slide-in-from-top-2">
                <div className="h-px bg-white/10 w-full" />
                <h5 className="text-[11px] font-black uppercase tracking-widest opacity-60">{t('fan.all_tiers')}</h5>
                <div className="grid grid-cols-3 gap-2">
                  <div className="text-[10px] font-bold opacity-40 uppercase">{t('fan.tier_name')}</div>
                  <div className="text-[10px] font-bold opacity-40 uppercase text-center">{t('fan.referral_rate')}</div>
                  <div className="text-[10px] font-bold opacity-40 uppercase text-right">{t('fan.fan_rate')}</div>
                </div>
                {Object.entries(levelRatios).map(([level, rates]) => (
                  <div key={level} className={`grid grid-cols-3 gap-2 py-1 ${level === userLevel ? 'bg-white/20 -mx-2 px-2 rounded-lg' : ''}`}>
                    <div className="text-[12px] font-black">{level}</div>
                    <div className="text-[12px] font-black text-center">{(rates.referral * 100).toFixed(1)}%</div>
                    <div className="text-[12px] font-black text-right">{(rates.fan * 100).toFixed(1)}%</div>
                  </div>
                ))}
                <div className="grid grid-cols-3 gap-2 py-1 opacity-80 italic">
                  <div className="text-[12px] font-black">{t('influencer.label')}</div>
                  <div className="text-[12px] font-black text-center col-span-2">{t('fan.negotiable')}</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      {/* 3. Influencer Application & Leaderboard */}
      <div className="grid grid-cols-2 gap-3 relative">
        <button 
          onClick={() => pushDrawer('influencer_apply')}
          className="bg-white dark:bg-[#1C1C1E] p-5 rounded-[28px] shadow-sm border border-gray-100 dark:border-white/5 flex flex-col items-center gap-3 active:scale-95 transition-all group relative overflow-hidden"
        >
          <div 
            onClick={(e) => {
              e.stopPropagation();
              pushDrawer('service');
            }}
            className="absolute top-3 right-3 p-1.5 bg-gray-50 dark:bg-white/5 rounded-full text-gray-400 hover:text-gray-600 active:scale-90 transition-all z-10"
          >
            <HelpCircle className="w-3.5 h-3.5" />
          </div>
          <div className="w-12 h-12 bg-purple-50 dark:bg-purple-900/20 rounded-2xl flex items-center justify-center text-purple-600 group-hover:scale-110 transition-transform">
            <Star className="w-6 h-6" />
          </div>
          <div className="text-center relative z-10">
            <span className="text-[12px] font-black text-gray-900 dark:text-white uppercase tracking-tight block">{t('fan.influencer_label')}</span>
            <div className="flex items-center justify-center gap-1 mt-0.5">
              <span className="text-[9px] text-purple-500 font-bold uppercase">{t('fan.apply_now')}</span>
              <ChevronRight className="w-2.5 h-2.5 text-purple-400 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </div>
        </button>
        <button 
          onClick={() => pushDrawer('leaderboard')}
          className="bg-white dark:bg-[#1C1C1E] p-5 rounded-[28px] shadow-sm border border-gray-100 dark:border-white/5 flex flex-col items-center gap-3 active:scale-95 transition-all group relative overflow-hidden"
        >
          <div 
            onClick={(e) => {
              e.stopPropagation();
              pushDrawer('service');
            }}
            className="absolute top-3 right-3 p-1.5 bg-gray-50 dark:bg-white/5 rounded-full text-gray-400 hover:text-gray-600 active:scale-90 transition-all z-10"
          >
            <HelpCircle className="w-3.5 h-3.5" />
          </div>
          <div className="w-12 h-12 bg-orange-50 dark:bg-orange-500/10 rounded-2xl flex items-center justify-center text-orange-600 group-hover:scale-110 transition-transform">
            <Trophy className="w-6 h-6" />
          </div>
          <div className="text-center">
            <span className="text-[12px] font-black text-gray-900 dark:text-white uppercase tracking-tight block">{t('fan.leaderboard_label')}</span>
            <span className="text-[9px] text-orange-500 font-bold uppercase">{t('fan.rank_prefix')}142</span>
          </div>
        </button>
      </div>

      {/* 4. Total Rewards Breakdown */}
      <div className="bg-white dark:bg-[#1C1C1E] rounded-[32px] p-6 shadow-sm border border-gray-100 dark:border-white/5">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-[12px] font-black text-gray-400 uppercase tracking-widest">{t('fan.earnings_history')}</h4>
          <button 
            onClick={() => pushDrawer('service')}
            className="flex items-center gap-1 text-[10px] text-[var(--wa-teal)] font-bold uppercase active:scale-95 transition-all"
          >
            <ShieldCheck className="w-3 h-3" />
            <span>{t('fan.rule_doc')}</span>
          </button>
        </div>
        <div className="space-y-4">
          {rewardStats.breakdown.map((item, idx) => (
            <div 
              key={idx} 
              onClick={() => pushDrawer('reward_history')}
              className="flex items-center justify-between group cursor-pointer active:scale-[0.98] transition-all"
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 ${item.bg} dark:bg-white/5 rounded-2xl flex items-center justify-center ${item.color}`}>
                  <item.icon className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[13px] font-black text-gray-900 dark:text-white tracking-tight">{item.label}</div>
                  <div className="text-[11px] text-gray-400 font-bold uppercase">{item.count}{t('fan.records')}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-[15px] font-black text-gray-900 dark:text-white">${item.amount}</div>
                <ChevronRight className="w-4 h-4 text-gray-300 ml-auto mt-0.5" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
