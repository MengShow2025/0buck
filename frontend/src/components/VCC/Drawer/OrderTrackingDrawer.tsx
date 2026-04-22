import React from 'react';
import { MapPin, Truck, ChevronRight, Phone, Copy, Package } from 'lucide-react';
import { usePreferenceContext } from '../contexts/PreferenceContext';
import { useDrawerContext } from '../contexts/DrawerContext';
import { useCommerceContext } from '../contexts/CommerceContext';
import { findOrderSummary, normalizeOrderStatus } from '../utils/orderSummary';

export const OrderTrackingDrawer: React.FC = () => {
  const { selectedProductId } = useDrawerContext();
  const { t } = usePreferenceContext();
  const { orders } = useCommerceContext();
  const order = findOrderSummary(orders, selectedProductId);

  if (!order || !order.tracking_number) {
    return (
      <div className="flex flex-col h-full items-center justify-center bg-[#F2F2F7] dark:bg-[#000000] px-6 text-center">
        <Package className="w-12 h-12 text-gray-300 mb-3" />
        <h3 className="text-[18px] font-black text-gray-900 dark:text-white">No tracking information</h3>
        <p className="text-[13px] text-gray-500 mt-2">This order does not have a confirmed tracking number from the backend yet.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#F2F2F7] dark:bg-[#000000] pb-24 overflow-y-auto no-scrollbar relative">
      <div className="bg-white dark:bg-[#1C1C1E] px-5 py-6 flex items-start gap-4 shadow-sm border-b border-gray-100 dark:border-white/5 relative z-10">
        <div className="w-16 h-16 rounded-xl overflow-hidden bg-gray-50 dark:bg-black/20 shrink-0 shadow-sm flex items-center justify-center">
          <Truck className="w-8 h-8 text-blue-500" />
        </div>
        <div className="flex-1 space-y-1">
          <div className="flex justify-between items-start">
            <div className="flex flex-col">
              <span className="text-[16px] font-black text-gray-900 dark:text-white leading-tight">
                {normalizeOrderStatus(String(order.status || '')).toUpperCase()}
              </span>
              <span className="text-[13px] text-gray-500 font-bold">{String(order.fulfillment_status || 'Tracking synced')}</span>
            </div>
            <button className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 dark:bg-white/5 rounded-full border border-gray-100 dark:border-white/10 shadow-sm active:scale-95 transition-all">
              <Phone className="w-3.5 h-3.5 text-blue-500" />
              <span className="text-[11px] text-gray-600 dark:text-gray-300 font-bold">{t('tracking.contact_merchant')}</span>
            </button>
          </div>
          <p className="text-[11px] text-gray-400 line-clamp-1 leading-relaxed">Order {String(order.order_id || '--')} tracking is available from the backend summary.</p>
        </div>
      </div>

      <div className="bg-white dark:bg-[#1C1C1E] px-5 py-4 flex items-center justify-between border-b border-gray-100 dark:border-white/5">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-purple-600 rounded-full flex items-center justify-center text-white text-[10px] font-black">
            YT
          </div>
          <span className="text-[13px] font-black text-gray-800 dark:text-gray-200">{t('notification.yunexpress')}</span>
          <span className="text-[13px] font-medium text-gray-500">{String(order.tracking_number)}</span>
          <button className="text-[11px] text-gray-400 hover:text-blue-500 font-bold ml-1 flex items-center gap-0.5">
            <Copy className="w-3 h-3" /> {t('common.copy')}
          </button>
        </div>
        <div className="text-[11px] text-gray-400 font-bold">{t('tracking.contact_phone')} --</div>
      </div>

      <div className="bg-white dark:bg-[#1C1C1E] px-5 py-6">
        <div className="space-y-4">
          <div className="rounded-2xl border border-gray-100 dark:border-white/10 p-4">
            <div className="text-[12px] font-black text-gray-400 uppercase tracking-widest mb-2">Order</div>
            <div className="text-[14px] font-semibold text-gray-900 dark:text-white">{String(order.order_id || '--')}</div>
          </div>
          <div className="rounded-2xl border border-gray-100 dark:border-white/10 p-4">
            <div className="text-[12px] font-black text-gray-400 uppercase tracking-widest mb-2">Latest Status</div>
            <div className="text-[14px] font-semibold text-gray-900 dark:text-white">{String(order.fulfillment_status || normalizeOrderStatus(String(order.status || '')))}</div>
          </div>
          <div className="rounded-2xl border border-dashed border-gray-200 dark:border-white/10 p-4 text-[12px] text-gray-500 leading-relaxed">
            Detailed carrier timeline has no verified backend payload yet, so this screen only shows confirmed tracking summary.
          </div>
        </div>
      </div>
    </div>
  );
};
