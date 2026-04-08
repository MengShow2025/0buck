import React from 'react';
import { Target, Gift, Users, Trophy, ChevronRight, ShieldCheck } from 'lucide-react';

export const FanCenterDrawer: React.FC = () => {
  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-[#111111] p-4 gap-4 pb-24">
      {/* 20-Phase Rebate Progress */}
      <div className="bg-white dark:bg-[#1c1c1e] rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-800">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-[var(--wa-teal)]" />
            <span className="text-[15px] font-bold text-gray-800 dark:text-gray-200">Rebate Radar</span>
          </div>
          <span className="text-[12px] font-medium text-[var(--wa-teal)] bg-orange-50 dark:bg-orange-500/10 px-2 py-1 rounded-md">
            Phase 7 of 20
          </span>
        </div>
        
        <div className="mb-2 flex justify-between items-end">
          <span className="text-[28px] font-black text-gray-800 dark:text-gray-100 leading-none">$14.50</span>
          <span className="text-[12px] text-gray-400 font-medium pb-1">of $45.00 Goal</span>
        </div>

        {/* Progress Bar */}
        <div className="h-2.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden mb-3">
          <div className="h-full bg-[var(--wa-teal)] rounded-full" style={{ width: '32%' }} />
        </div>
        
        <p className="text-[12px] text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-green-500" />
          13 phases left to full 100% unlock
        </p>
      </div>

      {/* Earnings Leaderboard / Fan Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white dark:bg-[#1c1c1e] p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
              <Users className="w-4 h-4 text-purple-500" />
            </div>
            <span className="text-[13px] text-gray-500 dark:text-gray-400 font-medium">My Fans</span>
          </div>
          <div className="text-[20px] font-bold text-gray-800 dark:text-gray-200">
            128
          </div>
          <div className="text-[11px] text-gray-400 mt-1">Active within 2 years</div>
        </div>

        <div className="bg-white dark:bg-[#1c1c1e] p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <Gift className="w-4 h-4 text-green-500" />
            </div>
            <span className="text-[13px] text-gray-500 dark:text-gray-400 font-medium">Referral Earned</span>
          </div>
          <div className="text-[20px] font-bold text-gray-800 dark:text-gray-200">
            $342.50
          </div>
          <div className="text-[11px] text-[var(--wa-teal)] mt-1 font-medium">+ $12.00 today</div>
        </div>
      </div>

      {/* Action List */}
      <div className="bg-white dark:bg-[#1c1c1e] rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
        <button className="w-full px-4 py-3.5 flex items-center justify-between border-b border-gray-100 dark:border-gray-800 active:bg-gray-50 dark:active:bg-gray-800 transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-orange-50 dark:bg-orange-500/10 flex items-center justify-center">
              <Trophy className="w-4 h-4 text-[var(--wa-teal)]" />
            </div>
            <div className="flex flex-col items-start">
              <span className="text-[15px] font-medium text-gray-800 dark:text-gray-200">Group Buy Status</span>
              <span className="text-[11px] text-gray-400">2 free items pending</span>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-400" />
        </button>
        <button className="w-full px-4 py-3.5 flex items-center justify-between active:bg-gray-50 dark:active:bg-gray-800 transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center">
              <Users className="w-4 h-4 text-blue-500" />
            </div>
            <div className="flex flex-col items-start">
              <span className="text-[15px] font-medium text-gray-800 dark:text-gray-200">Fan Leaderboard</span>
              <span className="text-[11px] text-gray-400">Ranked #142 globally</span>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-400" />
        </button>
      </div>
    </div>
  );
};