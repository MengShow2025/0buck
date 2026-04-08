import React from 'react';
import { Wallet, Coins, Zap, ChevronRight, ShieldCheck } from 'lucide-react';

export const WalletDrawer: React.FC = () => {
  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-[#111111] p-4 gap-4 pb-24">
      {/* Total Balance Card */}
      <div className="bg-[var(--wa-teal)] rounded-2xl p-5 text-white shadow-lg relative overflow-hidden">
        <div className="absolute -right-4 -top-4 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-1">
            <Wallet className="w-5 h-5 opacity-90" />
            <span className="text-[15px] font-medium opacity-90">Total Balance</span>
          </div>
          <div className="text-[36px] font-bold mb-4 tracking-tight">
            $1,240.50
          </div>
          
          <div className="flex gap-3">
            <button className="flex-1 bg-white text-[var(--wa-teal)] py-2.5 rounded-xl font-semibold text-[15px] active:scale-95 transition-transform shadow-sm">
              Withdraw
            </button>
            <button className="flex-1 bg-black/20 text-white py-2.5 rounded-xl font-semibold text-[15px] active:scale-95 transition-transform backdrop-blur-sm">
              Deposit
            </button>
          </div>
        </div>
      </div>

      {/* Points & Tokens */}
      <div className="grid grid-cols-2 gap-3">
        {/* Points */}
        <div className="bg-white dark:bg-[#1c1c1e] p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <Coins className="w-4 h-4 text-amber-500" />
            </div>
            <span className="text-[13px] text-gray-500 dark:text-gray-400 font-medium">0Buck Points</span>
          </div>
          <div className="text-[20px] font-bold text-gray-800 dark:text-gray-200">
            3,450
          </div>
          <div className="text-[11px] text-gray-400 mt-1">≈ 3 Resurgence Cards</div>
        </div>

        {/* AI Tokens */}
        <div className="bg-white dark:bg-[#1c1c1e] p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <Zap className="w-4 h-4 text-blue-500" />
            </div>
            <span className="text-[13px] text-gray-500 dark:text-gray-400 font-medium">API Usage</span>
          </div>
          <div className="text-[20px] font-bold text-gray-800 dark:text-gray-200">
            $0.42
          </div>
          <div className="text-[11px] text-gray-400 mt-1">Limit: $1.00 / day</div>
        </div>
      </div>

      {/* Settings Menu */}
      <div className="bg-white dark:bg-[#1c1c1e] rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
        <button className="w-full px-4 py-3.5 flex items-center justify-between border-b border-gray-100 dark:border-gray-800 active:bg-gray-50 dark:active:bg-gray-800 transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            </div>
            <span className="text-[15px] font-medium text-gray-800 dark:text-gray-200">Security & Payment</span>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-400" />
        </button>
        <button className="w-full px-4 py-3.5 flex items-center justify-between active:bg-gray-50 dark:active:bg-gray-800 transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
              <span className="text-[14px] font-bold text-gray-600 dark:text-gray-400">USDC</span>
            </div>
            <span className="text-[15px] font-medium text-gray-800 dark:text-gray-200">Withdrawal Methods</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[13px] text-gray-400">PayPal / Crypto</span>
            <ChevronRight className="w-4 h-4 text-gray-400" />
          </div>
        </button>
      </div>
    </div>
  );
};