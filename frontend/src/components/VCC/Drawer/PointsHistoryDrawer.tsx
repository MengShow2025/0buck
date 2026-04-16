import React, { useState, useEffect } from 'react';
import { ArrowDownToLine, Coins, Gift, TrendingUp, Users, CalendarDays, Filter, MessageSquare, ShoppingBag, Zap, Bot, TicketCheck } from 'lucide-react';
import { useAppContext } from '../AppContext';
import api from '../../../services/api';

type PointTxCategory = 'community' | 'shopping' | 'fan_shopping' | 'referral' | 'exchange' | 'ai_reward' | 'signin' | 'unknown';

export const PointsHistoryDrawer: React.FC = () => {
  const { popDrawer, t, user, showToast } = useAppContext();
  const [filter, setFilter] = useState<'all' | 'earn' | 'spend'>('all');
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState<number>(0);

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.id) return;
      try {
        const [txRes, statusRes] = await Promise.all([
          api.getPointsTransactions(user.id),
          api.getStatus(user.id)
        ]);

        if (statusRes.data?.wallet?.points !== undefined) {
          setBalance(statusRes.data.wallet.points);
        }

        if (txRes.data?.status === 'success') {
          const formatted = txRes.data.transactions.map((tx: any) => {
            const amountNum = parseFloat(tx.amount);
            let category: PointTxCategory = 'unknown';
            
            if (tx.source.includes('shopping')) category = 'shopping';
            else if (tx.source.includes('referral')) category = 'referral';
            else if (tx.source.includes('exchange')) category = 'exchange';
            else if (tx.source.includes('ai') || tx.source.includes('gpt')) category = 'ai_reward';
            else if (tx.source.includes('signin') || tx.source.includes('checkin')) category = 'signin';
            else if (tx.source.includes('fan')) category = 'fan_shopping';
            else if (tx.source.includes('community')) category = 'community';
            
            return {
              id: tx.id,
              type: amountNum >= 0 ? 'earn' : 'spend',
              category,
              title: t(`points.cat_${category}`) || tx.source.replace(/_/g, ' ').toUpperCase(),
              desc: tx.description || tx.source,
              amount: amountNum > 0 ? `+${amountNum}` : `${amountNum}`,
              date: new Date(tx.created_at).toLocaleString(),
              status: t('common.completed')
            };
          });
          setHistory(formatted);
        }
      } catch (err) {
        console.error(err);
        showToast(t('common.error'), 'error');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user?.id, t, showToast]);

  const filteredHistory = history.filter(item => filter === 'all' || item.type === filter);

  const getCategoryIcon = (category: PointTxCategory) => {
    switch(category) {
      case 'community': return <MessageSquare className="w-5 h-5 text-indigo-500" />;
      case 'shopping': return <ShoppingBag className="w-5 h-5 text-emerald-500" />;
      case 'fan_shopping': return <Users className="w-5 h-5 text-purple-500" />;
      case 'referral': return <Zap className="w-5 h-5 text-blue-500" />;
      case 'exchange': return <TicketCheck className="w-5 h-5 text-orange-500" />;
      case 'ai_reward': return <Bot className="w-5 h-5 text-cyan-500" />;
      case 'signin': return <CalendarDays className="w-5 h-5 text-amber-500" />;
      default: return <Coins className="w-5 h-5 text-gray-500" />;
    }
  };

  const getCategoryBg = (category: PointTxCategory) => {
    switch(category) {
      case 'community': return 'bg-indigo-50 dark:bg-indigo-900/20';
      case 'shopping': return 'bg-emerald-50 dark:bg-emerald-900/20';
      case 'fan_shopping': return 'bg-purple-50 dark:bg-purple-900/20';
      case 'referral': return 'bg-blue-50 dark:bg-blue-900/20';
      case 'exchange': return 'bg-orange-50 dark:bg-orange-900/20';
      case 'ai_reward': return 'bg-cyan-50 dark:bg-cyan-900/20';
      case 'signin': return 'bg-amber-50 dark:bg-amber-900/20';
      default: return 'bg-gray-50 dark:bg-gray-800';
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#F2F2F7] dark:bg-[#000000] pb-32 overflow-y-auto no-scrollbar">
      
      {/* Header Summary */}
      <div className="bg-white dark:bg-[#1C1C1E] px-6 pt-6 pb-8 rounded-b-[40px] shadow-sm border-b border-gray-100 dark:border-white/5 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-6 opacity-5">
          <Coins className="w-32 h-32 text-amber-500" />
        </div>
        
        <h2 className="text-[12px] font-black text-gray-400 uppercase tracking-widest mb-2 relative z-10">{t('points.balance_title')}</h2>
        <div className="flex items-baseline gap-2 relative z-10">
          <span className="text-[40px] font-black text-gray-900 dark:text-white tracking-tighter leading-none">{balance.toLocaleString()}</span>
          <span className="text-[12px] font-bold text-amber-500 uppercase tracking-widest bg-amber-500/10 px-2 py-1 rounded-lg">PTS</span>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 mt-6 overflow-x-auto no-scrollbar relative z-10">
          <button 
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-full text-[11px] font-black uppercase tracking-widest whitespace-nowrap transition-all ${filter === 'all' ? 'bg-gray-900 dark:bg-white text-white dark:text-black shadow-md' : 'bg-gray-100 dark:bg-white/5 text-gray-500'}`}
          >
            {t('points.tab_all')}
          </button>
          <button 
            onClick={() => setFilter('earn')}
            className={`px-4 py-2 rounded-full text-[11px] font-black uppercase tracking-widest whitespace-nowrap transition-all flex items-center gap-1.5 ${filter === 'earn' ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20' : 'bg-gray-100 dark:bg-white/5 text-gray-500'}`}
          >
            <TrendingUp className="w-3 h-3" /> {t('points.tab_earn')}
          </button>
          <button 
            onClick={() => setFilter('spend')}
            className={`px-4 py-2 rounded-full text-[11px] font-black uppercase tracking-widest whitespace-nowrap transition-all flex items-center gap-1.5 ${filter === 'spend' ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20' : 'bg-gray-100 dark:bg-white/5 text-gray-500'}`}
          >
            <ArrowDownToLine className="w-3 h-3" /> {t('points.tab_spend')}
          </button>
        </div>
      </div>

      {/* Transaction List */}
      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between px-2 pt-2">
          <h3 className="text-[14px] font-black text-gray-900 dark:text-white">{t('points.recent_detail')}</h3>
          <button className="p-2 bg-gray-200 dark:bg-white/10 rounded-full text-gray-500 active:scale-95 transition-all">
            <Filter className="w-4 h-4" />
          </button>
        </div>

        {loading ? (
          <div className="text-center py-10 text-gray-500 font-bold">{t('common.loading')}</div>
        ) : filteredHistory.length === 0 ? (
          <div className="text-center py-10 text-gray-500 font-bold">No transactions found.</div>
        ) : (
          filteredHistory.map((tx) => (
            <div key={tx.id} className="bg-white dark:bg-[#1C1C1E] p-4 rounded-[24px] shadow-sm border border-gray-100 dark:border-white/5 flex items-center gap-4">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${getCategoryBg(tx.category)}`}>
                {getCategoryIcon(tx.category)}
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
                <div className={`text-[16px] font-black ${tx.type === 'earn' ? 'text-emerald-500' : 'text-gray-900 dark:text-white'}`}>{tx.amount}</div>
                <div className="text-[9px] text-gray-400 font-bold uppercase mt-1 px-2 py-0.5 rounded-full inline-block bg-gray-100 dark:bg-white/5">
                  PTS
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};