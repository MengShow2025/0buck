import React, { useState } from 'react';
import { Mail, ShieldCheck, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useDrawerContext } from '../contexts/DrawerContext';
import { useSecurityContext } from '../contexts/SecurityContext';
import { usePreferenceContext } from '../contexts/PreferenceContext';
import { useSessionContext } from '../contexts/SessionContext';
import { authApi } from '../../../services/api';

export const EmailBindNewDrawer: React.FC = () => {
    const { user, setUser } = useSessionContext();
  const { isGoogle2FAEnabled } = useSecurityContext();
  const { t } = usePreferenceContext();
  const { popDrawer } = useDrawerContext();

  const [step, setStep] = useState<'verify_current' | 'input_new' | 'verify_new'>('verify_current');
  const [newEmail, setNewEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [currentOtp, setCurrentOtp] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

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

  const handleVerifyCurrent = () => {
    if (otp.join('').length === 6) {
      setCurrentOtp(otp.join(''));
      setStep('input_new');
      setOtp(['', '', '', '', '', '']);
    }
  };

  const handleSendNewOtp = () => {
    if (newEmail.includes('@')) {
      // In real system, call authApi.sendOtp(newEmail)
      setStep('verify_new');
    }
  };

  const handleVerifyNew = async () => {
    const newEmailOtp = otp.join('');
    if (newEmailOtp.length === 6 && user) {
      setIsLoading(true);
      try {
        await authApi.rebindEmail({
          new_email: newEmail,
          new_email_otp: newEmailOtp,
          google_2fa_code: isGoogle2FAEnabled ? currentOtp : undefined,
          old_email_otp: !isGoogle2FAEnabled ? currentOtp : undefined,
        });
        setIsSuccess(true);
        setTimeout(() => {
          setUser({ ...user, email: newEmail });
          setIsSuccess(false);
          popDrawer();
        }, 1500);
      } catch (error: any) {
        alert(error.response?.data?.detail || 'Rebind failed');
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
        <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-2">{t('security.email_bind_success')}</h2>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#F2F2F7] dark:bg-[#000000] overflow-y-auto no-scrollbar">
      <div className="p-4 space-y-4 pb-20">
        
        {/* Step 1: Verify Current Security */}
        {step === 'verify_current' && (
          <div className="bg-white dark:bg-[#1C1C1E] p-6 rounded-[32px] border border-gray-100 dark:border-white/5 space-y-6">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-blue-500/10 text-blue-500 rounded-2xl flex items-center justify-center mx-auto">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-black text-gray-900 dark:text-white">{t('security.email_bind_current_verify')}</h3>
              <p className="text-sm text-gray-500 font-medium leading-relaxed">
                {isGoogle2FAEnabled ? t('security.verify_with_google') : t('security.verify_with_email')}
              </p>
              
              {!isGoogle2FAEnabled && (
                <div className="text-xs font-bold text-gray-400 bg-gray-50 dark:bg-black py-2 rounded-xl border border-gray-100 dark:border-white/5">
                  {user?.email}
                </div>
              )}
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

            <button 
              onClick={handleVerifyCurrent}
              disabled={otp.join('').length < 6}
              className={`w-full py-4 rounded-2xl font-semibold text-[16px] shadow-lg flex items-center justify-center gap-2 transition-all active:scale-[0.98] ${
                otp.join('').length === 6 
                  ? 'bg-blue-600 text-white shadow-blue-600/30' 
                  : 'bg-gray-100 dark:bg-white/5 text-gray-400 cursor-not-allowed'
              }`}
            >
              {t('auth.continue')} <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Step 2: Input New Email */}
        {step === 'input_new' && (
          <div className="bg-white dark:bg-[#1C1C1E] p-6 rounded-[32px] border border-gray-100 dark:border-white/5 space-y-6">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-indigo-500/10 text-indigo-500 rounded-2xl flex items-center justify-center mx-auto">
                <Mail className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-black text-gray-900 dark:text-white">{t('security.email_bind_new_input')}</h3>
            </div>

            <div className="space-y-4">
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input 
                  type="email" 
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder={t('auth.email_placeholder')}
                  className="w-full bg-gray-50 dark:bg-black border border-gray-200 dark:border-white/10 rounded-2xl py-4 pl-12 pr-4 text-gray-900 dark:text-white font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                />
              </div>
              
              <button 
                onClick={handleSendNewOtp}
                disabled={!newEmail.includes('@')}
                className={`w-full py-4 rounded-2xl font-semibold text-[16px] shadow-lg flex items-center justify-center gap-2 transition-all active:scale-[0.98] ${
                  newEmail.includes('@')
                    ? 'bg-indigo-600 text-white shadow-indigo-600/30' 
                    : 'bg-gray-100 dark:bg-white/5 text-gray-400 cursor-not-allowed'
                }`}
              >
                {t('auth.continue')} <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Verify New Email */}
        {step === 'verify_new' && (
          <div className="bg-white dark:bg-[#1C1C1E] p-6 rounded-[32px] border border-gray-100 dark:border-white/5 space-y-6">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-green-500/10 text-green-500 rounded-2xl flex items-center justify-center mx-auto">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-black text-gray-900 dark:text-white">{t('security.email_bind_new_verify')}</h3>
              <p className="text-sm text-gray-500 font-medium leading-relaxed">
                {t('auth.otp_sent_to')} <br/>
                <span className="font-bold text-gray-900 dark:text-white">{newEmail}</span>
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

            <button 
              onClick={handleVerifyNew}
              disabled={otp.join('').length < 6}
              className={`w-full py-4 rounded-2xl font-semibold text-[16px] shadow-lg flex items-center justify-center gap-2 transition-all active:scale-[0.98] ${
                otp.join('').length === 6 
                  ? 'bg-green-600 text-white shadow-green-600/30' 
                  : 'bg-gray-100 dark:bg-white/5 text-gray-400 cursor-not-allowed'
              }`}
            >
              {t('common.confirm')} <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        )}

      </div>
    </div>
  );
};
