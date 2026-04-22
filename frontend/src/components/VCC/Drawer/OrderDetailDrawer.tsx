import React from 'react';
import { CreditCard, ChevronRight, Copy, Truck, ShieldCheck, HelpCircle, Package } from 'lucide-react';
import { usePreferenceContext } from '../contexts/PreferenceContext';
import { useAIContext } from '../contexts/AIContext';
import { useDrawerContext } from '../contexts/DrawerContext';
import { useCommerceContext } from '../contexts/CommerceContext';
import { findOrderSummary, normalizeOrderStatus } from '../utils/orderSummary';

export const OrderDetailDrawer: React.FC = () => {
  const { pushDrawer, selectedProductId, setActiveChat, setActiveDrawer } = useDrawerContext();
  const { setAiInput } = useAIContext();
  const { t } = usePreferenceContext();
  const { orders } = useCommerceContext();
  const order = findOrderSummary(orders, selectedProductId);
  const orderStatus = normalizeOrderStatus(String(order?.status || ''));
  const canTrack = Boolean(order?.tracking_number);

  const handleAfterSales = () => {
    if (!order?.order_id) return;
    // 1. Set the AI input context with the order ID
    setAiInput(`Hi AI Butler, I need help with order #${order.order_id}.`);
    
    // 2. Set the active chat to the AI Butler
    setActiveChat({
      id: 'ai_butler',
      name: 'AI Butler',
      type: 'private',
      avatar: 'https://ui-avatars.com/api/?name=AI+Butler&background=FF5722&color=fff'
    });

    // 3. Switch to the chat room drawer
    setActiveDrawer('chat_room');
  };

  if (!order) {
    return (
      <div className="flex flex-col h-full items-center justify-center bg-[#F2F2F7] dark:bg-[#000000] px-6 text-center">
        <Package className="w-12 h-12 text-gray-300 mb-3" />
        <h3 className="text-[18px] font-black text-gray-900 dark:text-white">Order details unavailable</h3>
        <p className="text-[13px] text-gray-500 mt-2">Select a real order first. We only show confirmed backend fields here.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#F2F2F7] dark:bg-[#000000] p-5 space-y-4 pb-24 overflow-y-auto no-scrollbar">
      <div className="bg-white dark:bg-[#1C1C1E] rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-white/5 flex flex-col items-center text-center space-y-2">
        <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mb-2">
          <Truck className="w-8 h-8 text-blue-500" />
        </div>
        <h3 className="text-[20px] font-black text-gray-900 dark:text-white uppercase tracking-tight">{orderStatus}</h3>
        <p className="text-[12px] text-gray-500 font-medium">
          {order.created_at ? new Date(String(order.created_at)).toLocaleString() : '--'}
        </p>
      </div>

      <button
        onClick={() => canTrack && pushDrawer('order_tracking')}
        disabled={!canTrack}
        className="bg-white dark:bg-[#1C1C1E] rounded-3xl p-5 shadow-sm border border-gray-100 dark:border-white/5 flex items-center justify-between active:scale-[0.98] transition-all group disabled:opacity-60"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gray-100 dark:bg-white/5 rounded-2xl flex items-center justify-center text-gray-500">
            <MapPin className="w-5 h-5 group-hover:text-blue-500 transition-colors" />
          </div>
          <div>
            <div className="text-[13px] font-black text-gray-900 dark:text-white uppercase tracking-tight">{t('order.track_on_map')}</div>
            <div className="text-[11px] text-blue-500 font-bold">{order.tracking_number || 'Tracking unavailable'}</div>
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-gray-300" />
      </button>

      <div className="bg-white dark:bg-[#1C1C1E] rounded-3xl p-5 shadow-sm border border-gray-100 dark:border-white/5 space-y-3">
        <div className="flex items-center gap-2 text-[12px] font-black text-gray-400 uppercase tracking-widest">
          <CreditCard className="w-3.5 h-3.5" /> {t('order.payment_summary')}
        </div>
        <div className="space-y-2">
          <div className="flex justify-between text-[13px] font-medium text-gray-500">
            <span>{t('order.order_number')}</span>
            <span className="text-gray-900 dark:text-white font-black">{order.order_id}</span>
          </div>
          <div className="flex justify-between text-[13px] font-medium text-gray-500">
            <span>Status</span>
            <span className="text-gray-900 dark:text-white font-black uppercase">{orderStatus}</span>
          </div>
          <div className="flex justify-between text-[13px] font-medium text-gray-500">
            <span>Fulfillment</span>
            <span className="text-gray-900 dark:text-white font-black">{String(order.fulfillment_status || '--')}</span>
          </div>
          <div className="h-px bg-gray-50 dark:bg-white/5 w-full my-1" />
          <div className="flex justify-between text-[16px] font-black">
            <span className="text-gray-900 dark:text-white">{t('order.total_amount')}</span>
            <span className="text-[var(--wa-teal)] tracking-tighter">
              {String(order.currency || 'USD')} {Number(order.total_price || 0).toFixed(2)}
            </span>
          </div>
        </div>
        <div className="pt-2 flex items-center justify-between text-[11px] text-gray-400 font-bold uppercase tracking-tight">
          <span>Estimated Cashback</span>
          <span className="text-emerald-500">+{Number(order.cashback_estimated || 0).toFixed(2)}</span>
        </div>
      </div>

      <div className="bg-white dark:bg-[#1C1C1E] rounded-3xl p-5 shadow-sm border border-gray-100 dark:border-white/5 space-y-3">
        <div className="flex justify-between items-center text-[12px]">
          <span className="text-gray-400 font-black uppercase tracking-widest">{t('order.order_number')}</span>
          <div className="flex items-center gap-2 text-gray-900 dark:text-white font-black">
            {order.order_id} <Copy className="w-3.5 h-3.5 cursor-pointer active:scale-90" />
          </div>
        </div>
        <div className="flex justify-between items-center text-[12px]">
          <span className="text-gray-400 font-black uppercase tracking-widest">{t('order.order_time')}</span>
          <span className="text-gray-900 dark:text-white font-bold">
            {order.created_at ? new Date(String(order.created_at)).toLocaleString() : '--'}
          </span>
        </div>
      </div>

      <div className="pt-4 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <button 
            onClick={handleAfterSales}
            className="bg-white dark:bg-white/5 text-gray-600 dark:text-white text-[13px] font-semibold py-4 rounded-3xl border border-gray-100 dark:border-white/10 shadow-sm active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <HelpCircle className="w-4 h-4" /> {t('order.after_sales')}
          </button>
          <button
            onClick={() => canTrack && pushDrawer('order_tracking')}
            disabled={!canTrack}
            className="text-white text-[13px] font-semibold py-4 rounded-[22px] active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #FF7A3D 0%, #E8450A 100%)', boxShadow: '0 4px 14px rgba(232,69,10,0.30)' }}>
            <ShieldCheck className="w-4 h-4" /> {canTrack ? 'View Tracking' : 'No Tracking'}
          </button>
        </div>
      </div>
    </div>
  );
};
