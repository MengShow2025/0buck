import React, { useState, useRef, useEffect } from 'react';
import { Star, ShieldCheck, TrendingUp, Users, MessageSquare, ArrowRight, CheckCircle2, Award, Zap, Sparkles, ChevronDown } from 'lucide-react';
import { usePreferenceContext } from '../contexts/PreferenceContext';
import { useDrawerContext } from '../contexts/DrawerContext';

export const InfluencerApplyDrawer: React.FC = () => {
    const { popDrawer } = useDrawerContext();
  const { t } = usePreferenceContext();
  const [step, setStep] = useState(1);
  const [showOtherPlatform, setShowOtherPlatform] = useState(false);
  const [isPlatformDropdownOpen, setIsPlatformDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [showOtherNiche, setShowOtherNiche] = useState(false);
  const [selectedNiches, setSelectedNiches] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    platform: 'TikTok',
    followers: '',
    experience: ''
  });

  const platforms = ['TikTok', 'Instagram', 'YouTube', 'Facebook Group', 'Discord Server', 'Other'];
  const nicheTags = [
    t('influencer.niche_tech'), 
    t('influencer.niche_home'), 
    t('influencer.niche_beauty'), 
    t('influencer.niche_sports'), 
    t('influencer.niche_pets'), 
    t('influencer.niche_fashion')
  ];

  const toggleNiche = (tag: string) => {
    setSelectedNiches(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag) 
        : [...prev, tag]
    );
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsPlatformDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNext = () => setStep(step + 1);

  const perks = [
    { icon: Zap, title: t('influencer.perk_commission'), desc: t('influencer.perk_commission_desc'), color: 'text-orange-500', bg: 'bg-orange-50' },
    { icon: TrendingUp, title: t('influencer.perk_traffic'), desc: t('influencer.perk_traffic_desc'), color: 'text-blue-500', bg: 'bg-blue-50' },
    { icon: Award, title: t('influencer.perk_negotiation'), desc: t('influencer.perk_negotiation_desc'), color: 'text-purple-500', bg: 'bg-purple-50' },
    { icon: ShieldCheck, title: t('influencer.perk_badge'), desc: t('influencer.perk_badge_desc'), color: 'text-[var(--wa-teal)]', bg: 'bg-[var(--wa-teal)]/10' }
  ];

  return (
    <div className="flex flex-col h-full bg-[#F2F2F7] dark:bg-[#000000] p-4 gap-6 pb-32 overflow-y-auto no-scrollbar">
      {/* Header Section */}
      <div className="text-center space-y-2 mt-4">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-[32px] shadow-lg shadow-purple-500/20 mb-2">
          <Star className="w-10 h-10 text-white fill-white/20" />
        </div>
        <h2 className="text-[24px] font-black text-gray-900 dark:text-white tracking-tight">{t('influencer.apply_title')}</h2>
        <p className="text-[13px] text-gray-500 font-medium px-8">{t('influencer.apply_desc')}</p>
      </div>

      {step === 1 && (
        <>
          {/* Perks Grid */}
          <div className="grid grid-cols-2 gap-3">
            {perks.map((perk, idx) => (
              <div key={idx} className="bg-white dark:bg-[#1C1C1E] p-4 rounded-[28px] border border-gray-100 dark:border-white/5 space-y-2 shadow-sm">
                <div className={`w-10 h-10 ${perk.bg} dark:bg-white/5 rounded-2xl flex items-center justify-center ${perk.color}`}>
                  <perk.icon className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-[13px] font-black text-gray-900 dark:text-white">{perk.title}</h4>
                  <p className="text-[10px] text-gray-400 font-bold leading-tight mt-0.5">{perk.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Action Button */}
          <div className="mt-4">
            <button 
              onClick={handleNext}
              className="w-full text-white py-5 rounded-[24px] font-semibold text-[16px] flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
              style={{ background: 'linear-gradient(135deg, #FF7A3D 0%, #E8450A 100%)', boxShadow: '0 4px 14px rgba(232,69,10,0.30)' }}
            >
              <span>{t('influencer.start_apply')}</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </>
      )}

      {step === 2 && (
        <div className="bg-white dark:bg-[#1C1C1E] rounded-[32px] p-6 shadow-xl border border-gray-100 dark:border-white/5 space-y-6">
          <div className="space-y-4">
            <div className="space-y-2 relative" ref={dropdownRef}>
              <label className="text-[12px] font-black text-gray-400 uppercase tracking-widest ml-1">{t('influencer.main_platform')}</label>
              <div 
                className="w-full h-14 bg-gray-50 dark:bg-white/5 border border-transparent rounded-2xl px-4 flex items-center justify-between cursor-pointer transition-all focus-within:ring-2 focus-within:ring-[var(--wa-teal)]"
                onClick={() => setIsPlatformDropdownOpen(!isPlatformDropdownOpen)}
              >
                <span className="text-[15px] font-black text-gray-900 dark:text-white">
                  {formData.platform}
                </span>
                <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${isPlatformDropdownOpen ? 'rotate-180' : ''}`} />
              </div>
              
              {isPlatformDropdownOpen && (
                <div className="absolute z-50 w-full mt-2 bg-white dark:bg-[#2C2C2E] border border-gray-100 dark:border-white/10 rounded-2xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.15)] overflow-hidden animate-in fade-in slide-in-from-top-2">
                  <div className="max-h-[240px] overflow-y-auto no-scrollbar">
                    {platforms.map((platform) => (
                      <button
                        key={platform}
                        onClick={() => {
                          setFormData({ ...formData, platform });
                          setShowOtherPlatform(platform === 'Other');
                          setIsPlatformDropdownOpen(false);
                        }}
                        className={`w-full text-left px-4 py-4 text-[15px] font-semibold transition-colors ${
                          formData.platform === platform 
                            ? 'bg-[var(--wa-teal)]/10 text-[var(--wa-teal)]' 
                            : 'text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-white/5'
                        }`}
                      >
                        {platform}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {showOtherPlatform && (
                <input 
                  type="text" 
                  placeholder={t('influencer.other_platform_placeholder')}
                  className="w-full h-14 mt-2 bg-gray-50 dark:bg-white/5 border-none rounded-2xl px-4 text-[15px] font-black text-gray-900 dark:text-white focus:ring-2 focus:ring-[var(--wa-teal)] transition-all placeholder:text-gray-300 animate-in fade-in slide-in-from-top-1"
                />
              )}
            </div>

            <div className="space-y-2">
              <label className="text-[12px] font-black text-gray-400 uppercase tracking-widest ml-1">{t('influencer.followers_label')}</label>
              <input 
                type="text" 
                placeholder={t('influencer.followers_placeholder')}
                className="w-full bg-gray-50 dark:bg-white/5 border-none rounded-2xl p-4 text-[15px] font-black text-gray-900 dark:text-white focus:ring-2 focus:ring-[var(--wa-teal)] transition-all placeholder:text-gray-300"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[12px] font-black text-gray-400 uppercase tracking-widest ml-1">{t('influencer.niche_label')}</label>
              <div className="flex flex-wrap gap-2">
                {nicheTags.map(tag => {
                  const isSelected = selectedNiches.includes(tag);
                  return (
                    <button 
                      key={tag} 
                      onClick={() => toggleNiche(tag)}
                      className={`px-4 py-2 rounded-full text-[12px] font-semibold transition-colors border ${
                        isSelected
                          ? 'text-white border-transparent shadow-sm'
                          : 'bg-gray-50 dark:bg-white/5 text-gray-500 border-gray-100 dark:border-white/5'
                      }`}
                      style={isSelected ? { background: 'linear-gradient(135deg, #FF7A3D 0%, #E8450A 100%)' } : {}}
                    >
                      {tag}
                    </button>
                  );
                })}
                <button 
                  onClick={() => setShowOtherNiche(!showOtherNiche)}
                  className={`px-4 py-2 rounded-full text-[12px] font-semibold transition-colors border ${
                    showOtherNiche 
                      ? 'bg-[var(--wa-teal)]/10 text-[var(--wa-teal)] border-[var(--wa-teal)]/30' 
                      : 'bg-gray-50 dark:bg-white/5 text-gray-500 border-gray-100 dark:border-white/5'
                  }`}
                >
                  {t('influencer.niche_other')}
                </button>
              </div>
              {showOtherNiche && (
                <input 
                  type="text" 
                  placeholder={t('influencer.other_niche_placeholder')}
                  className="w-full h-12 mt-2 bg-gray-50 dark:bg-white/5 border-none rounded-2xl px-4 text-[13px] font-black text-gray-900 dark:text-white focus:ring-2 focus:ring-[var(--wa-teal)] transition-all placeholder:text-gray-300 animate-in fade-in slide-in-from-top-1"
                />
              )}
            </div>

            <div className="space-y-2">
              <label className="text-[12px] font-black text-gray-400 uppercase tracking-widest ml-1">{t('influencer.intro_label')}</label>
              <textarea 
                rows={4}
                placeholder={t('influencer.intro_placeholder')}
                className="w-full bg-gray-50 dark:bg-white/5 border-none rounded-2xl p-4 text-[15px] font-black text-gray-900 dark:text-white focus:ring-2 focus:ring-[var(--wa-teal)] transition-all placeholder:text-gray-300 resize-none"
              />
            </div>
          </div>

          <button 
            onClick={handleNext}
            className="w-full text-white py-5 rounded-[24px] font-semibold text-[16px] active:scale-[0.98] transition-all"
            style={{ background: 'linear-gradient(135deg, #FF7A3D 0%, #E8450A 100%)', boxShadow: '0 4px 14px rgba(232,69,10,0.30)' }}
          >
            {t('influencer.submit_apply')}
          </button>
        </div>
      )}

      {step === 3 && (
        <div className="bg-white dark:bg-[#1C1C1E] rounded-[32px] p-8 shadow-xl border border-gray-100 dark:border-white/5 text-center space-y-6">
          <div className="relative inline-flex items-center justify-center">
            <div className="absolute inset-0 bg-emerald-400/20 rounded-full animate-ping" />
            <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center text-white relative z-10">
              <CheckCircle2 className="w-10 h-10" />
            </div>
          </div>
          
          <div className="space-y-2">
            <h3 className="text-[20px] font-black text-gray-900 dark:text-white">{t('influencer.submitted_title')}</h3>
            <p className="text-[14px] text-gray-500 font-medium px-4">
              {t('influencer.submitted_desc')}
            </p>
          </div>

          <div className="bg-gray-50 dark:bg-white/5 rounded-2xl p-4 flex items-start gap-3 text-left">
            <MessageSquare className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-[12px] font-black text-gray-900 dark:text-white">{t('influencer.review_tip_title')}</p>
              <p className="text-[11px] text-gray-500 font-medium">
                {t('influencer.review_tip_desc')}
              </p>
            </div>
          </div>

          <button 
            onClick={() => popDrawer()}
            className="w-full bg-gray-900 dark:bg-white text-white dark:text-black py-5 rounded-[24px] font-semibold text-[16px] active:scale-[0.98] transition-all"
          >
            {t('influencer.back_to_center')}
          </button>
        </div>
      )}

      {/* Trust Badges */}
      <div className="flex items-center justify-center gap-6 opacity-30 mt-auto">
        <div className="flex items-center gap-1.5 grayscale">
          <Sparkles className="w-4 h-4" />
          <span className="text-[10px] font-black uppercase tracking-widest">Verified Creator</span>
        </div>
        <div className="flex items-center gap-1.5 grayscale">
          <ShieldCheck className="w-4 h-4" />
          <span className="text-[10px] font-black uppercase tracking-widest">Secure Payments</span>
        </div>
      </div>
    </div>
  );
};