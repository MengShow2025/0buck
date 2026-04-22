import React, { useState, useEffect } from 'react';
import { ShieldCheck, Copy, QrCode, ArrowRight, CheckCircle2, Trash2, Key, ChevronLeft } from 'lucide-react';
import { useSecurityContext } from '../contexts/SecurityContext';
import { usePreferenceContext } from '../contexts/PreferenceContext';
import { useDrawerContext } from '../contexts/DrawerContext';
import { authApi } from '../../../services/api';

export const Google2FADrawer: React.FC = () => {
    const { isGoogle2FAEnabled, setIsGoogle2FAEnabled, google2FASecret, setGoogle2FASecret } = useSecurityContext();
  const { t } = usePreferenceContext();
  const { popDrawer } = useDrawerContext();

  const [step, setStep] = useState<'status' | 'bind' | 'verify_disable'>('status');
  const [qrCode, setQrCode] = useState<string>('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (step === 'bind') {
      const fetchSetup = async () => {
        setIsLoading(true);
        try {
          const resp = await authApi.setup2fa();
          setGoogle2FASecret(resp.data.secret);
          setQrCode(resp.data.qr_code);
        } catch (error) {
          console.error('Failed to setup 2FA', error);
        } finally {
          setIsLoading(false);
        }
      };
      fetchSetup();
    }
  }, [step, setGoogle2FASecret]);

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

  const handleVerify = async () => {
    const code = otp.join('');
    if (code.length === 6) {
      setIsLoading(true);
      try {
        if (step === 'bind') {
          await authApi.enable2fa(code);
          setIsGoogle2FAEnabled(true);
        } else if (step === 'verify_disable') {
          await authApi.disable2fa(code);
          setIsGoogle2FAEnabled(false);
        }
        setIsSuccess(true);
        setTimeout(() => {
          setIsSuccess(false);
          setStep('status');
          setOtp(['', '', '', '', '', '']);
        }, 1500);
      } catch (error: any) {
        alert(error.response?.data?.detail || 'Verification failed');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleCopySecret = () => {
    navigator.clipboard.writeText(google2FASecret);
    alert(t('common.success'));
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
        
        {/* Header - Current Status */}
        {step === 'status' && (
          <>
            <div className="bg-white dark:bg-[#1C1C1E] p-8 rounded-[32px] shadow-sm flex flex-col items-center text-center border border-gray-100 dark:border-white/5">
              <div className={`w-20 h-20 rounded-3xl flex items-center justify-center mb-6 shadow-lg ${
                isGoogle2FAEnabled 
                  ? 'bg-green-500/10 text-green-500 shadow-green-500/10' 
                  : 'bg-gray-100 dark:bg-white/5 text-gray-400'
              }`}>
                <ShieldCheck className="w-10 h-10" />
              </div>
              <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-2">
                {isGoogle2FAEnabled ? t('security.google_2fa_status_enabled') : t('security.google_2fa_status_disabled')}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 font-medium leading-relaxed max-w-[240px]">
                {isGoogle2FAEnabled 
                  ? t('security.2fa_desc') 
                  : t('security.status_desc')}
              </p>
            </div>

            <div className="space-y-3">
              {!isGoogle2FAEnabled ? (
                <button 
                  onClick={() => setStep('bind')}
                  className="w-full bg-blue-600 text-white py-4 rounded-2xl font-semibold text-[16px] flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-lg shadow-blue-600/20"
                >
                  <QrCode className="w-5 h-5" />
                  {t('security.google_2fa_enable_btn')}
                </button>
              ) : (
                <>
                  <button 
                    onClick={() => setStep('bind')}
                    className="w-full bg-white dark:bg-[#1C1C1E] text-gray-900 dark:text-white py-4 rounded-2xl font-semibold text-[16px] flex items-center justify-center gap-2 active:scale-[0.98] transition-all border border-gray-100 dark:border-white/5"
                  >
                    <RefreshCw className="w-5 h-5 text-blue-500" />
                    {t('security.google_2fa_change_btn')}
                  </button>
                  <button 
                    onClick={() => setStep('verify_disable')}
                    className="w-full bg-red-50 dark:bg-red-900/10 text-red-500 py-4 rounded-2xl font-semibold text-[16px] flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
                  >
                    <Trash2 className="w-5 h-5" />
                    {t('security.google_2fa_disable_btn')}
                  </button>
                </>
              )}
            </div>
          </>
        )}

        {/* Bind Flow */}
        {step === 'bind' && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-[#1C1C1E] p-6 rounded-[32px] border border-gray-100 dark:border-white/5">
              <button onClick={() => setStep('status')} className="flex items-center gap-2 text-gray-400 font-bold text-sm mb-6 active:scale-95">
                <ChevronLeft className="w-4 h-4" />
                {t('back')}
              </button>
              
              <div className="text-center space-y-6">
                <h3 className="text-xl font-black text-gray-900 dark:text-white">{t('security.google_2fa_enable_btn')}</h3>
                <p className="text-sm text-gray-500 font-medium leading-relaxed">
                  {t('security.google_2fa_bind_desc')}
                </p>

                {/* REAL QR Code */}
                <div className="w-48 h-48 bg-white p-4 rounded-2xl mx-auto shadow-inner border-4 border-gray-50 flex items-center justify-center">
                  {isLoading ? (
                    <div className="w-full h-full bg-gray-100 animate-pulse rounded-lg" />
                  ) : (
                    <img src={qrCode} alt="2FA QR Code" className="w-full h-full" />
                  )}
                </div>

                {/* Secret String */}
                <div className="bg-gray-50 dark:bg-black rounded-2xl p-4 flex items-center justify-between border border-gray-100 dark:border-white/5">
                  <div className="text-left">
                    <div className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1">Secret Key</div>
                    <div className="text-[16px] font-mono font-black text-gray-900 dark:text-white tracking-widest">{google2FASecret}</div>
                  </div>
                  <button onClick={handleCopySecret} className="p-3 bg-white dark:bg-white/5 rounded-xl shadow-sm text-blue-500 active:scale-90 transition-all">
                    <Copy className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-[#1C1C1E] p-6 rounded-[32px] border border-gray-100 dark:border-white/5">
              <h4 className="text-sm font-black text-gray-900 dark:text-white mb-4">{t('security.google_2fa_verify_desc')}</h4>
              <div className="flex justify-between gap-2 mb-6">
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
                onClick={handleVerify}
                disabled={otp.join('').length < 6}
                className={`w-full py-4 rounded-2xl font-semibold text-[16px] shadow-lg flex items-center justify-center gap-2 transition-all active:scale-[0.98] ${
                  otp.join('').length === 6 
                    ? 'bg-blue-600 text-white shadow-blue-600/30' 
                    : 'bg-gray-100 dark:bg-white/5 text-gray-400 cursor-not-allowed'
                }`}
              >
                {t('common.confirm')} <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* Verify to Disable Flow */}
        {step === 'verify_disable' && (
          <div className="bg-white dark:bg-[#1C1C1E] p-6 rounded-[32px] border border-gray-100 dark:border-white/5">
            <button onClick={() => setStep('status')} className="flex items-center gap-2 text-gray-400 font-bold text-sm mb-6 active:scale-95">
              <ChevronLeft className="w-4 h-4" />
              {t('back')}
            </button>
            
            <div className="text-center space-y-6">
              <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 text-red-500 rounded-2xl flex items-center justify-center mx-auto">
                <Key className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-black text-gray-900 dark:text-white">{t('security.google_2fa_disable_btn')}</h3>
              <p className="text-sm text-gray-500 font-medium leading-relaxed">
                {t('security.google_2fa_verify_desc')}
              </p>

              <div className="flex justify-between gap-2 mb-6">
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
                onClick={handleVerify}
                disabled={otp.join('').length < 6}
                className={`w-full py-4 rounded-2xl font-semibold text-[16px] shadow-lg flex items-center justify-center gap-2 transition-all active:scale-[0.98] ${
                  otp.join('').length === 6 
                    ? 'bg-red-500 text-white shadow-red-500/30' 
                    : 'bg-gray-100 dark:bg-white/5 text-gray-400 cursor-not-allowed'
                }`}
              >
                {t('security.google_2fa_disable_btn')} <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

const RefreshCw: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
);
