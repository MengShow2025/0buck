import React, { useState, useEffect } from 'react';
import { Bot, Key, ChevronDown, CheckCircle2, Server, ShieldCheck, Trash2, Power, PowerOff, RefreshCw } from 'lucide-react';
import { usePreferenceContext } from '../contexts/PreferenceContext';
import { useDrawerContext } from '../contexts/DrawerContext';
import { saveByokConfig, loadByokConfig, clearByokConfig } from '../../../services/byokStorage';

export const APIModelAddDrawer: React.FC = () => {
    const { popDrawer } = useDrawerContext();
  const { t } = usePreferenceContext();
  const [provider, setProvider] = useState('Google');
  const [model, setModel] = useState('gemini-2.5-flash');
  const [apiKey, setApiKey] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [isProviderOpen, setIsProviderOpen] = useState(false);
  const [isModelOpen, setIsModelOpen] = useState(false);
  const [existingConfig, setExistingConfig] = useState<any>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{success: boolean, message: string} | null>(null);

  useEffect(() => {
    const config = loadByokConfig();
    if (config) {
      setExistingConfig(config);
      setApiKey(config.apiKey);
      setModel(config.model);
      setProvider(config.provider === 'gemini' ? 'Google' : 'OpenAI');
    }
  }, []);

  const providers = ['OpenAI', 'Anthropic', 'Google', 'DeepSeek', 'Mistral'];
  const models: Record<string, string[]> = {
    'OpenAI': ['gpt-4-turbo', 'gpt-4o', 'gpt-3.5-turbo'],
    'Anthropic': ['claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku'],
    'Google': ['gemini-2.5-flash', 'gemini-2.5-pro'],
    'DeepSeek': ['deepseek-chat', 'deepseek-coder'],
    'Mistral': ['mistral-large', 'mistral-small']
  };

  const handleTestConnection = async () => {
    const trimmedKey = apiKey.trim();
    if (!trimmedKey) return;
    
    setIsTesting(true);
    setTestResult(null);
    
    try {
      // Simple test for Gemini API to check validity and Tier
      if (provider === 'Google') {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}?key=${trimmedKey}`);
        if (response.ok) {
          // Attempt to extract Tier from headers if possible, or just default to Valid
          const rateLimit = response.headers.get('x-ratelimit-limit');
          let tierInfo = 'Valid Key';
          
          if (rateLimit) {
            const limit = parseInt(rateLimit, 10);
            if (limit > 1000) tierInfo = 'Enterprise Tier (High RPM)';
            else if (limit > 100) tierInfo = 'Pro Tier (Med RPM)';
            else tierInfo = 'Free Tier (Low RPM)';
          }
          
          setTestResult({ success: true, message: `Connection successful! (${tierInfo})` });
        } else {
          const errorData = await response.json();
          setTestResult({ success: false, message: errorData.error?.message || 'Connection failed' });
        }
      } else {
        // Mock test for other providers for now
        await new Promise(resolve => setTimeout(resolve, 1000));
        setTestResult({ success: true, message: 'Connection successful! (Mock)' });
      }
    } catch (error: any) {
      setTestResult({ success: false, message: error.message || 'Network error' });
    } finally {
      setIsTesting(false);
    }
  };

  const handleToggleEnable = () => {
    if (existingConfig) {
      const newConfig = { ...existingConfig, enabled: !existingConfig.enabled };
      saveByokConfig(newConfig);
      setExistingConfig(newConfig);
    }
  };

  const handleClear = () => {
    clearByokConfig();
    setExistingConfig(null);
    setApiKey('');
    setTestResult(null);
  };

  const handleSubmit = () => {
    const trimmedKey = apiKey.trim();
    if (!trimmedKey) return;

    if (provider === 'Google') {
      saveByokConfig({
        enabled: true,
        provider: 'gemini',
        model,
        apiKey: trimmedKey,
      });
    }

    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="flex flex-col h-full bg-[#F2F2F7] dark:bg-[#000000] p-6 pb-32 items-center justify-center text-center space-y-6">
        <div className="w-24 h-24 bg-emerald-500 rounded-full flex items-center justify-center text-white shadow-xl shadow-emerald-500/30 animate-in zoom-in-50">
          <CheckCircle2 className="w-12 h-12" />
        </div>
        <div className="space-y-2">
          <h2 className="text-[24px] font-black text-gray-900 dark:text-white">{t('api_model.success_title')}</h2>
          <p className="text-[14px] text-gray-500 font-medium">
            {t('api_model.success_desc')}
          </p>
        </div>
        <button
          onClick={() => popDrawer()}
          className="w-full text-white py-4 rounded-[24px] font-semibold text-[16px] shadow-lg active:scale-95 transition-all mt-8"
          style={{ background: 'linear-gradient(135deg, #FF7A3D 0%, #E8450A 100%)', boxShadow: '0 4px 14px rgba(232,69,10,0.30)' }}
        >
          {t('withdraw.back_to_wallet')}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#F2F2F7] dark:bg-[#000000] p-4 gap-6 pb-32 overflow-y-auto no-scrollbar">
      <div className="text-center space-y-2 mt-4">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-500 rounded-3xl shadow-lg shadow-blue-500/20 mb-2">
          <Bot className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-[22px] font-black text-gray-900 dark:text-white tracking-tight">{t('wallet.add_custom_model_action')}</h2>
        <p className="text-[12px] text-gray-500 font-bold px-4">
          {t('api_model.desc')}
        </p>
      </div>

      <div className="bg-white dark:bg-[#1C1C1E] p-6 rounded-[32px] shadow-sm border border-gray-100 dark:border-white/5 space-y-5">
        
        {/* Provider */}
        <div className="space-y-2">
          <label className="text-[12px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5 ml-1">
            <span className="text-red-500">*</span> {t('api_model.provider')}
          </label>
          <div className="relative">
            <button
              type="button"
              onClick={() => { setIsProviderOpen(!isProviderOpen); setIsModelOpen(false); }}
              className="w-full h-14 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl px-4 text-[16px] font-black text-gray-900 dark:text-white focus:ring-2 focus:ring-[var(--wa-teal)] transition-all outline-none flex items-center justify-between"
            >
              <span>{provider}</span>
              <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${isProviderOpen ? 'rotate-180' : ''}`} />
            </button>
            
            {/* Custom Dropdown */}
              {isProviderOpen && (
                <>
                  <div className="absolute inset-0 z-40" onClick={() => setIsProviderOpen(false)}></div>
                  <div className="absolute top-[calc(100%+8px)] left-0 right-0 bg-white dark:bg-[#2C2C2E] border border-gray-100 dark:border-white/10 rounded-2xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
                  {providers.map(p => (
                    <div
                      key={p}
                      onClick={() => {
                        setProvider(p);
                        setModel(models[p][0]);
                        setIsProviderOpen(false);
                      }}
                      className={`px-4 py-4 text-[16px] font-bold cursor-pointer transition-colors ${provider === p ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5'}`}
                    >
                      {p}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Model */}
        <div className="space-y-2">
          <label className="text-[12px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5 ml-1">
            <span className="text-red-500">*</span> {t('api_model.model')}
          </label>
          <div className="relative">
            <button
              type="button"
              onClick={() => { setIsModelOpen(!isModelOpen); setIsProviderOpen(false); }}
              className="w-full h-14 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl px-4 text-[16px] font-black text-gray-900 dark:text-white focus:ring-2 focus:ring-[var(--wa-teal)] transition-all outline-none flex items-center justify-between"
            >
              <span>{model}</span>
              <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${isModelOpen ? 'rotate-180' : ''}`} />
            </button>
            
            {/* Custom Dropdown */}
            {isModelOpen && (
                <>
                  <div className="absolute inset-0 z-40" onClick={() => setIsModelOpen(false)}></div>
                <div className="absolute top-[calc(100%+8px)] left-0 right-0 bg-white dark:bg-[#2C2C2E] border border-gray-100 dark:border-white/10 rounded-2xl shadow-xl z-50 max-h-[240px] overflow-y-auto scrollbar-hide animate-in fade-in slide-in-from-top-2">
                  {models[provider]?.map(m => (
                    <div
                      key={m}
                      onClick={() => {
                        setModel(m);
                        setIsModelOpen(false);
                      }}
                      className={`px-4 py-4 text-[16px] font-bold cursor-pointer transition-colors ${model === m ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5'}`}
                    >
                      {m}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* API Key */}
        <div className="space-y-2">
          <label className="text-[12px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5 ml-1">
            <span className="text-red-500">*</span> {t('api_model.api_key')}
          </label>
          <div className="relative">
            <input 
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={t('api_model.api_key_placeholder')}
              className="w-full h-14 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl px-11 text-[15px] font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-[var(--wa-teal)] transition-all outline-none"
            />
            <Key className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
          </div>
          <div className="bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/30 p-3 rounded-2xl mt-2 flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
            <p className="text-[10px] text-emerald-600 dark:text-emerald-500 font-bold leading-relaxed">
              {t('api_model.privacy_note')}
            </p>
          </div>
        </div>

        <div className="pt-4 border-t border-gray-100 dark:border-white/5 space-y-3">
          {testResult && (
            <div className={`p-3 rounded-xl text-[13px] font-medium flex items-start gap-2 ${testResult.success ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' : 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400'}`}>
              {testResult.success ? <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" /> : <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />}
              <span>{testResult.message}</span>
            </div>
          )}

          <div className="flex gap-3">
            <button 
              onClick={handleTestConnection}
              disabled={!apiKey || isTesting}
              className={`flex-1 py-3.5 rounded-[20px] font-bold text-[15px] transition-all flex items-center justify-center gap-2 ${
                apiKey && !isTesting
                  ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 active:scale-95' 
                  : 'bg-gray-100 dark:bg-white/5 text-gray-400 cursor-not-allowed'
              }`}
            >
              <RefreshCw className={`w-4 h-4 ${isTesting ? 'animate-spin' : ''}`} />
              {isTesting ? 'Testing...' : 'Test Connection'}
            </button>

            {existingConfig && (
              <button 
                onClick={handleToggleEnable}
                className={`flex-1 py-3.5 rounded-[20px] font-bold text-[15px] transition-all flex items-center justify-center gap-2 active:scale-95 ${
                  existingConfig.enabled
                    ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400'
                    : 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                }`}
              >
                {existingConfig.enabled ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
                {existingConfig.enabled ? 'Disable' : 'Enable'}
              </button>
            )}
          </div>

          <div className="flex gap-3">
            <button 
              onClick={handleSubmit}
              disabled={!apiKey}
              className={`flex-[2] py-4 rounded-[24px] font-semibold text-[16px] transition-all shadow-lg flex items-center justify-center gap-2 ${
                apiKey 
                  ? 'bg-gray-900 dark:bg-white text-white dark:text-black active:scale-95' 
                  : 'bg-gray-100 dark:bg-white/5 text-gray-400 cursor-not-allowed'
              }`}
            >
              <Server className="w-5 h-5" />
              {existingConfig ? 'Update Config' : t('common.add')}
            </button>

            {existingConfig && (
              <button 
                onClick={handleClear}
                className="flex-1 py-4 rounded-[24px] font-bold text-[15px] transition-all flex items-center justify-center gap-2 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 active:scale-95"
              >
                <Trash2 className="w-5 h-5" />
                Clear
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
