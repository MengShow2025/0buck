import React, { useMemo, useState } from 'react';
import { Package, Truck, Clock, ChevronRight, RefreshCcw } from 'lucide-react';
import { usePreferenceContext } from '../contexts/PreferenceContext';
import { useDrawerContext } from '../contexts/DrawerContext';
import { useCommerceContext } from '../contexts/CommerceContext';
import { normalizeOrderStatus } from '../utils/orderSummary';

const STATUS_META: Record<string, { label: string; icon: React.ReactNode; color: string; bg: string }> = {
  pending: { label: 'Pending Payment', icon: <Clock className="w-4 h-4" />, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20' },
  paid: { label: 'Paid', icon: <Package className="w-4 h-4" />, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/20' },
  shipped: { label: 'Shipped', icon: <Truck className="w-4 h-4" />, color: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-50 dark:bg-indigo-900/20' },
  completed: { label: 'Completed', icon: <Package className="w-4 h-4" />, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
  refunding: { label: 'Refunding', icon: <RefreshCcw className="w-4 h-4" />, color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-50 dark:bg-rose-900/20' },
};

export const OrderCenterDrawer: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'all' | 'shipped' | 'completed' | 'refunding'>('all');
  const { pushDrawer, selectedProductId, setSelectedProductId } = useDrawerContext();
  const { t } = usePreferenceContext();
  const { orders } = useCommerceContext();

  const filteredOrders = useMemo(
    () =>
      orders.filter((order: any) => {
        const status = normalizeOrderStatus(order.status);
        return activeTab === 'all' ? true : status === activeTab;
      }),
    [activeTab, orders]
  );

  return (
    <div className="flex flex-col h-full bg-[#F2F2F7] dark:bg-black">
      {/* Tabs */}
      <div className="flex border-b border-gray-100 dark:border-white/5 bg-white dark:bg-[#1C1C1E] sticky top-0 z-10">
        {[
          { id: 'all', label: t('order.tab_all') || 'All' },
          { id: 'shipped', label: 'Shipped' },
          { id: 'completed', label: 'Completed' },
          { id: 'refunding', label: 'Refunding' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 py-3 text-[14px] font-semibold transition-colors ${
              activeTab === tab.id 
                ? 'text-[var(--wa-teal)] border-b-2 border-[var(--wa-teal)]' 
                : 'text-gray-500 dark:text-gray-400'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Order List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-24">
        {filteredOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-52 text-gray-400">
            <Package className="w-12 h-12 mb-3 opacity-30" />
            <p className="text-[14px] font-semibold">No orders in this section</p>
            <p className="text-[12px] mt-1">Real order summaries appear here after checkout.</p>
          </div>
        ) : (
          filteredOrders.map((order: any) => {
            const status = normalizeOrderStatus(order.status);
            const meta = STATUS_META[status] ?? STATUS_META.paid;
            const isSelected = selectedProductId === order.order_id;

            return (
              <button
                key={order.order_id}
                onClick={() => {
                  setSelectedProductId(order.order_id);
                  pushDrawer('order_detail');
                }}
                className={`w-full text-left bg-white dark:bg-[#1C1C1E] rounded-[22px] p-4 shadow-sm border transition-all ${
                  isSelected ? 'border-orange-300 dark:border-orange-700' : 'border-gray-100 dark:border-white/5'
                }`}
              >
                <div className="flex justify-between items-center mb-3 pb-3 border-b border-gray-100 dark:border-white/5">
                  <div className="flex flex-col">
                    <span className="text-[12px] font-black text-gray-900 dark:text-white uppercase tracking-tight">
                      {t('order.id_prefix')}{order.order_id}
                    </span>
                    <span className="text-[10px] font-medium text-gray-400">
                      {order.created_at ? new Date(order.created_at).toLocaleString() : '--'}
                    </span>
                  </div>
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[12px] font-bold ${meta.bg} ${meta.color}`}>
                    {meta.icon}
                    {meta.label}
                  </span>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[13px]">
                    <span className="text-gray-500">Amount</span>
                    <span className="font-black text-gray-900 dark:text-white">
                      {order.currency || 'USD'} {Number(order.total_price || 0).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[13px]">
                    <span className="text-gray-500">Tracking</span>
                    <span className="font-semibold text-gray-700 dark:text-gray-300">
                      {order.tracking_number || 'Unavailable'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[13px]">
                    <span className="text-gray-500">Cashback</span>
                    <span className="font-semibold text-emerald-500">
                      +{Number(order.cashback_estimated || 0).toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-gray-100 dark:border-white/5 flex items-center justify-between text-[12px] text-gray-500">
                  <span>{order.tracking_number ? 'Open details or tracking' : 'Open details'}</span>
                  <ChevronRight className="w-4 h-4 text-gray-300" />
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};
