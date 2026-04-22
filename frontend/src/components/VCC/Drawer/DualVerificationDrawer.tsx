import React, { useState, useEffect } from 'react';
import { Mail, ShieldCheck, ChevronLeft, ArrowRight, CheckCircle2, Lock, Key } from 'lucide-react';
import { useDrawerContext } from '../contexts/DrawerContext';
import { useSecurityContext } from '../contexts/SecurityContext';
import { usePreferenceContext } from '../contexts/PreferenceContext';
import { useSessionContext } from '../contexts/SessionContext';

export const DualVerificationDrawer: React.FC = () => {
    const { user } = useSessionContext();
  const { popDrawer } = useDrawerContext();
  const { t } = usePreferenceContext();
  const { dualVerification, setDualVerification } = useSecurityContext();

  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [tokens, setTokens] = useState<Record<string, string>>({});
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  if (!dualVerification) return null;

  const currentMethod = dualVerification.requiredMethods[currentStepIndex];

  const getMethodTitle = () => {
    switch (currentMethod) {
      case 'primary_email': return t('security.verify_primary_email');
      case 'backup_email': return t('security.verify_backup_email');
      case 'google_2fa': return t('security.2fa');
      case 'pay_password': return t('security.pay_password');
      case 'login_password': return t('security.login_password');
      default: return '';
    }
  };

  const getMethodDesc = () => {
    switch (currentMethod) {
      case 'primary_email': return `${t('auth.otp_sent_to')} ${user?.email}`;
      case 'backup_email': return `${t('auth.otp_sent_to')} ${user?.backup_email}`;
      case 'google_2fa': return t('security.2fa_desc');
      case 'pay_password': return t('security.pay_password_desc');
      case 'login_password': return t('security.password_desc');
      default: return '';
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) value = value.slice(-1);
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < 5) {
      const nextInput = document.getElementById(`dual-otp-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleNext = async () => {
    const code = otp.join('');
    if (code.length < 6 && !['pay_password', 'login_password'].includes(currentMethod)) return;
    
    setIsLoading(true);
    setError(null);

    // Simulation: Verification logic
    try {
      const newTokens = { ...tokens, [currentMethod]: code };
      setTokens(newTokens);

      if (currentStepIndex < dualVerification.requiredMethods.length - 1) {
        setCurrentStepIndex(currentStepIndex + 1);
        setOtp(['', '', '', '', '', '']);
      } else {
        setIsSuccess(true);
        setTimeout(() => {
          dualVerification.onSuccess(newTokens);
          setIsSuccess(false);
          setDualVerification(null);
          popDrawer();
        }, 1500);
      }
    } catch (err) {
      setError('Verification failed');
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="flex flex-col h-full bg-[#F2F2F7] dark:bg-black p-6 items-center justify-center text-center animate-in zoom-in-95 duration-300">
        <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center text-white mb-6 shadow-lg shadow-green-500/20 animate-bounce">
          <CheckCircle2 className="w-10 h-10" />
        </div>
        <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-2">{t('security.verify_success')}</h2>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#F2F2F7] dark:bg-black p-6 relative">
      <button onClick={() => popDrawer()} className="absolute top-6 left-4 p-2 text-gray-500 hover:text-gray-900 dark:hover:text-white z-10">
        <ChevronLeft className="w-6 h-6" />
      </button>

      <div className="flex-1 flex flex-col items-center pt-20 max-w-sm mx-auto w-full">
        <div className="w-16 h-16 bg-blue-500 rounded-2xl flex items-center justify-center mb-8 shadow-lg shadow-blue-500/20">
          {['pay_password', 'login_password'].includes(currentMethod) ? <Lock className="text-white w-8 h-8" /> : <ShieldCheck className="text-white w-8 h-8" />}
        </div>

        <div className="text-center mb-8">
          <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest bg-blue-50 dark:bg-blue-900/20 px-3 py-1 rounded-full mb-4 inline-block">
            {t('security.dual_step')} {currentStepIndex + 1} / {dualVerification.requiredMethods.length}
          </span>
          <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-2">{getMethodTitle()}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
            {getMethodDesc()}
          </p>
        </div>

        {['pay_password', 'login_password'].includes(currentMethod) ? (
          <div className="w-full space-y-4 mb-8">
            <div className="relative">
              <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input 
                type="password" 
                value={otp.join('')}
                onChange={(e) => setOtp(e.target.value.split('').slice(0, 20))}
                placeholder={t('auth.password_placeholder')}
                className="w-full bg-gray-50 dark:bg-black border border-gray-200 dark:border-white/10 rounded-xl py-4 pl-12 pr-4 text-gray-900 dark:text-white font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              />
            </div>
          </div>
        ) : (
          <div className="flex justify-between gap-2 mb-8 w-full">
            {otp.map((digit, index) => (
              <input 
                key={index}
                id={`dual-otp-${index}`}
                type="number"
                value={digit}
                onChange={(e) => handleOtpChange(index, e.target.value)}
                className="w-12 h-14 text-center text-xl font-black bg-gray-50 dark:bg-black border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              />
            ))}
          </div>
        )}

        {error && <p className="text-xs text-red-500 font-bold mb-4">{error}</p>}

        <button 
          onClick={handleNext}
          disabled={isLoading || (otp.join('').length === 0)}
          className={`w-full py-4 rounded-xl font-semibold text-[16px] shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95 mb-6 ${
            otp.join('').length > 0 && !isLoading
              ? 'bg-blue-600 text-white shadow-blue-600/30' 
              : 'bg-gray-100 dark:bg-white/5 text-gray-400 cursor-not-allowed'
          }`}
        >
          {currentStepIndex < dualVerification.requiredMethods.length - 1 ? t('common.next') : t('common.confirm')} <ArrowRight className="w-5 h-5" />
        </button>
        
        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest text-center">
          {t('security.dual_notice')}
        </p>
      </div>
    </div>
  );
};
