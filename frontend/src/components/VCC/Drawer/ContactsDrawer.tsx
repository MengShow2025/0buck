import React, { useState, useEffect } from 'react';
import { Search, UserPlus, Users, MessageSquare, ChevronRight, ChevronDown, Star, MoreHorizontal, UserCheck, Clock, UserX } from 'lucide-react';
import { useAppContext } from '../AppContext';
import { friendsApi } from '../../../services/api';

export const ContactsDrawer: React.FC = () => {
  const { pushDrawer, setActiveChat, t, requireAuth } = useAppContext();
  const [blockedFriends, setBlockedFriends] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [requestsCount, setRequestsCount] = useState(0);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [errorMsg, setErrorMsg] = useState('');

  const loadData = async () => {
    try {
      setErrorMsg('');
      const [friendsRes, blockedRes, reqRes] = await Promise.all([
        friendsApi.list(),
        friendsApi.listBlocked(),
        friendsApi.listRequests(),
      ]);
      setContacts(friendsRes.data?.items || []);
      setBlockedFriends(blockedRes.data?.items || []);
      setRequestsCount((reqRes.data?.items || []).length);
    } catch (e: any) {
      setContacts([]);
      setBlockedFriends([]);
      setRequestsCount(0);
      const status = Number(e?.response?.status || 0);
      setErrorMsg(status === 401 ? '请先登录后查看通讯录' : '通讯录加载失败，请重试');
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setResults([]);
      return;
    }
    const timer = window.setTimeout(async () => {
      try {
        const res = await friendsApi.search(q);
        setResults(res.data?.items || []);
      } catch {
        setResults([]);
      }
    }, 250);
    return () => window.clearTimeout(timer);
  }, [query]);

  const CONTACT_CATEGORIES = [
    { id: 'new_friends', name: t('contact.new_friends') || 'New Friends', count: requestsCount, icon: <UserPlus className="w-5 h-5 text-green-500" />, drawer: 'new_friends' },
    { id: 'groups', name: t('contact.groups'), count: 1, icon: <Users className="w-5 h-5 text-indigo-500" /> },
    { id: 'discover', name: t('contact.discover'), count: '99+', icon: <Search className="w-5 h-5 text-blue-500" />, drawer: 'all_fan_feeds' },
    { id: 'my_feeds', name: t('contact.my_feeds'), count: 8, icon: <Clock className="w-5 h-5 text-orange-500" />, drawer: 'my_feeds' },
    { id: 'blacklist', name: t('contact.blacklist') || 'Blacklist', count: blockedFriends.length, icon: <UserX className="w-5 h-5 text-red-500" />, drawer: 'blacklist' },
  ];

  const VISIBLE_CONTACTS = contacts.filter(c => !blockedFriends.some(b => b.id === c.id));

  return (
    <div className="flex flex-col h-full bg-[#F2F2F7] dark:bg-[#000000] overflow-y-auto pb-24">
      {/* Search Bar */}
      <div className="px-4 py-3 bg-white/70 dark:bg-[#1C1C1E]/70 backdrop-blur-xl sticky top-0 z-10 border-b border-gray-100/50 dark:border-white/5">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input 
            type="text" 
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('contact.search_placeholder')} 
            className="w-full bg-gray-100/50 dark:bg-white/5 text-gray-800 dark:text-gray-200 text-[15px] rounded-xl py-2 pl-9 pr-4 outline-none border border-transparent focus:border-[var(--wa-teal)] transition-all"
          />
        </div>
      </div>

      {!!query.trim() && (
        <div className="px-6 pt-3 space-y-2">
          <div className="text-[12px] font-bold text-gray-400">{t('contact.discover') || 'Discover'}</div>
          {(results || []).map((r: any) => (
            <div key={r.id} className="bg-white/70 dark:bg-white/5 backdrop-blur-xl rounded-2xl px-3 py-2 flex items-center justify-between border border-white/40 dark:border-white/10">
              <div className="flex items-center gap-3 min-w-0">
                <img src={r.avatar} alt={r.name} className="w-9 h-9 rounded-xl object-cover" />
                <div className="min-w-0">
                  <div className="text-[14px] font-semibold text-gray-900 dark:text-white truncate">{r.name}</div>
                  <div className="text-[11px] text-gray-500 truncate">{r.email}</div>
                </div>
              </div>
              {r.relation === 'friend' ? (
                <span className="text-[11px] text-gray-400">{t('contact.added') || 'Added'}</span>
              ) : r.relation === 'pending_out' ? (
                <span className="text-[11px] text-gray-400">Pending</span>
              ) : (
                <button
                  onClick={async () => {
                    try {
                      await friendsApi.requestAdd(Number(r.id));
                      const res = await friendsApi.search(query.trim());
                      setResults(res.data?.items || []);
                    } catch (e: any) {
                      setErrorMsg(String(e?.response?.data?.detail || '发送好友请求失败'));
                    }
                  }}
                  className="px-2.5 py-1 rounded-full text-[11px] bg-[var(--wa-teal)] text-white"
                >
                  {t('contact.accept') || 'Add'}
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Categories */}
      <div className="px-3 mt-4 space-y-1">
        {!!errorMsg && (
          <div className="mx-3 mb-3 rounded-xl border border-red-200 bg-red-50 text-red-600 px-3 py-2 text-[12px]">
            {errorMsg}
          </div>
        )}
        {/* Main Categories */}
        <div className="bg-white/70 dark:bg-white/5 backdrop-blur-xl rounded-[32px] overflow-hidden border border-white/40 dark:border-white/10 shadow-sm mx-3 mb-6">
          {CONTACT_CATEGORIES.map((cat, idx) => (
            <div 
              key={cat.id} 
              onClick={() => cat.drawer ? pushDrawer(cat.drawer as any) : console.log(`${cat.name} clicked`)}
              className={`flex items-center justify-between px-4 py-3.5 cursor-pointer active:bg-gray-50 dark:active:bg-white/5 transition-colors ${idx !== CONTACT_CATEGORIES.length - 1 ? 'border-b border-gray-100/50 dark:border-white/5' : ''}`}
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-[12px] bg-gray-50 dark:bg-white/5 flex items-center justify-center shadow-sm">
                  {cat.icon}
                </div>
                <span className="text-[15px] font-black text-gray-900 dark:text-white">{cat.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[13px] text-gray-400 dark:text-gray-500 font-bold">{cat.count}</span>
                <ChevronRight className="w-4 h-4 text-gray-300" />
              </div>
            </div>
          ))}
        </div>

        {/* Alphabetical Contacts */}
        <div className="space-y-4 px-3">
          <div className="text-[13px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest pl-3 flex items-center gap-2">
            <Star className="w-3.5 h-3.5 fill-current" />
            <span>{t('contact.star_friends')}</span>
          </div>
          
          <div className="bg-white/70 dark:bg-white/5 backdrop-blur-xl rounded-[32px] overflow-hidden border border-white/40 dark:border-white/10 shadow-sm">
            {VISIBLE_CONTACTS.map((contact, idx) => (
              <div 
                key={contact.id} 
                className={`flex items-center justify-between gap-4 px-4 py-3 cursor-pointer active:bg-gray-50 dark:active:bg-white/5 transition-colors group ${idx !== VISIBLE_CONTACTS.length - 1 ? 'border-b border-gray-100/50 dark:border-white/5' : ''}`}
                onClick={() => {
                  requireAuth(() => {
                    setActiveChat({ id: `private_${contact.id}`, name: contact.name, type: 'private', avatar: contact.avatar, peerUserId: Number(contact.id) } as any);
                    pushDrawer('chat_room');
                  });
                }}
              >
                <div className="flex items-center gap-4 min-w-0 flex-1">
                  <div className="w-11 h-11 rounded-[16px] overflow-hidden border border-white/20 shadow-sm shrink-0">
                    <img src={contact.avatar} alt={contact.name} className="w-full h-full object-cover" />
                  </div>
                  <span className="text-[15px] font-black text-gray-900 dark:text-white tracking-tight truncate">{contact.name}</span>
                </div>
                
                <button 
                  onClick={async (e) => {
                    e.stopPropagation();
                    try {
                      await friendsApi.block(Number(contact.id));
                      await loadData();
                    } catch (err: any) {
                      setErrorMsg(String(err?.response?.data?.detail || '拉黑失败'));
                    }
                  }}
                  className="px-3 py-1.5 bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-gray-400 text-[12px] font-bold rounded-lg opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                >
                  {t('contact.block') || 'Block'}
                </button>
              </div>
            ))}
            {VISIBLE_CONTACTS.length === 0 && (
              <div className="p-6 text-center text-[13px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-widest">
                {t('contact.no_friends') || 'No Friends Left'}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
