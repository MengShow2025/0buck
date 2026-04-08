import React from 'react';
import { Wallet, ShoppingBag, ChevronLeft } from 'lucide-react';
import { useAppContext } from './AppContext';

export const VCCHeader = () => {
  const { setActiveDrawer } = useAppContext();

  return (
    <div className="flex items-center justify-between h-16 px-4 bg-[var(--wa-teal)] text-white shadow-md z-20">
      <div className="flex items-center gap-3">
        <ChevronLeft className="w-6 h-6 cursor-pointer" />
        <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-xl overflow-hidden">🐘</div>
        <div>
          <h1 className="font-semibold text-base leading-tight">Dumbo (0Buck)</h1>
          <span className="text-xs opacity-90">verified artisan assistant</span>
        </div>
      </div>
      <div className="flex gap-4">
        <Wallet 
          className="w-6 h-6 cursor-pointer" 
          onClick={() => setActiveDrawer('wallet')}
        />
        <ShoppingBag 
          className="w-6 h-6 cursor-pointer" 
          onClick={() => setActiveDrawer('fans')}
        />
      </div>
    </div>
  );
};
