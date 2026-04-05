import { useMemo, useState } from 'react';
import { Apple, Chrome, Facebook, Lock, Mail, Terminal, Shield, ArrowRight, Info } from 'lucide-react';
import Logo from './Logo';

interface LoginViewProps {
  onLogin: (email: string) => void;
  onGoRegister: () => void;
  onGuestAccess?: () => void;
  onInteraction?: () => void;
  isModal?: boolean;
}

export default function LoginView({ onLogin, onGoRegister, onGuestAccess, onInteraction, isModal = false }: LoginViewProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [staySignedIn, setStaySignedIn] = useState(true);
  
  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    if (onInteraction) onInteraction();
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
    if (onInteraction) onInteraction();
  };

  const isContinueDisabled = useMemo(() => email.trim().length === 0 || password.trim().length === 0, [email, password]);

  const backgroundElements = (
    <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
      <div className="absolute -top-[20%] -left-[10%] w-[60%] h-[60%] bg-[radial-gradient(circle_at_50%_50%,rgba(255,92,0,0.15)_0%,transparent_70%)] opacity-40"></div>
      <div className="absolute top-[40%] -right-[15%] w-[50%] h-[50%] bg-[radial-gradient(circle_at_50%_50%,rgba(255,92,0,0.15)_0%,transparent_70%)] opacity-20"></div>
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.03] mix-blend-overlay"></div>
      <img 
        className="absolute inset-0 w-full h-full object-cover opacity-20 mix-blend-luminosity" 
        alt="Background"
        src="https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=2072&auto=format&fit=crop"
      />
    </div>
  );

  const header = (
    <header className="fixed top-0 w-full z-50 flex items-center justify-between px-8 h-20">
      <div className="flex items-center gap-2">
        <Logo mode="horizontal" size={32} />
        <div className="h-4 w-px bg-white/10 mx-2"></div>
        <span className="text-[8px] sm:text-[10px] uppercase tracking-[0.2em] text-white/40 font-bold whitespace-nowrap">Precision Ledger v2.4</span>
      </div>
      <div className="hidden md:flex items-center gap-6">
        <a className="text-sm font-medium text-white/60 hover:text-white transition-colors" href="#">Documentation</a>
        <a className="text-sm font-medium text-white/60 hover:text-white transition-colors" href="#">System Status</a>
      </div>
    </header>
  );

  const loginCard = (
    <div className="glass-panel bg-black/60 backdrop-blur-[24px] border border-white/10 rounded-2xl p-8 md:p-10 shadow-2xl relative overflow-hidden group">
      <div className="absolute -top-12 -right-12 text-[12rem] font-black text-white/[0.02] select-none pointer-events-none group-hover:text-primary/[0.03] transition-colors slashed-zero">0</div>
      <div className="relative z-10">
        <h2 className="text-2xl font-bold font-headline mb-2 text-white">Initialize Session</h2>
        <p className="text-white/40 text-sm mb-8">Select authentication method to access the ledger.</p>
        
        <div className="grid grid-cols-3 gap-3 mb-8">
          <button className="flex flex-col items-center justify-center py-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all active:scale-95 group/btn">
            <Chrome className="w-6 h-6 mb-2 text-white/60 group-hover/btn:text-white transition-colors" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-white/60 group-hover/btn:text-white">Google</span>
          </button>
          <button className="flex flex-col items-center justify-center py-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all active:scale-95 group/btn">
            <Apple className="w-6 h-6 mb-2 text-white/60 group-hover/btn:text-white transition-colors" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-white/60 group-hover/btn:text-white">Apple</span>
          </button>
          <button className="flex flex-col items-center justify-center py-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all active:scale-95 group/btn">
            <Facebook className="w-6 h-6 mb-2 text-white/60 group-hover/btn:text-white transition-colors" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-white/60 group-hover/btn:text-white">Meta</span>
          </button>
        </div>

        <div className="relative flex items-center gap-4 mb-8">
          <div className="h-px bg-white/10 flex-grow"></div>
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/20">or email protocol</span>
          <div className="h-px bg-white/10 flex-grow"></div>
        </div>

        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); onLogin(email); }}>
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-widest text-white/40 ml-1">Email Identifier</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
              <input 
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-sm text-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all placeholder:text-white/20" 
                placeholder="operator@0buck.network" 
                type="email"
                value={email}
                onChange={handleEmailChange}
                onFocus={onInteraction}
              />
            </div>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <label className="text-[10px] font-bold uppercase tracking-widest text-white/40 ml-1">Access Key</label>
              <button type="button" className="text-[10px] font-bold uppercase text-primary/60 hover:text-primary transition-colors">Recovery?</button>
            </div>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
              <input 
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-sm text-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all placeholder:text-white/20" 
                placeholder="••••••••••••" 
                type="password"
                value={password}
                onChange={handlePasswordChange}
                onFocus={onInteraction}
              />
            </div>
          </div>
          <button 
            disabled={isContinueDisabled}
            className="w-full bg-primary hover:bg-primary/90 py-4 rounded-xl font-bold text-sm tracking-widest uppercase shadow-lg shadow-primary/20 transition-all active:scale-[0.98] mt-4 text-white disabled:opacity-50"
          >
            Establish Connection
          </button>
        </form>
        <p className="text-center mt-8 text-xs text-white/30">
          System authorized access only. <button onClick={onGoRegister} className="text-white/60 hover:text-primary font-bold transition-colors">Register new node</button>
        </p>
      </div>
    </div>
  );

  const footer = (
    <footer className="fixed bottom-0 w-full z-50 p-8 hidden md:block">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-6">
        <div className="flex items-center gap-6 bg-black/60 backdrop-blur-[24px] border border-white/5 px-6 py-4 rounded-2xl">
          <div className="flex -space-x-2">
            <img className="w-8 h-8 rounded-full border-2 border-[#0a0a0a]" src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" alt="User" />
            <img className="w-8 h-8 rounded-full border-2 border-[#0a0a0a]" src="https://api.dicebear.com/7.x/avataaars/svg?seed=Aria" alt="User" />
            <div className="w-8 h-8 rounded-full border-2 border-[#0a0a0a] bg-primary flex items-center justify-center text-[10px] font-bold text-white">+12k</div>
          </div>
          <p className="text-xs text-white/40 leading-relaxed">
            Join the global network of precision ledgering. <br />
            <span className="text-white/60">Trusted by modern financial engineers.</span>
          </p>
        </div>
        <div className="flex flex-col items-end">
          <button 
            onClick={onGuestAccess}
            className="group flex items-center gap-3 bg-white/5 hover:bg-white/10 border border-white/10 px-8 py-3 rounded-xl transition-all active:scale-95"
          >
            <span className="text-xs font-bold uppercase tracking-widest text-white/80">Browse as Guest</span>
            <ArrowRight className="w-4 h-4 text-primary transition-transform group-hover:translate-x-1" />
          </button>
          <div className="flex items-center gap-2 mt-3 mr-2">
            <Info className="w-3 h-3 text-red-500" />
            <span className="text-[9px] font-bold uppercase tracking-tighter text-white/20">Limitations apply: No private groups or asset purchases</span>
          </div>
        </div>
      </div>
    </footer>
  );

  if (isModal) {
    return loginCard;
  }

  return (
    <div className="min-h-screen w-full bg-[#0a0a0a] text-white font-body overflow-hidden selection:bg-primary/30 relative">
      {backgroundElements}
      {header}
      
      <main className="relative z-10 min-h-screen w-full flex items-center justify-center p-6">
        <div className="w-full max-w-[1100px] grid md:grid-cols-2 gap-12 items-center">
          <div className="hidden md:block">
            <h1 className="font-headline text-6xl font-extrabold tracking-tight leading-[1.1] mb-6">
              Master the <span className="text-primary">Flow</span> of Digital Assets.
            </h1>
            <p className="text-white/50 text-lg max-w-md mb-8 leading-relaxed">
              0Buck provides high-performance ledgering for private ecosystems. Secure, immutable, and built for precision.
            </p>
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3 group">
                <div className="w-8 h-8 rounded bg-white/5 flex items-center justify-center border border-white/10 group-hover:border-primary/50 transition-colors">
                  <Terminal className="w-4 h-4 text-primary" />
                </div>
                <span className="text-sm text-white/40 font-medium">Terminal-grade interface</span>
              </div>
              <div className="flex items-center gap-3 group">
                <div className="w-8 h-8 rounded bg-white/5 flex items-center justify-center border border-white/10 group-hover:border-primary/50 transition-colors">
                  <Shield className="w-4 h-4 text-primary" />
                </div>
                <span className="text-sm text-white/40 font-medium">E2E Immutable ledgering</span>
              </div>
            </div>
          </div>
          
          {loginCard}
        </div>
      </main>

      {footer}

      <div className="fixed bottom-4 right-4 z-50 pointer-events-none opacity-20 hidden md:block">
        <div className="flex flex-col items-end font-mono text-[8px] tracking-tighter text-white uppercase">
          <span>Lat: 40.7128° N</span>
          <span>Lon: 74.0060° W</span>
          <span>Enc: AES-256-GCM</span>
        </div>
      </div>
    </div>
  );
}
