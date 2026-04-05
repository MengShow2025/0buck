import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import { 
  Terminal, ShieldCheck, Wallet, Star, HelpCircle, Info,
  Calendar, TrendingUp, History, Share2, Eye, Settings,
  Shield, Lock, Globe, Book, LogOut, User, ChevronRight,
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
  const [draftAgentName, setDraftAgentName] = useState(agentName);
  const [useByok, setUseByok] = useState(false);
  const isAgentNameDirty = useMemo(() => draftAgentName.trim() !== agentName.trim(), [agentName, draftAgentName]);

  React.useEffect(() => {
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
    <div className={`h-full overflow-y-auto selection:bg-primary selection:text-white ${isDark ? 'bg-[#0a0a0a] text-[#e5e5e5]' : 'bg-[#fff8f6] text-[#271814]'}`}>
      <style>{`
        .glass-panel { background: rgba(20, 20, 20, 0.7); backdrop-filter: blur(16px); border: 1px solid rgba(255, 255, 255, 0.08); }
        .flip-card { background: #1a1a1a; padding: 4px 6px; border-radius: 4px; border-bottom: 2px solid #000; font-family: 'JetBrains Mono', monospace; }
        .slashed-zero { font-variant-numeric: slashed-zero; }
        .scroll-hide::-webkit-scrollbar { display: none; }
      `}</style>
      
      <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-8 pb-32">
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            {onMenuClick && deviceType === 'h5' && (
              <button 
                onClick={onMenuClick}
                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                  isDark ? 'bg-white/5 border border-white/10 text-zinc-400 hover:text-primary' : 'bg-black/5 border border-black/10 text-zinc-600 hover:text-primary'
                }`}
              >
                <Menu className="w-5 h-5" />
              </button>
            )}
            <div className="relative group cursor-pointer" onClick={() => {
              const fileInput = document.createElement('input');
              fileInput.type = 'file';
              fileInput.accept = 'image/*';
              fileInput.onchange = (e) => {
                const file = (e.target as HTMLInputElement).files?.[0];
                if (file) {
                  // In a real app, this would upload the image
                  alert('Avatar update simulation: ' + file.name);
                }
              };
              fileInput.click();
            }}>
              <div className="w-20 h-20 md:w-24 md:h-24 rounded-full overflow-hidden border-2 border-primary/20 p-1 group-hover:border-primary transition-all duration-300 shadow-[0_0_20px_rgba(255,92,40,0.1)]">
                <img 
                  src="https://api.dicebear.com/7.x/avataaars/svg?seed=Julian" 
                  alt="Julian Rossi" 
                  className="w-full h-full object-cover bg-zinc-900 rounded-full"
                />
              </div>
              <div className="absolute bottom-0 right-0 w-6 h-6 bg-primary rounded-full border-4 border-[#0a0a0a] flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform">
                <Settings className="w-3 h-3 text-white" />
              </div>
            </div>
            
            <div>
              <div className="flex items-center gap-2 text-primary mb-1">
                <Terminal className="w-3 h-3 sm:w-4 h-4" />
                <span className="text-[8px] sm:text-[10px] font-black tracking-[0.2em] sm:tracking-[0.3em] uppercase">{t('me.secure_terminal')}</span>
              </div>
              <h1 className="font-headline text-2xl sm:text-4xl font-extrabold tracking-tighter text-white flex items-center gap-2 sm:gap-3">
                <input 
                    type="text" 
                    defaultValue="Julian Rossi"
                    className="bg-transparent border-none outline-none focus:ring-0 focus:border-b focus:border-primary/50 transition-all p-0 w-full max-w-[150px] sm:max-w-[200px]"
                  />
                <button className="text-zinc-500 hover:text-primary transition-colors">
                  <Settings className="w-3.5 h-3.5 sm:w-4 h-4" />
                </button>
              </h1>
              <p className="text-[9px] sm:text-sm font-bold text-zinc-500 tracking-widest uppercase mt-1">Pro Member • Node ID: 8829-QX</p>
            </div>
          </div>

          <div className="px-3 sm:px-4 py-1.5 sm:py-2 glass-panel rounded-full flex items-center gap-2 sm:gap-3 self-start md:self-auto">
            <div className="flex -space-x-1.5 sm:-space-x-2">
              <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full border border-black bg-zinc-800 flex items-center justify-center text-[8px] sm:text-[10px] font-black">T</div>
              <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full border border-black bg-zinc-800 flex items-center justify-center text-[8px] sm:text-[10px] font-black">E</div>
            </div>
            <span className="text-[8px] sm:text-[10px] font-bold text-zinc-400 uppercase tracking-widest whitespace-nowrap">{t('me.multi_sig')}</span>
          </div>
        </header>

        {/* Wallet Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Cash Wallet */}
          <div className="glass-panel rounded-[2rem] p-6 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <Wallet className="w-16 h-16" />
            </div>
            <div className="relative z-10">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-black">{t('me.cash_balance')}</p>
                  <h2 className="text-3xl font-headline font-black text-white mt-1">$12,480.<span className="text-zinc-500 text-xl">50</span></h2>
                </div>
                <span className="px-2 py-1 bg-green-500/10 text-green-500 text-[10px] font-black rounded uppercase">USD</span>
              </div>
              <div className="flex gap-2">
                <button className="flex-1 py-2.5 bg-white/5 border border-white/5 hover:border-primary/50 transition-all rounded-xl text-xs font-bold text-zinc-300">{t('me.view_details')}</button>
                <button className="px-4 py-2.5 bg-white/5 border border-white/5 hover:bg-white/10 transition-all rounded-xl">
                  <HelpCircle className="w-4 h-4 text-zinc-500" />
                </button>
              </div>
            </div>
          </div>

          {/* Points Wallet */}
          <div className="glass-panel rounded-[2rem] p-6 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <Star className="w-16 h-16" />
            </div>
            <div className="relative z-10">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-black">{t('me.precision_points')}</p>
                  <h2 className="text-3xl font-headline font-black text-primary mt-1">45,200 <span className="text-zinc-500 text-xl font-medium uppercase text-xs">0BK</span></h2>
                </div>
                <span className="px-2 py-1 bg-primary/10 text-primary text-[10px] font-black rounded uppercase">Tier 1</span>
              </div>
              <div className="flex gap-2">
                <button className="flex-1 py-2.5 bg-primary/10 border border-primary/20 hover:bg-primary/20 transition-all rounded-xl text-xs font-bold text-primary">{t('me.rules_multipliers')}</button>
                <button className="px-4 py-2.5 bg-white/5 border border-white/5 hover:bg-white/10 transition-all rounded-xl">
                  <Info className="w-4 h-4 text-zinc-500" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* CRITICAL: SIGN-IN CASHBACK CARD */}
        <section className="relative mt-8">
          <div className="absolute -inset-1 bg-gradient-to-r from-primary/50 to-orange-900/50 rounded-[3rem] blur opacity-25"></div>
          <div className="relative glass-panel rounded-[3rem] p-8 border-primary/20 bg-black/40 overflow-hidden">
            <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-primary/5 to-transparent pointer-events-none"></div>
            
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 relative z-10">
              {/* Left: Streak & Countdown */}
              <div className="lg:col-span-5 space-y-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center shadow-[0_0_20px_rgba(255,92,0,0.3)]">
                    <Calendar className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-headline font-black text-white">{t('me.signin_cashback')}</h3>
                    <p className="text-xs text-zinc-500 uppercase font-black tracking-widest">{t('me.phase_active')}</p>
                  </div>
                </div>

                <div className="flex items-end gap-4">
                  <div>
                    <p className="text-[10px] font-black text-zinc-500 uppercase mb-2">{t('me.current_streak')}</p>
                    <div className="flex items-baseline gap-1">
                      <span className="text-6xl font-black text-white tracking-tighter">12</span>
                      <span className="text-zinc-500 font-bold">{t('me.days')}</span>
                    </div>
                  </div>
                  <div className="flex-1 pb-2">
                    <div className="h-2 w-full bg-zinc-900 rounded-full overflow-hidden">
                      <div className="h-full bg-primary w-[80%] shadow-[0_0_12px_rgba(255,92,0,0.5)]"></div>
                    </div>
                    <p className="text-[9px] text-zinc-600 mt-2 font-bold uppercase tracking-widest">{t('me.next_milestone')}</p>
                  </div>
                </div>

                <div>
                  <p className="text-[10px] font-black text-zinc-500 uppercase mb-3">{t('me.phase_ends')}</p>
                  <div className="flex gap-2">
                    <div className="flex flex-col items-center">
                      <div className="flex gap-1">
                        <div className="flip-card text-2xl text-white">0</div>
                        <div className="flip-card text-2xl text-white">4</div>
                      </div>
                      <span className="text-[8px] font-black text-zinc-600 uppercase mt-1 tracking-widest">{t('me.days')}</span>
                    </div>
                    <div className="text-2xl text-zinc-700 pt-1">:</div>
                    <div className="flex flex-col items-center">
                      <div className="flex gap-1">
                        <div className="flip-card text-2xl text-white">1</div>
                        <div className="flip-card text-2xl text-white">8</div>
                      </div>
                      <span className="text-[8px] font-black text-zinc-600 uppercase mt-1 tracking-widest">{t('me.hrs')}</span>
                    </div>
                    <div className="text-2xl text-zinc-700 pt-1">:</div>
                    <div className="flex flex-col items-center">
                      <div className="flex gap-1">
                        <div className="flip-card text-2xl text-primary">5</div>
                        <div className="flip-card text-2xl text-primary">2</div>
                      </div>
                      <span className="text-[8px] font-black text-zinc-600 uppercase mt-1 tracking-widest">{t('me.min')}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right: Rewards & Metrics */}
              <div className="lg:col-span-7 flex flex-col justify-between">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-6 bg-white/5 rounded-3xl border border-white/5">
                    <p className="text-[10px] text-zinc-500 uppercase font-black tracking-widest mb-1">{t('me.potential_reward')}</p>
                    <p className="text-3xl font-black text-white">$45.00</p>
                    <button className="mt-4 w-full py-2.5 bg-primary text-white rounded-xl text-xs font-black uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-primary/20">
                      {t('me.claim_now')}
                    </button>
                  </div>
                  <div className="p-6 bg-primary/5 rounded-3xl border border-primary/10">
                    <p className="text-[10px] text-primary uppercase font-black tracking-widest mb-1">{t('me.total_reclaimed')}</p>
                    <p className="text-3xl font-black text-white">$1,240.65</p>
                    <div className="mt-4 flex items-center gap-2 text-green-500">
                      <TrendingUp className="w-4 h-4" />
                      <span className="text-[10px] font-bold tracking-widest uppercase">{t('me.vs_phase')}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-6">
                  <p className="text-[10px] text-zinc-500 uppercase font-black tracking-widest mb-3">{t('me.order_history')}</p>
                  <div className="flex gap-2 overflow-x-auto pb-2 scroll-hide">
                    {[
                      { id: '#8821-ORD', amount: '$120.00', status: 'Verified', color: 'text-zinc-500' },
                      { id: '#8845-ORD', amount: '$450.00', status: 'Verified', color: 'text-zinc-500' },
                      { id: '#8901-ORD', amount: '$95.20', status: 'Pending', color: 'text-orange-500' }
                    ].map((order, i) => (
                      <div key={i} className="min-w-[140px] p-3 bg-white/5 rounded-2xl border border-white/5 flex flex-col gap-1">
                        <span className="text-[10px] font-bold text-white">{order.id}</span>
                        <span className="text-xs font-black text-primary">{order.amount}</span>
                        <span className={`text-[9px] uppercase font-black tracking-widest ${order.color}`}>{order.status}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Order History Table */}
        <section className="glass-panel rounded-[2.5rem] overflow-hidden mt-8">
          <div className="p-6 flex justify-between items-center border-b border-white/5 bg-black/20">
            <div className="flex items-center gap-3">
              <History className="w-5 h-5 text-primary" />
              <h3 className="font-headline font-bold text-white uppercase tracking-widest text-sm">{t('me.order_logs')}</h3>
            </div>
            <button className="text-[10px] font-black text-zinc-500 hover:text-white uppercase tracking-[0.2em] transition-colors">{t('me.export_logs')}</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-black/40">
                <tr>
                  <th className="px-1.5 sm:px-6 py-3 text-[7px] sm:text-[10px] font-black text-zinc-500 uppercase tracking-tighter sm:tracking-widest whitespace-nowrap">{t('me.hash_id')}</th>
                  <th className="px-1.5 sm:px-6 py-3 text-[7px] sm:text-[10px] font-black text-zinc-500 uppercase tracking-tighter sm:tracking-widest whitespace-nowrap">{t('me.product')}</th>
                  <th className="px-1.5 sm:px-6 py-3 text-[7px] sm:text-[10px] font-black text-zinc-500 uppercase tracking-tighter sm:tracking-widest text-center whitespace-nowrap">{t('me.status')}</th>
                  <th className="px-1.5 sm:px-6 py-3 text-[7px] sm:text-[10px] font-black text-zinc-500 uppercase tracking-tighter sm:tracking-widest text-right whitespace-nowrap">{t('me.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                <tr className="hover:bg-white/[0.02] transition-colors group">
                  <td className="px-1.5 sm:px-6 py-3 font-mono text-[7px] sm:text-[11px] text-zinc-400 whitespace-nowrap">0x892...fA2</td>
                  <td className="px-1.5 sm:px-6 py-3">
                    <div className="flex items-center gap-1 sm:gap-3">
                      <div className="w-5 h-5 sm:w-10 sm:h-10 rounded-md sm:rounded-xl bg-zinc-900 border border-white/10 overflow-hidden flex-shrink-0">
                        <img src="https://images.unsplash.com/photo-1518770660439-4636190af475?w=100&h=100&fit=crop" className="w-full h-full object-cover opacity-80" alt="Product" />
                      </div>
                      <div className="flex items-center gap-1 min-w-0 whitespace-nowrap">
                        <span className="text-[8px] sm:text-xs font-bold text-white truncate max-w-[45px] sm:max-w-none">Neural Key V2</span>
                        <span className="hidden sm:inline text-[9px] text-zinc-500 uppercase font-bold tracking-widest">Hardware</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-1.5 sm:px-6 py-3 text-center">
                    <div className="inline-flex items-center gap-1 px-1 sm:px-3 py-0.5 bg-primary/10 rounded-full border border-primary/20 whitespace-nowrap">
                      <span className="w-0.5 h-0.5 sm:w-1.5 sm:h-1.5 rounded-full bg-primary animate-pulse"></span>
                      <span className="text-[7px] sm:text-[10px] font-black text-primary uppercase tracking-tighter sm:tracking-widest">In Transit</span>
                    </div>
                  </td>
                  <td className="px-1.5 sm:px-6 py-3 text-right">
                    <div className="flex justify-end gap-0.5 sm:gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="p-1 sm:p-2 hover:bg-white/10 rounded-md sm:rounded-xl text-zinc-500 hover:text-white transition-all">
                        <Share2 className="w-3 h-3 sm:w-4 h-4" />
                      </button>
                      <button className="p-1 sm:p-2 hover:bg-white/10 rounded-md sm:rounded-xl text-zinc-500 hover:text-white transition-all">
                        <Eye className="w-3 h-3 sm:w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
                <tr className="hover:bg-white/[0.02] transition-colors group">
                  <td className="px-1.5 sm:px-6 py-3 font-mono text-[7px] sm:text-[11px] text-zinc-400 whitespace-nowrap">0x110...dB5</td>
                  <td className="px-1.5 sm:px-6 py-3">
                    <div className="flex items-center gap-1 sm:gap-3">
                      <div className="w-5 h-5 sm:w-10 sm:h-10 rounded-md sm:rounded-xl bg-zinc-900 border border-white/10 overflow-hidden flex items-center justify-center flex-shrink-0">
                        <Globe className="w-3 h-3 sm:w-5 h-5 text-zinc-600" />
                      </div>
                      <div className="flex items-center gap-1 min-w-0 whitespace-nowrap">
                        <span className="text-[8px] sm:text-xs font-bold text-white truncate max-w-[45px] sm:max-w-none">Cloud Node 1yr</span>
                        <span className="hidden sm:inline text-[9px] text-zinc-500 uppercase font-bold tracking-widest">Service</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-1.5 sm:px-6 py-3 text-center">
                    <div className="inline-flex items-center gap-1 px-1 sm:px-3 py-0.5 bg-green-500/10 rounded-full border border-green-500/20 whitespace-nowrap">
                      <span className="text-[7px] sm:text-[10px] font-black text-green-500 uppercase tracking-tighter sm:tracking-widest">Delivered</span>
                    </div>
                  </td>
                  <td className="px-1.5 sm:px-6 py-3 text-right">
                    <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="p-2 hover:bg-white/10 rounded-xl text-zinc-500 hover:text-white transition-all">
                        <Share2 className="w-4 h-4" />
                      </button>
                      <button className="p-2 hover:bg-white/10 rounded-xl text-zinc-500 hover:text-white transition-all">
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Settings List */}
        <section className="glass-panel rounded-[2.5rem] overflow-hidden mt-8">
          <div className="flex flex-col">
            <button onClick={() => setShowSettings(!showSettings)} className="flex items-center justify-between p-6 hover:bg-white/[0.02] transition-colors group border-b border-white/5">
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
              <div className="p-6 bg-black/40 border-b border-white/5">
                <div className="space-y-8">
                  {/* Language Setting */}
                  <div className="flex items-center justify-between px-2">
                    <div className="flex flex-col">
                      <span className="text-[11px] font-black text-white uppercase tracking-widest">{t('settings.appearance')} / Language</span>
                      <span className="text-[10px] font-bold text-zinc-500 tracking-tight">Active: {LANGUAGES.find(l => l.code === i18n.language)?.name}</span>
                    </div>
                    <select 
                      value={i18n.language}
                      onChange={(e) => i18n.changeLanguage(e.target.value)}
                      className="bg-white/5 border-none rounded-xl px-3 py-1.5 text-[10px] font-black text-primary outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      {LANGUAGES.map(l => <option key={l.code} value={l.code} className="bg-zinc-900 text-white">{l.flag} {l.name}</option>)}
                    </select>
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
                          className="w-full h-14 px-5 rounded-2xl bg-black/40 border border-white/10 text-base font-bold text-white placeholder:text-zinc-600 focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all outline-none"
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
                        <div className="w-12 h-6.5 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:rounded-full after:h-4.5 after:w-4.5 after:transition-all peer-checked:bg-primary shadow-inner"></div>
                      </label>
                    </div>

                    {useByok && (
                      <div className="space-y-3 pt-2">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-zinc-500 uppercase ml-2 tracking-widest">{t('settings.model_endpoint')}</label>
                          <select className="w-full h-11 px-4 rounded-xl bg-black/40 border border-white/10 text-sm font-bold text-white outline-none focus:border-primary appearance-none transition-all">
                            <option className="bg-zinc-900">DeepSeek Chat (V3)</option>
                            <option className="bg-zinc-900">GPT-4o (OpenAI)</option>
                            <option className="bg-zinc-900">Claude 3.5 Sonnet</option>
                          </select>
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

            <button className="flex items-center justify-between p-6 hover:bg-white/[0.02] transition-colors group border-b border-white/5">
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

            <button className="flex items-center justify-between p-6 hover:bg-white/[0.02] transition-colors group border-b border-white/5">
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

            <button className="flex items-center justify-between p-6 hover:bg-white/[0.02] transition-colors group border-b border-white/5">
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

            <button className="flex items-center justify-between p-6 hover:bg-white/[0.02] transition-colors group border-b border-white/5">
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

            <button className="flex items-center justify-between p-6 hover:bg-white/[0.02] transition-colors group border-b border-white/5">
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
              className="flex items-center justify-between p-6 hover:bg-error/5 transition-colors group"
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
      </div>
    </div>
  );
}