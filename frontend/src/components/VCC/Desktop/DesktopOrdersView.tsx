import React, { useMemo, useState } from 'react';
import { Package, Truck, CheckCircle2, Clock, RefreshCcw, Search, ChevronRight } from 'lucide-react';
import { useDrawerContext } from '../contexts/DrawerContext';
import { useCommerceContext } from '../contexts/CommerceContext';
import { matchesOrderSearch, normalizeOrderStatus } from '../utils/orderSummary';

const STATUS_META: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  pending:   { label: 'Pending Payment', color: 'text-amber-600 dark:text-amber-400',  bg: 'bg-amber-50 dark:bg-amber-900/20',  icon: <Clock className="w-3.5 h-3.5" /> },
  paid:      { label: 'Paid', color: 'text-blue-600 dark:text-blue-400',    bg: 'bg-blue-50 dark:bg-blue-900/20',    icon: <Package className="w-3.5 h-3.5" /> },
  shipped:   { label: 'Shipped', color: 'text-indigo-600 dark:text-indigo-400',bg: 'bg-indigo-50 dark:bg-indigo-900/20',icon: <Truck className="w-3.5 h-3.5" /> },
  completed: { label: 'Completed', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20', icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  refunding: { label: 'Refunding', color: 'text-rose-600 dark:text-rose-400',    bg: 'bg-rose-50 dark:bg-rose-900/20',    icon: <RefreshCcw className="w-3.5 h-3.5" /> },
};

const TABS = ['All', 'Pending Payment', 'Paid', 'Shipped', 'Completed', 'Refunding'];
const TAB_STATUS: Record<string, string> = { 'Pending Payment': 'pending', 'Paid': 'paid', 'Shipped': 'shipped', 'Completed': 'completed', 'Refunding': 'refunding' };

interface Props {
  onOrderSelect: (id: string) => void;
}

export const DesktopOrdersView: React.FC<Props> = ({ onOrderSelect }) => {
  const { orders } = useCommerceContext();
  const { pushDrawer } = useDrawerContext();
  const [activeTab, setActiveTab] = useState('All');
  const [search, setSearch] = useState('');

  const normalizedOrders = useMemo(
    () =>
      orders.map((order: any) => ({
        ...order,
        uiStatus: normalizeOrderStatus(order.status),
      })),
    [orders]
  );

  const filtered = normalizedOrders.filter((order: any) => {
    const matchStatus = activeTab === 'All' || order.uiStatus === TAB_STATUS[activeTab];
    const matchSearch = matchesOrderSearch(order, search);
    return matchStatus && matchSearch;
  });

  const stats = {
    total: normalizedOrders.length,
    shipped: normalizedOrders.filter((o: any) => o.uiStatus === 'shipped').length,
    completed: normalizedOrders.filter((o: any) => o.uiStatus === 'completed').length,
    cashback: normalizedOrders.reduce((sum: number, order: any) => sum + Number(order.cashback_estimated || 0), 0),
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-[#0A0A0B]/80 backdrop-blur-xl shrink-0">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[18px] font-black text-zinc-900 dark:text-white tracking-tight">My Orders</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search order ID or tracking..."
              className="bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl pl-9 pr-4 py-2 text-[13px] text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-400 outline-none focus:border-orange-400 dark:focus:border-orange-500 transition-colors w-64"
            />
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-4 gap-3 mb-4">
          {[
            { label: 'All Orders', value: stats.total, color: 'text-zinc-700 dark:text-zinc-200' },
            { label: 'Shipping',  value: stats.shipped,   color: 'text-indigo-600 dark:text-indigo-400' },
            { label: 'Completed',  value: stats.completed,  color: 'text-emerald-600 dark:text-emerald-400' },
            { label: 'Total Cashback', value: `$${stats.cashback.toFixed(2)}`, color: 'text-orange-500' },
          ].map(s => (
            <div key={s.label} className="bg-zinc-50 dark:bg-zinc-900/50 rounded-xl px-3 py-2.5 border border-zinc-200 dark:border-zinc-800">
              <div className={`text-[18px] font-black ${s.color}`}>{s.value}</div>
              <div className="text-[11px] text-zinc-400 font-medium mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1">
          {TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all ${
                activeTab === tab
                  ? 'text-white shadow-sm'
                  : 'text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
              }`}
              style={activeTab === tab ? { background: 'linear-gradient(135deg, #FF7A3D 0%, #E8450A 100%)' } : {}}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Order List */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3" style={{ scrollbarWidth: 'thin', scrollbarColor: '#3f3f46 transparent' }}>
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-zinc-400">
            <Package className="w-12 h-12 mb-3 opacity-30" />
            <p className="text-[14px]">
              {search ? 'No matching orders found' : activeTab === 'All' ? 'No orders yet' : `No ${activeTab.toLowerCase()} orders`}
            </p>
          </div>
        ) : filtered.map(order => {
          const meta = STATUS_META[order.uiStatus] ?? STATUS_META.paid;
          return (
            <div
              key={order.order_id}
              onClick={() => onOrderSelect(order.order_id)}
              className="bg-white dark:bg-[#18181B] rounded-2xl border border-zinc-200 dark:border-zinc-800 hover:border-orange-300 dark:hover:border-orange-800 transition-all duration-200 cursor-pointer hover:shadow-md hover:shadow-orange-500/5 active:scale-[0.99] p-4"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-[12px] font-black text-zinc-500 dark:text-zinc-400">{order.order_id}</span>
                  <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${meta.bg} ${meta.color}`}>
                    {meta.icon} {meta.label}
                  </span>
                </div>
                <span className="text-[11px] text-zinc-400">
                  {order.created_at ? new Date(order.created_at).toLocaleDateString() : '--'}
                </span>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-zinc-100 dark:bg-zinc-800 shrink-0 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center">
                  <Package className="w-6 h-6 text-zinc-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[14px] font-semibold text-zinc-900 dark:text-white truncate">
                    {order.fulfillment_status ? `Fulfillment: ${order.fulfillment_status}` : 'Order summary'}
                  </div>
                  <div className="text-[12px] text-zinc-400 mt-0.5">
                    {order.tracking_number ? `Tracking: ${order.tracking_number}` : 'Tracking unavailable'}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-[16px] font-black text-zinc-900 dark:text-white">
                    {order.currency || 'USD'} {Number(order.total_price || 0).toFixed(2)}
                  </div>
                  {Number(order.cashback_estimated || 0) > 0 && (
                    <div className="text-[11px] text-emerald-500 font-semibold mt-0.5">
                      +{Number(order.cashback_estimated).toFixed(2)} cashback
                    </div>
                  )}
                </div>
                <ChevronRight className="w-4 h-4 text-zinc-300 shrink-0" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
