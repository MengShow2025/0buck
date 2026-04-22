import React, { useState } from 'react';
import { Ticket, Crown, ArrowRight, CalendarClock, Cpu } from 'lucide-react';
import { usePreferenceContext } from '../contexts/PreferenceContext';
import { useSessionContext } from '../contexts/SessionContext';
import { useDrawerContext } from '../contexts/DrawerContext';

export const CouponsDrawer: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'store' | 'platform'>('store');
    const { pushDrawer } = useDrawerContext();
  const { requireAuth } = useSessionContext();
  const { t } = usePreferenceContext();

  const MOCK_STORE_COUPONS = [
    {
      id: 'c1',
      value: '$10',
      type: t('coupon.type_cash'),
      title: t('coupon.title_new_user'),
      condition: t('coupon.condition_min_50'),
      validUntil: 'Oct 31, 2026',
      status: 'available',
      code: 'WELCOME10'
    },
    {
      id: 'c2',
      value: '20%',
      type: t('coupon.type_discount'),
      title: t('coupon.title_geek_week'),
      condition: t('coupon.condition_electronics'),
      validUntil: t('coupon.valid_2_days'),
      status: 'expiring_soon',
      code: 'GEEK20'
    },
    {
      id: 'c3',
      value: t('coupon.value_free'),
      type: t('coupon.type_shipping'),
      title: t('coupon.title_free_ship'),
      condition: t('coupon.condition_no_min'),
      validUntil: 'Oct 15, 2026',
      status: 'used',
      code: 'FREESHIP'
    }
  ];

  const MOCK_PLATFORM_PERKS = [
    {
      id: 'p1',
      icon: <CalendarClock className="w-8 h-8 text-indigo-400" />,
      title: t('perk.renewal_title'),
      subtitle: t('perk.renewal_subtitle'),
      desc: t('perk.renewal_desc'),
      bg: 'bg-gradient-to-br from-indigo-900 to-slate-900',
      border: 'border-indigo-500/30',
      actionText: t('perk.go_center')
    },
    {
      id: 'p2',
      icon: <Crown className="w-8 h-8 text-yellow-400" />,
      title: t('perk.kol_title'),
      subtitle: t('perk.kol_subtitle'),
      desc: t('perk.kol_desc'),
      bg: 'bg-gradient-to-br from-yellow-900 to-slate-900',
      border: 'border-yellow-500/30',
      actionText: t('perk.view_rights')
    },
    {
      id: 'p3',
      icon: <Cpu className="w-8 h-8 text-emerald-400" />,
      title: t('perk.ai_pts_title'),
      subtitle: t('perk.ai_pts_subtitle'),
      desc: t('perk.ai_pts_desc'),
      bg: 'bg-gradient-to-br from-emerald-900 to-slate-900',
      border: 'border-emerald-500/30',
      actionText: t('perk.go_top_up')
    }
  ];

  const renderStoreCoupons = () => {
    if (MOCK_STORE_COUPONS.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-20 px-6 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="w-24 h-24 bg-orange-50 dark:bg-orange-500/10 rounded-full flex items-center justify-center mb-6 shadow-inner border border-orange-100 dark:border-orange-500/20">
            <Ticket className="w-10 h-10 text-orange-400 dark:text-orange-500" />
          </div>
          <h3 className="text-[18px] font-black text-gray-900 dark:text-white mb-2 tracking-tight">{t('coupon.no_discounts')}</h3>
          <p className="text-[14px] text-gray-500 dark:text-gray-400 mb-8 font-medium leading-relaxed">
            {t('coupon.get_desc')}
          </p>
          <button 
            onClick={() => {
              requireAuth(() => {
                pushDrawer('prime');
              });
            }}
            className="text-white text-[15px] font-semibold px-8 py-3.5 rounded-xl shadow-lg transition-transform active:scale-95 w-full max-w-[240px]"
            style={{ background: 'linear-gradient(135deg, #FF7A3D 0%, #E8450A 100%)', boxShadow: '0 8px 24px rgba(232,69,10,0.3)' }}
          >
            {t('coupon.get_action')}
          </button>
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-4">
        {MOCK_STORE_COUPONS.map(coupon => (
          <div 
            key={coupon.id} 
            className={`relative rounded-2xl overflow-hidden flex shadow-sm border ${
              coupon.status === 'used' 
                ? 'bg-gray-100 dark:bg-white/5 border-gray-200 dark:border-white/10 opacity-60' 
                : 'bg-white dark:bg-[#1C1C1E] border-orange-100 dark:border-orange-500/20'
            }`}
          >
            <div className={`w-[100px] flex flex-col items-center justify-center p-4 border-r-2 border-dashed ${
              coupon.status === 'used' 
                ? 'bg-gray-200 dark:bg-white/10 border-gray-300 dark:border-white/20' 
                : 'bg-orange-50 dark:bg-orange-500/10 border-orange-200 dark:border-orange-500/30'
            } relative`}>
              <div className="absolute -top-3 -right-3 w-6 h-6 rounded-full bg-[#F2F2F7] dark:bg-black"></div>
              <div className="absolute -bottom-3 -right-3 w-6 h-6 rounded-full bg-[#F2F2F7] dark:bg-black"></div>
              
              <span className={`text-[28px] font-black leading-none ${coupon.status === 'used' ? 'text-gray-400 dark:text-gray-500' : 'text-orange-600 dark:text-orange-500'}`}>{coupon.value}</span>
              <span className={`text-[10px] font-bold uppercase tracking-wider mt-1 ${coupon.status === 'used' ? 'text-gray-400 dark:text-gray-500' : 'text-orange-500/80 dark:text-orange-400/80'}`}>{coupon.type}</span>
            </div>

            <div className="flex-1 p-4 flex flex-col justify-between relative">
              <div>
                <div className="flex justify-between items-start mb-1">
                  <h3 className={`text-[15px] font-black tracking-tight ${coupon.status === 'used' ? 'text-gray-500 dark:text-gray-400' : 'text-gray-900 dark:text-white'}`}>{coupon.title}</h3>
                  {coupon.status === 'expiring_soon' && (
                    <span className="text-[9px] font-bold bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 px-1.5 py-0.5 rounded uppercase tracking-wider">{t('coupon.expiring_badge')}</span>
                  )}
                </div>
                <p className="text-[12px] font-medium text-gray-500 dark:text-gray-400 mb-3">{coupon.condition}</p>
              </div>
              
              <div className="flex items-center justify-between mt-auto">
                <span className={`text-[11px] font-medium ${coupon.status === 'expiring_soon' ? 'text-red-500 dark:text-red-400' : 'text-gray-400 dark:text-gray-500'}`}>
                  {coupon.validUntil}
                </span>
                {coupon.status !== 'used' && (
                  <button
                    onClick={() => {
                      requireAuth(() => {
                        pushDrawer('prime'); // Jump to Prime Mall
                      });
                    }}
                    className="text-white text-[12px] font-semibold px-4 py-1.5 rounded-xl active:scale-95 transition-all shadow-sm"
                    style={{ background: 'linear-gradient(135deg, #FF7A3D 0%, #E8450A 100%)' }}
                  >
                    {t('voucher.use_action')}
                  </button>
                )}
                {coupon.status === 'used' && (
                  <span className="text-[12px] font-bold text-gray-400 dark:text-gray-500">{t('coupon.expired_label')}</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderPlatformPerks = () => {
    if (MOCK_PLATFORM_PERKS.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-20 px-6 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="w-24 h-24 bg-indigo-50 dark:bg-indigo-500/10 rounded-full flex items-center justify-center mb-6 shadow-inner border border-indigo-100 dark:border-indigo-500/20">
            <Crown className="w-10 h-10 text-indigo-400 dark:text-indigo-500" />
          </div>
          <h3 className="text-[18px] font-black text-gray-900 dark:text-white mb-2 tracking-tight">{t('coupon.no_perks')}</h3>
          <p className="text-[14px] text-gray-500 dark:text-gray-400 mb-8 font-medium leading-relaxed">
            {t('coupon.perks_desc')}
          </p>
          <button 
            onClick={() => {
              requireAuth(() => {
                pushDrawer('wallet');
              });
            }}
            className="bg-indigo-500 hover:bg-indigo-600 text-white text-[15px] font-semibold px-8 py-3.5 rounded-xl shadow-lg shadow-indigo-500/30 transition-transform active:scale-95 w-full max-w-[240px]"
          >
            {t('voucher.go_exchange')}
          </button>
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-4">
        {MOCK_PLATFORM_PERKS.map(perk => (
          <div 
            key={perk.id} 
            className={`relative rounded-2xl overflow-hidden shadow-lg border ${perk.border} ${perk.bg} text-white p-5 group cursor-pointer hover:scale-[1.01] transition-transform duration-300`}
          >
            <div className="absolute -inset-full bg-gradient-to-tr from-white/0 via-white/5 to-white/0 rotate-45 transform -translate-x-full group-hover:translate-x-full transition-transform duration-1000 pointer-events-none"></div>
            
            <div className="flex items-start gap-4 relative z-10">
              <div className="w-14 h-14 rounded-xl bg-white/10 backdrop-blur-sm border border-white/10 flex items-center justify-center shrink-0 shadow-inner">
                {perk.icon}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-[16px] font-black tracking-tight leading-tight mb-0.5">{perk.title}</h3>
                <p className="text-[11px] font-bold text-white/60 uppercase tracking-widest mb-2">{perk.subtitle}</p>
                <p className="text-[13px] font-medium text-white/80 leading-snug mb-4">{perk.desc}</p>
                
                <div className="flex items-center gap-1.5 text-[12px] font-bold text-white/90 group-hover:text-white transition-colors">
                  {perk.actionText}
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-[#F2F2F7] dark:bg-black overflow-hidden">
      <div className="flex px-4 py-3 bg-white dark:bg-[#1C1C1E] border-b border-gray-100 dark:border-white/5 sticky top-0 z-10">
        <button 
          onClick={() => setActiveTab('store')}
          className={`flex-1 flex justify-center items-center gap-2 py-2 text-[14px] font-bold rounded-xl transition-colors ${
            activeTab === 'store' ? 'bg-orange-50 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-white/5'
          }`}
        >
          <Ticket className="w-4 h-4" />
          {t('coupon.store_tab')}
        </button>
        <button 
          onClick={() => setActiveTab('platform')}
          className={`flex-1 flex justify-center items-center gap-2 py-2 text-[14px] font-bold rounded-xl transition-colors ${
            activeTab === 'platform' ? 'bg-indigo-50 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-white/5'
          }`}
        >
          <Crown className="w-4 h-4" />
          {t('coupon.platform_tab')}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 pb-24">
        {activeTab === 'store' ? renderStoreCoupons() : renderPlatformPerks()}
      </div>
    </div>
  );
};
