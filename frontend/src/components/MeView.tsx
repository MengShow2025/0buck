import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import { 
  Terminal, ShieldCheck, Wallet, Star, HelpCircle, Info,
  Calendar, TrendingUp, History, Share2, Eye, Settings,
  Shield, Lock, Globe, Book, LogOut, User, ChevronRight, ChevronDown, X,
  Sparkles, ArrowRight, Bell, MessageSquare, Users, Mail,
  Palette, Smartphone, EyeOff, Trash2, Menu
} from 'lucide-react';

const LANGUAGES = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'zh-CN', name: '简体中文', flag: '🇨🇳' },
  { code: 'zh-TW', name: '繁體中文', flag: '🇭🇰' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'it', name: 'Italiano', flag: '🇮🇹' },
  { code: 'ru', name: 'Русский', flag: '🇷🇺' },
  { code: 'ar', name: 'العربية', flag: '🇸🇦' },
  { code: 'ja', name: '日本語', flag: '🇯🇵' },
  { code: 'ko', name: '한국어', flag: '🇰🇷' },
  { code: 'th', name: 'ไทย', flag: '🇹🇭' },
  { code: 'ms', name: 'Bahasa Melayu', flag: '🇲🇾' },
  { code: 'vi', name: 'Tiếng Việt', flag: '🇻🇳' },
];

