import React from 'react';
import { Users, CheckCircle2, Clock, Gift, ChevronRight, UserPlus, ShieldCheck, TrendingUp } from 'lucide-react';
import { usePreferenceContext } from '../contexts/PreferenceContext';
import { useDrawerContext } from '../contexts/DrawerContext';

export const GroupBuyDetailDrawer: React.FC = () => {
    const { popDrawer } = useDrawerContext();
  const { t } = usePreferenceContext();

  // Mock data for the invitation details
  const details = {
    product: {
      title: t('ordercenter.artisan_crafted_wireless_earbu'),
      image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&q=80&w=400',
      price: '29.99',
    },
    invites: [
      { id: 1, name: t('contacts.david_w'), status: 'settled', date: '2026-04-10', avatar: 'https://i.pravatar.cc/150?u=1' },
      { id: 2, name: t('contacts.sarah_c'), status: 'settled', date: '2026-04-11', avatar: 'https://i.pravatar.cc/150?u=2' },
      { id: 3, name: t('contacts.mike_j'), status: 'settled', date: '2026-04-12', avatar: 'https://i.pravatar.cc/150?u=3' },
      { id: 4, name: t('contacts.elena_r'), status: 'pending', date: '2026-04-13', avatar: 'https://i.pravatar.cc/150?u=4' },
      { id: 5, name: t('order.waiting_for_join'), status: 'empty', date: '-', avatar: '' },
      { id: 6, name: t('order.waiting_for_join'), status: 'empty', date: '-', avatar: '' },
    ],
    stats: {
      totalInvited: 4,
      earnedCount: 1, // 4 invites / 3 = 1 item earned
      settledCount: 0, // 0 items settled yet (waiting for return period)
      pendingCount: 1, // 1 item pending verification
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'settled':
        return <span className="bg-green-500/10 text-green-600 text-[10px] font-black px-2 py-0.5 rounded-full uppercase">{t('order.verified')}</span>;
      case 'pending':
        return <span className="bg-orange-500/10 text-orange-600 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter">{t('order.waiting_for_delivery')}</span>;
      case 'empty':
        return <span className="bg-gray-100 text-gray-400 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter">{t('order.available_slot')}</span>;
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#F2F2F7] dark:bg-[#000000] p-5 space-y-6 pb-24">
      {/* 1. Product Summary Card */}
      <div className="bg-white dark:bg-[#1C1C1E] rounded-3xl p-4 shadow-sm border border-gray-100 dark:border-white/5 flex gap-4">
        <div className="w-20 h-20 rounded-2xl overflow-hidden border border-gray-100 dark:border-white/5 shadow-inner">
          <img src={details.product.image} className="w-full h-full object-cover" />
        </div>
        <div className="flex-1 flex flex-col justify-center">
          <h3 className="text-[15px] font-black text-gray-900 dark:text-white line-clamp-1 leading-tight mb-1">{details.product.title}</h3>
          <div className="flex items-center gap-2">
            <span className="text-[16px] font-black text-[var(--wa-teal)]">${details.product.price}</span>
            <span className="text-[11px] text-gray-400 font-bold uppercase tracking-widest">{t('order.product_share_to_free')}</span>
          </div>
        </div>
      </div>

      {/* 2. Rewards Progress Dashboard */}
      <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-[32px] p-6 text-white shadow-xl relative overflow-hidden">
        <div className="absolute -right-6 -bottom-6 opacity-10">
          <Gift className="w-32 h-32" />
        </div>
        
        <div className="relative z-10 flex justify-between items-start mb-6">
          <div>
            <h4 className="text-[13px] font-black uppercase tracking-widest opacity-80 mb-1">{t('order.earned_rewards')}</h4>
            <div className="text-[32px] font-black leading-none">${(parseFloat(details.product.price) * details.stats.earnedCount).toFixed(2)}</div>
          </div>
          <div className="bg-white/20 backdrop-blur-md p-3 rounded-2xl border border-white/20">
            <Gift className="w-6 h-6" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 relative z-10">
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/10">
            <div className="text-[20px] font-black">{details.stats.settledCount}</div>
            <div className="text-[10px] font-bold uppercase opacity-70 tracking-tighter leading-none">{t('order.settled_refunded')}</div>
          </div>
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/10">
            <div className="text-[20px] font-black">{details.stats.pendingCount}</div>
            <div className="text-[10px] font-bold uppercase opacity-70 tracking-tighter leading-none">{t('order.pending_verification')}</div>
          </div>
        </div>
      </div>

      {/* 3. Detailed Invitation List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-2">
          <h4 className="text-[14px] font-black text-gray-900 dark:text-white uppercase tracking-wider">{t('order.invitation_timeline')}</h4>
          <span className="text-[11px] text-gray-400 font-bold uppercase">{details.stats.totalInvited} {t('order.friends_joined')}</span>
        </div>

        <div className="bg-white dark:bg-[#1C1C1E] rounded-[32px] shadow-sm border border-gray-100 dark:border-white/5 overflow-hidden">
          {details.invites.map((invite, idx) => (
            <div 
              key={invite.id} 
              className={`p-4 flex items-center gap-4 transition-colors ${
                idx !== details.invites.length - 1 ? 'border-b border-gray-50 dark:border-white/5' : ''
              } ${invite.status === 'empty' ? 'opacity-40 grayscale' : ''}`}
            >
              <div className="relative">
                {invite.avatar ? (
                  <img src={invite.avatar} className="w-12 h-12 rounded-2xl object-cover border-2 border-white dark:border-white/10 shadow-sm" />
                ) : (
                  <div className="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-white/5 flex items-center justify-center border-2 border-dashed border-gray-300 dark:border-white/10">
                    <UserPlus className="w-5 h-5 text-gray-300" />
                  </div>
                )}
                {invite.status === 'settled' && (
                  <div className="absolute -right-1 -bottom-1 bg-green-500 text-white rounded-full p-0.5 border-2 border-white dark:border-[#1C1C1E] shadow-sm">
                    <CheckCircle2 className="w-3 h-3" />
                  </div>
                )}
              </div>

              <div className="flex-1">
                <div className="flex justify-between items-start mb-0.5">
                  <span className="text-[14px] font-black text-gray-900 dark:text-white tracking-tight">{invite.name}</span>
                  <span className="text-[10px] text-gray-400 font-medium">{invite.date}</span>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusBadge(invite.status)}
                  {invite.status === 'pending' && (
                    <div className="flex items-center gap-1 text-[9px] text-gray-400 italic">
                      <Clock className="w-2.5 h-2.5" />
                      Waiting for sign + return period
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 4. Rules Reminder Section */}
      <div className="bg-orange-500/5 dark:bg-orange-500/10 rounded-3xl p-5 border border-orange-500/10 space-y-3">
        <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400">
          <ShieldCheck className="w-5 h-5" />
          <h5 className="text-[13px] font-black uppercase tracking-tight">{t('order.rules_safety')}</h5>
        </div>
        <ul className="space-y-2">
          {[
            t('order.rule_1'),
            t('order.rule_2'),
            t('order.rule_3'),
            t('order.rule_4')
          ].map((rule, i) => (
            <li key={i} className="flex gap-2 text-[11px] text-gray-500 dark:text-gray-400 leading-snug">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-400 shrink-0 mt-1.5" />
              {rule}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};