import React, { useEffect, useMemo, useState } from 'react';
import { Truck, CheckCircle2, CreditCard, MoreHorizontal, ChevronRight, Gift } from 'lucide-react';
import { useDrawerContext } from '../contexts/DrawerContext';
import { useSessionContext } from '../contexts/SessionContext';
import { useCommerceContext } from '../contexts/CommerceContext';
import { rewardApi } from '../../../services/api';
import { buildNotificationsFeed, NotificationFeedItem } from '../utils/notificationFeed';

const GROUPS: NotificationFeedItem['group'][] = ['Today', 'Yesterday', 'This Week', 'Earlier'];

export const DesktopNotificationsView: React.FC = () => {
  const { pushDrawer } = useDrawerContext();
  const { user } = useSessionContext();
  const { orders } = useCommerceContext();
  const [transactions, setTransactions] = useState<any[]>([]);

  useEffect(() => {
    const fetchTransactions = async () => {
      if (!user?.customer_id) {
        setTransactions([]);
        return;
      }
      try {
        const response = await rewardApi.getTransactions(user.customer_id);
        setTransactions(Array.isArray(response.data) ? response.data : []);
      } catch {
        setTransactions([]);
      }
    };
    fetchTransactions();
  }, [user?.customer_id]);

  const notifications = useMemo(
    () => buildNotificationsFeed({ orders, transactions }),
    [orders, transactions]
  );

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-[#0A0A0B]/80 backdrop-blur-xl shrink-0 flex items-center justify-between">
        <h2 className="text-[18px] font-black text-zinc-900 dark:text-white">Notifications</h2>
        <button className="text-[12px] text-zinc-400 transition-colors font-medium">Live feed</button>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4" style={{ scrollbarWidth: 'thin', scrollbarColor: '#3f3f46 transparent' }}>
        <div className="max-w-2xl mx-auto space-y-8">
          {notifications.length === 0 && (
            <div className="bg-white dark:bg-[#18181B] rounded-2xl border border-zinc-200 dark:border-zinc-800 p-10 text-center">
              <Gift className="w-10 h-10 text-zinc-300 mx-auto mb-3" />
              <h3 className="text-[16px] font-black text-zinc-900 dark:text-white">No notifications yet</h3>
              <p className="text-[12px] text-zinc-400 mt-1">Order updates and reward events will appear here after real activity is generated.</p>
            </div>
          )}
          {GROUPS.map(group => {
            const items = notifications.filter(n => n.group === group);
            if (!items.length) return null;
            return (
              <div key={group}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="text-[11px] font-black text-zinc-400 uppercase tracking-widest">{group}</div>
                  <div className="flex-1 h-px bg-zinc-200 dark:bg-zinc-800" />
                </div>
                <div className="space-y-2">
                  {items.map(notif => (
                    <div key={notif.id} className="bg-white dark:bg-[#18181B] rounded-2xl border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors overflow-hidden">
                      <div className="flex items-start gap-4 p-4">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${notif.kind === 'order' ? 'bg-blue-50 dark:bg-blue-900/20' : 'bg-emerald-50 dark:bg-emerald-900/20'}`}>
                          {notif.kind === 'order'
                            ? (notif.title === 'Order completed'
                                ? <CheckCircle2 className="w-4 h-4 text-green-500" />
                                : <Truck className="w-4 h-4 text-blue-500" />)
                            : <CreditCard className="w-4 h-4 text-emerald-500" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[14px] font-semibold text-zinc-900 dark:text-white leading-snug">{notif.title}</div>
                          <div className="text-[12px] text-zinc-500 dark:text-zinc-400 mt-0.5">{notif.sub}</div>
                          {notif.extra && (
                            <div className="text-[11px] text-zinc-400 mt-1 bg-zinc-50 dark:bg-white/5 px-2 py-1 rounded-lg inline-block">{notif.extra}</div>
                          )}
                        </div>
                        <button className="text-zinc-300 hover:text-zinc-500 transition-colors shrink-0">
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                      </div>
                      <button
                        onClick={() => pushDrawer(notif.drawer)}
                        className="w-full flex items-center justify-between px-4 py-2.5 border-t border-zinc-100 dark:border-zinc-800 text-[12px] font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-white/5 transition-colors"
                      >
                        {notif.cta} <ChevronRight className="w-3.5 h-3.5 text-zinc-300" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
