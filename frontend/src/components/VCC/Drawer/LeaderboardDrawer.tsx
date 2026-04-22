import React, { useState } from 'react';
import { Trophy, Star, ChevronLeft, Search, Filter, ArrowUpRight, Award, Flame, Users } from 'lucide-react';
import { usePreferenceContext } from '../contexts/PreferenceContext';
import { useDrawerContext } from '../contexts/DrawerContext';

export const LeaderboardDrawer: React.FC = () => {
    const { popDrawer } = useDrawerContext();
  const { t } = usePreferenceContext();
  const [activeTab, setActiveTab] = useState<'global' | 'influencers'>('global');

  // Mock data for Global Leaderboard (Top Earners)
  const globalLeaders = [
    { rank: 1, name: t('leaderboard.alex_m'), level: 'Diamond', amount: '12,450.00', trend: '+12%', avatar: 'https://i.pravatar.cc/150?img=11' },
    { rank: 2, name: t('leaderboard.sarah_k'), level: 'Gold', amount: '9,820.50', trend: '+8%', avatar: 'https://i.pravatar.cc/150?img=5' },
    { rank: 3, name: t('leaderboard.david_w'), level: 'Diamond', amount: '8,105.00', trend: '+15%', avatar: 'https://i.pravatar.cc/150?img=8' },
    { rank: 4, name: t('leaderboard.emily_r'), level: 'Silver', amount: '6,430.20', trend: '+5%', avatar: 'https://i.pravatar.cc/150?img=9' },
    { rank: 5, name: t('leaderboard.michael_b'), level: 'Gold', amount: '5,900.00', trend: '+2%', avatar: 'https://i.pravatar.cc/150?img=12' },
  ];

  // Mock data for Influencers (Top Converters)
  const influencerLeaders = [
    { rank: 1, name: t('leaderboard.techinsider'), platform: 'YouTube', fans: '1.2M', amount: '45,200.00', avatar: 'https://i.pravatar.cc/150?img=33' },
    { rank: 2, name: t('leaderboard.beautybyjess'), platform: 'TikTok', fans: '850K', amount: '38,150.00', avatar: 'https://i.pravatar.cc/150?img=47' },
    { rank: 3, name: t('leaderboard.homedecordaily'), platform: 'Instagram', fans: '500K', amount: '29,800.00', avatar: 'https://i.pravatar.cc/150?img=45' },
  ];

  const currentLeaders = activeTab === 'global' ? globalLeaders : influencerLeaders;

  return (
    <div className="flex flex-col h-full bg-[#F2F2F7] dark:bg-[#000000] pb-32 overflow-y-auto no-scrollbar">
      {/* Header Banner */}
      <div className="bg-gradient-to-br from-orange-500 to-red-600 px-6 pt-6 pb-8 text-white relative overflow-hidden rounded-b-[40px] shadow-lg">
        <div className="absolute -right-10 -bottom-10 opacity-10">
          <Trophy className="w-48 h-48" />
        </div>
        
        <div className="relative z-10 flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center">
              <Trophy className="w-6 h-6 text-yellow-300" />
            </div>
            <div>
              <h2 className="text-[20px] font-black tracking-tight">{t('leaderboard.top_earners')}</h2>
              <p className="text-[11px] font-bold text-white/70 uppercase tracking-widest">{t('leaderboard.global_ranking')}</p>
            </div>
          </div>
          <div className="text-right bg-black/20 px-4 py-2 rounded-2xl backdrop-blur-md">
            <div className="text-[10px] font-bold text-white/70 uppercase">{t('leaderboard.my_rank')}</div>
            <div className="text-[18px] font-black text-yellow-300">#142</div>
          </div>
        </div>

        {/* Custom Tabs */}
        <div className="relative z-10 flex p-1 bg-black/20 backdrop-blur-md rounded-2xl">
          <button 
            onClick={() => setActiveTab('global')}
            className={`flex-1 py-2.5 text-[13px] font-semibold rounded-xl transition-all flex items-center justify-center gap-2 ${
              activeTab === 'global' ? 'bg-white text-orange-600 shadow-sm' : 'text-white/70 hover:text-white'
            }`}
          >
            <Users className="w-4 h-4" />
            {t('leaderboard.global_users')}
          </button>
          <button 
            onClick={() => setActiveTab('influencers')}
            className={`flex-1 py-2.5 text-[13px] font-semibold rounded-xl transition-all flex items-center justify-center gap-2 ${
              activeTab === 'influencers' ? 'bg-white text-orange-600 shadow-sm' : 'text-white/70 hover:text-white'
            }`}
          >
            <Star className="w-4 h-4" />
            {t('leaderboard.top_influencers')}
          </button>
        </div>
      </div>

      {/* Top 3 Podium (Visual) */}
      <div className="px-4 mt-6 relative z-20 flex items-end justify-center gap-2 mb-6">
        {/* Rank 2 */}
        {currentLeaders[1] && (
          <div className="w-1/3 flex flex-col items-center animate-in slide-in-from-bottom-4 duration-500 delay-100">
            <div className="relative mb-2">
              <img src={currentLeaders[1].avatar} className="w-14 h-14 rounded-full border-4 border-[#F2F2F7] dark:border-[#000000] object-cover" alt="" />
              <div className="absolute -bottom-2 -right-1 w-6 h-6 bg-gray-300 rounded-full flex items-center justify-center text-[10px] font-black text-white border-2 border-[#F2F2F7] dark:border-[#000000]">2</div>
            </div>
            <div className="w-full bg-white dark:bg-[#1C1C1E] h-24 rounded-t-2xl shadow-lg border border-gray-100 dark:border-white/5 flex flex-col items-center pt-3 px-2 text-center">
              <span className="text-[11px] font-black text-gray-900 dark:text-white truncate w-full">{currentLeaders[1].name}</span>
              <span className="text-[10px] text-gray-400 font-bold uppercase mt-1 truncate w-full">{activeTab === 'global' ? (currentLeaders[1] as any).level : (currentLeaders[1] as any).platform}</span>
              <span className="text-[12px] font-black text-[var(--wa-teal)] mt-auto pb-2">${currentLeaders[1].amount}</span>
            </div>
          </div>
        )}
        
        {/* Rank 1 */}
        {currentLeaders[0] && (
          <div className="w-1/3 flex flex-col items-center animate-in slide-in-from-bottom-8 duration-500">
            <div className="relative mb-2">
              <div className="absolute -top-6 inset-x-0 flex justify-center">
                <Trophy className="w-6 h-6 text-yellow-500 drop-shadow-md" />
              </div>
              <img src={currentLeaders[0].avatar} className="w-16 h-16 rounded-full border-4 border-yellow-400 object-cover shadow-lg shadow-yellow-500/30" alt="" />
              <div className="absolute -bottom-2 -right-1 w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center text-[10px] font-black text-white border-2 border-[#F2F2F7] dark:border-[#000000]">1</div>
            </div>
            <div className="w-full bg-gradient-to-t from-yellow-50 to-white dark:from-yellow-900/20 dark:to-[#1C1C1E] h-32 rounded-t-2xl shadow-xl border border-yellow-200 dark:border-yellow-500/20 flex flex-col items-center pt-4 px-2 text-center relative overflow-hidden">
              <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20 mix-blend-overlay"></div>
              <span className="text-[12px] font-black text-gray-900 dark:text-white truncate w-full relative z-10">{currentLeaders[0].name}</span>
              <span className="text-[10px] text-yellow-600 dark:text-yellow-500 font-bold uppercase mt-1 truncate w-full relative z-10">{activeTab === 'global' ? (currentLeaders[0] as any).level : (currentLeaders[0] as any).platform}</span>
              <span className="text-[14px] font-black text-[var(--wa-teal)] mt-auto pb-3 relative z-10">${currentLeaders[0].amount}</span>
            </div>
          </div>
        )}

        {/* Rank 3 */}
        {currentLeaders[2] && (
          <div className="w-1/3 flex flex-col items-center animate-in slide-in-from-bottom-2 duration-500 delay-200">
            <div className="relative mb-2">
              <img src={currentLeaders[2].avatar} className="w-14 h-14 rounded-full border-4 border-[#F2F2F7] dark:border-[#000000] object-cover" alt="" />
              <div className="absolute -bottom-2 -right-1 w-6 h-6 bg-orange-400 rounded-full flex items-center justify-center text-[10px] font-black text-white border-2 border-[#F2F2F7] dark:border-[#000000]">3</div>
            </div>
            <div className="w-full bg-white dark:bg-[#1C1C1E] h-20 rounded-t-2xl shadow-lg border border-gray-100 dark:border-white/5 flex flex-col items-center pt-2 px-2 text-center">
              <span className="text-[11px] font-black text-gray-900 dark:text-white truncate w-full">{currentLeaders[2].name}</span>
              <span className="text-[10px] text-gray-400 font-bold uppercase mt-1 truncate w-full">{activeTab === 'global' ? (currentLeaders[2] as any).level : (currentLeaders[2] as any).platform}</span>
              <span className="text-[11px] font-black text-[var(--wa-teal)] mt-auto pb-2">${currentLeaders[2].amount}</span>
            </div>
          </div>
        )}
      </div>

      {/* List View for Rank 4+ */}
      <div className="px-4 space-y-3">
        {currentLeaders.slice(3).map((leader, idx) => (
          <div key={idx} className="bg-white dark:bg-[#1C1C1E] p-4 rounded-2xl flex items-center gap-4 shadow-sm border border-gray-100 dark:border-white/5 group cursor-pointer active:scale-[0.98] transition-all">
            <div className="w-6 text-center font-black text-gray-400 text-[14px]">
              {leader.rank}
            </div>
            <img src={leader.avatar} className="w-12 h-12 rounded-full object-cover" alt="" />
            <div className="flex-1 min-w-0">
              <div className="text-[14px] font-black text-gray-900 dark:text-white truncate">{leader.name}</div>
              <div className="text-[11px] text-gray-400 font-bold uppercase truncate">
                {activeTab === 'global' ? (leader as any).level : `${(leader as any).platform} • ${(leader as any).fans} Fans`}
              </div>
            </div>
            <div className="text-right">
              <div className="text-[15px] font-black text-gray-900 dark:text-white">${leader.amount}</div>
              {activeTab === 'global' && (
                <div className="text-[10px] text-emerald-500 font-bold flex items-center justify-end gap-0.5">
                  <ArrowUpRight className="w-3 h-3" />
                  {(leader as any).trend}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      
      {/* Load More Trigger */}
      <div className="px-4 mt-6 text-center">
        <button className="text-[12px] font-black text-gray-400 uppercase tracking-widest hover:text-gray-600 transition-colors">
          {t('leaderboard.load_more_rankings')}
        </button>
      </div>
    </div>
  );
};