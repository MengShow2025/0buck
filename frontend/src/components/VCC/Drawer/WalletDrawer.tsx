import React, { useState } from 'react';
import { ChevronRight, History, ArrowUpRight, Bot, Plus, HelpCircle, TrendingUp, AlertTriangle } from 'lucide-react';
import { useCommerceContext } from '../contexts/CommerceContext';
import { usePreferenceContext } from '../contexts/PreferenceContext';
import { useDrawerContext } from '../contexts/DrawerContext';
import { loadByokConfig } from '../../../services/byokStorage';

export const WalletDrawer: React.FC = () => {
    const { pushDrawer } = useDrawerContext();
  const { t } = usePreferenceContext();
  const { userBalance, userPoints } = useCommerceContext();
  const [isUsingCustomModel] = useState(() => Boolean(loadByokConfig()?.enabled));

  const usagePercent = isUsingCustomModel ? null : 81;
  const isHighUsage = usagePercent !== null && usagePercent > 75;

  return (
    <div className="flex flex-col h-full bg-[#F2F2F7] dark:bg-black overflow-y-auto no-scrollbar pb-8">

      {/* ── Hero Balance Block ── */}
      <div
        className="relative overflow-hidden px-6 pt-8 pb-7"
        style={{
          background: 'linear-gradient(160deg, #FF7A3D 0%, #E8450A 60%, #C93A08 100%)',
        }}
      >
        {/* Decorative circles */}
        <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-white/10 blur-2xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-32 h-32 rounded-full bg-black/10 blur-2xl pointer-events-none" />

        <div className="relative z-10">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] font-semibold text-white/70 uppercase tracking-widest">
              {t('wallet.cash_balance')}
            </p>
            <button
              onClick={() => pushDrawer('reward_history')}
              className="flex items-center gap-1 bg-white/15 hover:bg-white/25 px-2.5 py-1 rounded-full text-[11px] font-semibold text-white active:scale-95 transition-all"
            >
              <History className="w-3 h-3" />
              {t('wallet.cash_detail')}
            </button>
          </div>

          {/* Big number */}
          <div className="flex items-end gap-2 mb-6">
            <span className="text-[15px] font-bold text-white/80 mb-2">$</span>
            <span className="font-mono font-black text-[54px] text-white leading-none tracking-tight">
              {userBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>

          {/* Withdraw button */}
          <button
            onClick={() => pushDrawer('withdraw')}
            className="w-full bg-white/95 text-[var(--wa-teal)] py-3.5 rounded-2xl font-bold text-[15px] active:scale-[0.98] transition-transform flex items-center justify-center gap-2 shadow-sm"
          >
            <ArrowUpRight className="w-4 h-4" />
            {t('wallet.withdraw_action')}
          </button>
        </div>
      </div>

      {/* ── Side-by-side: Points + AI Usage ── */}
      <div className="grid grid-cols-2 gap-3 mx-4 mt-4">

        {/* Points Card */}
        <div className="bg-white dark:bg-[#1C1C1E] rounded-[22px] p-4 border border-gray-100 dark:border-white/5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="w-9 h-9 rounded-[12px] bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center">
              <span className="text-[18px]">🪙</span>
            </div>
            <button
              onClick={() => pushDrawer('points_history')}
              className="text-gray-300 hover:text-gray-500 dark:hover:text-gray-300 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="font-mono font-black text-[26px] text-gray-900 dark:text-white leading-none mb-0.5">
            {userPoints.toLocaleString()}
          </div>
          <p className="text-[10px] text-gray-400 font-medium mb-3">
            {t('wallet.points_balance')}
          </p>

          <button
            onClick={() => pushDrawer('points_exchange')}
            className="w-full bg-amber-50 dark:bg-amber-900/15 text-amber-600 dark:text-amber-400 py-2 rounded-xl font-semibold text-[11px] flex items-center justify-center gap-1 active:scale-95 transition-all border border-amber-100 dark:border-amber-900/30"
          >
            <ArrowUpRight className="w-3 h-3" />
            {t('wallet.exchange_action')}
          </button>
        </div>

        {/* AI Usage Card */}
        <div className="bg-white dark:bg-[#1C1C1E] rounded-[22px] p-4 border border-gray-100 dark:border-white/5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className={`w-9 h-9 rounded-[12px] flex items-center justify-center ${isUsingCustomModel ? 'bg-emerald-50 dark:bg-emerald-900/20' : isHighUsage ? 'bg-rose-50 dark:bg-rose-900/20' : 'bg-blue-50 dark:bg-blue-900/20'}`}>
              {isUsingCustomModel
                ? <TrendingUp className="w-4.5 h-4.5 text-emerald-500" />
                : isHighUsage
                  ? <AlertTriangle className="w-4.5 h-4.5 text-rose-500" />
                  : <Bot className="w-4.5 h-4.5 text-blue-500" />
              }
            </div>
            <button
              onClick={() => pushDrawer('service')}
              className="text-gray-300 hover:text-gray-500 dark:hover:text-gray-300 transition-colors"
            >
              <HelpCircle className="w-4 h-4" />
            </button>
          </div>

          {isUsingCustomModel ? (
            <>
              <div className="font-mono font-black text-[26px] text-emerald-600 dark:text-emerald-400 leading-none mb-0.5">125K</div>
              <p className="text-[10px] text-gray-400 font-medium mb-1">{t('wallet.local_tokens')}</p>
              <p className="text-[10px] text-amber-500 font-bold mb-3">+150 pts earned</p>
              <button className="w-full bg-amber-50 dark:bg-amber-900/15 text-amber-600 dark:text-amber-400 py-2 rounded-xl font-semibold text-[11px] flex items-center justify-center gap-1 active:scale-95 transition-all border border-amber-100 dark:border-amber-900/30">
                {t('wallet.extract_points_action')}
              </button>
            </>
          ) : (
            <>
              <div className={`font-mono font-black text-[26px] leading-none mb-0.5 ${isHighUsage ? 'text-rose-500' : 'text-gray-900 dark:text-white'}`}>245K</div>
              <p className="text-[10px] text-gray-400 font-medium mb-2">{t('wallet.today_tokens')}</p>
              {/* Mini progress bar */}
              <div className="h-1.5 w-full bg-gray-100 dark:bg-white/5 rounded-full overflow-hidden mb-1">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${usagePercent}%`, background: isHighUsage ? 'linear-gradient(90deg, #fb923c, #ef4444)' : 'linear-gradient(90deg, #60a5fa, #3b82f6)' }}
                />
              </div>
              <p className={`text-[10px] font-bold ${isHighUsage ? 'text-rose-500' : 'text-gray-400'}`}>
                {usagePercent}% {isHighUsage ? t('wallet.approaching_limit') : t('wallet.free_limit_note')}
              </p>
            </>
          )}
        </div>
      </div>

      {/* ── Add Custom Model CTA ── */}
      <div className="mx-4 mt-3">
        <button
          onClick={() => pushDrawer('api_model_add')}
          className="w-full bg-white dark:bg-[#1C1C1E] border border-dashed border-gray-300 dark:border-white/15 hover:border-blue-400 dark:hover:border-blue-500/50 text-blue-500 dark:text-blue-400 py-4 rounded-[20px] font-semibold text-[13px] flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-sm"
        >
          <Bot className="w-4 h-4" />
          {t('wallet.add_custom_model_action')}
          <Plus className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
