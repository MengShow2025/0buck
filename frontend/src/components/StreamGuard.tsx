import React from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, ShieldCheck } from 'lucide-react';

interface StreamGuardProps {
  isReady: boolean;
  isConnecting: boolean;
  children: React.ReactNode;
  onRetry?: () => void;
}

export default function StreamGuard({ isReady, isConnecting, children, onRetry }: StreamGuardProps) {
  const { t } = useTranslation();

  if (!isReady) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[400px] p-10 bg-black/40 backdrop-blur-md rounded-[3rem] border border-white/5">
        <div className="relative mb-8">
          {/* Cyberpunk Loading Animation */}
          <div className="absolute inset-0 bg-primary/20 rounded-full blur-2xl animate-pulse"></div>
          <div className="relative">
            <Loader2 className="w-16 h-16 text-primary animate-spin" />
          </div>
        </div>
        
        <div className="space-y-4 text-center">
          <h2 className="text-xl font-black text-white uppercase tracking-[0.3em] animate-pulse">
            {isConnecting ? t('lounge.establishing_uplink') : t('lounge.syncing')}
          </h2>
          <div className="flex flex-col items-center gap-4">
            <div className="flex items-center justify-center gap-2 text-zinc-500">
              <ShieldCheck size={14} className="text-primary" />
              <span className="text-[10px] font-bold uppercase tracking-widest">
                Vortex Chat Container (VCC) v3.4.4
              </span>
            </div>
            
            {!isConnecting && (
              <button 
                onClick={() => onRetry ? onRetry() : window.location.reload()}
                className="px-6 py-2 bg-primary/10 border border-primary/20 rounded-xl text-[10px] font-black text-primary uppercase tracking-widest hover:bg-primary/20 transition-all"
              >
                Force Neural Re-Uplink
              </button>
            )}
          </div>
        </div>

        {/* Binary Stream Decoration */}
        <div className="absolute bottom-10 left-0 right-0 overflow-hidden h-4 opacity-10 pointer-events-none">
          <div className="whitespace-nowrap animate-scroll-left text-[8px] font-mono text-primary">
            1010110011010101010110101010110101010101101010101101010101011010101011010101010110101010110101010101101010101
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
