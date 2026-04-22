import React, { useState } from 'react';
import { Ticket, Search, Filter, AlertCircle, ArrowRight } from 'lucide-react';
import { usePreferenceContext } from '../contexts/PreferenceContext';
import { useDrawerContext } from '../contexts/DrawerContext';

export const VouchersDrawer: React.FC = () => {
    const { pushDrawer } = useDrawerContext();
  const { t } = usePreferenceContext();
  const [activeTab, setActiveTab] = useState<'valid' | 'used' | 'expired'>('valid');

  const mockVouchers = [
    { id: 1, type: 'resurgence', name: t('voucher.resurgence_name'), desc: t('voucher.resurgence_desc'), validity: '2024-12-31', status: 'valid', color: 'orange' },
    { id: 2, type: 'shipping', name: t('voucher.shipping_name'), desc: t('voucher.shipping_desc'), validity: '2024-06-30', status: 'valid', color: 'blue' },
    { id: 3, type: 'discount', name: t('voucher.discount_name'), desc: t('voucher.discount_desc'), validity: '2023-11-01', status: 'expired', color: 'emerald' },
  ];

  const filteredVouchers = mockVouchers.filter(v => v.status === activeTab);

  return (
    <div className="flex flex-col h-full bg-[#F2F2F7] dark:bg-[#000000] pb-32 overflow-y-auto no-scrollbar">
      {/* Search & Tabs Header */}
      <div className="bg-white dark:bg-[#1C1C1E] px-4 pt-4 pb-0 shadow-sm sticky top-0 z-20">
        <div className="relative mb-4">
          <input 
            type="text" 
            placeholder={t('voucher.search_placeholder')} 
            className="w-full bg-gray-100 dark:bg-white/5 rounded-[20px] py-3 pl-10 pr-4 text-[13px] font-medium outline-none focus:ring-2 focus:ring-[var(--wa-teal)] transition-all"
          />
          <Search className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
        </div>

        <div className="flex gap-6 border-b border-gray-100 dark:border-white/5">
          {[
            { id: 'valid', label: t('voucher.unused') },
            { id: 'used', label: t('voucher.used') },
            { id: 'expired', label: t('voucher.expired') }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`pb-3 text-[14px] font-black transition-all relative ${activeTab === tab.id ? 'text-[var(--wa-teal)]' : 'text-gray-400 hover:text-gray-600'}`}
            >
              {tab.label}
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-[var(--wa-teal)] rounded-t-full" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Vouchers List */}
      <div className="p-4 space-y-4 mt-2">
        {filteredVouchers.length > 0 ? (
          filteredVouchers.map(v => (
            <div key={v.id} className={`bg-white dark:bg-[#1C1C1E] rounded-[24px] shadow-sm border border-gray-100 dark:border-white/5 overflow-hidden flex relative ${v.status !== 'valid' ? 'opacity-60 grayscale' : ''}`}>
              <div className={`w-24 shrink-0 flex flex-col items-center justify-center border-r border-dashed border-gray-200 dark:border-gray-700 bg-${v.color}-50 dark:bg-${v.color}-900/10`}>
                <Ticket className={`w-8 h-8 text-${v.color}-500 mb-1`} />
                <span className={`text-[10px] font-black uppercase tracking-widest text-${v.color}-600`}>1x</span>
              </div>
              <div className="flex-1 p-4 relative">
                <div className="text-[15px] font-black text-gray-900 dark:text-white mb-1">{v.name}</div>
                <div className="text-[11px] text-gray-500 font-bold mb-3">{v.desc}</div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-gray-400 uppercase tracking-widest font-mono">
                    {t('voucher.valid_till')} {v.validity}
                  </span>
                  {v.status === 'valid' && (
                    <button className={`bg-${v.color}-500 text-white px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest active:scale-95 transition-transform`}>
                      {t('voucher.use_action')}
                    </button>
                  )}
                </div>
              </div>
              
              {/* Ticket cutouts */}
              <div className="absolute top-1/2 -left-2 -translate-y-1/2 w-4 h-4 rounded-full bg-[#F2F2F7] dark:bg-[#000000]" />
              <div className="absolute top-1/2 left-[5.5rem] -translate-y-1/2 w-4 h-4 rounded-full bg-[#F2F2F7] dark:bg-[#000000]" />
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 bg-gray-100 dark:bg-white/5 rounded-full flex items-center justify-center mb-4">
              <Ticket className="w-8 h-8 text-gray-300" />
            </div>
            <p className="text-[14px] font-black text-gray-500 mb-1">
              {t('voucher.empty_prefix')}{activeTab === 'valid' ? t('voucher.unused') : activeTab === 'used' ? t('voucher.used') : t('voucher.expired')}{t('voucher.empty_suffix')}
            </p>
            {activeTab === 'valid' && (
              <button 
                onClick={() => pushDrawer('points_exchange')}
                className="text-[12px] font-bold text-[var(--wa-teal)] flex items-center gap-1 mt-2"
              >
                {t('voucher.go_exchange')} <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};