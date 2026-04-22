import React, { useState } from 'react';
import { Lock, KeyRound, ChevronLeft, ArrowRight, CheckCircle2 } from 'lucide-react';
import { usePreferenceContext } from '../contexts/PreferenceContext';
import { useDrawerContext } from '../contexts/DrawerContext';

interface ChangePasswordDrawerProps {
  type: 'login_password' | 'pay_password';
}

export const ChangePasswordDrawer: React.FC<ChangePasswordDrawerProps> = ({ type }) => {
    const { popDrawer } = useDrawerContext();
  const { t } = usePreferenceContext();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  const getTitle = () => {
    return type === 'login_password' ? t('security.change_login_password') : t('security.change_pay_password');
  };

  const handleUpdate = () => {
    if (password && password === confirmPassword) {
      setIsSuccess(true);
      setTimeout(() => {
        popDrawer();
        popDrawer(); // Go back to Security
      }, 2000);
    }
  };

  if (isSuccess) {
    return (
      <div className="flex flex-col h-full bg-[#F2F2F7] dark:bg-black p-6 items-center justify-center text-center animate-in zoom-in-95 duration-300">
        <div className="w-20 h-20 rounded-full flex items-center justify-center text-white mb-6 animate-bounce" style={{ background: 'linear-gradient(135deg, #FF7A3D 0%, #E8450A 100%)', boxShadow: '0 8px 24px rgba(232,69,10,0.35)' }}>
          <CheckCircle2 className="w-10 h-10" />
        </div>
        <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-2">{t('security.update_success')}</h2>
        <p className="text-gray-500 dark:text-gray-400 font-medium">{t('security.redirecting')}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#F2F2F7] dark:bg-black p-6 relative">
      <button onClick={() => popDrawer()} className="absolute top-6 left-4 p-2 text-gray-500 hover:text-gray-900 dark:hover:text-white z-10">
        <ChevronLeft className="w-6 h-6" />
      </button>

      <div className="flex-1 flex flex-col pt-20 max-w-sm mx-auto w-full">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-8 mx-auto" style={{ background: 'linear-gradient(135deg, #FF7A3D 0%, #E8450A 100%)', boxShadow: '0 8px 20px rgba(232,69,10,0.30)' }}>
          <Lock className="text-white w-8 h-8" />
        </div>

        <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-2 text-center">{getTitle()}</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-8 text-center leading-relaxed">
          {t('security.password_req_desc')}
        </p>

        <div className="space-y-4 w-full">
          <div className="relative">
            <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input 
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t('security.new_password_placeholder')}
              className="w-full bg-gray-50 dark:bg-black border border-gray-200 dark:border-white/10 rounded-xl py-4 pl-12 pr-4 text-gray-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-[var(--wa-teal)] transition-all"
            />
          </div>

          <div className="relative">
            <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input 
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder={t('security.confirm_password_placeholder')}
              className="w-full bg-gray-50 dark:bg-black border border-gray-200 dark:border-white/10 rounded-xl py-4 pl-12 pr-4 text-gray-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-[var(--wa-teal)] transition-all"
            />
          </div>
        </div>

        <button
          onClick={handleUpdate}
          disabled={!password || password !== confirmPassword}
          className={`w-full py-4 rounded-xl font-semibold text-[16px] shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95 mt-10 ${
            password && password === confirmPassword
              ? 'text-white'
              : 'bg-gray-100 dark:bg-white/5 text-gray-400 cursor-not-allowed'
          }`}
          style={password && password === confirmPassword ? { background: 'linear-gradient(135deg, #FF7A3D 0%, #E8450A 100%)', boxShadow: '0 4px 14px rgba(232,69,10,0.30)' } : {}}
        >
          {t('security.update_action')} <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
