import React, { useState, useEffect } from 'react';
import { Mail, ShieldCheck, ChevronLeft, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useDrawerContext } from '../contexts/DrawerContext';
import { usePreferenceContext } from '../contexts/PreferenceContext';
import { useSessionContext } from '../contexts/SessionContext';

interface VerificationDrawerProps {
  type: 'login_password' | 'pay_password' | 'email_bind' | 'backup_email_bind';
  onSuccess: () => void;
}

export const VerificationDrawer: React.FC<VerificationDrawerProps> = ({ type, onSuccess }) => {
    const { user } = useSessionContext();
  const { popDrawer } = useDrawerContext();
  const { t } = usePreferenceContext();
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [isSuccess, setIsSuccess] = useState(false);
  const [timer, setTimer] = useState(0);

  const getTitle = () => {
    switch (type) {
      case 'login_password': return t('security.verify_login_password');
      case 'pay_password': return t('security.verify_pay_password');
      case 'email_bind': return t('security.verify_email_bind');
      case 'backup_email_bind': return t('security.verify_backup_email_bind');
      default: return t('auth.verify_email');
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) value = value.slice(-1);
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleVerify = () => {
    // Mock verification
    if (otp.join('').length === 6) {
      setIsSuccess(true);
      setTimeout(() => {
        onSuccess();
      }, 1500);
    }
  };

  const startTimer = () => {
    setTimer(60);
  };

  useEffect(() => {
    if (timer > 0) {
      const interval = setInterval(() => setTimer(t => t - 1), 1000);
      return () => clearInterval(interval);
    }
  }, [timer]);

  if (isSuccess) {
    return (
      <div className="flex flex-col h-full bg-[#F2F2F7] dark:bg-black p-6 items-center justify-center text-center animate-in zoom-in-95 duration-300">
        <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center text-white mb-6 shadow-lg shadow-green-500/20 animate-bounce">
          <CheckCircle2 className="w-10 h-10" />
        </div>
        <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-2">{t('security.verify_success')}</h2>
        <p className="text-gray-500 dark:text-gray-400 font-medium">{t('security.redirecting')}</p>
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
          <ShieldCheck className="text-white w-8 h-8" />
        </div>

        <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-2 text-center">{getTitle()}</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-8 text-center leading-relaxed">
          {t('auth.otp_sent_to')} <br/>
          <span className="font-bold text-gray-900 dark:text-white">{user?.email || '***@***.com'}</span>
        </p>

        <div className="flex justify-between gap-2 mb-8 w-full">
          {otp.map((digit, index) => (
            <input 
              key={index}
              id={`otp-${index}`}
              type="number"
              value={digit}
              onChange={(e) => handleOtpChange(index, e.target.value)}
              className="w-12 h-14 text-center text-xl font-black bg-gray-50 dark:bg-black border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            />
          ))}
        </div>

        <button 
          onClick={handleVerify}
          disabled={otp.join('').length < 6}
          className={`w-full py-4 rounded-xl font-semibold text-[16px] shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95 mb-6 ${
            otp.join('').length === 6 
              ? 'bg-blue-600 text-white shadow-blue-600/30' 
              : 'bg-gray-100 dark:bg-white/5 text-gray-400 cursor-not-allowed'
          }`}
        >
          {t('auth.verify_action')} <ArrowRight className="w-5 h-5" />
        </button>

        <div className="text-center">
          {timer > 0 ? (
            <span className="text-sm font-bold text-gray-400">{t('auth.resend')} ({timer}s)</span>
          ) : (
            <button onClick={startTimer} className="text-sm font-bold text-blue-500 hover:text-blue-600 transition-colors">
              {t('auth.resend')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
