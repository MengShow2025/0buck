import React, { useState } from 'react';
import { Mail, KeyRound, ChevronLeft, ArrowRight, Zap } from 'lucide-react';
import { useAppContext } from '../AppContext';
import { authApi } from '../../../services/api';

type AuthStep = 'email' | 'password';

const STEPS: AuthStep[] = ['email', 'password'];

export const AuthDrawer: React.FC = () => {
  const [step, setStep] = useState<AuthStep>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isExistingUser, setIsExistingUser] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const { setUser, pendingAuthAction, setPendingAuthAction, setActiveDrawer, t } = useAppContext();
  const oauthBase = (import.meta.env.VITE_API_URL || '/api/v1').replace(/\/$/, '');

  const currentStepIndex = STEPS.indexOf(step);

  const handleDemoLogin = () => {
    setUser({
      customer_id: 88888,
      email: 'demo@0buck.io',
      nickname: 'Demo User',
      avatar_url: 'https://i.pravatar.cc/150?img=32',
      user_tier: 'Gold',
      user_type: 'customer',
      is_two_factor_enabled: false
    });
    if (pendingAuthAction) {
      pendingAuthAction();
      setPendingAuthAction(null);
    } else {
      setActiveDrawer('none');
    }
  };

  const handleEmailSubmit = async () => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      if (!email.includes('@')) {
        setErrorMsg('Please enter a valid email');
        setIsLoading(false);
        return;
      }
      const res = await authApi.checkEmail(email);
      setIsExistingUser(res.data.exists);
      setStep('password');
    } catch (error) {
      setErrorMsg('Failed to verify email');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoginSuccess = async () => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      let response;
      if (isExistingUser) {
        response = await authApi.login({ email, password });
      } else {
        if (password !== confirmPassword) throw new Error('Passwords do not match');
        if (password.length < 6) throw new Error('Password must be at least 6 characters');
        response = await authApi.register({ email, password, confirm_password: confirmPassword });
      }

      const userData = response.data.user;
      const accessToken = response.data?.access_token || response.data?.token;
      const refreshToken = response.data?.refresh_token;
      if (accessToken) {
        localStorage.setItem('access_token', String(accessToken));
      }
      if (refreshToken) {
        localStorage.setItem('refresh_token', String(refreshToken));
      }
      setUser({
        customer_id: userData.customer_id || Math.floor(Math.random() * 1000),
        email: email,
        nickname: userData.first_name || email.split('@')[0],
        avatar_url: `https://i.pravatar.cc/150?img=${Math.floor(Math.random() * 50)}`,
        user_tier: 'Silver',
        user_type: userData.user_type || 'customer',
        is_two_factor_enabled: false
      });

      if (pendingAuthAction) {
        pendingAuthAction();
        setPendingAuthAction(null);
      } else {
        setActiveDrawer('none');
      }
    } catch (err: any) {
      if (err.response?.data?.detail) {
        setErrorMsg(err.response.data.detail);
      } else {
        setErrorMsg(err.message || 'Authentication failed');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialLogin = (provider: 'google' | 'apple' | 'facebook') => {
    const redirect = `${window.location.pathname}${window.location.search}`;
    // Since window.location.href bypasses vite proxy, we must use the absolute backend URL
    const isDev = import.meta.env.VITE_ENVIRONMENT === 'development';
    const backendHost = isDev ? 'http://127.0.0.1:8000' : window.location.origin;
    const absoluteOauthBase = oauthBase.startsWith('http') ? oauthBase : `${backendHost}${oauthBase}`;
    
    window.location.href = `${absoluteOauthBase}/auth/login/${provider}?redirect=${encodeURIComponent(redirect)}`;
  };

  return (
    <div className="flex flex-col h-full bg-[#F2F2F7] dark:bg-black relative overflow-hidden">

      {/* Top nav + step indicators */}
      <div className="flex items-center justify-between px-4 pt-5 pb-2 relative z-10">
        <div className="w-10">
          {step !== 'email' && (
            <button
              onClick={() => setStep('email')}
              className="w-9 h-9 rounded-full bg-white dark:bg-white/10 flex items-center justify-center shadow-sm active:scale-90 transition-transform"
            >
              <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            </button>
          )}
        </div>

        {/* Step dots */}
        <div className="flex items-center gap-2">
          {STEPS.map((s, i) => (
            <div
              key={s}
              className={`rounded-full transition-all duration-300 ${
                i === currentStepIndex
                  ? 'w-6 h-2'
                  : i < currentStepIndex
                  ? 'w-2 h-2'
                  : 'w-2 h-2 bg-gray-200 dark:bg-white/15'
              }`}
              style={
                i <= currentStepIndex
                  ? { background: 'linear-gradient(135deg, #FF7A3D 0%, #E8450A 100%)' }
                  : {}
              }
            />
          ))}
        </div>

        <div className="w-10" />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-8">

        {/* Logo */}
        <div
          className="w-16 h-16 rounded-[22px] flex items-center justify-center mb-7 shadow-lg"
          style={{
            background: 'linear-gradient(135deg, #FF7A3D 0%, #E8450A 100%)',
            boxShadow: '0 8px 24px rgba(232,69,10,0.35)'
          }}
        >
          <span className="text-white font-bold text-2xl tracking-tight">0B</span>
        </div>

        {/* Email step */}
        {step === 'email' && (
          <div className="w-full animate-in fade-in slide-in-from-bottom-3 duration-300">
            <h2 className="text-[26px] font-bold text-gray-900 dark:text-white mb-1.5 text-center tracking-tight">
              {t('auth.welcome')}
            </h2>
            <p className="text-[14px] text-gray-400 dark:text-gray-500 mb-8 text-center leading-relaxed">
              {t('auth.login_signup_desc')}
            </p>

            <div className="relative mb-4">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleEmailSubmit()}
                placeholder={t('auth.email_placeholder')}
                className="w-full bg-white dark:bg-[#1C1C1E] border border-gray-100 dark:border-white/8 rounded-[18px] py-4 pl-11 pr-4 text-[15px] text-gray-900 dark:text-white font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-400/30 transition-all"
              />
            </div>

            {errorMsg && (
              <p className="text-center text-[13px] font-medium text-red-500 mb-3">{errorMsg}</p>
            )}

            <button
              onClick={handleEmailSubmit}
              disabled={isLoading}
              className={`w-full text-white font-semibold text-[16px] py-4 rounded-[18px] flex items-center justify-center gap-2 transition-all active:scale-[0.98] mb-6 ${isLoading ? 'opacity-60' : ''}`}
              style={{
                background: 'linear-gradient(135deg, #FF7A3D 0%, #E8450A 100%)',
                boxShadow: '0 6px 20px rgba(232,69,10,0.28)'
              }}
            >
              {isLoading ? t('common.loading') || 'Processing…' : t('auth.continue')}
              {!isLoading && <ArrowRight className="w-5 h-5" />}
            </button>

            <p className="text-center text-[12px] text-gray-400 leading-relaxed mb-8">
              {t('auth.auto_create_desc')}
            </p>

            {/* Social sign-in */}
            <div className="flex items-center gap-3 mb-6">
              <div className="flex-1 h-px bg-gray-200 dark:bg-white/8" />
              <span className="text-[11px] font-medium text-gray-400 uppercase tracking-widest">{t('auth.social_or')}</span>
              <div className="flex-1 h-px bg-gray-200 dark:bg-white/8" />
            </div>

            <div className="flex justify-center gap-4">
              {/* Google */}
              <button
                type="button"
                onClick={() => handleSocialLogin('google')}
                className="w-14 h-14 rounded-[18px] bg-white dark:bg-[#1C1C1E] border border-gray-100 dark:border-white/8 flex items-center justify-center shadow-sm hover:shadow-md active:scale-90 transition-all"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
              </button>
              {/* Apple */}
              <button
                type="button"
                onClick={() => handleSocialLogin('apple')}
                className="w-14 h-14 rounded-[18px] bg-white dark:bg-[#1C1C1E] border border-gray-100 dark:border-white/8 flex items-center justify-center shadow-sm hover:shadow-md active:scale-90 transition-all"
              >
                <svg className="w-5 h-5 dark:text-white text-black" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.04 2.26-.74 3.58-.8 1.45-.06 2.87.49 3.82 1.64-3.35 1.91-2.82 6.06.49 7.34-.82 1.63-1.8 3.12-2.97 3.99M12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25"/>
                </svg>
              </button>
              {/* Facebook */}
              <button
                type="button"
                onClick={() => handleSocialLogin('facebook')}
                className="w-14 h-14 rounded-[18px] bg-white dark:bg-[#1C1C1E] border border-gray-100 dark:border-white/8 flex items-center justify-center shadow-sm hover:shadow-md active:scale-90 transition-all"
              >
                <svg className="w-5 h-5 text-[#1877F2]" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
              </button>
            </div>

            {/* Demo Login */}
            <div className="mt-6">
              <button
                onClick={handleDemoLogin}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-[18px] bg-gray-100 dark:bg-white/8 text-gray-500 dark:text-gray-400 text-[14px] font-medium active:scale-[0.98] transition-all border border-gray-200 dark:border-white/10"
              >
                <Zap className="w-4 h-4 text-orange-400" />
                Try Demo Mode
              </button>
            </div>
          </div>
        )}

        {/* Password step */}
        {step === 'password' && (
          <div className="w-full animate-in fade-in slide-in-from-right-3 duration-300">
            <h2 className="text-[26px] font-bold text-gray-900 dark:text-white mb-1.5 text-center tracking-tight">
              {isExistingUser ? t('auth.welcome_back') : t('auth.create_password')}
            </h2>
            <p className="text-[14px] text-gray-400 mb-8 text-center">{email}</p>

            <div className="space-y-3 mb-4">
              <div className="relative">
                <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t('auth.password_placeholder')}
                  className="w-full bg-white dark:bg-[#1C1C1E] border border-gray-100 dark:border-white/8 rounded-[18px] py-4 pl-11 pr-4 text-[15px] text-gray-900 dark:text-white font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-400/30 transition-all"
                />
              </div>

              {!isExistingUser && (
                <>
                  <div className="relative">
                    <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-400" />
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm Password"
                      className="w-full bg-white dark:bg-[#1C1C1E] border border-gray-100 dark:border-white/8 rounded-[18px] py-4 pl-11 pr-4 text-[15px] text-gray-900 dark:text-white font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-400/30 transition-all"
                    />
                  </div>

                </>
              )}
            </div>

            {errorMsg && (
              <p className="text-center text-[13px] font-medium text-red-500 mb-3">{errorMsg}</p>
            )}

            <button
              onClick={handleLoginSuccess}
              disabled={isLoading}
              className={`w-full text-white font-semibold text-[16px] py-4 rounded-[18px] transition-all active:scale-[0.98] mb-4 ${isLoading ? 'opacity-60' : ''}`}
              style={{
                background: 'linear-gradient(135deg, #FF7A3D 0%, #E8450A 100%)',
                boxShadow: '0 6px 20px rgba(232,69,10,0.28)'
              }}
            >
              {isLoading
                ? t('common.loading') || 'Processing…'
                : isExistingUser
                ? t('auth.login_action')
                : t('auth.create_account_action')}
            </button>

            {isExistingUser && (
              <p className="text-center text-[13px] font-semibold text-orange-500 cursor-pointer hover:text-orange-600 transition-colors">
                {t('auth.forgot_password')}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
