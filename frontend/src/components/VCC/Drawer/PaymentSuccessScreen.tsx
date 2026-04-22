import React, { useEffect, useState } from 'react';
import { CheckCircle2, Gift, Calendar, Clock, ArrowRight, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePreferenceContext } from '../contexts/PreferenceContext';

interface PaymentSuccessScreenProps {
  orderId: string;
  amount: number;
  onContinue: () => void;
}

export const PaymentSuccessScreen: React.FC<PaymentSuccessScreenProps> = ({ orderId, amount, onContinue }) => {
    const { t, currency, getExchangeRate } = usePreferenceContext();
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 400),
      setTimeout(() => setPhase(2), 1200),
      setTimeout(() => setPhase(3), 2000),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  const localRate = getExchangeRate(currency);
  const convertedAmount = (amount * localRate).toFixed(2);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-[10001] bg-gradient-to-b from-[var(--wa-teal)]/5 via-white to-white dark:from-[var(--wa-teal)]/10 dark:via-[#111111] dark:to-[#111111] flex flex-col items-center justify-center p-6"
    >
      {/* Confetti particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            initial={{
              opacity: 1,
              x: 0,
              y: 0,
              rotate: 0,
            }}
            animate={{
              opacity: 0,
              x: (Math.random() - 0.5) * 400,
              y: Math.random() * -600 - 200,
              rotate: Math.random() * 720 - 360,
            }}
            transition={{
              duration: 2 + Math.random(),
              ease: 'easeOut',
              delay: Math.random() * 0.5,
            }}
            className="absolute top-1/2 left-1/2"
          >
            <div
              className="w-3 h-3 rounded-sm"
              style={{
                backgroundColor: ['#FF5C00', '#00D4AA', '#FFD700', '#FF69B4', '#00BFFF'][i % 5],
              }}
            />
          </motion.div>
        ))}
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center text-center max-w-sm">
        {/* Check Icon */}
        <AnimatePresence>
          {phase >= 1 && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15 }}
              className="w-24 h-24 rounded-full flex items-center justify-center mb-8 shadow-2xl"
              style={{ background: 'linear-gradient(135deg, #FF7A3D 0%, #E8450A 100%)', boxShadow: '0 8px 24px rgba(232,69,10,0.35)' }}
            >
              <CheckCircle2 className="w-14 h-14 text-white" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Title */}
        <AnimatePresence>
          {phase >= 2 && (
            <motion.div
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="mb-6"
            >
              <div className="flex items-center justify-center gap-2 mb-2">
                <Sparkles className="w-5 h-5 text-[var(--wa-teal)]" />
                <h2 className="text-3xl font-black text-gray-900 dark:text-white">{t('checkout.payment_success_title')}</h2>
                <Sparkles className="w-5 h-5 text-[var(--wa-teal)]" />
              </div>
              <p className="text-[15px] text-gray-500 font-medium">
                Order ID: <span className="font-mono font-bold">{orderId}</span>
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Order Summary Card */}
        <AnimatePresence>
          {phase >= 3 && (
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="w-full bg-white dark:bg-[#1C1C1E] rounded-[32px] p-6 shadow-xl border border-gray-100 dark:border-white/5 mb-6"
            >
              {/* Amount */}
              <div className="text-center mb-6">
                <p className="text-[12px] font-bold text-gray-400 uppercase tracking-widest mb-1">Total Paid</p>
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-4xl font-black text-gray-900 dark:text-white">${amount.toFixed(2)}</span>
                  <span className="text-[14px] font-bold text-gray-400">({currency} {convertedAmount})</span>
                </div>
              </div>

              {/* Divider */}
              <div className="w-full h-px bg-gray-100 dark:bg-white/5 mb-6" />

              {/* Cashback Info */}
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-orange-50 dark:bg-orange-500/10 rounded-2xl flex items-center justify-center">
                  <Gift className="w-6 h-6 text-orange-500" />
                </div>
                <div className="flex-1">
                  <p className="text-[14px] font-black text-gray-900 dark:text-white">{t('cashback.pending_title')}</p>
                  <p className="text-[12px] text-gray-500">Payment confirmed. Cashback challenge is now queued.</p>
                </div>
                <Clock className="w-5 h-5 text-orange-500" />
              </div>

              {/* Info Box */}
              <div className="bg-blue-50 dark:bg-blue-500/10 rounded-2xl p-4 mb-4">
                <div className="flex items-start gap-3">
                  <Calendar className="w-4 h-4 text-blue-500 mt-0.5" />
                  <div className="text-left">
                    <p className="text-[12px] font-bold text-blue-600 dark:text-blue-400 mb-1">Check-in cashback starts automatically when all conditions are met:</p>
                    <p className="text-[11px] text-blue-500 dark:text-blue-300 leading-relaxed">
                      1. Order marked as delivered<br/>
                      2. 7-day no-return window passed<br/>
                      3. Auto-activated at next day 00:00
                    </p>
                  </div>
                </div>
              </div>

              {/* Reward Preview */}
              <div className="bg-gradient-to-r from-[var(--wa-teal)]/5 to-emerald-500/5 dark:from-[var(--wa-teal)]/10 dark:to-emerald-500/10 rounded-2xl p-4 border border-[var(--wa-teal)]/10">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Cashback Challenge Preview</p>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[20px] font-black text-[var(--wa-teal)]">${amount.toFixed(2)}</p>
                    <p className="text-[10px] text-gray-400">20-stage full cashback</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-gray-500">Daily check-in</p>
                    <p className="text-[13px] font-black text-gray-700 dark:text-gray-300">≈ ${(amount / 20).toFixed(2)}/day</p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Continue Button */}
        <AnimatePresence>
          {phase >= 3 && (
            <motion.button
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              onClick={onContinue}
              className="w-full h-14 text-white rounded-[24px] font-semibold text-[16px] shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"
              style={{ background: 'linear-gradient(135deg, #FF7A3D 0%, #E8450A 100%)', boxShadow: '0 4px 14px rgba(232,69,10,0.30)' }}
            >
              <span>Continue to Chat</span>
              <ArrowRight className="w-5 h-5" />
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};
