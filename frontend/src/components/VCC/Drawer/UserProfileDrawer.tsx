import React, { useState } from 'react';
import { UserPlus, MessageSquare, MapPin, Briefcase, Calendar, ShieldCheck, Star, ChevronRight, X } from 'lucide-react';
import { usePreferenceContext } from '../contexts/PreferenceContext';
import { useDrawerContext } from '../contexts/DrawerContext';

export const UserProfileDrawer: React.FC = () => {
    const { pushDrawer, setActiveChat } = useDrawerContext();
  const { t } = usePreferenceContext();
  const [requestSent, setRequestSent] = useState(false);

  // Mock user data - in a real app this would come from a selected user state
  const user = {
    name: 'Alex_Design',
    id: 'U12345',
    avatar: 'https://ui-avatars.com/api/?name=Alex&background=random',
    location: 'Singapore',
    bio: 'Product Designer | Tech Enthusiast | 0Buck Fanatic',
    vip: 'SVIP 5',
    joined: 'Jan 2024',
    stats: {
      feeds: 42,
      followers: 1205,
      following: 89
    }
  };

  const handleSendRequest = () => {
    setRequestSent(true);
    // In a real app, this would call an API
    console.log('Friend request sent to', user.name);
  };

  const handlePrivateMessage = () => {
    if (!requestSent) {
      handleSendRequest();
      return;
    }
    // If already friends/request sent, logic for chat can go here
    setActiveChat({ id: user.id, name: user.name, type: 'private', avatar: user.avatar });
    pushDrawer('chat_room');
  };

  return (
    <div className="flex flex-col h-full bg-[#F2F2F7] dark:bg-[#000000] overflow-y-auto pb-24">
      {/* Dynamic Title Sync */}
      <div className="hidden">{document.title = `${user.name} ${t('profile.title_suffix')}`}</div>
      {/* Header Profile Card */}
      <div className="bg-white/70 dark:bg-white/5 backdrop-blur-xl m-4 p-6 rounded-[40px] border border-white/40 dark:border-white/10 shadow-sm flex flex-col items-center">
        <div className="relative mb-4">
          <div className="w-24 h-24 rounded-[32px] overflow-hidden border-4 border-white dark:border-white/10 shadow-xl">
            <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
          </div>
          <div className="absolute -bottom-2 -right-2 bg-gradient-to-r from-yellow-500 to-orange-500 text-white text-[10px] font-black px-2 py-1 rounded-lg border-2 border-white shadow-md">
            {user.vip}
          </div>
        </div>
        
        <h2 className="text-[22px] font-black text-gray-900 dark:text-white tracking-tight mb-1">{user.name}</h2>
        <p className="text-[13px] text-gray-400 font-bold mb-4">ID: {user.id}</p>
        
        <div className="flex gap-8 mb-6">
          <div className="flex flex-col items-center">
            <span className="text-[18px] font-black text-gray-900 dark:text-white">{user.stats.feeds}</span>
            <span className="text-[11px] text-gray-400 font-bold uppercase tracking-widest">{t('profile.moments')}</span>
          </div>
          <div className="flex flex-col items-center border-x border-gray-100 dark:border-white/5 px-8">
            <span className="text-[18px] font-black text-gray-900 dark:text-white">{user.stats.followers}</span>
            <span className="text-[11px] text-gray-400 font-bold uppercase tracking-widest">{t('profile.fans')}</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-[18px] font-black text-gray-900 dark:text-white">{user.stats.following}</span>
            <span className="text-[11px] text-gray-400 font-bold uppercase tracking-widest">{t('profile.following')}</span>
          </div>
        </div>

        <div className="flex gap-3 w-full">
          <button 
            onClick={handlePrivateMessage}
            className="flex-1 h-14 bg-white dark:bg-white/5 rounded-[24px] border border-gray-100 dark:border-white/10 flex items-center justify-center gap-2 text-gray-900 dark:text-white font-black text-[15px] active:scale-95 transition-all shadow-sm"
          >
            <MessageSquare className="w-5 h-5" /> {t('profile.send_message')}
          </button>
          <button
            onClick={handleSendRequest}
            disabled={requestSent}
            className={`flex-1 h-14 rounded-[24px] flex items-center justify-center gap-2 font-semibold text-[15px] active:scale-95 transition-all shadow-lg ${
              requestSent
                ? 'bg-gray-200 dark:bg-white/10 text-gray-400 cursor-not-allowed'
                : 'text-white'
            }`}
            style={!requestSent ? { background: 'linear-gradient(135deg, #FF7A3D 0%, #E8450A 100%)', boxShadow: '0 4px 14px rgba(232,69,10,0.30)' } : {}}
          >
            <UserPlus className="w-5 h-5" /> {requestSent ? t('profile.request_sent') : t('profile.add_friend')}
          </button>
        </div>
      </div>

      {/* Info Sections */}
      <div className="px-4 space-y-4">
        <div className="bg-white/70 dark:bg-white/5 backdrop-blur-xl p-5 rounded-[32px] border border-white/40 dark:border-white/10 shadow-sm">
          <h3 className="text-[13px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3">{t('profile.intro')}</h3>
          <p className="text-[15px] text-gray-700 dark:text-gray-300 font-medium leading-relaxed">{user.bio}</p>
        </div>

        <div className="bg-white/70 dark:bg-white/5 backdrop-blur-xl rounded-[32px] overflow-hidden border border-white/40 dark:border-white/10 shadow-sm">
          <div className="flex items-center gap-4 px-5 py-4 border-b border-gray-100 dark:border-white/5">
            <MapPin className="w-5 h-5 text-blue-500" />
            <div className="flex-1">
              <div className="text-[11px] text-gray-400 font-bold uppercase tracking-widest">{t('profile.region')}</div>
              <div className="text-[15px] text-gray-900 dark:text-white font-black">{user.location}</div>
            </div>
          </div>
          <div className="flex items-center gap-4 px-5 py-4">
            <Calendar className="w-5 h-5 text-purple-500" />
            <div className="flex-1">
              <div className="text-[11px] text-gray-400 font-bold uppercase tracking-widest">{t('profile.join_date')}</div>
              <div className="text-[15px] text-gray-900 dark:text-white font-black">{user.joined}</div>
            </div>
          </div>
        </div>

        <div 
          onClick={() => {
            document.title = `${user.name} ${t('profile.moments_title')}`;
            pushDrawer('all_fan_feeds');
          }}
          className="bg-white/70 dark:bg-white/5 backdrop-blur-xl p-5 rounded-[32px] border border-white/40 dark:border-white/10 shadow-sm flex items-center justify-between cursor-pointer active:bg-gray-50 dark:active:bg-white/5 transition-all"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center">
              <Star className="w-6 h-6 text-orange-500 fill-current" />
            </div>
            <span className="text-[15px] font-black text-gray-900 dark:text-white">{t('profile.homepage')}</span>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-300" />
        </div>
      </div>
    </div>
  );
};
