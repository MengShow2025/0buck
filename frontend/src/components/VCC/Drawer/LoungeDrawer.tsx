import React, { useState, useEffect } from 'react';
import { Search, VolumeX, ShieldAlert, Sparkles, Bot, UserPlus, Users, Plus, PlusCircle, UserCheck, ChevronLeft } from 'lucide-react';
import { usePreferenceContext } from '../contexts/PreferenceContext';
import { useSessionContext } from '../contexts/SessionContext';
import { useDrawerContext } from '../contexts/DrawerContext';
import { friendsApi, groupsApi } from '../../../services/api';

export const LoungeDrawer: React.FC = () => {
    const { setActiveDrawer, setActiveChat, pushDrawer } = useDrawerContext();
  const { t } = usePreferenceContext();
  const { user, requireAuth } = useSessionContext();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [showPlusMenu, setShowPlusMenu] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'chat' | 'discover'>('chat');

  const [leftGroups, setLeftGroups] = useState<string[]>([]);
  const [closedGroups, setClosedGroups] = useState<string[]>([]);
  const [dynamicGroups, setDynamicGroups] = useState<any[]>([]);
  const [dynamicPrivateChats, setDynamicPrivateChats] = useState<any[]>([]);

  useEffect(() => {
    // Load hidden groups
    const loadHiddenGroups = () => {
      setLeftGroups(JSON.parse(localStorage.getItem('vcc_left_groups') || '[]'));
      setClosedGroups(JSON.parse(localStorage.getItem('vcc_closed_groups') || '[]'));
    };
    loadHiddenGroups();
    
    // Setup listener for storage changes to update list instantly if needed
    window.addEventListener('storage', loadHiddenGroups);
    return () => window.removeEventListener('storage', loadHiddenGroups);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const f = await friendsApi.list();
        const friendItems = (f.data?.items || []).map((x: any) => ({
          id: `private_${x.id}`,
          name: x.name,
          avatar: x.avatar,
          lastMessage: '',
          time: '',
          unread: 0,
          type: 'private',
          userId: Number(x.id),
        }));
        setDynamicPrivateChats(friendItems);
      } catch {
        setDynamicPrivateChats([]);
      }
      try {
        await groupsApi.bootstrapDefaults();
        const res = await groupsApi.list();
        const items = (res.data?.items || []).map((g: any) => ({
          id: `group_${g.id}`,
          name: g.name,
          avatar: g.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(g.name || 'Group')}&background=random`,
          lastMessage: '',
          time: '',
          unread: 0,
          type: 'group',
          memberCount: 0,
        }));
        setDynamicGroups(items);
      } catch {
        setDynamicGroups([]);
      }
    })();
  }, []);

  const handleRestoreGroups = () => {
    localStorage.removeItem('vcc_left_groups');
    localStorage.removeItem('vcc_closed_groups');
    setLeftGroups([]);
    setClosedGroups([]);
  };

  const CHAT_LIST = [
    {
      id: '2',
      name: user?.butler_name || t('lounge.ai_butler'),
      icon: <Bot className="w-6 h-6 text-white" />,
      avatarBg: 'bg-indigo-500',
      lastMessage: t('lounge.msg_phase_reward'),
      time: t('common.yesterday'),
      unread: 0,
      isOfficial: true,
      isAiButler: true,
      type: 'private'
    },
    {
      id: '5',
      name: t('lounge.order_helper'),
      icon: <ShieldAlert className="w-6 h-6 text-white" />,
      avatarBg: 'bg-gray-500',
      lastMessage: t('lounge.msg_package_delivered'),
      time: '10/24',
      unread: 0,
      isOfficial: true,
      type: 'topic'
    }
  ];

  const MERGED_CHAT_LIST = [...dynamicGroups, ...dynamicPrivateChats, ...CHAT_LIST];
  const VISIBLE_CHAT_LIST = MERGED_CHAT_LIST.filter(chat => !leftGroups.includes(chat.id) && !closedGroups.includes(chat.id));

  useEffect(() => {
    const q = searchQuery.trim();
    if (!q) {
      setSearchResults([]);
      return;
    }
    const timer = window.setTimeout(async () => {
      try {
        const res = await friendsApi.search(q);
        const users = (res.data?.items || []).map((x: any) => ({
          id: x.id,
          user_id: x.id,
          name: x.name,
          id_str: x.email || `UID-${x.id}`,
          type: 'user',
          isFriend: x.relation === 'friend',
          relation: x.relation,
          avatar: x.avatar,
        }));
        setSearchResults(users);
      } catch {
        setSearchResults([]);
      }
    }, 250);
    return () => window.clearTimeout(timer);
  }, [searchQuery]);

  const handleChatClick = (chat: any) => {
    setActiveChat({
      id: chat.id,
      name: chat.name,
      type: chat.type,
      avatar: chat.avatar,
      peerUserId: chat.userId ? Number(chat.userId) : (chat.user_id ? Number(chat.user_id) : undefined),
      memberCount: chat.memberCount,
      isOfficial: chat.isOfficial,
      isAiButler: chat.isAiButler,
    });
    pushDrawer('chat_room');
  };

  const handleAddFriend = async (e: React.MouseEvent, user: any) => {
    e.stopPropagation();
    const candidateId = Number(user.user_id);
    if (!Number.isFinite(candidateId) || candidateId <= 0) return;
    try {
      await friendsApi.requestAdd(candidateId, `Hi ${user.name}, let's connect on 0Buck.`);
      setSearchResults((prev) => prev.map((x) => (x.user_id === candidateId ? { ...x, relation: 'pending_out' } : x)));
    } catch {}
  };

  const PLUS_MENU_OPTIONS = [
    { id: 'add', name: t('lounge.add_friend') || 'Add Friend', icon: <UserPlus className="w-5 h-5" />, color: 'text-green-500' },
    { id: 'group', name: t('lounge.start_group') || 'Start Group', icon: <Users className="w-5 h-5" />, color: 'text-blue-500' },
    { id: 'scan', name: t('lounge.scan') || 'Scan', icon: <PlusCircle className="w-5 h-5" />, color: 'text-purple-500' },
  ];

  return (
    <div className="flex flex-col h-full bg-[#F2F2F7] dark:bg-[#000000]" onClick={() => setShowPlusMenu(false)}>
      {/* Header with Search and Actions */}
      <div className="px-4 py-3 bg-white/80 dark:bg-[#1C1C1E]/80 backdrop-blur-xl sticky top-0 z-10 border-b border-gray-100 dark:border-white/5">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setActiveDrawer('none')}
            className="w-10 h-10 flex items-center justify-center bg-white dark:bg-white/5 rounded-2xl border border-gray-200 dark:border-white/10 shadow-sm active:scale-90 transition-all text-gray-600 dark:text-gray-300 shrink-0"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          {/* Top Tabs (Chat / Discover) */}
          <div className="flex-1 flex justify-center gap-4 text-[16px] font-bold">
            <button 
              onClick={() => setActiveTab('chat')}
              className={`relative pb-1 transition-colors ${activeTab === 'chat' ? 'text-gray-900 dark:text-white' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
            >
              {t('lounge.chat') || 'Chat'}
              {activeTab === 'chat' && (
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-[3px] rounded-full bg-[var(--wa-teal)] dark:bg-orange-500" />
              )}
            </button>
            <button 
              onClick={() => setActiveTab('discover')}
              className={`relative pb-1 transition-colors ${activeTab === 'discover' ? 'text-gray-900 dark:text-white' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
            >
              {t('lounge.discover') || 'Discover'}
              {activeTab === 'discover' && (
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-[3px] rounded-full bg-[var(--wa-teal)] dark:bg-orange-500" />
              )}
            </button>
          </div>
          
          <button 
            onClick={() => requireAuth(() => pushDrawer('contacts'))}
            className="w-10 h-10 flex items-center justify-center bg-white dark:bg-white/5 rounded-2xl border border-gray-200 dark:border-white/10 shadow-sm active:scale-90 transition-all text-gray-600 dark:text-gray-300"
            title={t('lounge.friend_mgmt') || 'Contacts'}
          >
            <Users className="w-5 h-5" />
          </button>
          
          <div className="relative">
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setShowPlusMenu(!showPlusMenu);
              }}
              className={`w-10 h-10 flex items-center justify-center rounded-2xl shadow-lg active:scale-90 transition-all ${
                showPlusMenu ? 'bg-gray-800 text-white' : 'text-white'
              }`}
              style={!showPlusMenu ? { background: 'linear-gradient(135deg, #FF7A3D 0%, #E8450A 100%)' } : {}}
              title={t('lounge.more_actions')}
            >
              <Plus className={`w-6 h-6 transition-transform duration-300 ${showPlusMenu ? 'rotate-45' : ''}`} />
            </button>

            {/* Plus Menu Popover */}
            {showPlusMenu && (
              <div 
                className="absolute right-0 mt-2 w-44 bg-white dark:bg-[#1C1C1E] rounded-[24px] shadow-2xl border border-gray-100 dark:border-white/10 overflow-hidden z-50 animate-in zoom-in-95 duration-200 origin-top-right"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-1.5">
                  {PLUS_MENU_OPTIONS.map((option) => (
                    <button
                      key={option.id}
                      onClick={() => {
                        setShowPlusMenu(false);
                        if (option.id === 'group') pushDrawer('group_create');
                        if (option.id === 'add') setIsSearching(true);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 dark:hover:bg-white/5 rounded-[18px] transition-colors text-left group"
                    >
                      <div className={`${option.color} group-active:scale-90 transition-transform`}>
                        {option.icon}
                      </div>
                      <span className="text-[14px] font-semibold text-gray-900 dark:text-white tracking-tight">{option.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="px-4 py-2 bg-white/80 dark:bg-[#1C1C1E]/80 backdrop-blur-xl z-10 border-b border-gray-100 dark:border-white/5">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input 
            type="text" 
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setIsSearching(e.target.value.length > 0);
            }}
            placeholder={t('lounge.search_placeholder') || 'Search...'} 
            className="w-full bg-gray-100 dark:bg-white/5 text-gray-800 dark:text-gray-200 text-[14px] font-medium rounded-2xl py-2 pl-9 pr-4 outline-none border border-transparent focus:border-[var(--wa-teal)] transition-all"
          />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto pb-24">
        {activeTab === 'chat' ? (
          isSearching ? (
            <div className="animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="px-4 py-3 text-[13px] font-bold text-gray-500 uppercase tracking-wider sticky top-0 bg-[#F2F2F7] dark:bg-[#000000] z-10">
                {t('lounge.search_results')}
              </div>
              {searchResults.map((result) => (
                <div 
                  key={result.id}
                  onClick={() => handleChatClick(result)}
                  className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-[#1C1C1E] active:bg-gray-50 dark:active:bg-white/5 transition-colors cursor-pointer border-b border-gray-50 dark:border-white/5"
                >
                  <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-100 dark:bg-white/10 shrink-0">
                    {result.avatar ? (
                      <img src={result.avatar} alt={result.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        {result.type === 'topic' ? '#' : <Users className="w-6 h-6" />}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="font-semibold text-[16px] text-gray-900 dark:text-white truncate">
                        {result.name}
                      </span>
                      {result.id_str && (
                        <span className="text-[12px] text-gray-400 font-mono">{result.id_str}</span>
                      )}
                    </div>
                    <div className="text-[14px] text-gray-500 dark:text-gray-400 truncate">
                      {result.type === 'user' ? (
                        result.relation === 'friend'
                          ? <span className="text-green-500 text-[12px] font-medium">{t('lounge.already_friend')}</span>
                          : result.relation === 'pending_out'
                            ? <span className="text-[12px] font-medium text-amber-500">Pending</span>
                            : t('lounge.not_friend')
                      ) : (
                        <span className="flex items-center gap-1">
                          <Users className="w-3.5 h-3.5" />
                          {result.memberCount} {t('lounge.members')}
                        </span>
                      )}
                    </div>
                  </div>
                  {result.type === 'user' && result.relation !== 'friend' && result.relation !== 'pending_out' && (
                    <button 
                      onClick={(e) => handleAddFriend(e, result)}
                      className="px-3 py-1.5 bg-[var(--wa-teal)] text-white text-[13px] font-bold rounded-full active:scale-95 transition-transform"
                    >
                      {t('common.add')}
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="animate-in fade-in duration-300">
              {VISIBLE_CHAT_LIST.map((chat) => (
                <div 
                  key={chat.id}
                  onClick={() => handleChatClick(chat)}
                  className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-[#1C1C1E] active:bg-gray-50 dark:active:bg-white/5 transition-colors cursor-pointer relative group"
                >
                  <div className="w-12 h-12 rounded-full overflow-hidden shrink-0 relative">
                    {chat.avatar ? (
                      <img src={chat.avatar} alt={chat.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className={`w-full h-full flex items-center justify-center ${chat.avatarBg}`}>
                        {chat.icon}
                      </div>
                    )}
                    {chat.isOfficial && (
                      <div className="absolute -bottom-0.5 -right-0.5 bg-blue-500 rounded-full p-0.5 border-2 border-white dark:border-[#1C1C1E]">
                        <UserCheck className="w-2.5 h-2.5 text-white" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0 py-1 border-b border-gray-100 dark:border-white/5 group-last:border-none">
                    <div className="flex justify-between items-baseline mb-1">
                      <span className="font-semibold text-[16px] text-gray-900 dark:text-white truncate pr-2">
                        {chat.name}
                      </span>
                      <span className={`text-[12px] shrink-0 ${chat.unread > 0 ? 'text-[var(--wa-teal)] dark:text-[var(--wa-teal)] font-medium' : 'text-gray-400'}`}>
                        {chat.time}
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center gap-2">
                      <span className="text-[14px] text-gray-500 dark:text-gray-400 truncate">
                        {chat.lastMessage}
                      </span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {chat.isMuted && <VolumeX className="w-3.5 h-3.5 text-gray-400" />}
                        {chat.unread > 0 && (
                          <div className={`h-5 min-w-[20px] px-1.5 rounded-full flex items-center justify-center text-[11px] font-bold text-white ${chat.isMuted ? 'bg-gray-400' : 'bg-red-500'}`}>
                            {chat.unread > 99 ? '99+' : chat.unread}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {(leftGroups.length > 0 || closedGroups.length > 0) && (
                <div className="flex justify-center mt-6 mb-10">
                  <button 
                    onClick={handleRestoreGroups}
                    className="px-4 py-2 bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400 text-[13px] font-medium rounded-full active:scale-95 transition-transform"
                  >
                    {t('lounge.restore_hidden_groups') || 'Restore Hidden Groups'}
                  </button>
                </div>
              )}
            </div>
          )
        ) : (
          <div className="p-4 flex flex-col items-center justify-center h-full text-gray-400">
            <Sparkles className="w-12 h-12 mb-4 opacity-50" />
            <p>Discover Content Coming Soon...</p>
          </div>
        )}
      </div>
    </div>
  );
};
