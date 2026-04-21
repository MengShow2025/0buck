import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User, Shield, Bell, Moon, Sun, 
  Globe, Bot, Brain, Database, ChevronRight,
  Monitor, LogOut, Info, HardDrive, ChevronDown, Link2,
  MessageSquare, Send, MessageCircle, Gamepad2, Copy
} from 'lucide-react';
import { useAppContext } from '../AppContext';
import { aiApi, imApi } from '../../../services/api';

// Internal Custom Select Component for downward floating menu
const CustomSelect = ({ value, options, onChange, width = "w-36" }: { value: string, options: {label: string, value: string}[], onChange: (val: any) => void, width?: string }) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectedLabel = options.find(o => o.value === value)?.label || value;

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 active:opacity-70 transition-opacity"
      >
        <span className="truncate max-w-[100px] text-right">{selectedLabel}</span>
        <ChevronDown className="w-4 h-4 shrink-0" />
      </button>
      
      <AnimatePresence>
            {isOpen && (
              <>
                <div className="absolute inset-0 z-[90]" onClick={() => setIsOpen(false)} />
                <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className={`absolute right-0 top-full mt-2 ${width} max-h-[300px] bg-white dark:bg-[#2C2C2E] rounded-xl shadow-xl border border-gray-100 dark:border-white/10 overflow-y-auto z-[100] py-1 scrollbar-hide`}
            >
              {options.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => { onChange(opt.value); setIsOpen(false); }}
                  className={`w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center justify-between ${
                    value === opt.value 
                      ? 'text-[#FF5C00] bg-orange-50 dark:bg-[#FF5C00]/10 font-medium' 
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 active:bg-gray-100 dark:active:bg-white/10'
                  }`}
                >
                  <span className="truncate">{opt.label}</span>
                  {value === opt.value && <div className="w-1.5 h-1.5 rounded-full bg-[#FF5C00]" />}
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export const SettingsDrawer: React.FC = () => {
  const { 
    theme, setTheme, 
    language, setLanguage,
    notifications, setNotifications,
    aiPersona, setAiPersona,
    aiCustomInstructions, setAiCustomInstructions,
    aiMemoryTags, setAiMemoryTags,
    user, pushDrawer,
    currency, setCurrency,
    t
  } = useAppContext();

  const [instructions, setInstructions] = useState(aiCustomInstructions);
  const [cacheSize, setCacheSize] = useState('24.5 MB');
  const [isClearing, setIsClearing] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [recommendationEnabled, setRecommendationEnabled] = useState(true);
  const [recommendationLoading, setRecommendationLoading] = useState(false);
  const [identityMode, setIdentityMode] = useState<'ai_butler' | 'life_pilot' | 'exclusive_twin'>('ai_butler');
  const [identityLoading, setIdentityLoading] = useState(false);
  const [imBindings, setImBindings] = useState<Record<string, { linked: boolean; platform_uid: string }>>({});
  const [bindModal, setBindModal] = useState<{
    open: boolean;
    platform: 'feishu' | 'telegram' | 'whatsapp' | 'discord' | null;
    link: string;
    command: string;
    qrValue: string;
  }>({ open: false, platform: null, link: '', command: '', qrValue: '' });
  const [unlinkPlatform, setUnlinkPlatform] = useState<'feishu' | 'telegram' | 'whatsapp' | 'discord' | null>(null);
  const isLoggedIn = !!user?.customer_id;

  const PLATFORM_META: Record<'feishu' | 'telegram' | 'whatsapp' | 'discord', { label: string; icon: React.ReactNode; linked: string; unlinked: string }> = {
    feishu: {
      label: '飞书',
      icon: <MessageSquare className="w-4 h-4" />,
      linked: 'bg-blue-500 text-white',
      unlinked: 'bg-gray-200 text-gray-400 dark:bg-gray-700 dark:text-gray-500'
    },
    telegram: {
      label: 'Telegram',
      icon: <Send className="w-4 h-4" />,
      linked: 'bg-sky-500 text-white',
      unlinked: 'bg-gray-200 text-gray-400 dark:bg-gray-700 dark:text-gray-500'
    },
    whatsapp: {
      label: 'WhatsApp',
      icon: <MessageCircle className="w-4 h-4" />,
      linked: 'bg-emerald-500 text-white',
      unlinked: 'bg-gray-200 text-gray-400 dark:bg-gray-700 dark:text-gray-500'
    },
    discord: {
      label: 'Discord',
      icon: <Gamepad2 className="w-4 h-4" />,
      linked: 'bg-indigo-500 text-white',
      unlinked: 'bg-gray-200 text-gray-400 dark:bg-gray-700 dark:text-gray-500'
    }
  };

  const loadBindings = async () => {
    if (!isLoggedIn) {
      setImBindings({});
      return;
    }
    try {
      const resp = await imApi.getBindings();
      const list = (resp.data?.bindings || []) as Array<{ platform: string; linked: boolean; platform_uid: string }>;
      const map: Record<string, { linked: boolean; platform_uid: string }> = {};
      list.forEach((item) => {
        map[item.platform] = { linked: !!item.linked, platform_uid: item.platform_uid || '' };
      });
      setImBindings(map);
    } catch (e: any) {
      if (e?.response?.status === 401) {
        // Unauthenticated users should not trigger noisy console errors.
        setImBindings({});
        return;
      }
      console.error('Failed to load IM bindings', e);
    }
  };

  useEffect(() => {
    loadBindings();
  }, [isLoggedIn]);

  useEffect(() => {
    let mounted = true;
    const loadRecommendationSetting = async () => {
      try {
        const resp = await aiApi.getRecommendationSettings();
        const enabled = !!resp?.data?.enabled;
        if (mounted) setRecommendationEnabled(enabled);
      } catch (_e) {
        // keep default true on failure
      }
    };
    loadRecommendationSetting();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const mode = user?.ai_identity_mode;
    if (mode === 'life_pilot' || mode === 'exclusive_twin' || mode === 'ai_butler') {
      setIdentityMode(mode);
    }
  }, [user?.ai_identity_mode]);

  const toggleRecommendation = async (enabled: boolean) => {
    setRecommendationEnabled(enabled);
    setRecommendationLoading(true);
    try {
      await aiApi.setRecommendationSettings(enabled);
    } catch (_e) {
      setRecommendationEnabled((prev) => !enabled ? prev : true);
    } finally {
      setRecommendationLoading(false);
    }
  };

  const updateIdentityMode = async (mode: 'ai_butler' | 'life_pilot' | 'exclusive_twin') => {
    setIdentityMode(mode);
    setIdentityLoading(true);
    try {
      await aiApi.syncProfileSettings({ ui_settings: { identity_mode: mode } });
    } catch (_e) {
      // keep optimistic UI to avoid interruption; next refresh will reconcile
    } finally {
      setIdentityLoading(false);
    }
  };

  const openBindPanel = async (platform: 'feishu' | 'telegram' | 'whatsapp' | 'discord') => {
    if (!isLoggedIn) {
      pushDrawer('auth');
      return;
    }
    const linked = !!imBindings[platform]?.linked;
    if (linked) {
      setUnlinkPlatform(platform);
      return;
    }
    try {
      const tokenResp = await imApi.createBindToken(platform);
      const command = tokenResp.data?.im_command || '';
      let link = command;
      if (platform === 'feishu') {
        try {
          const oauthResp = await imApi.getFeishuOauthStart();
          if (oauthResp.data?.authorize_url) link = oauthResp.data.authorize_url;
        } catch (_e) {
          // fall back to command when oauth url is unavailable
        }
      }
      setBindModal({
        open: true,
        platform,
        link,
        command,
        qrValue: link || command
      });
    } catch (e) {
      alert('获取绑定信息失败，请稍后再试');
    }
  };

  const doUnlink = async () => {
    if (!unlinkPlatform) return;
    try {
      await imApi.unlink(unlinkPlatform);
      setUnlinkPlatform(null);
      await loadBindings();
    } catch (e) {
      alert('解绑失败，请稍后再试');
    }
  };

  const handleSaveInstructions = () => {
    setAiCustomInstructions(instructions);
  };

  const removeTag = (tagToRemove: string) => {
    setAiMemoryTags(aiMemoryTags.filter(tag => tag !== tagToRemove));
  };

  const confirmClearCache = () => {
    setShowClearConfirm(false);
    setIsClearing(true);
    setTimeout(() => {
      setCacheSize('0 KB');
      setIsClearing(false);
    }, 800);
  };

  const handleClearCacheClick = () => {
    if (cacheSize === '0 KB') return;
    setShowClearConfirm(true);
  };

  return (
    <div className="h-full flex flex-col bg-[#F2F2F7] dark:bg-black overflow-y-auto pb-20 transition-colors duration-300">
      
      {/* Settings Content */}
      <div className="px-4 py-6 space-y-6">
        
        {/* Group 1: Account & Security */}
        <div>
          <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 ml-2">{t('settings.account_security')}</h3>
          <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl overflow-hidden shadow-sm">
            <button 
              onClick={() => pushDrawer('personal_info')}
              className="w-full flex items-center justify-between px-4 py-3.5 border-b border-gray-100 dark:border-white/5 active:bg-gray-50 dark:active:bg-white/5 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                  <User className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <div className="text-[15px] font-medium text-gray-900 dark:text-white">{t('settings.nickname')}</div>
                  <div className="text-xs text-gray-500">{user?.email || 'user@example.com'}</div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </button>
            <button 
              onClick={() => pushDrawer('security')}
              className="w-full flex items-center justify-between px-4 py-3.5 active:bg-gray-50 dark:active:bg-white/5 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600 dark:text-green-400">
                  <Shield className="w-4 h-4" />
                </div>
                <span className="text-[15px] text-gray-900 dark:text-white">{t('settings.account_security')}</span>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </button>
          </div>
        </div>

        {/* Group 2: System Preferences */}
        <div>
          <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 ml-2">{t('settings.system_pref')}</h3>
          <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl shadow-sm">
            {/* Theme */}
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-gray-100 dark:border-white/5">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                  {theme === 'dark' ? <Moon className="w-4 h-4" /> : theme === 'light' ? <Sun className="w-4 h-4" /> : <Monitor className="w-4 h-4" />}
                </div>
                <span className="text-[15px] text-gray-900 dark:text-white">{t('settings.appearance')}</span>
              </div>
              <CustomSelect 
                value={theme}
                onChange={setTheme}
                options={[
                  { value: 'system', label: t('settings.theme_system') },
                  { value: 'light', label: t('settings.theme_light') },
                  { value: 'dark', label: t('settings.theme_dark') }
                ]}
              />
            </div>

            {/* Language */}
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-gray-100 dark:border-white/5">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center text-teal-600 dark:text-teal-400">
                  <Globe className="w-4 h-4" />
                </div>
                <span className="text-[15px] text-gray-900 dark:text-white">{t('settings.language')}</span>
              </div>
              <CustomSelect 
                value={language}
                onChange={setLanguage}
                options={[
                  { value: 'zh', label: 'Chinese (Simplified)' },
                  { value: 'en', label: 'English' }
                ]}
              />
            </div>

            {/* Currency */}
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-gray-100 dark:border-white/5">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                  <span className="text-xs font-bold">￥$</span>
                </div>
                <span className="text-[15px] text-gray-900 dark:text-white">{t('settings.currency')}</span>
              </div>
              <CustomSelect 
                value={currency}
                onChange={setCurrency}
                width="w-48"
                options={[
                  { value: 'AUTO', label: t('settings.currency_auto') },
                  { value: 'USD', label: t('settings.currency_usd') },
                  { value: 'JPY', label: t('settings.currency_jpy') },
                  { value: 'EUR', label: t('settings.currency_eur') },
                  { value: 'GBP', label: t('settings.currency_gbp') },
                  { value: 'CNY', label: t('settings.currency_cny') },
                  { value: 'HKD', label: t('settings.currency_hkd') },
                  { value: 'TWD', label: t('settings.currency_twd') },
                  { value: 'KRW', label: t('settings.currency_krw') },
                  { value: 'SGD', label: t('settings.currency_sgd') },
                  { value: 'AUD', label: t('settings.currency_aud') },
                  { value: 'CAD', label: t('settings.currency_cad') },
                  { value: 'CHF', label: t('settings.currency_chf') },
                  { value: 'MYR', label: t('settings.currency_myr') },
                  { value: 'THB', label: t('settings.currency_thb') },
                  { value: 'VND', label: t('settings.currency_vnd') },
                  { value: 'PHP', label: t('settings.currency_php') },
                  { value: 'IDR', label: t('settings.currency_idr') },
                  { value: 'RUB', label: t('settings.currency_rub') },
                  { value: 'BRL', label: t('settings.currency_brl') },
                  { value: 'INR', label: t('settings.currency_inr') }
                ]}
              />
            </div>

            {/* Notifications */}
            <div className="flex items-center justify-between px-4 py-3.5">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-orange-600 dark:text-orange-400">
                  <Bell className="w-4 h-4" />
                </div>
                <span className="text-[15px] text-gray-900 dark:text-white">{t('settings.notifications')}</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" checked={notifications} onChange={(e) => setNotifications(e.target.checked)} />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-[#FF5C00]"></div>
              </label>
            </div>

            {/* AI Identity */}
            <div className="flex items-center justify-between px-4 py-3.5 border-t border-gray-100 dark:border-white/5">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center text-violet-600 dark:text-violet-400">
                  <Bot className="w-4 h-4" />
                </div>
                <span className="text-[15px] text-gray-900 dark:text-white">{t('settings.identity_mode')}</span>
              </div>
              <div className={identityLoading ? 'opacity-60 pointer-events-none' : ''}>
                <CustomSelect
                  value={identityMode}
                  onChange={(v) => updateIdentityMode(v as 'ai_butler' | 'life_pilot' | 'exclusive_twin')}
                  width="w-40"
                  options={[
                    { value: 'ai_butler', label: t('settings.identity_ai_butler') },
                    { value: 'life_pilot', label: t('settings.identity_life_pilot') },
                    { value: 'exclusive_twin', label: t('settings.identity_exclusive_twin') },
                  ]}
                />
              </div>
            </div>

            {/* Smart Recommendation */}
            <div className="flex items-center justify-between px-4 py-3.5 border-t border-gray-100 dark:border-white/5">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-fuchsia-100 dark:bg-fuchsia-900/30 flex items-center justify-center text-fuchsia-600 dark:text-fuchsia-400">
                  <Bot className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[15px] text-gray-900 dark:text-white">{t('settings.smart_recommendation')}</div>
                  <div className="text-[11px] text-gray-500">{t('settings.smart_recommendation_desc')}</div>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={recommendationEnabled}
                  disabled={recommendationLoading}
                  onChange={(e) => toggleRecommendation(e.target.checked)}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-disabled:opacity-50 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-[#FF5C00]"></div>
              </label>
            </div>

            {/* Link Bindings */}
            <div className="flex items-center justify-between px-4 py-3.5 border-t border-gray-100 dark:border-white/5">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-cyan-100 dark:bg-cyan-900/30 flex items-center justify-center text-cyan-600 dark:text-cyan-400">
                  <Link2 className="w-4 h-4" />
                </div>
                <span className="text-[15px] text-gray-900 dark:text-white">链接：</span>
              </div>
              <div className="flex items-center gap-2">
                {(['feishu', 'telegram', 'whatsapp', 'discord'] as const).map((platform) => {
                  const linked = !!imBindings[platform]?.linked;
                  const meta = PLATFORM_META[platform];
                  return (
                    <button
                      key={platform}
                      onClick={() => openBindPanel(platform)}
                      title={meta.label}
                      className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${linked ? meta.linked : meta.unlinked}`}
                    >
                      {meta.icon}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Group 3: AI Configuration (3-Layer Stack) */}
        <div>
          <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 ml-2 flex items-center gap-1">
            {t('settings.ai_personalization')} 
            <span className="bg-gradient-to-r from-[#FF7A3D] to-[#E8450A] text-white text-[8px] px-1.5 py-0.5 rounded font-bold">L2/L3</span>
          </h3>
          
          <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl shadow-sm mb-4">
            <div className="px-4 py-3 bg-gray-50/50 dark:bg-white/[0.02] border-b border-gray-100 dark:border-white/5 rounded-t-2xl overflow-hidden">
              <div className="text-xs text-gray-500 leading-relaxed">
                {t('settings.ai_rule_note')}
              </div>
            </div>
            
            {/* L2 Persona */}
            <div className="px-4 py-3.5 border-b border-gray-100 dark:border-white/5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400">
                  <Bot className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[15px] text-gray-900 dark:text-white">{t('settings.ai_persona')}</div>
                  <div className="text-[10px] text-gray-400">{t('settings.persona_desc')}</div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 pt-1 pb-2">
                {[
                  { value: 'professional', label: t('settings.persona_professional') },
                  { value: 'friendly', label: t('settings.persona_friendly') },
                  { value: 'creative', label: t('settings.persona_creative') },
                  { value: 'concise', label: t('settings.persona_concise') },
                  { value: 'casual', label: t('settings.persona_casual') },
                  { value: 'expert', label: t('settings.persona_expert') },
                  { value: 'loli', label: t('settings.persona_loli') },
                  { value: 'tsundere', label: t('settings.persona_tsundere') },
                  { value: 'butler', label: t('settings.persona_butler') },
                  { value: 'mentor', label: t('settings.persona_mentor') }
                ].map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setAiPersona(opt.value as any)}
                    className={`px-4 py-1.5 rounded-full text-[13px] transition-all duration-200 border ${
                      aiPersona === opt.value
                        ? 'text-white border-transparent font-medium shadow-md scale-105'
                        : 'bg-transparent text-gray-600 border-gray-200 hover:bg-gray-50 dark:text-gray-300 dark:border-gray-700 dark:hover:bg-white/5 hover:scale-105'
                    }`}
                    style={aiPersona === opt.value ? { background: 'linear-gradient(135deg, #FF7A3D 0%, #E8450A 100%)' } : {}}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* L3 Custom Instructions */}
            <div className="px-4 py-3.5 border-b border-gray-100 dark:border-white/5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-pink-100 dark:bg-pink-900/30 flex items-center justify-center text-pink-600 dark:text-pink-400">
                    <Brain className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-[15px] text-gray-900 dark:text-white">{t('settings.custom_instr')}</div>
                    <div className="text-[10px] text-gray-400">{t('settings.custom_instr_desc')}</div>
                  </div>
                </div>
              </div>
              <textarea 
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                onBlur={handleSaveInstructions}
                placeholder={t('settings.custom_instr_placeholder')}
                className="w-full bg-gray-50 dark:bg-[#2C2C2E] text-gray-900 dark:text-white text-sm rounded-xl p-3 h-20 resize-none outline-none focus:ring-1 focus:ring-[#FF5C00]/50"
              />
            </div>

            {/* L3 Memory Tags */}
            <div className="px-4 py-3.5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                    <Database className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-[15px] text-gray-900 dark:text-white">{t('settings.memory_bank')}</div>
                    <div className="text-[10px] text-gray-400">{t('settings.memory_bank_desc')}</div>
                  </div>
                </div>
                {aiMemoryTags.length > 0 && (
                  <button onClick={() => setAiMemoryTags([])} className="text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 px-2 py-1 rounded">{t('settings.clear_memory')}</button>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {aiMemoryTags.length === 0 ? (
                  <div className="text-sm text-gray-400 py-2">{t('settings.memory_empty')}</div>
                ) : (
                  aiMemoryTags.map((tag, idx) => (
                    <div key={idx} className="flex items-center gap-1 bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-gray-300 text-xs px-2.5 py-1 rounded-full">
                      <span>{tag}</span>
                      <button onClick={() => removeTag(tag)} className="text-gray-400 hover:text-red-500 ml-1">
                        <X size={10} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Group 4: General */}
        <div>
          <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl overflow-hidden shadow-sm mb-2">
            <button 
              onClick={handleClearCacheClick}
              disabled={isClearing || cacheSize === '0 KB'}
              className="w-full flex items-center justify-between px-4 py-3.5 border-b border-gray-100 dark:border-white/5 active:bg-gray-50 dark:active:bg-white/5 transition-colors disabled:opacity-70 disabled:active:bg-transparent"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-white/5 flex items-center justify-center text-gray-600 dark:text-gray-400">
                  <HardDrive className="w-4 h-4" />
                </div>
                <span className="text-[15px] text-gray-900 dark:text-white">{t('settings.clear_cache')}</span>
              </div>
              <span className="text-xs text-gray-400">
                {isClearing ? t('settings.cache_clearing') : cacheSize}
              </span>
            </button>
            <button className="w-full flex items-center justify-between px-4 py-3.5 active:bg-gray-50 dark:active:bg-white/5 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-white/5 flex items-center justify-center text-gray-600 dark:text-gray-400">
                  <Info className="w-4 h-4" />
                </div>
                <span className="text-[15px] text-gray-900 dark:text-white">{t('settings.about')}</span>
              </div>
              <span className="text-xs text-gray-400">v3.2.0</span>
            </button>
          </div>
          <div className="px-4 text-[11px] text-gray-400 dark:text-gray-500 leading-relaxed">
            {t('settings.clear_confirm_desc')}
          </div>
        </div>

        {/* Logout */}
        <button className="w-full bg-white dark:bg-[#1C1C1E] rounded-2xl flex items-center justify-center gap-2 py-3.5 text-red-500 font-medium shadow-sm active:bg-gray-50 dark:active:bg-white/5 transition-colors">
          <LogOut className="w-4 h-4" />
          {t('settings.logout')}
        </button>
        
      </div>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {showClearConfirm && (
          <div className="absolute inset-0 z-[9999] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setShowClearConfirm(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-[280px] bg-[#f2f2f2] dark:bg-[#1C1C1E] rounded-2xl overflow-hidden shadow-2xl flex flex-col"
            >
              <div className="p-5 pb-4 text-center">
                <h3 className="text-[17px] font-semibold text-black dark:text-white mb-1.5">{t('settings.clear_confirm_title')}</h3>
                <p className="text-[13px] text-gray-500 dark:text-gray-400 leading-snug">
                  {t('settings.clear_confirm_desc')}
                </p>
              </div>
              <div className="flex border-t border-gray-300 dark:border-gray-700/50">
                <button 
                  onClick={() => setShowClearConfirm(false)}
                  className="flex-1 py-3 text-[16px] text-blue-500 dark:text-blue-400 font-normal active:bg-gray-200/50 dark:active:bg-white/5 border-r border-gray-300 dark:border-gray-700/50 transition-colors"
                >
                  {t('common.cancel')}
                </button>
                <button 
                  onClick={confirmClearCache}
                  className="flex-1 py-3 text-[16px] text-red-500 dark:text-red-500 font-semibold active:bg-gray-200/50 dark:active:bg-white/5 transition-colors"
                >
                  {t('common.confirm')}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Bind Panel Modal */}
      <AnimatePresence>
        {bindModal.open && bindModal.platform && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setBindModal({ open: false, platform: null, link: '', command: '', qrValue: '' })}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-[320px] bg-[#f2f2f2] dark:bg-[#1C1C1E] rounded-2xl overflow-hidden shadow-2xl"
            >
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-[16px] font-semibold text-black dark:text-white">{PLATFORM_META[bindModal.platform].label} 连接</h3>
                <p className="text-[12px] text-gray-500 mt-1">请使用连接链接或二维码完成绑定</p>
              </div>
              <div className="p-4 space-y-3">
                <div className="bg-white dark:bg-[#2C2C2E] rounded-xl p-3">
                  <div className="text-[12px] text-gray-500 mb-1">连接链接</div>
                  <div className="text-[12px] break-all text-gray-800 dark:text-gray-200">{bindModal.link || bindModal.command}</div>
                </div>
                <button
                  onClick={async () => {
                    const content = bindModal.link || bindModal.command;
                    await navigator.clipboard.writeText(content);
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-blue-500 text-white text-[13px] font-medium"
                >
                  <Copy className="w-4 h-4" />
                  复制连接链接
                </button>
                <div className="bg-white dark:bg-[#2C2C2E] rounded-xl p-3">
                  <div className="text-[12px] text-gray-500 mb-2">二维码</div>
                  {bindModal.qrValue ? (
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(bindModal.qrValue)}`}
                      alt="bind-qr"
                      className="w-44 h-44 mx-auto rounded-md bg-white p-1"
                    />
                  ) : (
                    <div className="text-[12px] text-gray-400">暂无二维码内容</div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Unlink Modal */}
      <AnimatePresence>
        {!!unlinkPlatform && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setUnlinkPlatform(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-[280px] bg-[#f2f2f2] dark:bg-[#1C1C1E] rounded-2xl overflow-hidden shadow-2xl"
            >
              <div className="p-5 text-center">
                <h3 className="text-[16px] font-semibold text-black dark:text-white mb-2">确认解绑</h3>
                <p className="text-[13px] text-gray-500">是否解绑 {unlinkPlatform ? PLATFORM_META[unlinkPlatform].label : ''}？</p>
              </div>
              <div className="flex border-t border-gray-300 dark:border-gray-700/50">
                <button
                  onClick={() => setUnlinkPlatform(null)}
                  className="flex-1 py-3 text-[15px] text-blue-500 border-r border-gray-300 dark:border-gray-700/50"
                >
                  取消
                </button>
                <button
                  onClick={doUnlink}
                  className="flex-1 py-3 text-[15px] text-red-500 font-semibold"
                >
                  解绑
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};

// Internal icon X component
const X = ({ size = 24, ...props }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M18 6 6 18" />
    <path d="m6 6 12 12" />
  </svg>
);
