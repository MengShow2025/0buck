import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import { useDeviceType } from '../hooks/useDeviceType';
import { 
  Copy, Share2, Users, Gift, ArrowRight, CheckCircle2,
  Menu, ShoppingCart, Activity, CreditCard, Star, 
  BarChart2, Gavel, Bot, Megaphone, Image as ImageIcon,
  QrCode, Send, ShieldCheck, Loader2, Crown, Fingerprint
} from 'lucide-react';
import { motion } from 'motion/react';
import { useRewards, RewardStatus } from '../hooks/useRewards';

interface ReferralViewProps {
  isAuthenticated?: boolean;
  currentUser?: any;
}

export default function ReferralView({ isAuthenticated = false, currentUser }: ReferralViewProps) {
  const { t } = useTranslation();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const deviceType = useDeviceType();
  
  const { status, isLoading } = useRewards(currentUser?.id ? parseInt(currentUser.id) : null);
  
  // Local view mode override (for mobile/PC toggling)
  const [viewMode, setViewMode] = useState<'talent' | 'user' | null>(null);

  // v3.4.6: Automatically sync view mode with user identity once status is loaded
  React.useEffect(() => {
    if (status?.user_type && viewMode === null) {
      setViewMode(status.user_type === 'kol' ? 'talent' : 'user');
    }
  }, [status, viewMode]);

  // Determine if user is KOL/Talent based on real backend data OR manual override
  const isTalent = viewMode === 'talent' || (viewMode === null && status?.user_type === 'kol');

  if (isLoading && !status) {
    return (
      <div className="h-full flex items-center justify-center bg-black">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className={`h-full overflow-y-auto selection:bg-primary/30 selection:text-primary ${isDark ? 'bg-[#0a0a0a] text-[#f5f5f5]' : 'bg-[#fff8f6] text-[#271814]'}`}>
      <style>{`
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .slashed-zero { font-variant-numeric: slashed-zero; }
        .terminal-glow { text-shadow: 0 0 10px rgba(255, 92, 40, 0.4); }
      `}</style>
      
      {!isAuthenticated && (
        <div className="fixed top-[72px] left-1/2 -translate-x-1/2 z-[100] bg-zinc-950/20 backdrop-blur-2xl border border-white/10 px-8 py-2 rounded-full text-[10px] font-black uppercase tracking-widest text-white shadow-[0_8px_32px_0_rgba(0,0,0,0.8)] whitespace-nowrap min-w-[280px] text-center">
          Sign in to access full ledger
        </div>
      )}

      {isTalent ? <TalentReferralView isDark={isDark} status={status} /> : <UserReferralView isDark={isDark} status={status} />}

      {/* Draggable View Toggle (Floating) */}
      <motion.div 
        drag
        dragConstraints={{ left: -100, right: 100, top: -400, bottom: 50 }}
        whileDrag={{ scale: 1.1, zIndex: 100 }}
        className="fixed bottom-28 left-6 z-[60] flex flex-col gap-3 p-1 bg-black/40 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl touch-none"
      >
          <button 
            onClick={() => setViewMode('talent')}
            className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center transition-all active:scale-90 ${
              isTalent 
                ? 'bg-gradient-to-tr from-primary to-orange-400 text-white shadow-lg shadow-primary/30' 
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <Crown className="w-5 h-5" />
            <span className="text-[7px] font-black uppercase mt-0.5 tracking-tighter">Talent</span>
          </button>
          
          <div className="h-px w-6 mx-auto bg-white/5"></div>
          
          <button 
            onClick={() => setViewMode('user')}
            className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center transition-all active:scale-90 ${
              !isTalent 
                ? 'bg-gradient-to-tr from-primary to-orange-400 text-white shadow-lg shadow-primary/30' 
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <Fingerprint className="w-5 h-5" />
            <span className="text-[7px] font-black uppercase mt-0.5 tracking-tighter">Member</span>
          </button>
        </motion.div>
    </div>
  );
}

function UserReferralView({ isDark, status }: { isDark: boolean, status: RewardStatus | null }) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  const referralCode = status?.referral_code || 'GUEST-ACCESS';
  const balance = status?.wallet?.available || 0;
  const inviteCount = status?.level?.invitees || 0;
  const conversionRate = inviteCount > 0 ? '14%' : '0%'; // Mock conversion for now

  const handleCopy = () => {
    const link = `${window.location.origin}/?ref=${referralCode}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="pt-4 md:pt-8 pb-24 px-6 max-w-[1600px] mx-auto grid grid-cols-12 gap-6 font-body">
      {/* Left Column: Main Dashboard */}
      <div className="col-span-12 lg:col-span-9 space-y-6">
        
        {/* Hero Terminal Section */}
        <section className={`relative overflow-hidden rounded-3xl p-8 border-l-4 border-primary ${isDark ? 'bg-[#110a08]' : 'bg-orange-50'}`} style={{ background: isDark ? 'linear-gradient(180deg, rgba(255, 92, 40, 0.03) 0%, rgba(0, 0, 0, 0) 100%)' : '' }}>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
                <span className="font-mono text-primary text-xs tracking-tighter uppercase">{t('referral.system_status')}</span>
              </div>
              <h2 className="font-headline text-4xl md:text-5xl font-extrabold tracking-tighter mb-2 uppercase">{t('referral.welcome_core')} <span className="text-primary italic">{t('referral.core')}</span>.</h2>
              <p className={`max-w-md font-mono text-sm ${isDark ? 'text-[#e3beb4]' : 'text-stone-600'}`}>{t('referral.session_desc')}</p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <span className={`text-xs font-mono ${isDark ? 'text-[#e3beb4]' : 'text-stone-500'}`}>{t('referral.total_assets')}</span>
              <div className="text-5xl font-black slashed-zero tracking-tighter">Ø{balance.toFixed(2)}</div>
              <div className="text-primary font-mono text-sm">{t('referral.this_week')}</div>
            </div>
          </div>
        </section>

        {/* Bento Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Referral Metrics Card */}
          <div className={`md:col-span-2 rounded-3xl p-8 flex flex-col justify-between min-h-[300px] ${isDark ? 'bg-[#1a110f]' : 'bg-orange-100/50'}`}>
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-headline text-xl font-bold mb-1">{t('referral.ref_network')}</h3>
                <p className={`text-sm ${isDark ? 'text-[#e3beb4]' : 'text-stone-600'}`}>{t('referral.visualizing_nodes')}</p>
              </div>
              <Activity className="w-6 h-6 text-primary" />
            </div>
            <div className="flex items-end gap-12 mt-8">
              <div>
                <div className="text-4xl font-black slashed-zero mb-1">{inviteCount}</div>
                <div className={`text-[10px] font-mono uppercase tracking-widest ${isDark ? 'text-[#e3beb4]' : 'text-stone-500'}`}>{t('referral.active_nodes')}</div>
              </div>
              <div className="flex-1 h-24 flex items-end gap-1 pb-2">
                <div className="w-full bg-primary/20 h-1/2 rounded-t-sm"></div>
                <div className="w-full bg-primary/20 h-2/3 rounded-t-sm"></div>
                <div className="w-full bg-primary h-full rounded-t-sm"></div>
                <div className="w-full bg-primary/40 h-3/4 rounded-t-sm"></div>
                <div className="w-full bg-primary/20 h-1/2 rounded-t-sm"></div>
                <div className="w-full bg-primary h-5/6 rounded-t-sm"></div>
              </div>
              <div>
                <div className="text-4xl font-black text-primary mb-1">{conversionRate}</div>
                <div className={`text-[10px] font-mono uppercase tracking-widest ${isDark ? 'text-[#e3beb4]' : 'text-stone-500'}`}>{t('referral.conversion_rate')}</div>
              </div>
            </div>
          </div>

          {/* Invite Hub / QR Code */}
          <div className={`rounded-3xl p-8 text-white flex flex-col items-center justify-center text-center ${isDark ? 'bg-primary/20 border border-primary/30' : 'bg-gradient-to-br from-primary/80 to-primary/60 backdrop-blur-xl border border-primary/20 shadow-lg shadow-primary/10'}`}>
            <div className="bg-white p-4 rounded-2xl mb-6 shadow-xl shadow-primary/20">
              <QrCode className="w-24 h-24 text-black" />
            </div>
            <h3 className="font-headline text-lg font-extrabold uppercase mb-2">Invite_Legacy</h3>
            <code className="bg-black/20 px-3 py-1 rounded-lg text-sm font-mono mb-6 truncate max-w-full block">{referralCode}</code>
            <button onClick={handleCopy} className="w-full py-3 bg-white text-primary font-bold rounded-xl active:scale-95 transition-transform flex items-center justify-center gap-2">
              {copied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? 'COPIED!' : 'COPY LINK'}
            </button>
          </div>
        </div>

        {/* Earning History Table-less List */}
        <section className={`rounded-3xl p-8 ${isDark ? 'bg-[#1a110f]' : 'bg-orange-100/50'}`}>
          <div className="flex justify-between items-center mb-8">
            <h3 className="font-headline text-xl font-bold">Earning History</h3>
            <button className="text-primary font-mono text-xs uppercase tracking-widest hover:underline">View_All_Logs</button>
          </div>
          <div className="space-y-4">
            {status?.transactions && status.transactions.length > 0 ? (
              status.transactions.map((tx) => (
                <div key={tx.id} className={`rounded-2xl p-5 flex items-center justify-between group transition-colors ${isDark ? 'bg-[#110a08] hover:bg-[#1e1412]' : 'bg-white hover:bg-orange-50'}`}>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                      {tx.type === 'referral' ? <Users className="w-6 h-6" /> : <Gift className="w-6 h-6" />}
                    </div>
                    <div>
                      <p className="font-bold capitalize">{tx.type} Reward</p>
                      <p className={`text-xs font-mono ${isDark ? 'text-[#e3beb4]' : 'text-stone-500'}`}>
                        {new Date(tx.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-black text-primary">+Ø{tx.amount.toFixed(2)}</div>
                    <div className={`text-[10px] uppercase font-mono ${isDark ? 'text-[#e3beb4]' : 'text-stone-500'}`}>Status: {tx.status}</div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12 text-zinc-500 font-mono text-sm uppercase tracking-widest">
                No transaction logs detected in local buffer.
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Right Column: Sidebar */}
      <aside className="col-span-12 lg:col-span-3 space-y-6">
        {/* Global Leaderboard */}
        <section className={`rounded-3xl p-6 shadow-[20px_0_60px_-15px_rgba(255,92,40,0.1)] border border-primary/5 ${isDark ? 'bg-[#271814]' : 'bg-white'}`}>
          <div className="flex items-center gap-3 mb-6">
            <Activity className="w-5 h-5 text-primary" />
            <h3 className="font-headline font-extrabold uppercase tracking-tight">Leaderboard</h3>
          </div>
          <div className="space-y-5">
            <div className="flex items-center justify-between border-b border-primary/10 pb-4">
              <div className="flex items-center gap-3">
                <span className="font-mono text-primary font-bold">01</span>
                <div className="w-8 h-8 rounded-full bg-primary/20 overflow-hidden">
                  <img alt="Rank 1" src="https://api.dicebear.com/7.x/avataaars/svg?seed=Whale"/>
                </div>
                <span className="text-sm font-bold">X_WHALE</span>
              </div>
              <span className="text-xs font-mono slashed-zero">Ø8.2M</span>
            </div>
            {/* User Self Row */}
            {status && (
              <div className="flex items-center justify-between bg-primary/10 p-3 rounded-xl border border-primary/20">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-primary font-bold">YOU</span>
                  <div className="w-8 h-8 rounded-full bg-primary overflow-hidden border-2 border-primary">
                    <img alt="You" src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${status.user_id}`}/>
                  </div>
                  <span className="text-sm font-bold uppercase">{status.user_tier}</span>
                </div>
                <span className="text-xs font-mono font-bold text-primary">Ø{balance.toFixed(1)}K</span>
              </div>
            )}
          </div>
          <button className={`w-full mt-6 py-2 text-xs font-mono uppercase tracking-widest hover:text-primary transition-colors ${isDark ? 'text-[#e3beb4]' : 'text-stone-500'}`}>Expand_Ranking_Data</button>
        </section>

        {/* Network Stats Visualizer */}
        <section className={`rounded-3xl p-6 relative overflow-hidden group ${isDark ? 'bg-[#1a110f]' : 'bg-orange-100/50'}`}>
          <div className="absolute inset-0 opacity-10 pointer-events-none">
            <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-primary via-transparent to-transparent"></div>
          </div>
          <h3 className={`text-xs font-mono uppercase mb-4 tracking-widest ${isDark ? 'text-[#e3beb4]' : 'text-stone-500'}`}>Tier_Status</h3>
          <div className="relative z-10">
            <div className="flex items-end justify-between mb-2">
              <span className="text-3xl font-black uppercase">{status?.user_tier || 'SILVER'}</span>
              <span className="text-primary font-mono text-xs">{(status?.dist_rate || 0.015) * 100}% REWARD</span>
            </div>
            <div className="w-full bg-neutral-900 h-2 rounded-full overflow-hidden">
              <div className="bg-primary h-full w-[33%]" style={{ boxShadow: '0 0 15px rgba(255,92,40,0.5)' }}></div>
            </div>
            <p className={`text-[10px] mt-3 leading-relaxed ${isDark ? 'text-[#e3beb4]' : 'text-stone-500'}`}>
              Your current distribution rate is <span className="font-bold text-primary">{(status?.dist_rate || 0.015) * 100}%</span>. Level up to Gold for 2.0%.
            </p>
          </div>
        </section>
      </aside>
    </div>
  );
}

