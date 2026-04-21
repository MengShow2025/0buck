import React, { useState, useEffect } from 'react';
import { ChevronLeft, UserCheck } from 'lucide-react';
import { useAppContext } from '../AppContext';
import { friendsApi } from '../../../services/api';

export const NewFriendsDrawer: React.FC = () => {
  const { popDrawer, t } = useAppContext();

  const [newFriends, setNewFriends] = useState<any[]>([]);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    (async () => {
      try {
        setErrorMsg('');
        const res = await friendsApi.listRequests();
        const items = (res.data?.items || []).map((x: any) => ({ ...x, status: 'pending' }));
        setNewFriends(items);
      } catch (e: any) {
        setNewFriends([]);
        setErrorMsg(String(e?.response?.data?.detail || '新朋友加载失败'));
      }
    })();
  }, []);

  const handleAccept = async (id: string | number) => {
    try {
      await friendsApi.accept(Number(id));
      setNewFriends((prev: any[]) => prev.map((f: any) => String(f.id) === String(id) ? { ...f, status: 'added' } : f));
    } catch (e: any) {
      setErrorMsg(String(e?.response?.data?.detail || '同意失败'));
    }
  };

  const handleIgnore = async (id: string | number) => {
    try {
      await friendsApi.ignore(Number(id));
      setNewFriends((prev: any[]) => prev.map((f: any) => String(f.id) === String(id) ? { ...f, status: 'expired' } : f));
    } catch (e: any) {
      setErrorMsg(String(e?.response?.data?.detail || '忽略失败'));
    }
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
          {t('contact.new_friends') || 'New Friends'}
        </span>
      </div>

      <div className="p-4 space-y-3">
        {!!errorMsg && (
          <div className="rounded-xl border border-red-200 bg-red-50 text-red-600 px-3 py-2 text-[12px]">
            {errorMsg}
          </div>
        )}
        {newFriends.map((nf) => (
          <div 
            key={nf.id} 
            className="bg-white dark:bg-[#1C1C1E] rounded-2xl p-3 flex items-center justify-between shadow-sm"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-12 h-12 rounded-full overflow-hidden shrink-0">
                <img src={nf.avatar} alt={nf.name} className="w-full h-full object-cover" />
              </div>
              <div className="min-w-0">
                <div className="text-[15px] font-semibold text-gray-900 dark:text-white truncate">{nf.name}</div>
                <div className="text-[13px] text-gray-500 truncate">{nf.message}</div>
              </div>
            </div>
            <div className="shrink-0 ml-2">
              {nf.status === 'added' ? (
                <span className="text-[12px] text-gray-400">{t('contact.added') || 'Added'}</span>
              ) : nf.status === 'expired' ? (
                <span className="text-[12px] text-gray-400">{t('contact.expired') || 'Expired'}</span>
              ) : (
                <div className="flex gap-2">
                  <button 
                    onClick={() => handleAccept(nf.id)}
                    className="px-3 py-1.5 bg-[var(--wa-teal)] text-white text-[13px] font-bold rounded-full active:scale-95 transition-transform"
                  >
                    {t('contact.accept') || 'Accept'}
                  </button>
                  <button 
                    onClick={() => handleIgnore(nf.id)}
                    className="px-3 py-1.5 bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-300 text-[13px] font-bold rounded-full active:scale-95 transition-transform"
                  >
                    {t('common.ignore') || 'Ignore'}
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