export default function MeView({ 
  isAuthenticated, 
  onLoginClick, 
  onLogout, 
  agentName,
  onAgentNameChange,
  deviceType = 'web',
  onMenuClick
}: { 
  isAuthenticated: boolean; 
  onLoginClick: () => void; 
  onLogout: () => void;
  agentName: string;
  onAgentNameChange: (name: string) => void;
  deviceType?: string;
  onMenuClick?: () => void;
}) {
  const { t, i18n } = useTranslation();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const [showSettings, setShowSettings] = useState(false);
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const [showRulesModal, setShowRulesModal] = useState<'points' | 'renewal' | 'rewards' | null>(null);
  const [draftAgentName, setDraftAgentName] = useState(agentName);
  const [useByok, setUseByok] = useState(false);
  
  // v3.4.5: Dynamic Countdown Logic
  const [timeLeft, setTimeLeft] = useState({ days: 4, hrs: 18, min: 52, sec: 30 });

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev.sec > 0) return { ...prev, sec: prev.sec - 1 };
        if (prev.min > 0) return { ...prev, min: prev.min - 1, sec: 59 };
        if (prev.hrs > 0) return { ...prev, hrs: prev.hrs - 1, min: 59, sec: 59 };
        if (prev.days > 0) return { ...prev, days: prev.days - 1, hrs: 23, min: 59, sec: 59 };
        return prev;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const isAgentNameDirty = useMemo(() => draftAgentName.trim() !== agentName.trim(), [agentName, draftAgentName]);

  const FlipDigit = useMemo(() => {
    return ({ value, color = "text-white" }: { value: string | number, color?: string }) => (
      <div className="relative w-7 sm:w-10 h-10 sm:h-14 overflow-hidden">
        <AnimatePresence mode="popLayout">
          <motion.div
            key={value}
            initial={{ y: "100%", opacity: 0, rotateX: -90 }}
            animate={{ y: "0%", opacity: 1, rotateX: 0 }}
            exit={{ y: "-100%", opacity: 0, rotateX: 90 }}
            transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
            className={`absolute inset-0 flex items-center justify-center text-3xl sm:text-4xl font-headline font-black bg-zinc-900 rounded-lg border border-white/5 shadow-inner ${color}`}
          >
            {value}
          </motion.div>
        </AnimatePresence>
      </div>
    );
  }, []);

  useEffect(() => {
    setDraftAgentName(agentName);
  }, [agentName]);

  if (!isAuthenticated) {
    return (
      <div className={`h-full flex flex-col items-center justify-center p-6 relative ${isDark ? 'bg-[#0a0a0a] text-[#e5e5e5]' : 'bg-[#fff8f6] text-[#271814]'}`}>
        {onMenuClick && deviceType === 'h5' && (
           <button 
             onClick={onMenuClick}
             className={`absolute top-6 left-6 w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
               isDark ? 'bg-white/5 border border-white/10 text-zinc-400 hover:text-primary' : 'bg-black/5 border border-black/10 text-zinc-600 hover:text-primary'
             }`}
           >
             <Menu className="w-5 h-5" />
           </button>
         )}
        <div className="w-24 h-24 rounded-full bg-zinc-900/50 border border-white/5 flex items-center justify-center mb-6 shadow-2xl">
          <User className="w-12 h-12 text-zinc-500" />
        </div>
        <h2 className="text-3xl font-black font-headline tracking-tighter mb-3 uppercase">{t('me.node_disconnected')}</h2>
        <p className="text-zinc-500 text-center max-w-md mb-8 text-sm font-bold tracking-widest uppercase">{t('me.auth_desc')}</p>
        <button 
          onClick={onLoginClick}
          className="px-10 py-4 bg-primary text-white rounded-2xl font-black uppercase tracking-[0.2em] hover:scale-105 active:scale-95 transition-all shadow-[0_0_20px_rgba(255,92,0,0.3)]"
        >
          {t('me.init_conn')}
        </button>
      </div>
    );
  }

  return (
    <div className="pt-2 sm:pt-8 pb-24 px-1 sm:px-8 max-w-[1600px] mx-auto space-y-2 sm:space-y-8 font-body relative">
      {onMenuClick && deviceType === 'h5' && (
        <button 
          onClick={onMenuClick}
          className="fixed top-4 left-4 w-10 h-10 rounded-xl bg-zinc-900/80 backdrop-blur-md border border-white/10 flex items-center justify-center text-zinc-400 hover:text-primary transition-colors z-50 shadow-2xl"
        >
          <Menu className="w-5 h-5" />
        </button>
      )}
      {/* Header Section */}
      <header className="glass-panel rounded-[1rem] sm:rounded-[2.5rem] p-3 sm:p-10 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 blur-[100px] -mr-32 -mt-32 rounded-full"></div>
        
        <div className="relative z-10 flex flex-col items-center">
          <div className="flex items-center gap-4 mb-6 sm:mb-8">
            <div className="w-14 h-14 sm:w-20 sm:h-20 rounded-[1.25rem] sm:rounded-[2rem] bg-zinc-900 border border-white/10 overflow-hidden p-1 flex-shrink-0">
              <div className="w-full h-full rounded-[1rem] sm:rounded-[1.75rem] bg-primary/10 flex items-center justify-center text-primary">
                <User className="w-7 h-7 sm:w-10 sm:h-10" />
              </div>
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2 text-primary mb-0.5">
                <Terminal className="w-3 h-3 sm:w-4 h-4" />
                <span className="text-[10px] sm:text-[10px] font-black tracking-[0.2em] sm:tracking-[0.3em] uppercase">{t('me.secure_terminal')}</span>
              </div>
              <h1 className="font-headline text-xl sm:text-4xl font-extrabold tracking-tighter text-white flex items-center gap-2 sm:gap-3">
                <input 
                    type="text" 
                    defaultValue="Julian Rossi"
                    className="bg-transparent border-none outline-none focus:ring-0 focus:border-b focus:border-primary/50 transition-all p-0 w-full max-w-[120px] sm:max-w-[200px]"
                  />
                <button className="text-zinc-500 hover:text-primary transition-colors ml-4 sm:ml-6">
                  <Settings className="w-3.5 h-3.5 sm:w-4 h-4" />
                </button>
              </h1>
              <p className="text-[10px] sm:text-sm font-bold text-zinc-500 tracking-widest uppercase mt-0.5">Pro Member • Node ID: 8829-QX</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-6 w-full">
            {/* Wallet Card 1: Cash */}
            <div className="glass-panel rounded-[1.25rem] sm:rounded-[2rem] p-3 sm:p-6 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <Wallet className="w-12 h-12 sm:w-16 sm:h-16" />
              </div>
              <div className="relative z-10">
                <div className="flex justify-between items-start mb-4 sm:mb-6">
                  <div>
                    <p className="text-[9px] sm:text-[10px] text-zinc-500 uppercase tracking-widest font-black">{t('me.cash_balance')}</p>
                    <h2 className="text-2xl sm:text-3xl font-headline font-black text-white mt-1">$12,480.<span className="text-zinc-500 text-lg sm:text-xl">50</span></h2>
                  </div>
                  <span className="px-2 py-1 bg-green-500/10 text-green-500 text-[9px] sm:text-[10px] font-black rounded uppercase">USD</span>
                </div>
                <div className="flex gap-2">
                  <button className="flex-1 py-2 sm:py-2.5 bg-white/5 border border-white/5 hover:border-primary/50 transition-all rounded-xl text-[10px] sm:text-[10px] font-black text-zinc-300 uppercase tracking-widest">{t('me.details')}</button>
                  <button className="flex-1 py-2 sm:py-2.5 bg-white/5 border border-white/5 hover:border-primary/50 transition-all rounded-xl text-[10px] sm:text-[10px] font-black text-zinc-300 uppercase tracking-widest">{t('me.withdraw')}</button>
                  <button 
                    onClick={() => setShowRulesModal('renewal')}
                    className="px-3 sm:px-4 py-2 sm:py-2.5 bg-white/5 border border-white/5 hover:bg-white/10 transition-all rounded-xl"
                  >
                    <HelpCircle className="w-3.5 h-3.5 sm:w-4 h-4 text-zinc-500" />
                  </button>
                </div>
              </div>
            </div>

            {/* Wallet Card 2: Points */}
            <div className="glass-panel rounded-[1.25rem] sm:rounded-[2rem] p-3 sm:p-6 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <Star className="w-12 h-12 sm:w-16 sm:h-16" />
              </div>
              <div className="relative z-10">
                <div className="flex justify-between items-start mb-4 sm:mb-6">
                  <div>
                    <p className="text-[9px] sm:text-[10px] text-zinc-500 uppercase tracking-widest font-black">{t('me.precision_points')}</p>
                    <h2 className="text-2xl sm:text-3xl font-headline font-black text-primary mt-1">45,200 <span className="text-zinc-500 text-sm sm:text-xl font-medium uppercase text-xs">0BK</span></h2>
                  </div>
                  <span className="px-2 py-1 bg-primary/10 text-primary text-[9px] sm:text-[10px] font-black rounded uppercase">Tier 1</span>
                </div>
                <div className="flex gap-2">
                  <button className="flex-1 py-2 sm:py-2.5 bg-primary/10 border border-primary/20 hover:bg-primary/20 transition-all rounded-xl text-[10px] sm:text-[10px] font-black text-primary uppercase tracking-widest">{t('me.details')}</button>
                  <button className="flex-1 py-2 sm:py-2.5 bg-primary/10 border border-primary/20 hover:bg-primary/20 transition-all rounded-xl text-[10px] sm:text-[10px] font-black text-primary uppercase tracking-widest">{t('me.redeem')}</button>
                  <button 
                    onClick={() => setShowRulesModal('points')}
                    className="px-3 sm:px-4 py-2 sm:py-2.5 bg-white/5 border border-white/5 hover:bg-white/10 transition-all rounded-xl"
                  >
                    <Info className="w-3.5 h-3.5 sm:w-4 h-4 text-zinc-500" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Stats Section */}
      <div className="relative glass-panel rounded-[1rem] sm:rounded-[3rem] p-3 sm:p-8 border-primary/20 bg-black/40 overflow-hidden">
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-primary/5 to-transparent pointer-events-none"></div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 relative z-10">
          <div className="lg:col-span-5 space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-primary rounded-xl sm:rounded-2xl flex items-center justify-center shadow-[0_0_20px_rgba(255,92,0,0.3)]">
                <Calendar className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg sm:text-xl font-headline font-black text-white">{t('me.signin_cashback')}</h3>
                <p className="text-[10px] sm:text-xs text-zinc-500 uppercase font-black tracking-widest">{t('me.phase_active')}</p>
              </div>
            </div>

            <div className="flex items-end gap-4">
              <div>
                <p className="text-[9px] sm:text-[10px] font-black text-zinc-500 uppercase mb-1 sm:mb-2">{t('me.current_streak')}</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl sm:text-6xl font-black text-white tracking-tighter">12</span>
                  <span className="text-zinc-500 font-bold text-sm sm:text-base">{t('me.days')}</span>
                </div>
              </div>
              <div className="flex-1 pb-2">
                <div className="h-1.5 sm:h-2 w-full bg-zinc-900 rounded-full overflow-hidden">
                  <div className="h-full bg-primary w-[80%] shadow-[0_0_12px_rgba(255,92,0,0.5)]"></div>
                </div>
                <p className="text-[8px] sm:text-[9px] text-zinc-600 mt-2 font-bold uppercase tracking-widest">{t('me.next_milestone')}</p>
              </div>
            </div>

            <div className="flex flex-col items-center">
              <p className="text-[9px] sm:text-[10px] font-black text-zinc-500 uppercase mb-3 sm:mb-4 tracking-[0.2em] sm:tracking-[0.3em]">{t('me.phase_ends')}</p>
              <div className="flex justify-center items-start gap-3 sm:gap-4 h-14 sm:h-16">
                <div className="flex flex-col items-center gap-1 sm:gap-2">
                  <div className="flex gap-1">
                    <FlipDigit value={Math.floor(timeLeft.days / 10)} />
                    <FlipDigit value={timeLeft.days % 10} />
                  </div>
                  <span className="text-[7px] sm:text-[9px] font-black text-zinc-600 uppercase tracking-widest">{t('me.days')}</span>
                </div>
                <div className="text-xl sm:text-2xl font-headline font-black text-zinc-800 pt-1">:</div>
                <div className="flex flex-col items-center gap-1 sm:gap-2">
                  <div className="flex gap-1">
                    <FlipDigit value={Math.floor(timeLeft.hrs / 10)} />
                    <FlipDigit value={timeLeft.hrs % 10} />
                  </div>
                  <span className="text-[7px] sm:text-[9px] font-black text-zinc-600 uppercase tracking-widest">{t('me.hrs')}</span>
                </div>
                <div className="text-xl sm:text-2xl font-headline font-black text-zinc-800 pt-1">:</div>
                <div className="flex flex-col items-center gap-1 sm:gap-2">
                  <div className="flex gap-1">
                    <FlipDigit value={Math.floor(timeLeft.min / 10)} />
                    <FlipDigit value={timeLeft.min % 10} />
                  </div>
                  <span className="text-[7px] sm:text-[9px] font-black text-zinc-600 uppercase tracking-widest">{t('me.min')}</span>
                </div>
                <div className="text-xl sm:text-2xl font-headline font-black text-zinc-800 pt-1">:</div>
                <div className="flex flex-col items-center gap-1 sm:gap-2">
                  <div className="flex gap-1">
                    <FlipDigit value={Math.floor(timeLeft.sec / 10)} color="text-primary" />
                    <FlipDigit value={timeLeft.sec % 10} color="text-primary" />
                  </div>
                  <span className="text-[7px] sm:text-[9px] font-black text-primary uppercase tracking-widest">{t('me.sec')}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-7 flex flex-col justify-between">
            <div className="grid grid-cols-2 gap-2 sm:gap-4">
              <div className="p-3 sm:p-6 bg-white/5 rounded-[1rem] sm:rounded-3xl border border-white/5 relative group">
                <button 
                  onClick={() => setShowRulesModal('rewards')}
                  className="absolute top-3 right-3 sm:top-4 sm:right-4 p-1 hover:bg-white/5 rounded-full text-zinc-500 hover:text-white transition-colors"
                >
                  <Info className="w-3.5 h-3.5 sm:w-4 h-4" />
                </button>
                <p className="text-[9px] sm:text-[10px] text-zinc-500 uppercase font-black tracking-widest mb-1">{t('me.potential_reward')}</p>
                <p className="text-sm sm:text-sm font-black text-white">$45.00</p>
                <button className="mt-3 sm:mt-4 w-full py-2 bg-primary text-white rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-primary/20">
                  {t('me.signin')}
                </button>
              </div>
              <div className="p-3 sm:p-6 bg-primary/5 rounded-[1rem] sm:rounded-3xl border border-primary/10 relative group">
                <button 
                  onClick={() => setShowRulesModal('rewards')}
                  className="absolute top-3 right-3 sm:top-4 sm:right-4 p-1 hover:bg-primary/10 rounded-full text-zinc-500 hover:text-primary transition-colors"
                >
                  <Info className="w-3.5 h-3.5 sm:w-4 h-4" />
                </button>
                <p className="text-[9px] sm:text-[10px] text-primary uppercase font-black tracking-widest mb-1">{t('me.total_reclaimed')}</p>
                <p className="text-sm sm:text-sm font-black text-white">$1,240.65</p>
                <div className="mt-3 sm:mt-4 flex items-center gap-1.5 sm:gap-2 text-green-500">
                  <TrendingUp className="w-3 h-3 sm:w-4 h-4" />
                  <span className="text-[8px] sm:text-[10px] font-bold tracking-widest uppercase">+12.4% vs Phase 03</span>
                </div>
              </div>
            </div>

            <div className="mt-6 sm:mt-6">
              <p className="text-[9px] sm:text-[10px] text-zinc-500 uppercase font-black tracking-widest mb-2 sm:mb-3">{t('me.order_history_phase')}</p>
              <div className="flex gap-2 overflow-x-auto pb-2 scroll-hide">
                {[
                  { id: '#8821-ORD', amount: '$120.00', status: 'Verified', statusColor: 'text-primary' },
                  { id: '#8845-ORD', amount: '$450.00', status: 'Verified', statusColor: 'text-primary' },
                  { id: '#8901-ORD', amount: '$95.20', status: 'Pending', statusColor: 'text-orange-500' }
                ].map((order, i) => (
                  <div key={i} className="min-w-[120px] sm:min-w-[140px] p-2.5 sm:p-3 bg-white/5 rounded-xl sm:rounded-2xl border border-white/5 flex flex-col gap-0.5 sm:gap-1">
                    <span className="text-[9px] sm:text-[10px] font-bold text-white">{order.id}</span>
                    <span className="text-xs font-black text-primary">{order.amount}</span>
                    <span className={`text-[8px] sm:text-[9px] uppercase font-black tracking-widest ${order.statusColor}`}>{order.status}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Order History Table (Restored & Optimized) */}
      <section className="glass-panel rounded-[1rem] sm:rounded-[2.5rem] overflow-hidden mt-4 sm:mt-8">
        <div className="p-3 sm:p-6 flex justify-between items-center border-b border-white/5 bg-black/20">
          <div className="flex items-center gap-3">
            <History className="w-5 h-5 text-primary" />
            <h3 className="font-headline font-bold text-white uppercase tracking-widest text-sm">{t('me.order_logs')}</h3>
          </div>
          <button className="text-[10px] font-black text-zinc-500 hover:text-white uppercase tracking-[0.2em] transition-colors">{t('me.export_logs')}</button>
        </div>
        <div className="overflow-hidden">
          <table className="w-full text-left table-fixed border-collapse">
            <thead className="bg-black/40">
              <tr>
                <th className="w-[18%] px-1 sm:px-6 py-3 text-[9px] sm:text-[10px] font-black text-zinc-500 uppercase tracking-tighter whitespace-nowrap">{t('me.hash_id')}</th>
                <th className="w-[42%] px-1 sm:px-6 py-3 text-[9px] sm:text-[10px] font-black text-zinc-500 uppercase tracking-tighter whitespace-nowrap">{t('me.product')}</th>
                <th className="w-[25%] px-1 sm:px-6 py-3 text-[9px] sm:text-[10px] font-black text-zinc-500 uppercase tracking-tighter text-center whitespace-nowrap">{t('me.status')}</th>
                <th className="w-[15%] px-1 sm:px-6 py-3 text-[9px] sm:text-[10px] font-black text-zinc-500 uppercase tracking-tighter text-right whitespace-nowrap">{t('me.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {[
                { id: '0x892...fA2', name: 'Neural Key V2', type: 'Hardware', status: 'In Transit', statusType: 'primary', img: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=100&h=100&fit=crop' },
                { id: '0x110...dB5', name: 'Cloud Node 1yr', type: 'Service', status: 'Delivered', statusType: 'success', icon: <Globe className="w-3 h-3 sm:w-5 h-5 text-zinc-600" /> }
              ].map((order, idx) => (
                <tr key={idx} className="hover:bg-white/[0.02] transition-colors group">
                  <td className="px-1 sm:px-6 py-3 font-mono text-[9px] sm:text-[11px] text-zinc-400 truncate">{order.id}</td>
                  <td className="px-1 sm:px-6 py-3 overflow-hidden">
                    <div className="flex items-center gap-1 sm:gap-3">
                      <div className="w-5 h-5 sm:w-10 sm:h-10 rounded-md sm:rounded-xl bg-zinc-900 border border-white/10 overflow-hidden flex items-center justify-center flex-shrink-0 hidden xs:block">
                        {order.img ? (
                          <img src={order.img} alt="Product" className="w-full h-full object-cover opacity-80" />
                        ) : order.icon}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-[10px] sm:text-xs font-bold text-white truncate">{order.name}</span>
                        <span className="text-[8px] sm:text-[9px] text-zinc-500 uppercase font-bold truncate">{order.type}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-1 sm:px-6 py-3 text-center">
                    <div className={`inline-flex items-center gap-0.5 sm:gap-2 px-1 sm:px-3 py-0.5 rounded-full border ${
                      order.statusType === 'primary' ? 'bg-primary/10 border-primary/20' : 'bg-green-500/10 border-green-500/20'
                    }`}>
                      {order.statusType === 'primary' && <span className="w-0.5 h-0.5 sm:w-1.5 sm:h-1.5 rounded-full bg-primary animate-pulse"></span>}
                      <span className={`text-[9px] sm:text-[10px] font-black uppercase tracking-tighter ${
                        order.statusType === 'primary' ? 'text-primary' : 'text-green-500'
                      }`}>{order.status}</span>
                    </div>
                  </td>
                  <td className="px-1 sm:px-6 py-3 text-right">
                    <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="p-1 sm:p-2 hover:bg-white/10 rounded-md sm:rounded-xl text-zinc-500 hover:text-white transition-all">
                        <Share2 className="w-4 h-4" />
                      </button>
                      <button className="p-1 sm:p-2 hover:bg-white/10 rounded-md sm:rounded-xl text-zinc-500 hover:text-white transition-all">
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Settings List */}
      <section className="glass-panel rounded-[1rem] sm:rounded-[2.5rem] overflow-hidden mt-4 sm:mt-8">
        <div className="flex flex-col">
          <button onClick={() => setShowSettings(!showSettings)} className="flex items-center justify-between p-3 sm:p-6 hover:bg-white/[0.02] transition-colors group border-b border-white/5">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-zinc-900 flex items-center justify-center text-zinc-400 group-hover:text-primary transition-colors">
                <Settings className="w-5 h-5" />
              </div>
              <div className="text-left">
                <h4 className="font-bold text-white text-sm uppercase tracking-tight">{t('me.app_settings')}</h4>
                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">{t('me.theme_prefs')}</p>
              </div>
            </div>
            <ChevronRight className={`w-5 h-5 text-zinc-600 group-hover:text-primary transition-all ${showSettings ? 'rotate-90' : ''}`} />
          </button>

          {/* Inline Settings Panel */}
          {showSettings && (
            <div className="p-3 sm:p-6 bg-black/40 border-b border-white/5">
              <div className="space-y-8">
                {/* Language Setting */}
                <div className="flex items-center justify-between px-2 py-1">
                  <div className="flex flex-col">
                    <span className="text-xs sm:text-[11px] font-black text-white uppercase tracking-widest">{t('settings.appearance')} / Language</span>
                    <span className="text-[10px] font-bold text-zinc-500 tracking-tight opacity-80">Active: {LANGUAGES.find(l => l.code === i18n.language)?.name}</span>
                  </div>
                  <div className="relative">
                    <button 
                      onClick={() => setShowLanguageDropdown(!showLanguageDropdown)}
                      className="bg-white/10 border border-white/10 rounded-xl px-4 py-3 sm:px-6 sm:py-4 pr-10 text-sm sm:text-[10px] font-bold text-primary outline-none hover:bg-white/15 transition-all min-w-[140px] sm:min-w-[160px] text-center flex items-center justify-center gap-2"
                    >
                      <span>{LANGUAGES.find(l => l.code === i18n.language)?.flag}</span>
                      <span>{LANGUAGES.find(l => l.code === i18n.language)?.name}</span>
                    </button>
                    <ChevronDown className={`absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary pointer-events-none transition-transform ${showLanguageDropdown ? 'rotate-180' : ''}`} />

                    {showLanguageDropdown && (
                      <>
                        <div className="fixed inset-0 z-[110]" onClick={() => setShowLanguageDropdown(false)}></div>
                        <div className="absolute right-0 top-full mt-2 w-full min-w-[180px] max-h-[300px] overflow-y-auto glass-panel rounded-2xl border-white/10 shadow-2xl z-[120] animate-in fade-in slide-in-from-top-2 duration-200 scroll-hide">
                          <div className="p-2 space-y-1">
                            {LANGUAGES.map((lang) => (
                              <button
                                key={lang.code}
                                onClick={() => {
                                  i18n.changeLanguage(lang.code);
                                  setShowLanguageDropdown(false);
                                }}
                                className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all text-left ${
                                  i18n.language === lang.code 
                                    ? 'bg-primary/20 text-primary border border-primary/20' 
                                    : 'hover:bg-white/5 text-zinc-300'
                                }`}
                              >
                                <span className="text-xl">{lang.flag}</span>
                                <span className="text-[16px] sm:text-xs font-bold tracking-tight">{lang.name}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Butler Settings */}
                <div className="space-y-4 px-2">
                  <p className="text-[10px] font-headline font-bold uppercase tracking-[0.2em] text-zinc-500 flex items-center gap-2">
                    <Sparkles className="w-3 h-3 text-primary" />
                    Personal Butler Protocol
                  </p>
                  
                  <div className="space-y-3">
                    <div className="relative group">
                      <input
                        value={draftAgentName}
                        onChange={(e) => {
                          setDraftAgentName(e.target.value);
                          localStorage.setItem('butlerName', e.target.value);
                          window.dispatchEvent(new Event('butlerNameChanged'));
                        }}
                        placeholder="Name your agent"
                        className="w-full h-12 sm:h-14 px-5 rounded-2xl bg-black/40 border border-white/10 text-base font-bold text-white placeholder:text-zinc-600 focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all outline-none"
                      />
                      <div className="absolute right-4 top-1/2 -translate-y-1/2">
                        <button
                          type="button"
                          disabled={!isAgentNameDirty}
                          onClick={() => onAgentNameChange(draftAgentName.trim())}
                          className="p-2.5 rounded-xl bg-primary text-white shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-30 disabled:hover:scale-100"
                        >
                          <ArrowRight className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                    <p className="text-[10px] font-bold text-zinc-500 ml-2 italic">The Butler will refer to itself by this name.</p>
                  </div>
                </div>

                {/* BYOK Settings */}
                <div className="space-y-4 px-2">
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-[11px] font-black text-white uppercase tracking-widest">{t('settings.byok_protocol')}</span>
                      <span className="text-[10px] font-bold text-zinc-500 tracking-tight">{t('settings.byok_desc')}</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer group">
                      <input type="checkbox" className="sr-only peer" checked={useByok} onChange={(e) => setUseByok(e.target.checked)} />
                      <div className="w-12 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary shadow-inner"></div>
                    </label>
                  </div>

                  {useByok && (
                    <div className="space-y-3 pt-2">
                      <div className="space-y-1.5 relative">
                        <label className="text-[10px] font-black text-zinc-500 uppercase ml-2 tracking-widest">{t('settings.model_endpoint')}</label>
                        <button 
                          onClick={() => setShowModelDropdown(!showModelDropdown)}
                          className="w-full h-11 px-4 rounded-xl bg-black/40 border border-white/10 text-base sm:text-sm font-bold text-white outline-none flex items-center justify-between hover:bg-black/60 transition-all"
                        >
                          <span>DeepSeek Chat (V3)</span>
                          <ChevronDown className={`w-4 h-4 text-zinc-500 transition-transform ${showModelDropdown ? 'rotate-180' : ''}`} />
                        </button>
                        
                        {showModelDropdown && (
                          <>
                            <div className="fixed inset-0 z-[110]" onClick={() => setShowModelDropdown(false)}></div>
                            <div className="absolute left-0 top-full mt-1 w-full glass-panel rounded-xl border-white/10 shadow-2xl z-[120] p-1 space-y-1 overflow-hidden">
                              {['DeepSeek Chat (V3)', 'GPT-4o (OpenAI)', 'Claude 3.5 Sonnet'].map((model) => (
                                <button
                                  key={model}
                                  onClick={() => setShowModelDropdown(false)}
                                  className="w-full px-4 py-3 text-[16px] sm:text-sm font-bold text-left text-zinc-300 hover:bg-white/5 rounded-lg transition-colors"
                                >
                                  {model}
                                </button>
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-zinc-500 uppercase ml-2 tracking-widest">{t('settings.api_key')}</label>
                        <input type="password" placeholder="sk-..." className="w-full h-11 px-4 rounded-xl bg-black/40 border border-white/10 text-sm font-bold text-white outline-none focus:border-primary transition-all" />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <button className="flex items-center justify-between p-3 sm:p-6 hover:bg-white/[0.02] transition-colors group border-b border-white/5">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div className="text-left">
                <h4 className="font-bold text-white text-sm uppercase tracking-tight">{t('me.google_2fa')}</h4>
                <p className="text-[10px] text-green-500 font-bold uppercase tracking-widest">{t('me.active_secure')}</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-zinc-600 group-hover:text-primary transition-colors" />
          </button>

          <button className="flex items-center justify-between p-3 sm:p-6 hover:bg-white/[0.02] transition-colors group border-b border-white/5">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-zinc-900 flex items-center justify-center text-zinc-400 group-hover:text-primary transition-colors">
                <Lock className="w-5 h-5" />
              </div>
              <div className="text-left">
                <h4 className="font-bold text-white text-sm uppercase tracking-tight">{t('me.security')}</h4>
                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">{t('me.passwords_keys')}</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-zinc-600 group-hover:text-primary transition-colors" />
          </button>

          <button className="flex items-center justify-between p-3 sm:p-6 hover:bg-white/[0.02] transition-colors group border-b border-white/5">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-zinc-900 flex items-center justify-center text-zinc-400 group-hover:text-primary transition-colors">
                <Globe className="w-5 h-5" />
              </div>
              <div className="text-left">
                <h4 className="font-bold text-white text-sm uppercase tracking-tight">{t('me.region')}</h4>
                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">{t('me.usd_en')}</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-zinc-600 group-hover:text-primary transition-colors" />
          </button>

          <button className="flex items-center justify-between p-3 sm:p-6 hover:bg-white/[0.02] transition-colors group border-b border-white/5">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-zinc-900 flex items-center justify-center text-zinc-400 group-hover:text-primary transition-colors">
                <Book className="w-5 h-5" />
              </div>
              <div className="text-left">
                <h4 className="font-bold text-white text-sm uppercase tracking-tight">{t('me.address_book')}</h4>
                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">{t('me.nodes_config')}</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-zinc-600 group-hover:text-primary transition-colors" />
          </button>

          <button className="flex items-center justify-between p-3 sm:p-6 hover:bg-white/[0.02] transition-colors group border-b border-white/5">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-zinc-900 flex items-center justify-center text-zinc-400 group-hover:text-primary transition-colors">
                <HelpCircle className="w-5 h-5" />
              </div>
              <div className="text-left">
                <h4 className="font-bold text-white text-sm uppercase tracking-tight">{t('me.help_center')}</h4>
                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">{t('me.support_doc')}</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-zinc-600 group-hover:text-primary transition-colors" />
          </button>

          <button 
            onClick={onLogout}
            className="flex items-center justify-between p-3 sm:p-6 hover:bg-error/5 transition-colors group"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-zinc-900 flex items-center justify-center text-zinc-400 group-hover:text-error transition-colors">
                <LogOut className="w-5 h-5" />
              </div>
              <div className="text-left">
                <h4 className="font-bold text-white text-sm uppercase tracking-tight group-hover:text-error transition-colors">{t('me.terminate_session')}</h4>
                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">{t('me.sign_out')}</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-zinc-600 group-hover:text-error transition-colors" />
          </button>
        </div>
      </section>

      {/* Rules Modal */}
      {showRulesModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setShowRulesModal(null)}></div>
          <div className="relative w-full max-w-md glass-panel rounded-[2.5rem] p-8 border-white/10 shadow-2xl animate-in fade-in zoom-in duration-300">
            <button 
              onClick={() => setShowRulesModal(null)}
              className="absolute top-6 right-6 p-2 hover:bg-white/5 rounded-full text-zinc-500 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                {showRulesModal === 'points' ? <Star className="w-6 h-6" /> : (showRulesModal === 'renewal' ? <ShieldCheck className="w-6 h-6" /> : <Info className="w-6 h-6" />)}
              </div>
              <div>
                <h3 className="text-xl font-headline font-black text-white uppercase tracking-tight">
                  {showRulesModal === 'points' ? t('me.points_rules_title') : (showRulesModal === 'renewal' ? t('me.renewal_rules_title') : t('me.rewards_rules_title'))}
                </h3>
                <p className="text-[10px] text-primary font-black uppercase tracking-[0.2em] mt-1">Industrial Protocol v3.4</p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="p-6 bg-white/5 rounded-3xl border border-white/5">
                <div className="space-y-4">
                  {(showRulesModal === 'points' 
                    ? t('me.points_rules_content') 
                    : (showRulesModal === 'renewal' ? t('me.renewal_rules_content') : t('me.rewards_rules_content'))
                  ).split('\n').map((line, i) => (
                    <div key={i} className="flex gap-3">
                      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] font-black flex items-center justify-center border border-primary/20">
                        {i + 1}
                      </span>
                      <p className="text-sm font-bold text-zinc-300 leading-relaxed">{line.replace(/^\d+\.\s*/, '')}</p>
                    </div>
                  ))}
                </div>
              </div>

              <button 
                onClick={() => setShowRulesModal(null)}
                className="w-full py-4 bg-primary text-white rounded-2xl font-black uppercase tracking-[0.2em] hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-primary/20"
              >
                {t('common.success')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
