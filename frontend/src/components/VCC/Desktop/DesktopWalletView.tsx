import React, { useEffect, useMemo, useState } from 'react';
import { ArrowUpRight, History, Zap, Target, Users, TrendingUp, CreditCard, Crown, ArrowDownToLine, RefreshCcw, Banknote, Bot, ChevronRight } from 'lucide-react';
import { useCommerceContext } from '../contexts/CommerceContext';
import { useDrawerContext } from '../contexts/DrawerContext';
import { useSessionContext } from '../contexts/SessionContext';
import { rewardApi } from '../../../services/api';
import { classifyRewardTransaction, summarizeRewardTransactions } from '../utils/rewardCommerce';

export const DesktopWalletView: React.FC = () => {
  const { userBalance, userPoints, isPrime } = useCommerceContext();
  const { pushDrawer } = useDrawerContext();
  const { user } = useSessionContext();
  const [activeFilter, setActiveFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTransactions = async () => {
      if (!user?.customer_id) {
        setTransactions([]);
        setLoading(false);
        return;
      }

      try {
        const response = await rewardApi.getTransactions(user.customer_id);
        setTransactions(Array.isArray(response.data) ? response.data : []);
      } catch {
        setTransactions([]);
      } finally {
        setLoading(false);
      }
    };

    setLoading(true);
    fetchTransactions();
  }, [user?.customer_id]);

  const summary = useMemo(() => summarizeRewardTransactions(transactions), [transactions]);

  const normalizedTransactions = useMemo(() => {
    return transactions.map((tx) => {
      const category = classifyRewardTransaction(tx);
      const amount = Number(tx.amount) || 0;
      const positive = amount >= 0;

      const metadata = {
        cashback: {
          icon: <Target className="w-4 h-4 text-emerald-500" />,
          bg: 'bg-emerald-50 dark:bg-emerald-900/20',
          title: 'Cashback Reward',
        },
        fan: {
          icon: <Users className="w-4 h-4 text-purple-500" />,
          bg: 'bg-purple-50 dark:bg-purple-900/20',
          title: 'Fan Reward',
        },
        referral: {
          icon: <Zap className="w-4 h-4 text-blue-500" />,
          bg: 'bg-blue-50 dark:bg-blue-900/20',
          title: 'Referral Reward',
        },
        payment: {
          icon: <CreditCard className="w-4 h-4 text-zinc-500" />,
          bg: 'bg-zinc-100 dark:bg-zinc-800',
          title: 'Order Payment',
        },
        withdraw: {
          icon: <ArrowDownToLine className="w-4 h-4 text-orange-500" />,
          bg: 'bg-orange-50 dark:bg-orange-900/20',
          title: 'Withdrawal',
        },
        refund: {
          icon: <RefreshCcw className="w-4 h-4 text-indigo-500" />,
          bg: 'bg-indigo-50 dark:bg-indigo-900/20',
          title: 'Refund',
        },
        other: {
          icon: <Banknote className="w-4 h-4 text-rose-500" />,
          bg: 'bg-rose-50 dark:bg-rose-900/20',
          title: 'Wallet Update',
        },
      }[category];

      return {
        id: String(tx.id || `${category}-${tx.created_at || ''}`),
        positive,
        icon: metadata.icon,
        bg: metadata.bg,
        title: metadata.title,
        desc: tx.description || tx.order_id || tx.status || '--',
        amount: `${positive ? '+' : '-'}$${Math.abs(amount).toFixed(2)}`,
        date: tx.created_at ? new Date(tx.created_at).toLocaleString() : '--',
      };
    });
  }, [transactions]);

  const filtered = normalizedTransactions.filter((tx) =>
    activeFilter === 'all' || (activeFilter === 'income' ? tx.positive : !tx.positive)
  );

  const EARN_ITEMS = [
    {
      label: 'Total Cashback',
      value: `$${summary.breakdown.cashback.amount.toFixed(2)}`,
      icon: <Target className="w-4 h-4 text-emerald-500" />,
      sub: `${summary.breakdown.cashback.count} reward records`,
    },
    {
      label: 'Referral Earnings',
      value: `$${summary.breakdown.referral.amount.toFixed(2)}`,
      icon: <Zap className="w-4 h-4 text-blue-500" />,
      sub: `${summary.breakdown.referral.count} commission records`,
    },
    {
      label: 'Fan Rewards',
      value: `$${summary.breakdown.fan.amount.toFixed(2)}`,
      icon: <Users className="w-4 h-4 text-purple-500" />,
      sub: `${summary.breakdown.fan.count} fan records`,
    },
    {
      label: 'Refunds & Other',
      value: `$${(summary.breakdown.refund.amount + summary.breakdown.other.amount).toFixed(2)}`,
      icon: <Bot className="w-4 h-4 text-cyan-500" />,
      sub: `${summary.breakdown.refund.count + summary.breakdown.other.count} records`,
    },
  ];

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left: Hero Balance */}
      <div className="w-[280px] shrink-0 border-r border-zinc-200 dark:border-zinc-800 flex flex-col">
        {/* Balance Card */}
        <div className="relative overflow-hidden p-6 m-4 rounded-2xl" style={{ background: 'linear-gradient(160deg, #FF7A3D 0%, #E8450A 60%, #C93A08 100%)' }}>
          <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-white/10 blur-2xl pointer-events-none" />
          <div className="relative z-10">
            <p className="text-[11px] font-semibold text-white/70 uppercase tracking-widest mb-1">Available Balance</p>
            <div className="flex items-end gap-1 mb-5">
              <span className="text-[14px] font-bold text-white/80 mb-1">$</span>
              <span className="text-[40px] font-black text-white leading-none tracking-tight">
                {userBalance.toFixed(2)}
              </span>
            </div>
            <button
              onClick={() => pushDrawer('withdraw')}
              className="w-full bg-white/90 hover:bg-white py-2.5 rounded-xl font-semibold text-[13px] flex items-center justify-center gap-2 active:scale-95 transition-all text-[#E8450A]"
            >
              <ArrowUpRight className="w-4 h-4" /> Withdraw Now
            </button>
          </div>
        </div>

        {/* Points */}
        <div className="mx-4 mb-4 bg-zinc-50 dark:bg-zinc-900/50 rounded-2xl p-4 border border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[12px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Points</span>
            <button onClick={() => pushDrawer('points_history')} className="text-[11px] text-orange-500 font-semibold hover:underline">History</button>
          </div>
          <div className="text-[28px] font-black text-zinc-900 dark:text-white">{userPoints.toLocaleString()}</div>
          <button
            onClick={() => pushDrawer('points_exchange')}
            className="mt-3 w-full py-2 rounded-xl text-[12px] font-semibold border border-orange-500/30 text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors"
          >
            Redeem Points
          </button>
        </div>

        {/* Prime */}
        <div className="mx-4 mb-4 rounded-2xl p-4 border border-amber-500/30"
          style={{ background: 'linear-gradient(135deg, rgba(251,191,36,0.08) 0%, rgba(245,158,11,0.08) 100%)' }}>
          <div className="flex items-center gap-2 mb-2">
            <Crown className="w-4 h-4 text-amber-500" />
            <span className="text-[13px] font-black text-amber-600 dark:text-amber-400">Prime Membership</span>
            {isPrime && <span className="ml-auto text-[10px] bg-amber-500 text-white px-1.5 py-0.5 rounded-full font-bold">Active</span>}
          </div>
          <p className="text-[12px] text-zinc-500 dark:text-zinc-400 mb-3">Unlimited cashback · Exclusive discounts · Priority support</p>
          <button
            onClick={() => pushDrawer('prime')}
            className="w-full py-2 rounded-xl text-[12px] font-semibold text-white"
            style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' }}
          >
            {isPrime ? 'Manage Membership' : 'Upgrade to Prime'}
          </button>
        </div>

        {/* Shortcuts */}
        <div className="mx-4 space-y-1">
          {[
            { label: 'Withdrawal History', icon: <History className="w-4 h-4" />, drawer: 'reward_history' as const },
            { label: 'Coupons',   icon: <TrendingUp className="w-4 h-4" />, drawer: 'coupons' as const },
          ].map(item => (
            <button
              key={item.label}
              onClick={() => pushDrawer(item.drawer)}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-zinc-600 dark:text-zinc-400"
            >
              <div className="flex items-center gap-2.5">{item.icon}<span className="text-[13px] font-medium">{item.label}</span></div>
              <ChevronRight className="w-4 h-4 text-zinc-300" />
            </button>
          ))}
        </div>
      </div>

      {/* Right: Stats + Transactions */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Earn Stats */}
        <div className="px-6 py-5 border-b border-zinc-200 dark:border-zinc-800 shrink-0">
          <h3 className="text-[13px] font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-widest mb-4">Earnings Breakdown</h3>
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
            {EARN_ITEMS.map(item => (
              <div key={item.label} className="bg-zinc-50 dark:bg-zinc-900/50 rounded-2xl p-4 border border-zinc-200 dark:border-zinc-800 hover:border-orange-300 dark:hover:border-orange-800 transition-colors cursor-pointer">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 rounded-lg bg-white dark:bg-zinc-800 flex items-center justify-center shadow-sm border border-zinc-200 dark:border-zinc-700">
                    {item.icon}
                  </div>
                  <span className="text-[11px] text-zinc-500 font-medium">{item.label}</span>
                </div>
                <div className="text-[20px] font-black text-zinc-900 dark:text-white">{item.value}</div>
                <div className="text-[11px] text-zinc-400 mt-0.5">{item.sub}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Transaction List */}
        <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: '#3f3f46 transparent' }}>
          <div className="px-6 py-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[13px] font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">Recent Transactions</h3>
              <div className="flex gap-1">
                {(['all', 'income', 'expense'] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => setActiveFilter(f)}
                    className={`px-3 py-1 rounded-lg text-[12px] font-semibold transition-all ${activeFilter === f ? 'bg-zinc-900 dark:bg-white text-white dark:text-black' : 'text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}
                  >
                    {{ all: 'All', income: 'Income', expense: 'Expense' }[f]}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              {loading ? (
                <div className="text-center py-10 text-[13px] font-semibold text-zinc-400">Loading transactions...</div>
              ) : filtered.length === 0 ? (
                <div className="text-center py-10 text-[13px] font-semibold text-zinc-400">No wallet activity yet.</div>
              ) : (
                filtered.map(tx => (
                  <div key={tx.id} className="flex items-center gap-4 bg-white dark:bg-[#18181B] p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${tx.bg}`}>{tx.icon}</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-semibold text-zinc-900 dark:text-white">{tx.title}</div>
                      <div className="text-[11px] text-zinc-400">{tx.desc}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className={`text-[15px] font-black ${tx.positive ? 'text-emerald-500' : 'text-zinc-600 dark:text-zinc-300'}`}>{tx.amount}</div>
                      <div className="text-[10px] text-zinc-400">{tx.date}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
