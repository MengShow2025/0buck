import React, { useState } from 'react';
import { Mail, ShieldCheck, ArrowRight, CheckCircle2, ChevronLeft } from 'lucide-react';
import { useDrawerContext } from '../contexts/DrawerContext';
import { usePreferenceContext } from '../contexts/PreferenceContext';
import { useSessionContext } from '../contexts/SessionContext';
import { userApi } from '../../../services/api';

export const BackupEmailDrawer: React.FC = () => {
    const { user, setUser } = useSessionContext();
  const { t } = usePreferenceContext();
  const { popDrawer } = useDrawerContext();

  const [step, setStep] = useState<'input_email' | 'verify_otp'>('input_email');
  const [email, setEmail] = useState(user?.backup_email || '');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) value = value.slice(-1);
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleSendOtp = () => {
    if (email.includes('@')) {
      // Simulation: Send OTP to the backup email
      setStep('verify_otp');
      setError(null);
    }
  };

  const handleBind = async () => {
    const otpValue = otp.join('');
    if (otpValue.length === 6 && user) {
      setIsLoading(true);
      setError(null);
      try {
        await userApi.bindBackupEmail({
          email: email,
          otp: otpValue,
        });
        
        setIsSuccess(true);
        setTimeout(() => {
          setUser({ ...user, backup_email: email });
          setIsSuccess(false);
          popDrawer();
        }, 1500);
      } catch (err: any) {
        setError(err.response?.data?.detail || 'Binding failed');
      } finally {
        setIsLoading(false);
      }
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
    <div className="flex flex-col h-full bg-[#F2F2F7] dark:bg-[#000000] overflow-y-auto no-scrollbar">
      <div className="p-4 space-y-4 pb-20">
        
        {/* Step 1: Input Backup Email */}
        {step === 'input_email' && (
          <div className="bg-white dark:bg-[#1C1C1E] p-6 rounded-[32px] border border-gray-100 dark:border-white/5 space-y-6">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-green-500/10 text-green-500 rounded-2xl flex items-center justify-center mx-auto">
                <Mail className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-black text-gray-900 dark:text-white">{t('security.backup_email_binding')}</h3>
              <p className="text-sm text-gray-500 font-medium leading-relaxed">
                {t('security.backup_email_desc')}
              </p>
            </div>

            <div className="space-y-4">
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t('auth.email_placeholder')}
                  className="w-full bg-gray-50 dark:bg-black border border-gray-200 dark:border-white/10 rounded-2xl py-4 pl-12 pr-4 text-gray-900 dark:text-white font-bold focus:outline-none focus:ring-2 focus:ring-green-500 transition-all"
                />
              </div>
              
              {error && (
                <p className="text-xs text-red-500 font-bold px-2">{error}</p>
              )}

              <button 
                onClick={handleSendOtp}
                disabled={!email.includes('@')}
                className={`w-full py-4 rounded-2xl font-semibold text-[16px] shadow-lg flex items-center justify-center gap-2 transition-all active:scale-[0.98] ${
                  email.includes('@')
                    ? 'bg-green-600 text-white shadow-green-600/30' 
                    : 'bg-gray-100 dark:bg-white/5 text-gray-400 cursor-not-allowed'
                }`}
              >
                {t('auth.continue')} <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Verify OTP */}
        {step === 'verify_otp' && (
          <div className="bg-white dark:bg-[#1C1C1E] p-6 rounded-[32px] border border-gray-100 dark:border-white/5 space-y-6">
            <div className="flex items-center gap-2 -ml-2 mb-2">
              <button onClick={() => setStep('input_email')} className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-full transition-colors">
                <ChevronLeft className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-blue-500/10 text-blue-500 rounded-2xl flex items-center justify-center mx-auto">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-black text-gray-900 dark:text-white">{t('security.verify_backup_email_bind')}</h3>
              <p className="text-sm text-gray-500 font-medium leading-relaxed">
                {t('auth.otp_sent_to')} <br/>
                <span className="font-bold text-gray-900 dark:text-white">{email}</span>
              </p>
            </div>

            <div className="flex justify-between gap-2">
              {otp.map((digit, index) => (
                <input 
                  key={index}
                  id={`otp-${index}`}
                  type="number"
                  value={digit}
                  onChange={(e) => handleOtpChange(index, e.target.value)}
                  className="w-10 h-14 text-center text-xl font-black bg-gray-50 dark:bg-black border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                />
              ))}
            </div>

            {error && (
              <p className="text-xs text-red-500 font-bold text-center">{error}</p>
            )}

            <button 
              onClick={handleBind}
              disabled={otp.join('').length < 6 || isLoading}
              className={`w-full py-4 rounded-2xl font-semibold text-[16px] shadow-lg flex items-center justify-center gap-2 transition-all active:scale-[0.98] ${
                otp.join('').length === 6 && !isLoading
                  ? 'bg-blue-600 text-white shadow-blue-600/30' 
                  : 'bg-gray-100 dark:bg-white/5 text-gray-400 cursor-not-allowed'
              }`}
            >
              {isLoading ? t('security.redirecting') : t('common.confirm')} <ArrowRight className="w-5 h-5" />
            </button>
            
            <p className="text-center text-[10px] text-gray-400 font-bold uppercase tracking-widest">
              Simulation Mode: Use 123456
            </p>
          </div>
        )}

      </div>
    </div>
  );
};