function TalentReferralView({ isDark, status }: { isDark: boolean, status: RewardStatus | null }) {
  const [inputValue, setInputValue] = useState('');
  const distRate = ((status?.dist_rate || 0.015) * 100).toFixed(1);
  const fanRate = ((status?.fan_rate || 0.05) * 100).toFixed(1);

  return (
    <div className="pt-4 md:pt-8 pb-28 px-6 max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-6 font-body">
      {/* IM Group Mode Header / Hero Section */}
      <section className={`md:col-span-12 p-8 rounded-3xl overflow-hidden relative border border-white/5 ${isDark ? 'bg-[#111111]' : 'bg-orange-50'}`}>
        <div className="absolute top-0 right-0 w-1/2 h-full opacity-20 mix-blend-screen pointer-events-none">
          <div className="w-full h-full bg-gradient-to-l from-primary/40 to-transparent"></div>
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <span className="bg-primary/20 text-primary px-3 py-1 rounded-full text-[10px] font-bold tracking-[0.2em] uppercase">IM Group Priority</span>
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            <span className="text-neutral-500 text-xs font-mono">NODE_{status?.user_id || '772'}_STABLE</span>
          </div>
          <h2 className="font-headline text-5xl font-extrabold tracking-tighter mb-2 terminal-glow uppercase">Talent <span className="text-primary italic">Partner</span> Dashboard</h2>
          <p className="text-neutral-400 font-body max-w-xl text-lg leading-relaxed">
            Negotiated Rates: <span className="text-white font-bold">{distRate}% One-time</span> / <span className="text-white font-bold">{fanRate}% Long-term</span>.
          </p>
        </div>
      </section>

      {/* Stats Grid (Bento Style) */}
      <div className="md:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Commission Earnings */}
        <div className={`p-6 rounded-2xl flex flex-col justify-between group transition-all ${isDark ? 'bg-[#1e1e1e] hover:bg-[#1a1a1a]' : 'bg-white hover:bg-orange-50 shadow-sm'}`}>
          <div>
            <div className="flex justify-between items-start mb-6">
              <span className="text-xs font-mono text-primary font-bold uppercase tracking-widest">Commission Flow</span>
              <Gift className="w-5 h-5 text-neutral-600 group-hover:text-primary transition-colors" />
            </div>
            <div className="text-4xl font-mono font-black">$12,842.00</div>
            <div className="text-xs text-green-500 font-mono mt-1">+14.2% from last cycle</div>
          </div>
          <div className="mt-8 h-24 w-full flex items-end gap-1">
            <div className="flex-1 bg-primary/20 rounded-t h-[40%] group-hover:bg-primary/40 transition-all"></div>
            <div className="flex-1 bg-primary/20 rounded-t h-[65%] group-hover:bg-primary/40 transition-all"></div>
            <div className="flex-1 bg-primary/20 rounded-t h-[55%] group-hover:bg-primary/40 transition-all"></div>
            <div className="flex-1 bg-primary/20 rounded-t h-[85%] group-hover:bg-primary/40 transition-all"></div>
            <div className="flex-1 bg-primary/40 rounded-t h-[100%]"></div>
          </div>
        </div>

        {/* Network Growth */}
        <div className={`p-6 rounded-2xl flex flex-col justify-between ${isDark ? 'bg-[#1e1e1e]' : 'bg-white shadow-sm'}`}>
          <div>
            <div className="flex justify-between items-start mb-6">
              <span className="text-xs font-mono text-neutral-400 font-bold uppercase tracking-widest">Network Nodes</span>
              <Users className="w-5 h-5 text-neutral-600" />
            </div>
            <div className="text-4xl font-mono font-black">482</div>
            <div className="text-xs text-neutral-500 font-mono mt-1">Active talent recruits</div>
          </div>
          <div className="mt-8 flex -space-x-3 overflow-hidden">
            <img className={`inline-block h-10 w-10 rounded-full ring-2 ${isDark ? 'ring-[#0a0a0a]' : 'ring-white'}`} src="https://lh3.googleusercontent.com/aida-public/AB6AXuBOxrNAUOqwy387-P1kwYTL_9ghoRx3p7tpioID8Eh1QP3mUR_kaAB1nY9dumecilot8gDtBq_3URyHUOhhDtel6b37nQusTbsVy-j-CFF5laInUrQPcfYiSo2McPVJMP1U14o0DySk9sZoQ6p5TpMmB_FNaG3aEGPyDH9MAKIObF1gvd5sqcucWbrnLOrcD36Zs9WqyQt7gMSj7P4kHIyHCw6itrU8TEd8NKWA2Qcox7ZOb12H0GLxExI_5tAXdVri7V4tuwx-PqT9"/>
            <img className={`inline-block h-10 w-10 rounded-full ring-2 ${isDark ? 'ring-[#0a0a0a]' : 'ring-white'}`} src="https://lh3.googleusercontent.com/aida-public/AB6AXuDwvIQxoXJIJMjt_nsx9pKj-cEoZBwA6zZWbEbjnwEoH_BgDVjVpxSxI0LMAVcW2wed7QEr8JwSLzd-mXeDQc7ddUvH80RDZ7xq4MdBOgU8HmRlRVN0SN1yavvedEWFSQ0quat2Ei7qc2PiEDHAtDqfCQ8DT7_sya97utq5-Gz58n1nUwgu4ggzh75ApzGScgFtHlnhNdyfe5ZIu4jAQhe3_b7ckUSJPVc-9okNUbwP0NOY9M9C-L0V3jjIlZOWLp3xKOUY8Y6ndeb4"/>
            <img className={`inline-block h-10 w-10 rounded-full ring-2 ${isDark ? 'ring-[#0a0a0a]' : 'ring-white'}`} src="https://lh3.googleusercontent.com/aida-public/AB6AXuDovMtwwP-N08qf_T9TafWmJDhahcNe_Mti5WTYCCDGhnP_4NafyF8eSqPC92YX48BvveeSpRZ4GhTgQwnz29SQlggYRIW_QjcAw9zEaDuB89FickB_4V7eThLKOViCPk7FXcPDcZYe1q5WjyEOyjPtZLg8RcKhD9LnRwi47NHeCbTR70VrKcHTrSdWbz-wK2VmXTds7EAAMN6TgBldVBwAPvE9FQMWsZ9tvX4ZDoeckBVH0E2SizkQW9ijebiHw4J0-QlmTvs2deYh"/>
            <div className={`h-10 w-10 rounded-full bg-neutral-800 flex items-center justify-center text-[10px] font-bold ring-2 text-white ${isDark ? 'ring-[#0a0a0a]' : 'ring-white'}`}>+479</div>
          </div>
        </div>

        {/* Marketing Assets (Wide Card) */}
        <div className={`md:col-span-2 p-6 rounded-2xl border border-white/5 ${isDark ? 'bg-[#111111]' : 'bg-orange-50'}`}>
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-headline font-bold text-lg">Marketing Engine</h3>
            <button className="text-xs font-bold text-primary uppercase tracking-widest hover:underline transition-all">Deploy All</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className={`p-4 rounded-xl flex items-center gap-4 hover:border-orange-500/50 border border-transparent transition-all cursor-pointer ${isDark ? 'bg-neutral-900' : 'bg-white shadow-sm'}`}>
              <div className="p-2 bg-orange-600/10 rounded-lg">
                <Share2 className="w-5 h-5 text-orange-500" />
              </div>
              <div>
                <div className="text-sm font-bold">Email Kit</div>
                <div className="text-[10px] text-neutral-500 uppercase font-mono">3 Variants</div>
              </div>
            </div>
            <div className={`p-4 rounded-xl flex items-center gap-4 hover:border-orange-500/50 border border-transparent transition-all cursor-pointer ${isDark ? 'bg-neutral-900' : 'bg-white shadow-sm'}`}>
              <div className="p-2 bg-orange-600/10 rounded-lg">
                <ImageIcon className="w-5 h-5 text-orange-500" />
              </div>
              <div>
                <div className="text-sm font-bold">Social Banners</div>
                <div className="text-[10px] text-neutral-500 uppercase font-mono">HD Assets</div>
              </div>
            </div>
            <div className={`p-4 rounded-xl flex items-center gap-4 hover:border-orange-500/50 border border-transparent transition-all cursor-pointer ${isDark ? 'bg-neutral-900' : 'bg-white shadow-sm'}`}>
              <div className="p-2 bg-orange-600/10 rounded-lg">
                <QrCode className="w-5 h-5 text-orange-500" />
              </div>
              <div>
                <div className="text-sm font-bold">Smart Link</div>
                <div className="text-[10px] text-neutral-500 uppercase font-mono">Dynamic QR</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Sidebar (Rules & Butler) */}
      <aside className="md:col-span-4 flex flex-col gap-6">
        {/* AI Butler Section */}
        <div className={`p-6 rounded-2xl border-2 border-orange-600/20 relative overflow-visible ${isDark ? 'bg-neutral-950' : 'bg-white shadow-md'}`}>
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-orange-600/5 rounded-full blur-3xl overflow-hidden pointer-events-none"></div>
          <div className="flex items-center gap-3 mb-6 relative z-10">
            <Bot className="w-6 h-6 text-orange-500" />
            <h3 className="font-headline font-extrabold text-lg uppercase tracking-tight">AI Butler</h3>
          </div>
          <div className={`p-4 rounded-xl text-xs font-mono leading-relaxed border-l-2 border-orange-600 mb-4 relative z-10 ${isDark ? 'bg-neutral-900 text-neutral-300' : 'bg-orange-50 text-neutral-700'}`}>
            "I have optimized your referral link for the APAC region. Click throughput increased by 22%."
          </div>
          <div className="relative">
            <input 
              className={`w-full border-none rounded-xl text-sm px-4 py-3 focus:ring-1 focus:ring-orange-600/50 placeholder:text-neutral-600 outline-none ${isDark ? 'bg-[#111111] text-white' : 'bg-orange-50 text-black'}`} 
              placeholder="Ask your Butler..." 
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (inputValue.trim()) {
                    window.dispatchEvent(new CustomEvent('openFloatingButler', { detail: { initialMessage: inputValue } }));
                    setInputValue('');
                  }
                }
              }}
            />
            <button 
              className="absolute right-2 top-2 p-1.5 text-primary"
              onClick={() => {
                if (inputValue.trim()) {
                  window.dispatchEvent(new CustomEvent('openFloatingButler', { detail: { initialMessage: inputValue } }));
                  setInputValue('');
                }
              }}
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Rules Ledger */}
        <div className={`p-6 rounded-2xl ${isDark ? 'bg-[#1e1e1e]' : 'bg-white shadow-sm'}`}>
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-headline font-bold text-lg">System Rules</h3>
            <Gavel className="w-5 h-5 text-neutral-600" />
          </div>
          <ul className="space-y-4">
            <li className="flex gap-4 items-start">
              <span className="text-primary font-mono font-bold text-xs">01</span>
              <p className="text-xs text-neutral-400 font-body">Payouts are settled every Friday at 00:00 UTC.</p>
            </li>
            <li className="flex gap-4 items-start">
              <span className="text-primary font-mono font-bold text-xs">02</span>
              <p className="text-xs text-neutral-400 font-body">Direct recruits yield 15% tier 1 commission.</p>
            </li>
            <li className="flex gap-4 items-start">
              <span className="text-primary font-mono font-bold text-xs">03</span>
              <p className="text-xs text-neutral-400 font-body">Secondary network volume grants LVL 4 status.</p>
            </li>
          </ul>
          <button className={`w-full mt-6 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${isDark ? 'bg-[#1a1a1a] text-neutral-400 hover:text-white' : 'bg-neutral-100 text-neutral-500 hover:text-black'}`}>
            View Full Protocol
          </button>
        </div>
      </aside>
    </div>
  );
}
