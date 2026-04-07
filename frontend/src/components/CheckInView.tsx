import React, { useEffect, useRef, useState, useMemo } from 'react';
import confetti from 'canvas-confetti';
import { useRewards } from '../hooks/useRewards';
import { Terminal, ShieldCheck, ShoppingCart, Bot, Info, Bolt, CheckCircle2, ChevronRight } from 'lucide-react';

export default function CheckInView() {
  // v3.4.7: Use real rewards data. Using fixed ID 8829 for demo consistency.
  const { status, checkIn, isLoading, fetchStatus } = useRewards(8829);
  const [isInjecting, setIsInjecting] = useState(false);
  const coinSound = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    coinSound.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2012/2012-preview.mp3');
  }, []);

  // v3.4.7 Logic: Find the most "exciting" plan to highlight
  // Prioritize plans that just completed a period or have the highest streak
  const highlightedPlan = useMemo(() => {
    if (!status?.plans || status.plans.length === 0) return null;
    
    const activePlans = status.plans.filter(p => p.raw_status === 'active_checkin');
    if (activePlans.length === 0) return status.plans[0];

    return [...activePlans].sort((a, b) => {
      // If one just checked in today and reached a milestone (multiple of 5/10/30), prioritize it
      // For now, just sort by streak descending
      return b.consecutive_days - a.consecutive_days;
    })[0];
  }, [status]);

  // Check if user has already checked in today for ALL plans
  const hasCheckedInToday = useMemo(() => {
    if (!status?.plans || status.plans.length === 0) return false;
    const today = new Date().toISOString().split('T')[0];
    return status.plans.every(p => p.last_checkin_at?.startsWith(today));
  }, [status]);

  const handleInjection = async () => {
    if (hasCheckedInToday || isInjecting) return;
    
    setIsInjecting(true);
    try {
      // 1. Backend Call (Batch Mode)
      await checkIn();
      
      // 2. Sound & Visuals
      coinSound.current?.play().catch(() => {});
      confetti({ 
        particleCount: 150, 
        spread: 70, 
        origin: { y: 0.6 }, 
        colors: ['#FF5C28', '#FFD700', '#FFFFFF'] 
      });

      // 3. Status is automatically refreshed by hook
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Check-in failed');
    } finally {
      setIsInjecting(false);
    }
  };

  if (isLoading && !status) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full min-h-[600px] overflow-hidden bg-background text-on-background flex flex-col">
      <style>{`
        .checkin-glass-panel {
          background: var(--color-surface-container-lowest);
          opacity: 0.8;
          backdrop-filter: blur(60px) saturate(180%);
          border: 1px solid rgba(255, 92, 40, 0.12);
        }
        .dark .checkin-glass-panel {
          background: rgba(15, 15, 15, 0.7);
        }
        .checkin-glow-ring::after {
          content: ''; 
          position: absolute; 
          inset: -2px; 
          background: conic-gradient(from 0deg, transparent, var(--color-primary), transparent 30%); 
          border-radius: 50%; 
          animation: rotate 4s linear infinite; 
          mask: radial-gradient(transparent 68%, black 70%); 
          -webkit-mask: radial-gradient(transparent 68%, black 70%); 
        } 
        @keyframes rotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } } 
        .checkin-scanline { 
          background: linear-gradient(to bottom, transparent 50%, rgba(255, 92, 40, 0.02) 50%); 
          background-size: 100% 4px; 
        }
        @keyframes attention-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(255, 92, 40, 0.7); transform: scale(1); }
          50% { box-shadow: 0 0 40px 10px rgba(255, 92, 40, 0.3); transform: scale(1.02); }
        }
        .btn-attention {
          animation: attention-pulse 2s infinite ease-in-out;
        }
      `}</style>

      {/* Background Elements */}
      <div className="absolute inset-0 checkin-scanline pointer-events-none opacity-40 z-0"></div>

      {/* Header */}
      <div className="relative z-10 flex justify-between items-center px-8 pt-4 pb-2 border-b border-outline/10 dark:border-white/5 mb-6">
        <div className="flex items-center gap-4">
          <span className="font-black text-primary tracking-tighter text-xl uppercase">0BUCK TERMINAL</span>
          <span className="text-[10px] font-bold text-on-surface-variant tracking-[0.3em] uppercase opacity-50">
            // {highlightedPlan ? `PHASE_${String(highlightedPlan.current_period).padStart(2, '0')}_STASH` : 'NO_ACTIVE_PLANS'}
          </span>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 checkin-glass-panel px-3 py-1 rounded-full border-emerald-500/20">
            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
            <span className="text-[9px] font-bold text-emerald-500 uppercase">Dumbo_Live</span>
          </div>
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-primary to-orange-400 p-0.5">
            <div className="w-full h-full rounded-full bg-background dark:bg-black flex items-center justify-center font-bold text-[10px] text-on-background">
              {status?.user_id ? 'JR' : '??'}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex-1 px-8 pb-6 max-w-[1600px] w-full mx-auto grid grid-cols-12 gap-6 overflow-y-auto no-scrollbar">
        
        {/* Left Sidebar */}
        <aside className="col-span-12 lg:col-span-3 flex flex-col gap-6">
          <div className="checkin-glass-panel p-6 rounded-[2rem] flex-1 relative flex flex-col overflow-hidden min-h-[300px]">
            <p className="text-[10px] font-black tracking-[.3em] text-on-surface-variant uppercase mb-4">Dumbo Intelligence</p>
            <div className="flex-1 flex items-center justify-center relative">
              <div className="absolute inset-0 border border-outline/10 dark:border-white/5 rounded-full"></div>
              <div className="absolute inset-12 border border-outline/10 dark:border-white/5 rounded-full"></div>
              <div className="text-center bg-background/50 dark:bg-black/50 p-4 rounded-full backdrop-blur-sm z-10">
                <p className="text-[9px] text-on-surface-variant font-bold mb-1 uppercase">Current Tier</p>
                <p className="text-2xl font-black text-primary uppercase">{status?.level.level || 'Silver'}</p>
              </div>
            </div>
            <div className="mt-4 p-4 bg-primary/5 rounded-2xl border border-primary/10 relative z-10">
              <p className="text-[10px] text-on-surface-variant italic">
                "{highlightedPlan 
                  ? `Address checked! Order #${highlightedPlan.order_id} locks in a $${highlightedPlan.reward_base.toFixed(2)} cashback path.` 
                  : 'No active cashback plans detected. Start shopping to unlock rewards!'}"
              </p>
            </div>
          </div>
          
          <div className="checkin-glass-panel p-6 rounded-[2rem] h-32 flex flex-col justify-center">
            <p className="text-[10px] font-black tracking-[.3em] text-on-surface-variant uppercase mb-2">Uplink Stability</p>
            <div className="flex justify-between items-center">
              <span className="text-xl font-black tracking-tighter text-on-background">22ms</span>
              <div className="flex gap-1 h-3 items-end">
                <div className="w-1 bg-emerald-500 h-full"></div>
                <div className="w-1 bg-emerald-500 h-3/4"></div>
                <div className="w-1 bg-emerald-500 h-1/2"></div>
              </div>
            </div>
          </div>
        </aside>

        {/* Center Content */}
        <section className="col-span-12 lg:col-span-5 flex flex-col gap-6 text-center">
          <div className="checkin-glass-panel flex-1 rounded-[3rem] p-12 flex flex-col items-center justify-center min-h-[400px]">
            <div className="relative w-64 h-64 flex items-center justify-center mb-8">
              <div className="absolute inset-0 rounded-full border-8 border-outline/5 dark:border-white/5"></div>
              {!hasCheckedInToday && <div className="absolute inset-0 checkin-glow-ring"></div>}
              <div className="bg-background/50 dark:bg-black/50 w-full h-full rounded-full flex flex-col items-center justify-center backdrop-blur-sm z-10">
                <h2 className="text-7xl font-black italic tracking-tighter text-on-background">
                  {highlightedPlan?.consecutive_days || 0}
                </h2>
                <p className="text-[10px] font-bold text-primary tracking-[.4em] uppercase">Day Streak</p>
              </div>
            </div>
            
            {/* Countdown or Milestone info */}
            <div className="flex gap-6 items-center bg-surface-container/50 dark:bg-black/40 p-6 rounded-3xl border border-outline/10 dark:border-white/5 shadow-2xl">
              {hasCheckedInToday ? (
                <div className="flex items-center gap-3 text-emerald-500">
                  <CheckCircle2 className="w-8 h-8" />
                  <span className="text-xl font-black uppercase tracking-widest italic">Node Synchronized</span>
                </div>
              ) : (
                <>
                  <div>
                    <p className="text-4xl font-black text-on-background">04</p>
                    <p className="text-[8px] uppercase tracking-widest text-on-surface-variant">Hrs</p>
                  </div>
                  <div className="text-xl text-primary font-black animate-pulse">:</div>
                  <div>
                    <p className="text-4xl font-black text-primary">28</p>
                    <p className="text-[8px] uppercase tracking-widest text-on-surface-variant">Min</p>
                  </div>
                  <div className="text-xl text-primary font-black animate-pulse">:</div>
                  <div>
                    <p className="text-4xl font-black text-on-background">15</p>
                    <p className="text-[8px] uppercase tracking-widest text-on-surface-variant">Sec</p>
                  </div>
                </>
              )}
            </div>
          </div>

          <button 
            onClick={handleInjection}
            disabled={hasCheckedInToday || isInjecting}
            className={`relative h-24 checkin-glass-panel rounded-[2rem] group transition-all duration-500 overflow-hidden active:scale-95 flex items-center justify-center ${
              hasCheckedInToday
                ? '!bg-emerald-500/10 !border-emerald-500/40 shadow-[0_0_50px_rgba(16,185,129,0.3)]'
                : 'hover:shadow-[0_0_60px_rgba(255,92,40,0.2)] btn-attention border-primary/30'
            }`}
          >
            {!hasCheckedInToday && !isInjecting && (
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
            )}
            {isInjecting ? (
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                <span className="text-xl font-black uppercase tracking-widest italic text-primary">Injecting Pulse...</span>
              </div>
            ) : hasCheckedInToday ? (
              <span className="text-emerald-500 font-black tracking-widest uppercase italic text-2xl relative z-10">Mission Success</span>
            ) : (
              <div className="relative z-10 flex items-center justify-center gap-6">
                <Bolt className="w-10 h-10 text-primary animate-pulse group-hover:scale-125 transition-transform" />
                <span className="text-2xl font-black tracking-[.5em] uppercase text-primary group-hover:text-primary transition-colors drop-shadow-[0_0_10px_rgba(255,92,40,0.8)]">
                  Click to Inject
                </span>
                <Bolt className="w-10 h-10 text-primary animate-pulse group-hover:scale-125 transition-transform" />
              </div>
            )}
          </button>
        </section>

        {/* Right Sidebar */}
        <aside className="col-span-12 lg:col-span-4 flex flex-col gap-6">
          <div className="checkin-glass-panel p-8 rounded-[2.5rem] bg-gradient-to-br from-primary/5 to-transparent">
            <p className="text-[10px] font-black tracking-[.3em] text-on-surface-variant uppercase mb-6">Financial Summary</p>
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div className="flex-1">
                  <p className="text-[10px] font-black uppercase text-on-surface-variant tracking-widest mb-1">Available Balance</p>
                  <p className="text-3xl font-black text-on-background">${(status?.wallet?.available || 0).toFixed(2)}</p>
                </div>
                <div className="flex-1">
                  <p className="text-[10px] font-black uppercase text-on-surface-variant tracking-widest mb-1">Lifetime Earned</p>
                  <p className="text-3xl font-black text-primary">${(status?.plans?.reduce((acc, p) => acc + (p.reward_base || 0), 0) || 0).toFixed(2)}</p>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-[9px] font-bold tracking-widest text-on-surface-variant">
                  <span className="uppercase">Vault Progress</span>
                  <span className="uppercase">{(status?.plans?.length ?? 0) > 0 ? Math.round(((status?.plans?.reduce((acc, p) => acc + p.total_earned, 0) ?? 0) / (status?.plans?.reduce((acc, p) => acc + p.reward_base, 0) ?? 1)) * 100) : 0}% Secured</span>
                </div>
                <div className="h-1.5 bg-outline/10 dark:bg-white/5 rounded-full overflow-hidden border border-outline/5 dark:border-white/5">
                  <div 
                    className="h-full bg-gradient-to-r from-primary to-orange-400 shadow-[0_0_15px_rgba(255,92,40,0.5)] transition-all duration-1000" 
                    style={{ width: `${(status?.plans?.length ?? 0) > 0 ? ((status?.plans?.reduce((acc, p) => acc + p.total_earned, 0) ?? 0) / (status?.plans?.reduce((acc, p) => acc + p.reward_base, 0) ?? 1)) * 100 : 0}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>

          <div className="checkin-glass-panel p-8 rounded-[2.5rem] flex-1">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-[10px] font-black tracking-[.3em] text-on-surface-variant uppercase">
                Linked Orders ({status?.plans.length || 0})
              </h3>
              <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded uppercase">
                {status?.plans.filter(p => p.raw_status === 'active_checkin').length || 0} Active
              </span>
            </div>
            
            <div className="space-y-4 max-h-[300px] overflow-y-auto no-scrollbar pr-2">
              {status?.plans.map((plan) => (
                <div key={plan.id} className="flex items-center gap-4 p-3 rounded-2xl bg-surface-container/50 dark:bg-white/5 border border-outline/10 dark:border-white/5 hover:bg-surface-container dark:hover:bg-white/10 transition-all cursor-pointer group">
                  <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                    {plan.order_id % 2 === 0 ? <ShoppingCart className="w-5 h-5 text-primary" /> : <Bot className="w-5 h-5 text-primary" />}
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-bold text-on-background group-hover:text-primary transition-colors">Order #{plan.order_id}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-[8px] font-black text-primary uppercase">P{String(plan.current_period).padStart(2, '0')}</span>
                      <span className="text-[9px] text-on-surface-variant tracking-tighter">
                        ${(plan.total_earned || 0).toFixed(2)} / ${(plan.reward_base || 0).toFixed(2)}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-on-surface-variant group-hover:text-primary transition-colors" />
                </div>
              ))}
              
              {(!status?.plans || status.plans.length === 0) && (
                <p className="text-[10px] text-center text-on-surface-variant uppercase italic py-8">No linked orders found</p>
              )}
            </div>

            <div className="mt-8 pt-6 border-t border-outline/10 dark:border-white/5">
              <div className="flex gap-3 items-start p-4 rounded-2xl bg-primary/5">
                <Info className="w-5 h-5 text-primary mt-0.5" />
                <p className="text-[10px] text-on-surface-variant leading-relaxed uppercase tracking-wider">
                  "Every pulse injection stabilizes the cashback path for all active nodes. Complete the 500-day protocol to unlock 100% reclamation."
                </p>
              </div>
            </div>
          </div>
        </aside>

      </div>
    </div>
  );
}