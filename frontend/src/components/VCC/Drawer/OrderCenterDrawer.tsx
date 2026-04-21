import React, { useState } from 'react';
import { Package, Truck, Clock, ChevronRight, Gift, Copy, ShieldCheck } from 'lucide-react';
import { useAppContext } from '../AppContext';
import { imApi } from '../../../services/api';

const DUMMY_ORDERS = [
  {
    id: 'ORD-20260409-1A',
    status: 'in_transit',
    date: '2026-04-09',
    items: [
      {
        id: 'item-1',
        title: 'ordercenter.artisan_crafted_wireless_earbu',
        image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&q=80&w=400',
        price: '29.99',
        quantity: 2, // User bought 2 items (matching user's example)
        rebate: { 
          active: true,
          currentPhase: 1, 
          totalPhases: 20, 
          totalEarned: '0.00',
          settlementDate: '2026-05-09'
        },
        groupBuy: {
          active: true,
          status: 'active',
          joined: 4, // Invited 4 people (matching user's example)
          neededPerFree: 3,
          freeEarned: 1, // 1st free item earned
          nextFreeAt: 6, // 2nd free item needs 6 total invites
          settledCount: 0, // Still waiting for 3 friends to complete return period
          pendingCount: 1
        }
      },
      {
        id: 'item-2',
        title: 'ordercenter.minimalist_titanium_watch',
        image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&q=80&w=400',
        price: '149.00',
        quantity: 1,
        rebate: { 
          active: true,
          currentPhase: 1, 
          totalPhases: 20, 
          totalEarned: '7.45',
          settlementDate: '2026-04-01' // Settlement started, Group Buy forfeited
        },
        groupBuy: {
          active: false,
          status: 'forfeited', // FORFEITED due to rebate starting
          reason: 'order.group_buy_forfeited_reason',
          joined: 1,
          neededPerFree: 3,
          freeEarned: 0,
          nextFreeAt: 3,
          settledCount: 0,
          pendingCount: 0
        }
      }
    ],
    tracking: {
      number: 'YT123456789',
      status: 'ordercenter.out_for_delivery'
    }
  },
  {
    id: 'ORD-20260310-4F',
    status: 'delivered',
    date: '2026-03-10',
    items: [
      {
        id: 'item-3',
        title: 'ordercenter.premium_leather_messenger_bag',
        image: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&q=80&w=400',
        price: '89.00',
        quantity: 1,
        rebate: { 
          active: false, // FORFEITED due to successful Group Buy
          currentPhase: 0, 
          totalPhases: 20, 
          totalEarned: '0.00',
          reason: 'order.rebate_forfeited_reason'
        },
        groupBuy: {
          active: true,
          status: 'completed',
          joined: 3,
          neededPerFree: 3,
          freeEarned: 1,
          nextFreeAt: 6,
          settledCount: 1,
          pendingCount: 0
        }
      }
    ],
    tracking: {
      number: 'YT445566778',
      status: 'ordercenter.delivered'
    }
  }
];

