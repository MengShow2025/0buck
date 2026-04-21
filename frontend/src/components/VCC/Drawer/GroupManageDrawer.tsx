import React, { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, Search, ChevronRight, Plus } from 'lucide-react';
import { useAppContext } from '../AppContext';
import { groupsApi } from '../../../services/api';

export const GroupManageDrawer: React.FC = () => {
  const { popDrawer, activeChat, user } = useAppContext();
  const [members, setMembers] = useState<any[]>([]);
  const [groupName, setGroupName] = useState('');
  const [announcement, setAnnouncement] = useState('');
  const [recommendTitle, setRecommendTitle] = useState('群主推荐');
  const [recommendLink, setRecommendLink] = useState('');
  const [recommendSubtitle, setRecommendSubtitle] = useState('');
  const [hasRecommendation, setHasRecommendation] = useState(false);
  const [myRole, setMyRole] = useState<'owner' | 'admin' | 'member'>('member');
  const [ownerId, setOwnerId] = useState<number | null>(null);
  const [muteAll, setMuteAll] = useState(false);
  const [selfRemark, setSelfRemark] = useState('');
  const [selfNick, setSelfNick] = useState('');
  const [muteNotification, setMuteNotification] = useState(false);
  const [pinChat, setPinChat] = useState(false);
  const [showMemberAlias, setShowMemberAlias] = useState(true);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [showInviteBox, setShowInviteBox] = useState(false);
  const [inviteUserIds, setInviteUserIds] = useState('');
  const [memberSearch, setMemberSearch] = useState('');
  const [chatSearchOpen, setChatSearchOpen] = useState(false);
  const [chatSearchQuery, setChatSearchQuery] = useState('');
  const [chatSearchResults, setChatSearchResults] = useState<any[]>([]);
  const [mySettingsLoaded, setMySettingsLoaded] = useState(false);

  const groupId = useMemo(() => {
    const raw = String(activeChat?.id || '');
    const m = raw.match(/^group_(\d+)$/);
    return m ? Number(m[1]) : null;
  }, [activeChat?.id]);
  const isManager = myRole === 'owner' || myRole === 'admin';

  const chatStorageKey = useMemo(() => (activeChat?.id ? `vcc_chat_history_${activeChat.id}` : ''), [activeChat?.id]);

  const load = async () => {
    if (!groupId) return;
    setLoading(true);
    setLoadError('');
    try {
      const detailRes = await groupsApi.detail(groupId);
      const item = detailRes.data?.item || {};
      setMyRole((item.my_role || 'member') as any);
      setOwnerId(Number(item.owner_id || 0) || null);
      setGroupName(String(item.name || activeChat?.name || '群聊'));
      setAnnouncement(String(item.settings?.announcement || ''));
      setMuteAll(Boolean(item.settings?.mute_all));
      const rec = item.settings?.pinned_message || null;
      setHasRecommendation(Boolean(rec));
      setRecommendTitle(String(rec?.title || '群主推荐'));
      setRecommendLink(String(rec?.link || ''));
      setRecommendSubtitle(String(rec?.content || ''));
      try {
        const membersRes = await groupsApi.members(groupId);
        setMembers(membersRes.data?.items || []);
      } catch {
        setMembers([]);
      }
      try {
        const prefRes = await groupsApi.mySettings(groupId);
        const item = prefRes.data?.item || {};
        setSelfRemark(String(item.self_remark || ''));
        setSelfNick(String(item.self_nickname || ''));
        setMuteNotification(Boolean(item.mute_notification));
        setPinChat(Boolean(item.pin_chat));
        setShowMemberAlias(item.show_member_alias !== false);
      } catch {
        setSelfRemark('');
        setSelfNick('');
        setMuteNotification(false);
        setPinChat(false);
        setShowMemberAlias(true);
      }
      setMySettingsLoaded(true);
    } catch (e: any) {
      setLoadError(String(e?.response?.data?.detail || '群信息加载失败，请稍后重试'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [groupId]);

  useEffect(() => {
    if (!groupId || !mySettingsLoaded) return;
    const timer = window.setTimeout(async () => {
      try {
        await groupsApi.updateMySettings(groupId, {
          self_remark: selfRemark,
          self_nickname: selfNick,
          mute_notification: muteNotification,
          pin_chat: pinChat,
          show_member_alias: showMemberAlias,
        });
      } catch {}
    }, 250);
    return () => window.clearTimeout(timer);
  }, [groupId, mySettingsLoaded, selfRemark, selfNick, muteNotification, pinChat, showMemberAlias]);

  useEffect(() => {
    if (!chatSearchOpen) return;
    const q = chatSearchQuery.trim().toLowerCase();
    if (!q || !chatStorageKey) {
      setChatSearchResults([]);
      return;
    }
    try {
      const raw = localStorage.getItem(chatStorageKey);
      const list = raw ? JSON.parse(raw) : [];
      const hits = (Array.isArray(list) ? list : [])
        .filter((m: any) => String(m?.content || '').toLowerCase().includes(q))
        .slice(-20)
        .reverse();
      setChatSearchResults(hits);
    } catch {
      setChatSearchResults([]);
    }
  }, [chatSearchOpen, chatSearchQuery, chatStorageKey]);

  if (!groupId) {
    return <div className="p-6 text-sm text-gray-500">当前会话未绑定群ID，请先从群会话进入管理页。</div>;
  }

  return (
    <div className="flex flex-col h-full bg-[#F2F2F7] dark:bg-[#000000] overflow-y-auto pb-24">
      <div className="px-4 py-3 bg-white/80 dark:bg-[#1C1C1E]/80 backdrop-blur-xl sticky top-0 z-10 border-b border-gray-100 dark:border-white/5 flex items-center gap-3">
        <button
          onClick={popDrawer}
          className="w-10 h-10 flex items-center justify-center bg-white dark:bg-white/5 rounded-2xl border border-gray-200 dark:border-white/10 shadow-sm active:scale-90 transition-all text-gray-600 dark:text-gray-300 shrink-0"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <span className="text-[16px] font-bold text-gray-900 dark:text-white">群聊信息</span>
      </div>

      <div className="p-4 space-y-3">
        {!!loadError && (
          <div className="rounded-xl border border-red-200 bg-red-50 text-red-600 px-3 py-2 text-[12px]">
            {loadError}
          </div>
        )}
        <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl p-3 shadow-sm">
          <div className="relative mb-3">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input value={memberSearch} onChange={(e) => setMemberSearch(e.target.value)} placeholder="搜索群成员" className="w-full bg-gray-100/70 dark:bg-white/5 rounded-xl pl-9 pr-3 py-2 text-[13px] outline-none" />
          </div>
          <div className="flex items-start gap-3 overflow-x-auto pb-1">
            {members.filter((m: any) => String(m.name || '').toLowerCase().includes(memberSearch.trim().toLowerCase())).slice(0, 8).map((m: any) => (
              <div key={m.user_id} className="shrink-0 w-[58px]">
                <img
                  src={`https://ui-avatars.com/api/?name=${encodeURIComponent(m.name || m.user_id)}&background=random`}
                  className="w-12 h-12 rounded-xl object-cover mx-auto"
                  alt={m.name}
                />
                <div className="mt-1 text-[11px] text-center truncate text-gray-700 dark:text-gray-200">{m.name}</div>
              </div>
            ))}
            {isManager && (
              <button
                onClick={() => setShowInviteBox((v) => !v)}
                className="shrink-0 w-[58px] h-[58px] rounded-xl border-2 border-dashed border-gray-300 dark:border-white/20 flex items-center justify-center text-gray-400"
                title="通过成员管理添加"
              >
                <Plus className="w-5 h-5" />
              </button>
            )}
          </div>
          {isManager && showInviteBox && (
            <div className="mt-2 flex gap-2">
              <input
                value={inviteUserIds}
                onChange={(e) => setInviteUserIds(e.target.value)}
                placeholder="输入用户ID，多个逗号分隔"
                className="flex-1 bg-gray-100/70 dark:bg-white/5 rounded-xl px-3 py-2 text-[13px] outline-none"
              />
              <button
                onClick={async () => {
                  const ids = inviteUserIds.split(',').map((x) => Number(x.trim())).filter((x) => Number.isFinite(x) && x > 0);
                  if (!ids.length) return;
                  await groupsApi.invite(groupId, ids as number[]);
                  setInviteUserIds('');
                  await load();
                }}
                className="px-3 py-2 rounded-xl text-[12px] bg-[var(--wa-teal)] text-white"
              >
                添加
              </button>
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl p-3 shadow-sm space-y-3">
          <div>
            <div className="text-[12px] text-gray-500 mb-1">群聊名称</div>
            <input
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              disabled={!isManager}
              className="w-full bg-gray-100/70 dark:bg-white/5 rounded-xl px-3 py-2 text-[14px] outline-none disabled:opacity-70"
            />
            {isManager && (
              <button
                onClick={async () => {
                  await groupsApi.updateSettings(groupId, { name: groupName });
                  await load();
                }}
                className="mt-2 px-3 py-1.5 rounded-full text-[12px] bg-[var(--wa-teal)] text-white"
              >
                保存群名
              </button>
            )}
          </div>
          <div>
            <div className="text-[12px] text-gray-500 mb-1">群公告</div>
            <textarea
              value={announcement}
              onChange={(e) => setAnnouncement(e.target.value)}
              className="w-full min-h-16 bg-gray-100/70 dark:bg-white/5 rounded-xl px-3 py-2 text-[14px] outline-none"
              placeholder="群主未设置"
              disabled={!isManager}
            />
            {isManager && (
              <button
                onClick={async () => {
                  await groupsApi.updateSettings(groupId, { announcement });
                }}
                className="mt-2 px-3 py-1.5 rounded-full text-[12px] bg-[var(--wa-teal)] text-white"
              >
                保存公告
              </button>
            )}
          </div>
          <div>
            <div className="text-[12px] text-gray-500 mb-1">备注（仅自己可见）</div>
            <input
              value={selfRemark}
              onChange={(e) => setSelfRemark(e.target.value)}
              className="w-full bg-gray-100/70 dark:bg-white/5 rounded-xl px-3 py-2 text-[14px] outline-none"
              placeholder="群聊备注仅自己可见"
            />
          </div>
          <div>
            <div className="text-[12px] text-gray-500 mb-1">我在本群的昵称</div>
            <input
              value={selfNick}
              onChange={(e) => setSelfNick(e.target.value)}
              className="w-full bg-gray-100/70 dark:bg-white/5 rounded-xl px-3 py-2 text-[14px] outline-none"
              placeholder={user?.nickname || '未设置'}
            />
          </div>
          <button onClick={() => setChatSearchOpen((v) => !v)} className="w-full flex items-center justify-between text-left px-1 py-1 text-[14px] text-gray-800 dark:text-white">
            <span>查找聊天内容</span>
            <ChevronRight className="w-4 h-4 text-gray-400" />
          </button>
          {chatSearchOpen && (
            <div className="mt-1 space-y-2">
              <input
                value={chatSearchQuery}
                onChange={(e) => setChatSearchQuery(e.target.value)}
                placeholder="输入关键词搜索聊天记录"
                className="w-full bg-gray-100/70 dark:bg-white/5 rounded-xl px-3 py-2 text-[13px] outline-none"
              />
              <div className="max-h-36 overflow-y-auto space-y-1">
                {chatSearchResults.map((m: any) => (
                  <div key={m.id} className="text-[12px] rounded-lg border border-gray-200 dark:border-white/10 px-2 py-1.5">
                    <div className="text-gray-900 dark:text-white truncate">{m.content}</div>
                    <div className="text-gray-400">{m.time || ''}</div>
                  </div>
                ))}
                {!chatSearchResults.length && <div className="text-[12px] text-gray-500">暂无匹配内容</div>}
              </div>
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl p-3 shadow-sm space-y-2">
          <label className="flex items-center justify-between text-[14px]">
            <span>消息免打扰</span>
            <input type="checkbox" checked={muteNotification} onChange={(e) => setMuteNotification(e.target.checked)} />
          </label>
          <label className="flex items-center justify-between text-[14px]">
            <span>置顶聊天</span>
            <input type="checkbox" checked={pinChat} onChange={(e) => setPinChat(e.target.checked)} />
          </label>
          <label className="flex items-center justify-between text-[14px]">
            <span>显示群成员昵称</span>
            <input type="checkbox" checked={showMemberAlias} onChange={(e) => setShowMemberAlias(e.target.checked)} />
          </label>
        </div>

        {isManager && (
          <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl p-3 shadow-sm space-y-2">
            <div className="text-[12px] text-gray-500">群主推荐（分销/拼团）</div>
            <input
              value={recommendTitle}
              onChange={(e) => setRecommendTitle(e.target.value)}
              className="w-full bg-gray-100/70 dark:bg-white/5 rounded-xl px-3 py-2 text-[13px] outline-none"
              placeholder="推荐标题"
            />
            <input
              value={recommendLink}
              onChange={(e) => setRecommendLink(e.target.value)}
              className="w-full bg-gray-100/70 dark:bg-white/5 rounded-xl px-3 py-2 text-[13px] outline-none"
              placeholder="0Buck 分销/拼团链接"
            />
            <input
              value={recommendSubtitle}
              onChange={(e) => setRecommendSubtitle(e.target.value)}
              className="w-full bg-gray-100/70 dark:bg-white/5 rounded-xl px-3 py-2 text-[13px] outline-none"
              placeholder="简短说明（可选）"
            />
            <div className="flex gap-2 pt-1">
              <button
                onClick={async () => {
                  if (!recommendLink.trim()) return;
                  await groupsApi.setRecommendation(groupId, {
                    title: recommendTitle.trim() || '群主推荐',
                    link: recommendLink.trim(),
                    subtitle: recommendSubtitle.trim() || undefined,
                  });
                  await load();
                }}
                className="px-3 py-1.5 rounded-full text-[12px] bg-[var(--wa-teal)] text-white"
              >
                {hasRecommendation ? '更新推荐' : '发布推荐'}
              </button>
              <button
                onClick={async () => {
                  await groupsApi.clearRecommendation(groupId);
                  await load();
                }}
                className="px-3 py-1.5 rounded-full text-[12px] border border-red-200 text-red-600"
              >
                关闭推荐
              </button>
            </div>
          </div>
        )}

        {isManager && (
          <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl p-3 shadow-sm">
            <div className="text-[13px] font-semibold text-gray-900 dark:text-white mb-2">管理群员</div>
            {loading ? (
              <div className="text-[12px] text-gray-500">加载中...</div>
            ) : (
              <div className="space-y-2">
                {members.map((m: any) => (
                  <div key={m.user_id} className="rounded-xl border border-gray-200 dark:border-white/10 p-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-[13px] text-gray-900 dark:text-white">{m.name}</div>
                      <div className="text-[11px] text-gray-500">{m.role}</div>
                    </div>
                    {Number(m.user_id) !== ownerId && (
                      <div className="mt-2 flex gap-2 flex-wrap">
                        {myRole === 'owner' && (
                          <>
                            <button onClick={async () => { await groupsApi.setRole(groupId, Number(m.user_id), 'admin'); await load(); }} className="px-2.5 py-1 text-[11px] rounded-full border border-gray-200 dark:border-white/15">设管理员</button>
                            <button onClick={async () => { await groupsApi.setRole(groupId, Number(m.user_id), 'member'); await load(); }} className="px-2.5 py-1 text-[11px] rounded-full border border-gray-200 dark:border-white/15">设成员</button>
                            <button onClick={async () => { await groupsApi.transferOwner(groupId, Number(m.user_id)); await load(); }} className="px-2.5 py-1 text-[11px] rounded-full border border-indigo-200 text-indigo-600">转让群主</button>
                          </>
                        )}
                        <button onClick={async () => { await groupsApi.muteMember(groupId, Number(m.user_id), 30); await load(); }} className="px-2.5 py-1 text-[11px] rounded-full border border-amber-200 text-amber-600">禁言30分</button>
                        <button onClick={async () => { await groupsApi.muteMember(groupId, Number(m.user_id), 0); await load(); }} className="px-2.5 py-1 text-[11px] rounded-full border border-green-200 text-green-600">解除禁言</button>
                        <button onClick={async () => { await groupsApi.removeMember(groupId, Number(m.user_id)); await load(); }} className="px-2.5 py-1 text-[11px] rounded-full border border-red-200 text-red-500">移除</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            <div className="mt-3 flex gap-2">
              <button
                onClick={async () => {
                  await groupsApi.muteAll(groupId, !muteAll);
                  setMuteAll((v) => !v);
                }}
                className={`px-3 py-1.5 rounded-full text-[12px] border ${muteAll ? 'border-red-200 text-red-600' : 'border-gray-200 dark:border-white/15 text-gray-700 dark:text-white/80'}`}
              >
                {muteAll ? '关闭全员禁言' : '开启全员禁言'}
              </button>
            </div>
          </div>
        )}

        <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl p-3 shadow-sm">
          <button
            className="w-full px-3 py-2 text-[14px] rounded-xl text-red-500"
            onClick={() => {
              if (chatStorageKey) localStorage.removeItem(chatStorageKey);
              setLoadError('已清空本地聊天记录');
            }}
          >
            清空聊天记录
          </button>
          <button
            onClick={async () => {
              await groupsApi.leave(groupId);
              popDrawer();
            }}
            className="w-full px-3 py-2 text-[14px] rounded-xl text-red-600"
          >
            退出群聊
          </button>
          {myRole === 'owner' && (
            <button
              onClick={async () => {
                await groupsApi.dissolve(groupId);
                popDrawer();
              }}
              className="w-full mt-1 px-3 py-2 text-[14px] rounded-xl text-red-700"
            >
              解散群聊
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
