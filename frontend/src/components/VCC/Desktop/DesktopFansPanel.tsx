import React, { useEffect, useMemo, useState } from 'react';
import { Target, Users, Zap, Copy, Calendar, ChevronDown, ChevronUp, UserCheck, TrendingUp, Trophy, Bot, ChevronRight, Share2 } from 'lucide-react';
import { useCommerceContext } from '../contexts/CommerceContext';
import { useDrawerContext } from '../contexts/DrawerContext';
import { useSessionContext } from '../contexts/SessionContext';
import { rewardApi } from '../../../services/api';
import { summarizeRewardStatus, summarizeRewardTransactions } from '../utils/rewardCommerce';

export const DesktopFansPanel: React.FC = () => {
  const { pushDrawer } = useDrawerContext();
  const { user } = useSessionContext();
  const { hasCheckedInToday, setHasCheckedInToday, userLevel, isInfluencer } = useCommerceContext();
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [statusPayload, setStatusPayload] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStatus = async () => {
      if (!user?.customer_id) {
        setStatusPayload(null);
        setLoading(false);
        return;
      }

      try {
        const response = await rewardApi.getStatus(user.customer_id);
        setStatusPayload(response.data ?? null);
      } catch {
        setStatusPayload(null);
      } finally {
        setLoading(false);
      }
    };

    setLoading(true);
    fetchStatus();
  }, [user?.customer_id]);

  const statusSummary = useMemo(() => summarizeRewardStatus(statusPayload), [statusPayload]);
  const transactionSummary = useMemo(
    () => summarizeRewardTransactions(statusPayload?.transactions),
    [statusPayload]
  );
  const averageProgress = useMemo(() => {
    const rows = statusSummary.orderRows;
    if (rows.length === 0) return 0;
    const total = rows.reduce((sum, row) => sum + row.currentPeriod, 0);
    return Math.max(0, Math.min(100, (total / rows.length / 20) * 100));
  }, [statusSummary.orderRows]);

  const handleCopy = () => {
    navigator.clipboard.writeText(statusSummary.referralCode || user?.referral_code || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left: Main content */}
      <div className="flex-1 overflow-y-auto px-6 py-5" style={{ scrollbarWidth: 'thin', scrollbarColor: '#3f3f46 transparent' }}>

        {/* Stats overview */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Total Fans',      value: String(statusSummary.totalFans),      sub: 'Invited users', color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-900/20', icon: Users },
            { label: 'Total Earnings',  value: `$${transactionSummary.lifetimeEarnings.toFixed(2)}`,  sub: 'Completed reward income', color: 'text-emerald-500',bg: 'bg-emerald-50 dark:bg-emerald-900/20',icon: TrendingUp },
            { label: 'Referral Rate',   value: isInfluencer ? '5.0%' : userLevel === 'Gold' ? '4.0%' : userLevel === 'Silver' ? '3.0%' : '2.0%', sub: `${userLevel} tier`, color: 'text-blue-500',   bg: 'bg-blue-50 dark:bg-blue-900/20',     icon: Zap },
            { label: 'Fan Cashback Rate', value: isInfluencer ? '3.0%' : '1.0%',  sub: 'Cashback from friend orders',  color: 'text-amber-500',  bg: 'bg-amber-50 dark:bg-amber-900/20',   icon: Trophy },
          ].map(s => (
            <div key={s.label} className="bg-white dark:bg-[#18181B] rounded-2xl p-4 border border-zinc-200 dark:border-zinc-800 hover:border-orange-300 dark:hover:border-orange-800 transition-colors">
              <div className={`w-8 h-8 rounded-xl ${s.bg} flex items-center justify-center mb-3`}>
                <s.icon className={`w-4 h-4 ${s.color}`} />
              </div>
              <div className={`text-[22px] font-black ${s.color}`}>{s.value}</div>
              <div className="text-[12px] font-semibold text-zinc-700 dark:text-zinc-300 mt-0.5">{s.label}</div>
              <div className="text-[11px] text-zinc-400 mt-0.5">{s.sub}</div>
            </div>
          ))}
        </div>

        {/* Check-in + Progress */}
        <div className="bg-white dark:bg-[#18181B] rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 mb-4">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="text-[12px] font-black text-zinc-400 uppercase tracking-widest mb-1">Daily Cashback Progress</div>
              <div className="flex items-baseline gap-2">
                <span className="text-[32px] font-black text-zinc-900 dark:text-white">${statusSummary.pendingCashbackAmount.toFixed(2)}</span>
                <span className="text-[13px] text-orange-500 font-bold">{loading ? 'Loading' : 'Pending'}</span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-[13px] font-black text-orange-500">{statusSummary.activePlanCount} active check-in plan(s)</div>
              <div className="text-[12px] text-zinc-400">{statusSummary.orderRows.length} orders syncing</div>
            </div>
          </div>

          <div className="h-2 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden mb-4">
            <div className="h-full rounded-full" style={{ width: `${averageProgress}%`, background: 'linear-gradient(90deg, #FF7A3D 0%, #E8450A 100%)', boxShadow: '0 0 10px rgba(232,69,10,0.3)' }} />
          </div>

          <button
            onClick={() => setHasCheckedInToday(true)}
            disabled={hasCheckedInToday}
            className={`w-full py-3 rounded-xl font-semibold text-[14px] flex items-center justify-center gap-2 transition-all ${
              hasCheckedInToday ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 cursor-not-allowed' : 'text-white active:scale-95'
            }`}
            style={!hasCheckedInToday ? { background: 'linear-gradient(135deg, #FF7A3D 0%, #E8450A 100%)' } : {}}
          >
            {hasCheckedInToday ? <><UserCheck className="w-4 h-4" /> Checked in today</> : <><Calendar className="w-4 h-4" /> Check in all orders</>}
          </button>
        </div>

        {/* Order details accordion */}
        <div className="bg-white dark:bg-[#18181B] rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
          <button
            onClick={() => setDetailsOpen(!detailsOpen)}
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-zinc-50 dark:hover:bg-white/5 transition-colors"
          >
            <span className="text-[13px] font-black text-zinc-700 dark:text-zinc-200">Order Cashback Details</span>
            {detailsOpen ? <ChevronUp className="w-4 h-4 text-zinc-400" /> : <ChevronDown className="w-4 h-4 text-zinc-400" />}
          </button>
          {detailsOpen && (
            <div className="border-t border-zinc-100 dark:border-zinc-800">
              <div className="grid grid-cols-5 gap-2 px-5 py-2.5 text-[11px] font-black text-zinc-400 uppercase tracking-wider border-b border-zinc-100 dark:border-zinc-800">
                <span className="col-span-2">Order</span><span>Stage</span><span>Rate</span><span className="text-right">Est. Amount</span>
              </div>
              {statusSummary.orderRows.map(o => (
                <div key={o.id} className="grid grid-cols-5 gap-2 items-center px-5 py-3 border-b border-zinc-50 dark:border-zinc-800/50 hover:bg-zinc-50 dark:hover:bg-white/3 transition-colors">
                  <div className="col-span-2">
                    <div className="text-[12px] font-semibold text-orange-500 underline cursor-pointer hover:text-orange-600" onClick={() => pushDrawer('order_detail')}>{o.id}</div>
                    <div className="text-[11px] text-zinc-400 truncate">{o.rawStatus}</div>
                  </div>
                  <span className="text-[12px] font-semibold text-zinc-700 dark:text-zinc-300">{o.currentPeriod}/20</span>
                  <span className="text-[12px] font-semibold text-zinc-700 dark:text-zinc-300">{(isInfluencer ? 5 : 3).toFixed(1)}%</span>
                  <span className="text-[13px] font-black text-emerald-500 text-right">${o.estimatedAmount.toFixed(2)}</span>
                </div>
              ))}
              {statusSummary.orderRows.length === 0 && (
                <div className="px-5 py-6 text-center text-[12px] font-semibold text-zinc-400">No cashback plans yet.</div>
              )}
            </div>
          )}
        </div>

        {/* Influencer apply shortcut */}
        <div className="mt-4 flex gap-3">
          <button onClick={() => pushDrawer('influencer_apply')} className="flex-1 flex items-center justify-between px-4 py-3 bg-white dark:bg-[#18181B] rounded-2xl border border-zinc-200 dark:border-zinc-800 hover:border-orange-300 dark:hover:border-orange-800 transition-colors group">
            <div className="flex items-center gap-2.5">
              <Zap className="w-4 h-4 text-yellow-500" />
              <div>
                <div className="text-[13px] font-semibold text-zinc-900 dark:text-white">Apply as Creator</div>
                <div className="text-[11px] text-zinc-400">Unlock higher commission rates</div>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-zinc-300 group-hover:text-orange-400 transition-colors" />
          </button>
          <button onClick={() => pushDrawer('leaderboard')} className="flex-1 flex items-center justify-between px-4 py-3 bg-white dark:bg-[#18181B] rounded-2xl border border-zinc-200 dark:border-zinc-800 hover:border-orange-300 dark:hover:border-orange-800 transition-colors group">
            <div className="flex items-center gap-2.5">
              <Trophy className="w-4 h-4 text-amber-500" />
              <div>
                <div className="text-[13px] font-semibold text-zinc-900 dark:text-white">Creator Leaderboard</div>
                <div className="text-[11px] text-zinc-400">View this month’s ranking</div>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-zinc-300 group-hover:text-orange-400 transition-colors" />
          </button>
        </div>
      </div>

      {/* Right: Referral + Earnings breakdown */}
      <aside className="w-[260px] shrink-0 border-l border-zinc-200 dark:border-zinc-800 overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: '#3f3f46 transparent' }}>
        {/* Referral card */}
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800">
          <div className="relative overflow-hidden rounded-2xl p-5" style={{ background: 'linear-gradient(160deg, #FF7A3D 0%, #E8450A 60%, #C93A08 100%)' }}>
            <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-white/10 blur-2xl pointer-events-none" />
            <div className="relative z-10">
              <div className="text-[11px] font-black text-white/70 uppercase tracking-widest mb-2">My Referral Code</div>
              <div className="text-[22px] font-black text-white tracking-wider mb-4">{statusSummary.referralCode || user?.referral_code || '--'}</div>
              <div className="flex gap-2">
                <button onClick={handleCopy} className="flex-1 flex items-center justify-center gap-1.5 bg-white/20 hover:bg-white/30 py-2 rounded-xl text-white text-[12px] font-semibold transition-colors">
                  <Copy className="w-3.5 h-3.5" /> {copied ? 'Copied!' : 'Copy'}
                </button>
                <button onClick={() => pushDrawer('share_menu')} className="flex-1 flex items-center justify-center gap-1.5 bg-white/20 hover:bg-white/30 py-2 rounded-xl text-white text-[12px] font-semibold transition-colors">
                  <Share2 className="w-3.5 h-3.5" /> Share
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Earnings breakdown */}
        <div className="p-4">
          <div className="text-[11px] font-black text-zinc-400 uppercase tracking-widest mb-3">Earnings Breakdown</div>
          <div className="space-y-2.5">
            {[
              { label: 'Fan Rewards', amount: transactionSummary.breakdown.fan.amount, count: transactionSummary.breakdown.fan.count, icon: Users, color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-900/20', border: 'border-purple-200 dark:border-purple-800' },
              { label: 'Referral Rewards', amount: transactionSummary.breakdown.referral.amount, count: transactionSummary.breakdown.referral.count, icon: Zap, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-blue-200 dark:border-blue-800' },
              { label: 'Stage Cashback', amount: transactionSummary.breakdown.cashback.amount, count: transactionSummary.breakdown.cashback.count, icon: Target, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900/20', border: 'border-emerald-200 dark:border-emerald-800' },
              { label: 'Other Rewards', amount: transactionSummary.breakdown.other.amount + transactionSummary.breakdown.refund.amount, count: transactionSummary.breakdown.other.count + transactionSummary.breakdown.refund.count, icon: Bot, color: 'text-cyan-500', bg: 'bg-cyan-50 dark:bg-cyan-900/20', border: 'border-cyan-200 dark:border-cyan-800' },
            ].map(b => (
              <div key={b.label} className={`flex items-center gap-3 p-3 rounded-xl border ${b.bg} ${b.border}`}>
                <div className={`w-8 h-8 rounded-xl bg-white dark:bg-zinc-900 flex items-center justify-center shadow-sm`}>
                  <b.icon className={`w-4 h-4 ${b.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] font-semibold text-zinc-700 dark:text-zinc-300">{b.label}</div>
                  <div className="text-[10px] text-zinc-400">{b.count} records</div>
                </div>
                <div className={`text-[14px] font-black ${b.color}`}>${b.amount.toFixed(2)}</div>
              </div>
            ))}
          </div>

          <button
            onClick={() => pushDrawer('reward_history')}
            className="mt-4 w-full py-2.5 rounded-xl border border-orange-500/30 text-orange-500 text-[12px] font-semibold hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors flex items-center justify-center gap-1"
          >
            View Full Details <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </aside>
    </div>
  );
};
