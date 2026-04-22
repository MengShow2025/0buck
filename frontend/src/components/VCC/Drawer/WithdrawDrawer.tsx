import React, { useState } from 'react';
import { ArrowDownToLine, Banknote, Bitcoin, CheckCircle2, DollarSign, Info, ChevronLeft, X } from 'lucide-react';
import { useCommerceContext } from '../contexts/CommerceContext';
import { usePreferenceContext } from '../contexts/PreferenceContext';
import { useDrawerContext } from '../contexts/DrawerContext';

export const WithdrawDrawer: React.FC = () => {
    const { popDrawer, setActiveDrawer, drawerHistory } = useDrawerContext();
  const { t } = usePreferenceContext();
  const { userBalance } = useCommerceContext();
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('paypal');
  const [submitted, setSubmitted] = useState(false);

  const balance = userBalance;
  const minAmount = 50;

  const numAmount = Number(amount);
  const fee = method === 'paypal' ? (numAmount * 0.032 + 2) : 2;
  const received = Math.max(0, numAmount - fee);

  const handleSubmit = () => {
    if (!amount || isNaN(numAmount) || numAmount < minAmount || numAmount > balance) return;
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="flex flex-col h-full bg-[#F2F2F7] dark:bg-[#000000] p-6 pb-32 items-center justify-center text-center space-y-6">
        <div className="w-24 h-24 rounded-full flex items-center justify-center text-white animate-in zoom-in-50" style={{ background: 'linear-gradient(135deg, #FF7A3D 0%, #E8450A 100%)', boxShadow: '0 8px 24px rgba(232,69,10,0.35)' }}>
          <CheckCircle2 className="w-12 h-12" />
        </div>
        <div className="space-y-2">
          <h2 className="text-[24px] font-black text-gray-900 dark:text-white">{t('withdraw.submitted')}</h2>
          <p className="text-[14px] text-gray-500 font-medium">
            {t('withdraw.success_desc').replace('${amount}', `$${numAmount.toFixed(2)}`).replace('{method}', method === 'paypal' ? 'PayPal' : t('withdraw.crypto'))}
            <br/><br/>
            <span className="text-[12px] font-bold text-[var(--wa-teal)] bg-[var(--wa-teal)]/10 px-3 py-1.5 rounded-full">
              {t('withdraw.estimated_arrival')}: ${received.toFixed(2)}
            </span>
          </p>
        </div>
        <button 
          onClick={() => popDrawer()}
          className="w-full bg-gray-900 dark:bg-white text-white dark:text-black py-4 rounded-[24px] font-semibold text-[16px] shadow-lg active:scale-95 transition-all mt-8"
        >
          {t('withdraw.back_to_wallet')}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#F2F2F7] dark:bg-[#000000] pb-32 overflow-y-auto no-scrollbar">
      
      {/* Header Banner with Navigation */}
      <div className="text-white relative rounded-b-[40px] shadow-lg shrink-0" style={{ background: 'linear-gradient(160deg, #FF7A3D 0%, #E8450A 100%)' }}>
        {/* Navigation Bar */}
        <div className="px-6 py-4 flex items-center justify-between relative z-[99999]">
          <div className="w-10">
            <button
              onClick={() => popDrawer()}
              className="w-10 h-10 flex items-center justify-center bg-black/20 rounded-full text-white hover:bg-black/30 active:scale-90 transition-all duration-200 cursor-pointer"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
          </div>
          <div className="flex flex-col items-center pointer-events-none">
            <h2 className="text-[18px] font-black text-white tracking-tight">{t('withdraw.title')}</h2>
          </div>
          <div className="w-10 flex justify-end">
            <button
              onClick={() => setActiveDrawer('none')}
              className="w-10 h-10 flex items-center justify-center bg-black/20 rounded-full text-white hover:bg-black/30 active:scale-90 transition-all duration-200 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="absolute -right-10 -bottom-10 opacity-20 pointer-events-none z-0 overflow-hidden rounded-b-[40px] w-full h-full">
          <div className="absolute -right-10 -bottom-10">
            <ArrowDownToLine className="w-48 h-48" />
          </div>
        </div>
        
        <div className="px-6 pt-4 pb-10">
          <h2 className="text-[12px] font-black text-white/70 uppercase tracking-widest mb-2 relative z-10">{t('withdraw.withdrawable_balance')}</h2>
          <div className="flex items-baseline gap-2 relative z-10">
            <span className="text-[48px] font-black tracking-tighter leading-none">{balance.toFixed(2)}</span>
            <span className="text-[14px] font-bold uppercase tracking-widest">{t('common.currency_usd')}</span>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Amount Input */}
        <div className="space-y-3">
          <div className="flex items-center justify-between ml-1">
            <label className="text-[12px] font-black text-gray-400 uppercase tracking-widest">{t('withdraw.amount')}</label>
            {numAmount >= minAmount && numAmount <= balance && (
              <span className="text-[10px] font-bold text-[var(--wa-teal)] bg-[var(--wa-teal)]/10 px-2 py-0.5 rounded-md flex items-center gap-1">
                {t('withdraw.estimated_arrival')}: ${received.toFixed(2)} 
                <span className="opacity-70">({t('withdraw.fee_note')} ${fee.toFixed(2)})</span>
              </span>
            )}
          </div>
          <div className="relative">
            <input 
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full h-16 bg-white dark:bg-[#1C1C1E] border border-gray-100 dark:border-white/5 rounded-[24px] px-12 text-[24px] font-black text-gray-900 dark:text-white focus:ring-2 focus:ring-[var(--wa-teal)] transition-all outline-none shadow-sm"
            />
            <DollarSign className="w-6 h-6 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <button 
              onClick={() => setAmount(balance.toString())}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-[12px] font-black text-[var(--wa-teal)] uppercase tracking-widest active:scale-95"
            >
              {t('withdraw.all')}
            </button>
          </div>
        </div>

        {/* Withdrawal Method */}
        <div className="space-y-3">
          <label className="text-[12px] font-black text-gray-400 uppercase tracking-widest ml-1">{t('withdraw.method')}</label>
          <div className="grid grid-cols-2 gap-3">
            <button 
              onClick={() => setMethod('paypal')}
              className={`p-4 rounded-[24px] border ${method === 'paypal' ? 'bg-[var(--wa-teal)]/10 border-[var(--wa-teal)] text-[var(--wa-teal)]' : 'bg-white dark:bg-[#1C1C1E] border-gray-100 dark:border-white/5 text-gray-500'} flex flex-col items-center justify-center gap-1.5 transition-all text-center`}
            >
              <Banknote className="w-6 h-6 mb-1" />
              <span className="text-[13px] font-black leading-none">{t('withdraw.paypal')}</span>
              <span className={`text-[10px] font-bold mt-1 ${method === 'paypal' ? 'text-[var(--wa-teal)]/70' : 'text-gray-400'}`}>{t('withdraw.fee_rate')}: 3.2% + $2</span>
            </button>
            <button 
              onClick={() => setMethod('crypto')}
              className={`p-4 rounded-[24px] border ${method === 'crypto' ? 'bg-[var(--wa-teal)]/10 border-[var(--wa-teal)] text-[var(--wa-teal)]' : 'bg-white dark:bg-[#1C1C1E] border-gray-100 dark:border-white/5 text-gray-500'} flex flex-col items-center justify-center gap-1.5 transition-all text-center`}
            >
              <Bitcoin className="w-6 h-6 mb-1" />
              <span className="text-[13px] font-black leading-none">{t('withdraw.crypto')}</span>
              <span className={`text-[10px] font-bold mt-1 ${method === 'crypto' ? 'text-[var(--wa-teal)]/70' : 'text-gray-400'}`}>{t('withdraw.fee')}: $2</span>
            </button>
          </div>
        </div>

        {/* Rules Note */}
        <div className="bg-gray-50 dark:bg-white/5 p-4 rounded-[20px] flex items-start gap-3">
          <Info className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
          <div className="text-[11px] text-gray-500 font-medium space-y-1.5 leading-relaxed">
            <p>• {t('withdraw.min_amount_note')}</p>
            <p>• {t('withdraw.eta_note')}</p>
            <p>• {t('withdraw.fee_deduction_note')}</p>
          </div>
        </div>

        <button 
          onClick={handleSubmit}
          disabled={!amount || numAmount < minAmount || numAmount > balance}
          className={`w-full py-5 rounded-[24px] font-semibold text-[16px] transition-all shadow-lg flex items-center justify-center gap-2 mt-4 ${
            numAmount >= minAmount && numAmount <= balance
              ? 'text-white active:scale-95'
              : 'bg-gray-100 dark:bg-white/5 text-gray-400 cursor-not-allowed'
          }`}
          style={numAmount >= minAmount && numAmount <= balance ? { background: 'linear-gradient(135deg, #FF7A3D 0%, #E8450A 100%)', boxShadow: '0 4px 14px rgba(232,69,10,0.30)' } : {}}
        >
          {numAmount > 0 && numAmount < minAmount 
            ? t('withdraw.min_amount_error') 
            : numAmount > balance 
              ? t('withdraw.insufficient_balance') 
              : t('withdraw.submit')}
        </button>

      </div>
    </div>
  );
};