export const OrderCenterDrawer: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'all' | 'rebate' | 'group'>('all');
  const { pushDrawer, t } = useAppContext();

  const handleCopyGroupBuyLink = async () => {
    try {
      const resp = await imApi.generatePromoCard({
        card_type: 'invite',
        target_type: 'none',
        share_category: 'group_buy',
        entry_type: 'order_group_buy_share',
      });
      const link = resp.data?.universal_link || resp.data?.link || resp.data?.short_link;
      if (link) {
        await navigator.clipboard.writeText(String(link));
        alert('拼团分享链接已复制');
      } else {
        alert('暂未生成拼团分享链接');
      }
    } catch (_e) {
      alert('拼团链接生成失败，请稍后重试');
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#F2F2F7] dark:bg-black">
      {/* Tabs */}
      <div className="flex border-b border-gray-100 dark:border-white/5 bg-white dark:bg-[#1C1C1E] sticky top-0 z-10">
        {[
          { id: 'all', label: t('order.tab_all') },
          { id: 'rebate', label: t('order.tab_rebates') },
          { id: 'group', label: t('order.tab_group_buys') }
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
        {DUMMY_ORDERS.map(order => (
          <div key={order.id} className="bg-white dark:bg-[#1C1C1E] rounded-[22px] p-4 shadow-sm border border-gray-100 dark:border-white/5">
            {/* Header */}
            <div className="flex justify-between items-center mb-3 pb-3 border-b border-gray-100 dark:border-white/5">
              <div 
                onClick={() => pushDrawer('order_detail')}
                className="flex flex-col cursor-pointer active:scale-95 transition-all group relative"
              >
                <span className="text-[12px] font-black text-gray-900 dark:text-white uppercase tracking-tight group-hover:text-[var(--wa-teal)] transition-colors border-b border-transparent group-hover:border-[var(--wa-teal)]">
                  {t('order.id_prefix')}{order.id}
                </span>
                <span className="text-[10px] font-medium text-gray-400">{order.date}</span>
                
                {/* Tooltip on Hover */}
                <div className="absolute -top-8 left-0 bg-black/80 backdrop-blur-md text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-20">
                  {t('order.track_tooltip')}
                </div>
              </div>
              <span className={`text-[12px] font-bold px-2 py-1 rounded-md ${
                order.status === 'in_transit' 
                  ? 'bg-blue-50 text-blue-600 dark:bg-blue-500/10' 
                  : 'bg-green-50 text-green-600 dark:bg-green-500/10'
              }`}>
                {order.status === 'in_transit' ? t('tracking.in_transit') : t('tracking.delivered')}
              </span>
            </div>

            {/* Dynamic Status Action Bar (Taobao Style) */}
            <div 
              onClick={() => order.status === 'in_transit' ? pushDrawer('order_tracking') : pushDrawer('order_detail')}
              className={`flex items-center justify-between p-3 rounded-xl mb-4 border cursor-pointer active:scale-[0.98] transition-all group ${
                order.status === 'in_transit' 
                  ? 'bg-blue-50 dark:bg-blue-500/5 border-blue-100 dark:border-blue-500/20' 
                  : 'bg-orange-50 dark:bg-orange-500/5 border-orange-100 dark:border-orange-500/20'
              }`}
            >
              <div className="flex items-center gap-2 text-[13px]">
                {order.status === 'in_transit' ? (
                  <>
                    <Truck className="w-4 h-4 text-blue-500 animate-bounce" />
                    <span className="font-black text-blue-600 dark:text-blue-400 uppercase tracking-tight">{t('tracking.in_transit')}: {t(order.tracking.status)}</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4 text-orange-500 animate-pulse" />
                    <span className="font-black text-orange-600 dark:text-orange-400 uppercase tracking-tight">{t('tracking.delivered')}: {t('order.confirm_receipt')}</span>
                  </>
                )}
              </div>
              <div className="flex items-center gap-1 text-[12px] text-gray-400 font-bold">
                {order.status === 'in_transit' ? order.tracking.number : t('order.confirm_rebate_note')}
                <ChevronRight className={`w-4 h-4 transition-transform group-hover:translate-x-1 ${
                  order.status === 'in_transit' ? 'text-blue-300' : 'text-orange-300'
                }`} />
              </div>
            </div>

            {/* Product Items List (Share-to-Free per Product) */}
            <div className="space-y-6">
              {order.items.map((item, itemIdx) => (
                <div key={item.id} className="space-y-4">
                  {/* Product Info */}
                  <div className="flex gap-3">
                    <img src={item.image} alt="Product" className="w-16 h-16 rounded-[14px] object-cover border border-gray-100 dark:border-white/5 shadow-sm" />
                    <div className="flex-1">
                      <h3 className="text-[14px] font-black text-gray-900 dark:text-white line-clamp-2 leading-tight mb-1 tracking-tight">
                        {t(item.title)}
                      </h3>
                      <div className="flex items-center justify-between">
                        <div className="text-[15px] font-black text-[var(--wa-teal)] tracking-tighter">${item.price}</div>
                        <div className="text-[11px] text-gray-400 font-bold uppercase">{t('order.qty_prefix')}{item.quantity}</div>
                      </div>
                    </div>
                  </div>

                  {/* Rebate Radar Mini */}
                  <div className={`p-3 rounded-xl border ${
                    item.rebate.active 
                    ? 'bg-gray-50/50 dark:bg-white/5 border-gray-100 dark:border-white/5' 
                    : 'bg-gray-100/50 dark:bg-black/20 border-dashed border-gray-300 dark:border-white/10 opacity-60'
                  }`}>
                    <div className="flex justify-between text-[10px] font-black text-gray-500 mb-1.5 uppercase tracking-widest">
                      <span className={`flex items-center gap-1 ${item.rebate.active ? 'text-orange-600' : 'text-gray-400'}`}>
                        <Gift className="w-3 h-3" /> {t('order.rebate_radar')}
                      </span>
                      <span>{item.rebate.active ? t('order.rebate_phase_format').replace('{current}', item.rebate.currentPhase.toString()).replace('{total}', item.rebate.totalPhases.toString()) : t('order.forfeited')}</span>
                    </div>
                    {item.rebate.active ? (
                      <>
                        <div className="w-full h-1 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[var(--wa-teal)] rounded-full transition-all duration-500"
                            style={{ width: `${(item.rebate.currentPhase / item.rebate.totalPhases) * 100}%`, boxShadow: '0 0 8px rgba(232,69,10,0.4)' }}
                          />
                        </div>
                        <div className="mt-1 flex justify-between items-center">
                          <span className="text-[9px] text-gray-400 font-bold uppercase tracking-tight">{t('order.next_settlement')}{(item.rebate as any).settlementDate}</span>
                          <span className="text-[10px] text-[var(--wa-teal)] font-black">${item.rebate.totalEarned}{t('order.earned')}</span>
                        </div>
                      </>
                    ) : (
                      <p className="text-[9px] text-gray-400 italic leading-tight">
                        {t((item.rebate as any).reason) || t('order.rebate_deactivated')}
                      </p>
                    )}
                  </div>

                  {/* Share-to-Free Section - PER PRODUCT */}
                  {item.groupBuy.active || item.groupBuy.status === 'forfeited' ? (
                    <div className={`p-4 rounded-2xl border shadow-sm space-y-3 relative overflow-hidden ${
                      item.groupBuy.status === 'forfeited'
                      ? 'bg-gray-100/30 dark:bg-black/20 border-dashed border-gray-200 dark:border-white/5 opacity-50'
                      : 'bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-500/5 dark:to-orange-500/10 border-orange-200 dark:border-orange-500/20'
                    }`}>
                      <div className="absolute -right-4 -bottom-4 opacity-5 pointer-events-none">
                        <Gift className="w-24 h-24 text-orange-500" />
                      </div>
                      
                      <div className="flex justify-between items-center relative z-10">
                        <div className="flex items-center gap-2">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white shadow-md ${
                            item.groupBuy.status === 'forfeited' ? 'bg-gray-400' : 'bg-orange-500'
                          }`}>
                            <Gift className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className={`text-[13px] font-black uppercase tracking-tight ${
                              item.groupBuy.status === 'forfeited' ? 'text-gray-500' : 'text-orange-700 dark:text-orange-400'
                            }`}>
                              {item.groupBuy.status === 'forfeited' ? t('order.share_to_free_expired') : t('order.product_share_to_free')}
                            </h4>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{t('order.invite_3_get_1_free')}</p>
                          </div>
                        </div>
                        {item.groupBuy.freeEarned > 0 && item.groupBuy.status !== 'forfeited' && (
                          <div className="bg-orange-500 text-white text-[10px] font-black px-2 py-1 rounded-full shadow-lg border border-white/20 animate-pulse">
                            {item.groupBuy.freeEarned}{t('order.free_earned')}
                          </div>
                        )}
                        {item.groupBuy.status === 'forfeited' && (
                          <div className="bg-gray-400 text-white text-[9px] font-black px-2 py-1 rounded-md uppercase">
                            {t('order.expired_status')}
                          </div>
                        )}
                      </div>

                      {item.groupBuy.status !== 'forfeited' ? (
                        <>
                          <div className="space-y-1.5 relative z-10">
                            <div className="flex justify-between items-end">
                              <span className="text-[11px] text-gray-500 dark:text-gray-400 font-black">{t('order.invites_label')}{item.groupBuy.joined} / {item.groupBuy.nextFreeAt}</span>
                              <span className="text-[11px] text-orange-600 font-black tracking-tight">{t('order.next_reward_at')}{item.groupBuy.nextFreeAt}</span>
                            </div>
                            <div className="h-2 w-full bg-white dark:bg-black/20 rounded-full overflow-hidden border border-orange-200 dark:border-orange-500/10 shadow-inner">
                              <div 
                                className="h-full bg-gradient-to-r from-orange-400 to-orange-600 rounded-full shadow-[0_0_10px_rgba(249,115,22,0.4)]" 
                                style={{ width: `${(item.groupBuy.joined / item.groupBuy.nextFreeAt) * 100}%` }}
                              />
                            </div>
                          </div>

                          <div className="flex gap-2 relative z-10">
                        <button onClick={handleCopyGroupBuyLink} className="flex-1 text-white text-[12px] font-semibold py-2.5 rounded-xl active:scale-95 transition-all flex items-center justify-center gap-2"
                          style={{ background: 'linear-gradient(135deg, #FF7A3D 0%, #E8450A 100%)', boxShadow: '0 2px 10px rgba(232,69,10,0.25)' }}>
                          <Copy className="w-4 h-4" /> {t('order.copy_item_link')}
                        </button>
                        <button 
                          onClick={() => pushDrawer('group_buy_detail')}
                          className="w-12 h-10 bg-white dark:bg-white/5 text-orange-500 rounded-xl flex items-center justify-center shadow-sm border border-orange-200 dark:border-white/10 active:scale-95 transition-all"
                        >
                          <ChevronRight className="w-5 h-5" />
                        </button>
                      </div>

                          {/* Settlement Info */}
                          <div className="pt-2 border-t border-orange-500/10 flex flex-col gap-1.5 relative z-10">
                            <div className="flex justify-between items-center text-[11px] font-bold">
                              <span className="text-gray-500">{t('order.settled')}:</span>
                              <span className="text-green-600 bg-green-500/10 px-2 py-0.5 rounded-full">{item.groupBuy.settledCount}{t('order.items_unit')}</span>
                            </div>
                            <div className="flex justify-between items-center text-[11px] font-bold">
                              <span className="text-gray-500">{t('order.pending_settlement')}:</span>
                              <span className="text-orange-600 bg-orange-500/10 px-2 py-0.5 rounded-full">{item.groupBuy.pendingCount}{t('order.items_unit')}</span>
                            </div>
                          </div>
                        </>
                      ) : (
                        <p className="text-[10px] text-gray-400 italic leading-tight relative z-10">
                            {t((item.groupBuy as any).reason)}
                          </p>
                      )}
                    </div>
                  ) : null}
                  {/* Divider for multiple items */}
                  {itemIdx < order.items.length - 1 && (
                    <div className="h-px bg-gray-100 dark:bg-white/5 w-full" />
                  )}
                </div>
              ))}
            </div>
            
            <p className="text-[9px] text-gray-400 italic leading-tight mt-4 text-center">
              {t('fan.invite_rule_note')}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};
