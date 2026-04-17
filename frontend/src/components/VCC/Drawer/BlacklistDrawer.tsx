import React, { useState } from 'react';
import { ChevronLeft } from 'lucide-react';
import { useAppContext } from '../AppContext';

export const BlacklistDrawer: React.FC = () => {
  const { popDrawer, t } = useAppContext();
  const [blockedUsers, setBlockedUsers] = useState([
    { id: 'b1', name: 'Spam User', avatar: 'https://ui-avatars.com/api/?name=Spam&background=random' }
  ]);

  const handleUnblock = (id: string) => {
    setBlockedUsers(prev => prev.filter(u => u.id !== id));
  };

  return (
    <div className="flex flex-col h-full bg-[#F2F2F7] dark:bg-[#000000] overflow-y-auto pb-24">
      {/* Header */}
      <div className="px-4 py-3 bg-white/80 dark:bg-[#1C1C1E]/80 backdrop-blur-xl sticky top-0 z-10 border-b border-gray-100 dark:border-white/5 flex items-center gap-3">
        <button 
          onClick={popDrawer}
          className="w-10 h-10 flex items-center justify-center bg-white dark:bg-white/5 rounded-2xl border border-gray-200 dark:border-white/10 shadow-sm active:scale-90 transition-all text-gray-600 dark:text-gray-300 shrink-0"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <span className="text-[16px] font-bold text-gray-900 dark:text-white">
          {t('contact.blacklist') || 'Blacklist'}
        </span>
      </div>

      <div className="p-4 space-y-3">
        {blockedUsers.length === 0 ? (
          <div className="text-center text-gray-500 py-10">No blocked users</div>
        ) : (
          blockedUsers.map((user) => (
            <div 
              key={user.id} 
              className="bg-white dark:bg-[#1C1C1E] rounded-2xl p-3 flex items-center justify-between shadow-sm"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-12 h-12 rounded-full overflow-hidden shrink-0">
                  <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                </div>
                <span className="text-[15px] font-semibold text-gray-900 dark:text-white truncate">{user.name}</span>
              </div>
              <button 
                onClick={() => handleUnblock(user.id)}
                className="px-3 py-1.5 bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-300 text-[13px] font-bold rounded-full active:scale-95 transition-transform shrink-0"
              >
                {t('contact.unblock') || 'Unblock'}
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
