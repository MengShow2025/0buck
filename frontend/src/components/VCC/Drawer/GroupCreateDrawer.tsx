import React, { useEffect, useState } from 'react';
import { ChevronLeft, Users } from 'lucide-react';
import { useAppContext } from '../AppContext';
import { friendsApi, groupsApi } from '../../../services/api';

export const GroupCreateDrawer: React.FC = () => {
  const { popDrawer, setActiveChat, pushDrawer } = useAppContext();
  const [name, setName] = useState('');
  const [friends, setFriends] = useState<any[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await friendsApi.list();
        setFriends(res.data?.items || []);
      } catch {
        setFriends([]);
      }
    })();
  }, []);

  const toggle = (id: number) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleCreate = async () => {
    const finalName = name.trim();
    if (!finalName || !selected.length) return;
    setSubmitting(true);
    try {
      const resp = await groupsApi.create({ name: finalName, group_type: 'private', member_user_ids: selected });
      const gid = resp.data?.group_id;
      setActiveChat({
        id: `group_${gid}`,
        name: finalName,
        type: 'group',
        avatar: 'https://ui-avatars.com/api/?name=Group&background=random',
      });
      pushDrawer('chat_room');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#F2F2F7] dark:bg-[#000000] overflow-y-auto pb-24">
      <div className="px-4 py-3 bg-white/80 dark:bg-[#1C1C1E]/80 backdrop-blur-xl sticky top-0 z-10 border-b border-gray-100 dark:border-white/5 flex items-center gap-3">
        <button
          onClick={popDrawer}
          className="w-10 h-10 flex items-center justify-center bg-white dark:bg-white/5 rounded-2xl border border-gray-200 dark:border-white/10 shadow-sm active:scale-90 transition-all text-gray-600 dark:text-gray-300 shrink-0"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <span className="text-[16px] font-bold text-gray-900 dark:text-white">创建群聊</span>
      </div>

      <div className="p-4 space-y-3">
        <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl p-3 shadow-sm">
          <div className="text-[12px] text-gray-500 mb-1">群名称</div>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="输入群名称"
            className="w-full bg-gray-100/70 dark:bg-white/5 rounded-xl px-3 py-2 text-[14px] outline-none"
          />
        </div>

        <div className="text-[12px] text-gray-500 px-1">选择成员（至少1人）</div>
        <div className="space-y-2">
          {friends.map((f) => {
            const id = Number(f.id);
            const active = selected.includes(id);
            return (
              <button
                type="button"
                key={f.id}
                onClick={() => toggle(id)}
                className={`w-full text-left rounded-2xl p-3 border ${active ? 'border-[var(--wa-teal)] bg-[#e6fbf5] dark:bg-[#10362f]' : 'border-gray-200 dark:border-white/10 bg-white dark:bg-[#1C1C1E]'}`}
              >
                <div className="flex items-center gap-3">
                  <img src={f.avatar} alt={f.name} className="w-10 h-10 rounded-xl object-cover" />
                  <div className="text-[14px] font-semibold text-gray-900 dark:text-white truncate">{f.name}</div>
                </div>
              </button>
            );
          })}
          {!friends.length && (
            <div className="text-center text-[13px] text-gray-500 py-8">暂无可邀请好友</div>
          )}
        </div>

        <button
          onClick={handleCreate}
          disabled={submitting || !name.trim() || !selected.length}
          className="w-full mt-2 rounded-xl py-3 text-white font-semibold disabled:opacity-50"
          style={{ background: 'linear-gradient(135deg, #FF7A3D 0%, #E8450A 100%)' }}
        >
          {submitting ? '创建中...' : `创建群聊（${selected.length}人）`}
        </button>
      </div>
    </div>
  );
};
