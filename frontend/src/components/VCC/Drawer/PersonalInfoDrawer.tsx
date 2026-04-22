import React, { useState } from 'react';
import { Camera, ChevronRight } from 'lucide-react';
import { usePreferenceContext } from '../contexts/PreferenceContext';
import { useSessionContext } from '../contexts/SessionContext';
import { buildAvatarFallback, getDisplayName } from '../utils/userIdentity';

export const PersonalInfoDrawer: React.FC = () => {
  const { user } = useSessionContext();
  const { t } = usePreferenceContext();
  const [nickname, setNickname] = useState(getDisplayName(user));
  
  return (
    <div className="h-full flex flex-col bg-[#F2F2F7] dark:bg-[#000000] overflow-y-auto pb-20">
      <div className="px-4 py-6 space-y-6">
        
        {/* Avatar Section */}
        <div className="flex flex-col items-center justify-center pt-4 pb-2">
          <div className="relative group cursor-pointer">
            <div className="w-24 h-24 rounded-full bg-gray-200 dark:bg-gray-800 overflow-hidden border-4 border-white dark:border-[#1C1C1E] shadow-sm">
              <img 
                src={user?.avatar_url || buildAvatarFallback(user)} 
                alt="Avatar"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="absolute bottom-0 right-0 w-8 h-8 bg-white dark:bg-[#2C2C2E] rounded-full flex items-center justify-center shadow-md border border-gray-100 dark:border-white/10 text-gray-600 dark:text-gray-300">
              <Camera className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-3">{t('profile.change_avatar')}</p>
        </div>

        {/* Form Group */}
        <div>
          <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 ml-2">{t('profile.basic_info')}</h3>
          <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl overflow-hidden shadow-sm">
            
            {/* Nickname */}
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-gray-100 dark:border-white/5">
              <span className="text-[15px] text-gray-900 dark:text-white">{t('nickname')}</span>
              <input 
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                className="text-right text-[15px] text-gray-500 dark:text-gray-400 bg-transparent outline-none w-1/2"
                placeholder={t('profile.nickname_placeholder')}
              />
            </div>

            {/* Email (Readonly) */}
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-gray-100 dark:border-white/5">
              <span className="text-[15px] text-gray-900 dark:text-white">{t('email')}</span>
              <span className="text-[15px] text-gray-400">{user?.email || '--'}</span>
            </div>

            {/* Level */}
            <div className="flex items-center justify-between px-4 py-3.5">
              <span className="text-[15px] text-gray-900 dark:text-white">{t('level')}</span>
              <span className="text-[13px] font-medium bg-gradient-to-r from-yellow-500 to-orange-500 text-white px-2 py-0.5 rounded">
                {user?.user_tier || t('profile.level_v1')}
              </span>
            </div>

          </div>
        </div>

        {/* Address Entry */}
        <div>
          <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl overflow-hidden shadow-sm">
            <button 
              className="w-full flex items-center justify-between px-4 py-3.5 active:bg-gray-50 dark:active:bg-white/5 transition-colors"
            >
              <span className="text-[15px] text-gray-900 dark:text-white">{t('address_mgmt')}</span>
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
