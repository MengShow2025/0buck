import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, Key, Lock, Fingerprint, Mail, 
  ChevronRight, MessageCircle as FacebookIcon, Send as TwitterIcon, Code as GithubIcon 
} from 'lucide-react';
import { useAppContext } from '../AppContext';
import { userApi, authApi, imApi } from '../../../services/api';

export const SecurityDrawer: React.FC = () => {
  const { 
    user, t, pushDrawer, setVerificationType, refreshUser,
    isGoogle2FAEnabled, setIsGoogle2FAEnabled,
    isFacebookBound, setIsFacebookBound,
    isTwitterBound, setIsTwitterBound,
    isGithubBound, setIsGithubBound,
    mfaRecoveryEnabled, setMfaRecoveryEnabled
  } = useAppContext();

  const [kycStatus, setKycStatus] = useState<{ kyc_level: number; status: string }>({ kyc_level: 0, status: 'unverified' });
  const [imBindings, setImBindings] = useState<Record<string, { linked: boolean; platform_uid: string }>>({});

  const fetchImBindings = async () => {
    try {
      const resp = await imApi.getBindings();
      const list = (resp.data?.bindings || []) as Array<{ platform: string; linked: boolean; platform_uid: string }>;
      const map: Record<string, { linked: boolean; platform_uid: string }> = {};
      list.forEach((item) => {
        map[item.platform] = { linked: !!item.linked, platform_uid: item.platform_uid || '' };
      });
      setImBindings(map);
    } catch (e) {
      console.error('Failed to load IM bindings', e);
    }
  };

  useEffect(() => {
    const fetchSecurityStatus = async () => {
      try {
        const kycResp = await userApi.getKycStatus();
        setKycStatus(kycResp.data);
        
        // Also ensure user info is fresh
        await refreshUser();
        await fetchImBindings();
      } catch (error) {
        console.error('Failed to fetch security status', error);
      }
    };
    fetchSecurityStatus();
  }, [refreshUser]);

  const handleImBind = async (platform: 'feishu' | 'telegram' | 'whatsapp' | 'discord') => {
    try {
      if (platform === 'feishu') {
        const resp = await imApi.getFeishuOauthStart();
        const url = resp.data?.authorize_url;
        if (url) {
          window.open(url, '_blank', 'noopener,noreferrer');
          alert('Opened Feishu OAuth page in a new tab.');
          return;
        }
      }
      const resp = await imApi.createBindToken(platform);
      const cmd = resp.data?.im_command || '';
      if (cmd) {
        await navigator.clipboard.writeText(cmd);
        alert(`Binding command copied: ${cmd}`);
      } else {
        alert('Bind token generated. Please use IM command to complete binding.');
      }
    } catch (e) {
      alert('Failed to start IM binding flow.');
    }
  };

  const handleImUnlink = async (platform: 'feishu' | 'telegram' | 'whatsapp' | 'discord') => {
    try {
      await imApi.unlink(platform);
      await fetchImBindings();
      alert(`${platform} unlinked.`);
    } catch (e) {
      alert(`Failed to unlink ${platform}.`);
    }
  };

  const handleSocialBind = async (platform: 'facebook' | 'twitter' | 'github', isBound: boolean, setter: (v: boolean) => void) => {
    if (isBound) {
      if (window.confirm(`${t('common.delete')} ${platform}?`)) {
        // In real system, call authApi.unbindSocial(platform)
        setter(false);
      }
    } else {
      // Mock Approach A: Auth loading
      try {
        // Simulate OAuth redirect/callback
        setter(true);
        alert(`${platform} ${t('common.success')}`);
      } catch (error) {
        alert('Binding failed');
      }
    }
  };

  return (
    <div className="h-full flex flex-col bg-[#F2F2F7] dark:bg-[#000000] overflow-y-auto pb-20 no-scrollbar">
      <div className="px-4 py-6 space-y-6">
        
        {/* Security Score Header */}
        <div className="flex flex-col items-center justify-center py-6 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/10 rounded-[32px] border border-green-100 dark:border-green-900/30">
          <ShieldCheck className="w-16 h-16 text-green-500 mb-3" />
          <h2 className="text-xl font-black text-gray-900 dark:text-white">{t('security.status_good')}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 font-medium mt-1">{t('security.status_desc')}</p>
        </div>

        {/* IM Platform Binding Group */}
        <div>
          <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-3 ml-4">IM Platform Bindings</h3>
          <div className="bg-white dark:bg-[#1C1C1E] rounded-[32px] overflow-hidden shadow-sm border border-gray-100 dark:border-white/5">
            {(['feishu', 'telegram', 'whatsapp', 'discord'] as const).map((platform, idx) => {
              const info = imBindings[platform] || { linked: false, platform_uid: '' };
              const showBorder = idx < 3;
              return (
                <button
                  key={platform}
                  onClick={() => (info.linked ? handleImUnlink(platform) : handleImBind(platform))}
                  className={`w-full flex items-center justify-between px-5 py-4 ${showBorder ? 'border-b border-gray-50 dark:border-white/5' : ''} active:bg-gray-50 dark:active:bg-white/5 transition-colors`}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-2xl bg-sky-50 dark:bg-sky-900/20 flex items-center justify-center text-sky-600 dark:text-sky-400">
                      <TwitterIcon className="w-5 h-5" />
                    </div>
                    <div className="text-left">
                      <div className="text-[15px] font-black text-gray-900 dark:text-white">{platform.charAt(0).toUpperCase() + platform.slice(1)}</div>
                      <div className="text-[11px] text-gray-400 font-medium">
                        {info.linked ? `Linked UID: ${info.platform_uid || '-'}` : 'Not linked'}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-black uppercase tracking-widest ${info.linked ? 'text-red-500' : 'text-green-500'}`}>
                      {info.linked ? 'Unlink' : 'Bind'}
                    </span>
                    <ChevronRight className="w-4 h-4 text-gray-300" />
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Auth Group */}
        <div>
          <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-3 ml-4">{t('security.basic_security')}</h3>
          <div className="bg-white dark:bg-[#1C1C1E] rounded-[32px] overflow-hidden shadow-sm border border-gray-100 dark:border-white/5">
            <button 
              onClick={() => {
                setVerificationType('login_password');
                pushDrawer('verification');
              }}
              className="w-full flex items-center justify-between px-5 py-4 border-b border-gray-50 dark:border-white/5 active:bg-gray-50 dark:active:bg-white/5 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
                  <Key className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <div className="text-[15px] font-black text-gray-900 dark:text-white">{t('security.login_password')}</div>
                  <div className="text-[11px] text-gray-400 font-medium">{t('security.password_desc')}</div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-300" />
            </button>
            
            <button 
              onClick={() => {
                setVerificationType('pay_password');
                pushDrawer('verification');
              }}
              className="w-full flex items-center justify-between px-5 py-4 border-b border-gray-50 dark:border-white/5 active:bg-gray-50 dark:active:bg-white/5 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                  <Lock className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <div className="text-[15px] font-black text-gray-900 dark:text-white">{t('security.pay_password')}</div>
                  <div className="text-[11px] text-gray-400 font-medium">{t('security.pay_password_desc')}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] bg-red-50 text-red-500 dark:bg-red-900/20 px-2 py-0.5 rounded-full font-black uppercase tracking-widest">{t('security.not_set')}</span>
                <ChevronRight className="w-4 h-4 text-gray-300" />
              </div>
            </button>

            <button 
              onClick={() => pushDrawer('google_2fa')}
              className="w-full flex items-center justify-between px-5 py-4 active:bg-gray-50 dark:active:bg-white/5 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-2xl bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center text-purple-600 dark:text-purple-400">
                  <Fingerprint className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <div className="text-[15px] font-black text-gray-900 dark:text-white">{t('security.2fa')}</div>
                  <div className="text-[11px] text-gray-400 font-medium">{t('security.2fa_desc')}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-black uppercase tracking-widest ${
                  isGoogle2FAEnabled 
                    ? 'bg-green-50 text-green-500 dark:bg-green-900/20' 
                    : 'bg-gray-100 text-gray-500 dark:bg-gray-800'
                }`}>
                  {isGoogle2FAEnabled ? t('security.google_2fa_status_enabled') : t('security.not_enabled')}
                </span>
                <ChevronRight className="w-4 h-4 text-gray-300" />
              </div>
            </button>
          </div>
        </div>

        {/* Binding Group */}
        <div>
          <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-3 ml-4">{t('security.binding_verification')}</h3>
          <div className="bg-white dark:bg-[#1C1C1E] rounded-[32px] overflow-hidden shadow-sm border border-gray-100 dark:border-white/5">
            <button 
              onClick={() => pushDrawer('email_bind_new')}
              className="w-full flex items-center justify-between px-5 py-4 border-b border-gray-50 dark:border-white/5 active:bg-gray-50 dark:active:bg-white/5 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-2xl bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center text-orange-600 dark:text-orange-400">
                  <Mail className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <div className="text-[15px] font-black text-gray-900 dark:text-white">{t('security.email_binding')}</div>
                  <div className="text-[11px] text-gray-400 font-bold">{user?.email}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-blue-500 font-black uppercase tracking-widest">{t('common.change')}</span>
                <ChevronRight className="w-4 h-4 text-gray-300" />
              </div>
            </button>
            
            <button 
              onClick={() => pushDrawer('BackupEmail')}
              className="w-full flex items-center justify-between px-5 py-4 active:bg-gray-50 dark:active:bg-white/5 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-2xl bg-green-50 dark:bg-green-900/20 flex items-center justify-center text-green-600 dark:text-green-400">
                  <Mail className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <div className="text-[15px] font-black text-gray-900 dark:text-white">{t('security.backup_email_binding')}</div>
                  {user?.backup_email && <div className="text-[11px] text-gray-400 font-bold">{user.backup_email}</div>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-orange-500 font-black uppercase tracking-widest">
                  {user?.backup_email ? t('common.change') : t('security.go_bind')}
                </span>
                <ChevronRight className="w-4 h-4 text-gray-300" />
              </div>
            </button>
          </div>
        </div>
        
        {/* Social Accounts Group */}
        <div>
          <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-3 ml-4">{t('security.social_bind_title')}</h3>
          <div className="bg-white dark:bg-[#1C1C1E] rounded-[32px] overflow-hidden shadow-sm border border-gray-100 dark:border-white/5">
            <button 
              onClick={() => handleSocialBind('facebook', isFacebookBound, setIsFacebookBound)}
              className="w-full flex items-center justify-between px-5 py-4 border-b border-gray-50 dark:border-white/5 active:bg-gray-50 dark:active:bg-white/5 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-500 dark:text-blue-400">
                  <FacebookIcon className="w-5 h-5" />
                </div>
                <span className="text-[15px] font-black text-gray-900 dark:text-white">Facebook</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-black uppercase tracking-widest ${isFacebookBound ? 'text-green-500' : 'text-orange-500'}`}>
                  {isFacebookBound ? t('security.bound') : t('security.go_bind')}
                </span>
                <ChevronRight className="w-4 h-4 text-gray-300" />
              </div>
            </button>
            
            <button 
              onClick={() => handleSocialBind('twitter', isTwitterBound, setIsTwitterBound)}
              className="w-full flex items-center justify-between px-5 py-4 border-b border-gray-50 dark:border-white/5 active:bg-gray-50 dark:active:bg-white/5 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-2xl bg-sky-50 dark:bg-sky-900/20 flex items-center justify-center text-sky-500 dark:text-sky-400">
                  <TwitterIcon className="w-5 h-5" />
                </div>
                <span className="text-[15px] font-black text-gray-900 dark:text-white">Twitter</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-black uppercase tracking-widest ${isTwitterBound ? 'text-green-500' : 'text-orange-500'}`}>
                  {isTwitterBound ? t('security.bound') : t('security.go_bind')}
                </span>
                <ChevronRight className="w-4 h-4 text-gray-300" />
              </div>
            </button>

            <button 
              onClick={() => handleSocialBind('github', isGithubBound, setIsGithubBound)}
              className="w-full flex items-center justify-between px-5 py-4 active:bg-gray-50 dark:active:bg-white/5 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-2xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-gray-700 dark:text-gray-300">
                  <GithubIcon className="w-5 h-5" />
                </div>
                <span className="text-[15px] font-black text-gray-900 dark:text-white">GitHub</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-black uppercase tracking-widest ${isGithubBound ? 'text-green-500' : 'text-orange-500'}`}>
                  {isGithubBound ? t('security.bound') : t('security.go_bind')}
                </span>
                <ChevronRight className="w-4 h-4 text-gray-300" />
              </div>
            </button>
          </div>
        </div>

        {/* Multi-Factor Recovery Group */}
        <div>
          <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-3 ml-4">{t('security.high_recovery')}</h3>
          <div className="bg-white dark:bg-[#1C1C1E] rounded-[32px] overflow-hidden shadow-sm border border-gray-100 dark:border-white/5">
            <div className="flex items-center justify-between px-5 py-4">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-2xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center text-red-600 dark:text-red-400">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div className="text-left max-w-[200px]">
                  <div className="text-[15px] font-black text-gray-900 dark:text-white leading-tight mb-1">{t('security.mfa_recovery_title')}</div>
                  <div className="text-[10px] text-gray-400 leading-tight font-medium">
                    {t('security.mfa_recovery_desc')}
                  </div>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input 
                  type="checkbox" 
                  className="sr-only peer" 
                  checked={mfaRecoveryEnabled} 
                  onChange={(e) => setMfaRecoveryEnabled(e.target.checked)} 
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-800 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>
        </div>
        
      </div>
    </div>
  );
};
