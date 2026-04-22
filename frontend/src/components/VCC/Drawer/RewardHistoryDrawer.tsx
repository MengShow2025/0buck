import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Users, Zap, Target, TrendingUp, CalendarDays, Filter, Wallet, ArrowDownToLine, RefreshCcw, Banknote, Bot } from 'lucide-react';
import { usePreferenceContext } from '../contexts/PreferenceContext';
import { useDrawerContext } from '../contexts/DrawerContext';
import { useSessionContext } from '../contexts/SessionContext';
import { rewardApi } from '../../../services/api';
import { resolveRewardUserId } from '../utils/rewardStatus';
import { classifyRewardTransaction, summarizeRewardTransactions } from '../utils/rewardCommerce';

type TxType = 'all' | 'cashback' | 'referral' | 'fan' | 'payment' | 'withdraw' | 'refund' | 'crowdfund_refund' | 'ai_reward';

export const RewardHistoryDrawer: React.FC = () => {
  const { popDrawer } = useDrawerContext();
  const { t } = usePreferenceContext();
  const { user } = useSessionContext();
  const [filter, setFilter] = useState<TxType>('all');
  const [transactions, setTransactions] = useState<any[]>([]);

  useEffect(() => {
    const fetchTransactions = async () => {
      const userId = resolveRewardUserId(user);
      if (!userId) {
        setTransactions([]);
        return;
      }
      try {
        const response = await rewardApi.getTransactions(userId);
        setTransactions(Array.isArray(response.data) ? response.data : []);
      } catch {
        setTransactions([]);
      }
    };
    fetchTransactions();
  }, [user]);

  const lifetimeSummary = useMemo(() => summarizeRewardTransactions(transactions), [transactions]);

  const history = useMemo(() => {
    return transactions.map((tx) => {
      const category = classifyRewardTransaction(tx);
      const amount = Number(tx.amount) || 0;
      const isPositive = amount >= 0;

      const titleMap: Record<string, string> = {
        cashback: t('reward.cat_cashback') || 'Cashback',
        fan: t('reward.cat_fan') || 'Fan Reward',
        referral: t('reward.cat_referral') || 'Referral Reward',
        payment: t('reward.cat_payment') || 'Payment',
        withdraw: t('reward.cat_withdraw') || 'Withdrawal',
        refund: t('reward.cat_refund') || 'Refund',
        other: t('reward.all_details') || 'Transaction',
      };

      return {
        id: String(tx.id || `${category}-${tx.created_at || ''}`),
        type: (category === 'other' ? 'all' : category) as TxType,
        title: titleMap[category] || titleMap.other,
        desc: tx.description || tx.order_id || tx.status || '--',
        amount: `${isPositive ? '+' : '-'}${Math.abs(amount).toFixed(2)}`,
        date: tx.created_at ? new Date(tx.created_at).toLocaleString() : '--',
        status: String(tx.status || t('reward.status_completed') || 'completed'),
      };
    });
  }, [t, transactions]);

  const filteredHistory = history.filter(item => filter === 'all' || item.type === filter);

  const getIcon = (type: string) => {
    switch(type) {
      case 'fan': return <Users className="w-5 h-5 text-purple-500" />;
      case 'referral': return <Zap className="w-5 h-5 text-blue-500" />;
      case 'cashback': return <Target className="w-5 h-5 text-emerald-500" />;
      case 'payment': return <Wallet className="w-5 h-5 text-gray-500" />;
      case 'withdraw': return <ArrowDownToLine className="w-5 h-5 text-orange-500" />;
      case 'refund': return <RefreshCcw className="w-5 h-5 text-indigo-500" />;
      case 'crowdfund_refund': return <Banknote className="w-5 h-5 text-rose-500" />;
      case 'ai_reward': return <Bot className="w-5 h-5 text-cyan-500" />;
      default: return <TrendingUp className="w-5 h-5 text-gray-500" />;
    }
  };

  const getBg = (type: string) => {
    switch(type) {
      case 'fan': return 'bg-purple-50 dark:bg-purple-900/20';
      case 'referral': return 'bg-blue-50 dark:bg-blue-900/20';
      case 'cashback': return 'bg-emerald-50 dark:bg-emerald-900/20';
      case 'payment': return 'bg-gray-100 dark:bg-gray-800';
      case 'withdraw': return 'bg-orange-50 dark:bg-orange-900/20';
      case 'refund': return 'bg-indigo-50 dark:bg-indigo-900/20';
      case 'crowdfund_refund': return 'bg-rose-50 dark:bg-rose-900/20';
      case 'ai_reward': return 'bg-cyan-50 dark:bg-cyan-900/20';
      default: return 'bg-gray-50 dark:bg-gray-800';
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#F2F2F7] dark:bg-[#000000] pb-32 overflow-y-auto no-scrollbar">
      
      {/* Header Summary */}
      <div className="bg-white dark:bg-[#1C1C1E] px-6 pt-8 pb-8 rounded-b-[40px] shadow-sm border-b border-gray-100 dark:border-white/5 relative">
        <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none">
          <TrendingUp className="w-32 h-32 text-[var(--wa-teal)]" />
        </div>

        <h2 className="text-[12px] font-black text-gray-400 uppercase tracking-widest mb-2 relative z-10">{t('reward.total_lifetime')}</h2>
        <div className="flex items-baseline gap-2 relative z-10">
          <span className="text-[40px] font-black text-gray-900 dark:text-white tracking-tighter leading-[1.1]">${lifetimeSummary.lifetimeEarnings.toFixed(2)}</span>
          <span className="text-[12px] font-bold text-[var(--wa-teal)] uppercase tracking-widest bg-[var(--wa-teal)]/10 px-2 py-1 rounded-lg">{t('reward.status_available')}</span>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 mt-6 overflow-x-auto no-scrollbar relative z-10 pb-2">
          <button 
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-full text-[11px] font-black uppercase tracking-widest whitespace-nowrap transition-all shrink-0 ${filter === 'all' ? 'bg-gray-900 dark:bg-white text-white dark:text-black shadow-md' : 'bg-gray-100 dark:bg-white/5 text-gray-500'}`}
          >
            {t('reward.all_details')}
          </button>
          <button 
            onClick={() => setFilter('cashback')}
            className={`px-4 py-2 rounded-full text-[11px] font-black uppercase tracking-widest whitespace-nowrap transition-all flex items-center gap-1.5 shrink-0 ${filter === 'cashback' ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20' : 'bg-gray-100 dark:bg-white/5 text-gray-500'}`}
          >
            <Target className="w-3 h-3" /> {t('reward.cat_cashback')}
          </button>
          <button 
            onClick={() => setFilter('referral')}
            className={`px-4 py-2 rounded-full text-[11px] font-black uppercase tracking-widest whitespace-nowrap transition-all flex items-center gap-1.5 shrink-0 ${filter === 'referral' ? 'bg-blue-500 text-white shadow-md shadow-blue-500/20' : 'bg-gray-100 dark:bg-white/5 text-gray-500'}`}
          >
            <Zap className="w-3 h-3" /> {t('reward.cat_referral')}
          </button>
          <button 
            onClick={() => setFilter('fan')}
            className={`px-4 py-2 rounded-full text-[11px] font-black uppercase tracking-widest whitespace-nowrap transition-all flex items-center gap-1.5 shrink-0 ${filter === 'fan' ? 'bg-purple-500 text-white shadow-md shadow-purple-500/20' : 'bg-gray-100 dark:bg-white/5 text-gray-500'}`}
          >
            <Users className="w-3 h-3" /> {t('reward.cat_fan')}
          </button>
          <button 
            onClick={() => setFilter('payment')}
            className={`px-4 py-2 rounded-full text-[11px] font-black uppercase tracking-widest whitespace-nowrap transition-all flex items-center gap-1.5 shrink-0 ${filter === 'payment' ? 'bg-gray-900 dark:bg-gray-700 text-white shadow-md' : 'bg-gray-100 dark:bg-white/5 text-gray-500'}`}
          >
            <Wallet className="w-3 h-3" /> {t('reward.cat_payment')}
          </button>
          <button 
            onClick={() => setFilter('withdraw')}
            className={`px-4 py-2 rounded-full text-[11px] font-black uppercase tracking-widest whitespace-nowrap transition-all flex items-center gap-1.5 shrink-0 ${filter === 'withdraw' ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20' : 'bg-gray-100 dark:bg-white/5 text-gray-500'}`}
          >
            <ArrowDownToLine className="w-3 h-3" /> {t('reward.cat_withdraw')}
          </button>
          <button 
            onClick={() => setFilter('refund')}
            className={`px-4 py-2 rounded-full text-[11px] font-black uppercase tracking-widest whitespace-nowrap transition-all flex items-center gap-1.5 shrink-0 ${filter === 'refund' ? 'bg-indigo-500 text-white shadow-md shadow-indigo-500/20' : 'bg-gray-100 dark:bg-white/5 text-gray-500'}`}
          >
            <RefreshCcw className="w-3 h-3" /> {t('reward.cat_refund')}
          </button>
          <button 
            onClick={() => setFilter('crowdfund_refund')}
            className={`px-4 py-2 rounded-full text-[11px] font-black uppercase tracking-widest whitespace-nowrap transition-all flex items-center gap-1.5 shrink-0 ${filter === 'crowdfund_refund' ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20' : 'bg-gray-100 dark:bg-white/5 text-gray-500'}`}
          >
            <Banknote className="w-3 h-3" /> {t('reward.cat_overflow')}
          </button>
        </div>
      </div>

      {/* Transaction List */}
      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between px-2 pt-2">
          <h3 className="text-[14px] font-black text-gray-900 dark:text-white">{t('reward.recent_transactions')}</h3>
          <button className="p-2 bg-gray-200 dark:bg-white/10 rounded-full text-gray-500 active:scale-95 transition-all">
            <Filter className="w-4 h-4" />
          </button>
        </div>

        {filteredHistory.length === 0 ? (
          <div className="text-center py-12 text-[13px] font-semibold text-gray-400">No reward transactions yet.</div>
        ) : (
          filteredHistory.map((tx) => (
            <div key={tx.id} className="bg-white dark:bg-[#1C1C1E] p-4 rounded-[24px] shadow-sm border border-gray-100 dark:border-white/5 flex items-center gap-4">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${getBg(tx.type)}`}>
                {getIcon(tx.type)}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="text-[14px] font-black text-gray-900 dark:text-white truncate">{tx.title}</div>
                <div className="text-[11px] text-gray-400 font-bold truncate mt-0.5">{tx.desc}</div>
                <div className="flex items-center gap-1 mt-1.5 text-[10px] text-gray-400 uppercase font-black tracking-widest">
                  <CalendarDays className="w-3 h-3" />
                  {tx.date}
                </div>
              </div>
              
              <div className="text-right shrink-0">
                <div className="text-[16px] font-black text-[var(--wa-teal)]">{tx.amount}</div>
                <div className="text-[9px] text-emerald-500 font-bold uppercase mt-1 bg-emerald-500/10 px-2 py-0.5 rounded-full inline-block">
                  {tx.status}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
