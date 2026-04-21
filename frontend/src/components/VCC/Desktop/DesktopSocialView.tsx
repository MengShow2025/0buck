import React, { useEffect, useState } from 'react';
import { Heart, MessageSquare, Share2, Plus, TrendingUp, Flame, ChevronRight, Play, MessageCircle, Globe, Trophy, Contact, Send, Trash2 } from 'lucide-react';
import { useAppContext } from '../AppContext';
import { DesktopSquarePanel } from './DesktopSquarePanel';
import { DesktopLoungePanel } from './DesktopLoungePanel';
import { DesktopFansPanel } from './DesktopFansPanel';
import { DesktopContactsPanel } from './DesktopContactsPanel';
import { getCheckoutBlockReasonText } from '../utils/checkoutBlockReason';
import { socialApi } from '../../../services/api';
import { mapSocialComments } from '../utils/socialComments';

const TRENDING_TOPICS = [
  { id: 't1', name: 'Must-Buy Gadget List', count: '125k', color: 'text-orange-500' },
  { id: 't2', name: 'Crowdfunding Picks',   count: '82k',  color: 'text-blue-600' },
  { id: 't3', name: 'Camping Gear Guide',   count: '41k',  color: 'text-green-600' },
  { id: 't4', name: 'OOTD Today',           count: '33k',  color: 'text-pink-600' },
];

const GROUP_BUY = [
  { id: 1, name: 'C2W Minimal Keyboard Workstation', tag: 'Crowdfunding', left: 12, img: '3850512', type: 'crowdfunding', checkoutReady: false, checkoutBlockReason: 'not_published' },
  { id: 2, name: 'iPhone 15 Pro Group Buy',          tag: 'C2W',          left: 5,  img: '1092644', type: 'presale', checkoutReady: false, checkoutBlockReason: 'not_published' },
];

type SocialTab = 'feed' | 'square' | 'lounge' | 'fans' | 'contacts';

const TABS: { id: SocialTab; label: string; icon: React.ReactNode }[] = [
  { id: 'feed',     label: 'Feed',      icon: <TrendingUp className="w-4 h-4" /> },
  { id: 'square',   label: 'Square',    icon: <Globe className="w-4 h-4" /> },
  { id: 'lounge',   label: 'Lounge',    icon: <MessageCircle className="w-4 h-4" /> },
  { id: 'fans',     label: 'Fans',      icon: <Trophy className="w-4 h-4" /> },
  { id: 'contacts', label: 'Contacts',  icon: <Contact className="w-4 h-4" /> },
];

export const DesktopSocialView: React.FC = () => {
  const { pushDrawer, setSelectedProductId, t, user } = useAppContext();
  const [activeTab, setActiveTab] = useState<SocialTab>('feed');
  const [feedItems, setFeedItems] = useState<any[]>([]);
  const [feedError, setFeedError] = useState('');
  const [openCommentsId, setOpenCommentsId] = useState<string | null>(null);
  const [commentsByActivity, setCommentsByActivity] = useState<Record<string, any[]>>({});
  const [commentDraftByActivity, setCommentDraftByActivity] = useState<Record<string, string>>({});
  const [replyingToByActivity, setReplyingToByActivity] = useState<Record<string, { id: string; user: string } | null>>({});

  const loadFeed = async () => {
    try {
      setFeedError('');
      const res = await socialApi.listActivities({ limit: 30 });
      setFeedItems(res.data?.items || []);
    } catch {
      setFeedItems([]);
      setFeedError('动态加载失败');
    }
  };

  useEffect(() => {
    if (activeTab === 'feed') loadFeed();
  }, [activeTab]);

  const refreshComments = async (activityId: string) => {
    const res = await socialApi.listComments(activityId);
    setCommentsByActivity((prev) => ({
      ...prev,
      [activityId]: mapSocialComments(res.data?.items || []),
    }));
  };

  const toggleComments = async (activityId: string) => {
    if (openCommentsId === activityId) {
      setOpenCommentsId(null);
      return;
    }
    setOpenCommentsId(activityId);
    try {
      await refreshComments(activityId);
    } catch {
      setCommentsByActivity((prev) => ({ ...prev, [activityId]: [] }));
    }
  };

  const submitComment = async (activityId: string) => {
    const content = String(commentDraftByActivity[activityId] || '').trim();
    if (!content) return;
    try {
      const replying = replyingToByActivity[activityId];
      await socialApi.createComment(activityId, content, replying?.id);
      setCommentDraftByActivity((prev) => ({ ...prev, [activityId]: '' }));
      setReplyingToByActivity((prev) => ({ ...prev, [activityId]: null }));
      await refreshComments(activityId);
      await loadFeed();
    } catch {}
  };

  const removeComment = async (activityId: string, commentId: string) => {
    try {
      await socialApi.deleteComment(commentId);
      await refreshComments(activityId);
      await loadFeed();
    } catch {}
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Tab Bar */}
      <div className="flex items-center gap-1 px-6 py-3 border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-[#0A0A0B]/80 backdrop-blur-xl shrink-0">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-[13px] font-semibold transition-all ${
              activeTab === tab.id
                ? 'text-white shadow-md'
                : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-700 dark:hover:text-zinc-200'
            }`}
            style={activeTab === tab.id ? { background: 'linear-gradient(135deg, #FF7A3D 0%, #E8450A 100%)' } : {}}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden">

        {/* Feed */}
        {activeTab === 'feed' && (
          <div className="flex h-full overflow-hidden">
            {/* Feed */}
            <div className="flex-1 flex flex-col overflow-hidden border-r border-zinc-200 dark:border-zinc-800">
              {/* Compose Bar */}
              <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-[#0A0A0B]/80 backdrop-blur-xl shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-black text-[13px] shrink-0 shadow-sm">ME</div>
                  <button
                    onClick={() => pushDrawer('my_feeds')}
                    className="flex-1 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-xl px-4 py-2.5 text-left text-[13px] text-zinc-400 transition-colors"
                  >
                    Share your product experience...
                  </button>
                  <button
                    onClick={() => pushDrawer('my_feeds')}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-white text-[13px] font-semibold shadow-md active:scale-95 transition-all"
                    style={{ background: 'linear-gradient(135deg, #FF7A3D 0%, #E8450A 100%)' }}
                  >
                    <Plus className="w-4 h-4" /> Post
                  </button>
                </div>
              </div>

              {/* Feed List */}
              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4" style={{ scrollbarWidth: 'thin', scrollbarColor: '#3f3f46 transparent' }}>
                {!!feedError && (
                  <div className="rounded-xl border border-red-200 bg-red-50 text-red-600 px-3 py-2 text-[12px]">{feedError}</div>
                )}
                {feedItems.map(feed => (
                  <article key={feed.id} className="bg-white dark:bg-[#18181B] rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors">
                    <div className="flex items-center gap-3 mb-3">
                      <img src={feed.avatar} alt={feed.user} className="w-10 h-10 rounded-xl object-cover shrink-0 shadow-sm" />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[14px] font-black text-zinc-900 dark:text-white">{feed.user}</span>
                          {feed.is_official && (
                            <span className="px-1.5 py-0.5 text-[10px] font-black rounded-md bg-blue-100 dark:bg-blue-500/20 text-blue-600">
                              {feed.official_type === 'topic' ? '官方话题' : '官方活动'}
                            </span>
                          )}
                          {feed.pinned && (
                            <span className="px-1.5 py-0.5 text-[10px] font-black rounded-md bg-amber-100 dark:bg-amber-500/20 text-amber-700">置顶</span>
                          )}
                          <span className="px-1.5 py-0.5 text-[10px] font-black rounded-md bg-gradient-to-r from-yellow-500 to-orange-500 text-white italic">{feed.visibility === 'friends' ? '好友圈' : '公开'}</span>
                        </div>
                        <div className="text-[11px] text-zinc-400">{feed.timestamp || feed.time || ''}</div>
                      </div>
                      <div className="ml-auto flex items-center gap-2">
                        {user?.user_type === 'admin' && !!feed.is_official && (
                          <button
                            onClick={async () => {
                              try {
                                await socialApi.pinActivity(feed.id, !feed.pinned);
                                await loadFeed();
                              } catch {}
                            }}
                            className="text-[11px] px-2 py-0.5 rounded-md border border-zinc-300 dark:border-zinc-700 text-zinc-500 dark:text-zinc-300"
                          >
                            {feed.pinned ? '取消置顶' : '置顶'}
                          </button>
                        )}
                        <button className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors">
                          <Share2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <p className="text-[14px] text-zinc-700 dark:text-zinc-300 leading-relaxed mb-3 font-medium">{feed.content}</p>
                    {feed.isVideo ? (
                      <div className="relative aspect-video rounded-2xl overflow-hidden mb-3 cursor-pointer bg-zinc-100 dark:bg-zinc-800 group">
                        <img src={feed.videoImg} alt="" className="w-full h-full object-cover opacity-70 group-hover:opacity-90 transition-opacity" />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-14 h-14 bg-white/30 backdrop-blur-md rounded-full flex items-center justify-center border border-white/40 shadow-xl">
                            <Play className="w-7 h-7 text-white fill-current ml-1" />
                          </div>
                        </div>
                      </div>
                    ) : (feed.media || []).length > 0 ? (
                      <div className={`grid gap-1.5 mb-3 ${(feed.media || []).length === 1 ? 'grid-cols-1 max-w-xs' : (feed.media || []).length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
                        {(feed.media || []).map((img: any, i: number) => (
                          <div key={i} className="aspect-square rounded-xl overflow-hidden cursor-pointer hover:opacity-90 transition-opacity">
                            <img src={img.cdn_url || img.url} alt="" className="w-full h-full object-cover" />
                          </div>
                        ))}
                      </div>
                    ) : null}
                    <div className="flex items-center gap-5 text-zinc-400">
                      <button
                        onClick={async () => {
                          const nextLiked = !feed.liked;
                          const delta = nextLiked ? 1 : -1;
                          setFeedItems((prev) => prev.map((x: any) => (
                            x.id === feed.id
                              ? { ...x, liked: nextLiked, likes: Math.max(0, Number(x.likes || 0) + delta) }
                              : x
                          )));
                          try {
                            if (feed.liked) await socialApi.unlike(feed.id);
                            else await socialApi.like(feed.id);
                          } catch {
                            setFeedItems((prev) => prev.map((x: any) => (
                              x.id === feed.id ? { ...x, liked: feed.liked, likes: Number(feed.likes || 0) } : x
                            )));
                          }
                        }}
                        className={`flex items-center gap-1.5 text-[13px] font-semibold transition-colors ${feed.liked ? 'text-red-500' : 'hover:text-red-500'}`}
                      >
                        <Heart className={`w-4 h-4 ${feed.liked ? 'fill-current text-red-500' : ''}`} />
                        {feed.likes}
                      </button>
                      <button
                        onClick={() => toggleComments(feed.id)}
                        className={`flex items-center gap-1.5 text-[13px] font-semibold transition-colors ${openCommentsId === feed.id ? 'text-blue-500' : 'hover:text-blue-500'}`}
                      >
                        <MessageSquare className="w-4 h-4" /> {feed.comments}
                      </button>
                    </div>
                    {openCommentsId === feed.id && (
                      <div className="mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-700 space-y-2">
                        {(commentsByActivity[feed.id] || []).map((c: any) => (
                          <div key={c.id} className="text-[12px] rounded-lg border border-zinc-200 dark:border-zinc-700 px-2 py-1.5">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <div className="font-semibold text-zinc-800 dark:text-zinc-100 flex items-center gap-1.5">
                                  {c.user}
                                  {c.isAuthor && (
                                    <span className="px-1.5 py-0.5 rounded bg-orange-100 dark:bg-orange-500/20 text-[10px] text-[#E8450A] font-bold">作者</span>
                                  )}
                                </div>
                                <div className="text-zinc-600 dark:text-zinc-300">{c.content}</div>
                                <button
                                  onClick={() => setReplyingToByActivity((prev) => ({ ...prev, [feed.id]: { id: c.id, user: c.user } }))}
                                  className="mt-1 text-[11px] text-zinc-400 hover:text-[#E8450A]"
                                >
                                  回复
                                </button>
                              </div>
                              {c.canDelete && (
                                <button
                                  onClick={() => removeComment(feed.id, c.id)}
                                  className="text-zinc-400 hover:text-red-500"
                                  title="删除评论"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                            {(c.replies || []).map((r: any) => (
                              <div key={r.id} className="mt-2 ml-4 pl-2 border-l border-zinc-200 dark:border-zinc-700 flex items-start justify-between gap-2">
                                <div>
                                  <div className="font-semibold text-zinc-800 dark:text-zinc-100 flex items-center gap-1.5">
                                    {r.user}
                                    {r.isAuthor && (
                                      <span className="px-1.5 py-0.5 rounded bg-orange-100 dark:bg-orange-500/20 text-[10px] text-[#E8450A] font-bold">作者</span>
                                    )}
                                  </div>
                                  <div className="text-zinc-600 dark:text-zinc-300">{r.content}</div>
                                </div>
                                {r.canDelete && (
                                  <button
                                    onClick={() => removeComment(feed.id, r.id)}
                                    className="text-zinc-400 hover:text-red-500"
                                    title="删除回复"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        ))}
                        {replyingToByActivity[feed.id] && (
                          <div className="text-[11px] text-zinc-500">
                            正在回复 @{replyingToByActivity[feed.id]?.user}
                            <button
                              onClick={() => setReplyingToByActivity((prev) => ({ ...prev, [feed.id]: null }))}
                              className="ml-2 text-[#E8450A]"
                            >
                              取消
                            </button>
                          </div>
                        )}
                        <div className="flex gap-2">
                          <input
                            value={commentDraftByActivity[feed.id] || ''}
                            onChange={(e) => setCommentDraftByActivity((prev) => ({ ...prev, [feed.id]: e.target.value }))}
                            placeholder={replyingToByActivity[feed.id] ? `回复 @${replyingToByActivity[feed.id]?.user}` : "写评论..."}
                            className="flex-1 bg-zinc-100 dark:bg-zinc-800 rounded-full px-3 py-1.5 text-[12px] outline-none"
                          />
                          <button
                            onClick={() => submitComment(feed.id)}
                            className="px-3 py-1.5 rounded-full text-[12px] bg-[var(--wa-teal)] text-white flex items-center gap-1"
                          >
                            <Send className="w-3.5 h-3.5" />
                            发送
                          </button>
                        </div>
                      </div>
                    )}
                  </article>
                ))}
              </div>
            </div>

            {/* Right Sidebar */}
            <div className="w-[260px] shrink-0 overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: '#3f3f46 transparent' }}>
              {/* Trending Topics */}
              <div className="px-4 py-5 border-b border-zinc-200 dark:border-zinc-800">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="w-4 h-4 text-orange-500" />
                  <h3 className="text-[13px] font-black text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">Trending Topics</h3>
                </div>
                <div className="space-y-2">
                  {TRENDING_TOPICS.map((t, i) => (
                    <button
                      key={t.id}
                      onClick={() => setActiveTab('square')}
                      className="w-full flex items-center justify-between py-2 group"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-[11px] font-black text-zinc-400 w-4">{i + 1}</span>
                        <span className={`text-[13px] font-semibold ${t.color} group-hover:opacity-80 transition-opacity`}>#{t.name}</span>
                      </div>
                      <span className="text-[11px] text-zinc-400">{t.count}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Group Buy */}
              <div className="px-4 py-5">
                <div className="flex items-center gap-2 mb-3">
                  <Flame className="w-4 h-4 text-orange-500" />
                  <h3 className="text-[13px] font-black text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">Live C2W</h3>
                </div>
                <div className="space-y-3">
                  {GROUP_BUY.map(item => (
                    <div
                      key={item.id}
                      onClick={() => {
                        if (item.checkoutReady === false) return;
                        setSelectedProductId(`p${item.id}`);
                        pushDrawer('product_detail');
                      }}
                      className={`flex items-center gap-3 group ${item.checkoutReady === false ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
                      title={item.checkoutReady === false ? getCheckoutBlockReasonText(t, item.checkoutBlockReason) : undefined}
                    >
                      <div className="w-12 h-12 rounded-xl overflow-hidden bg-zinc-100 dark:bg-zinc-800 shrink-0 border border-zinc-200 dark:border-zinc-700">
                        <img src={`https://picsum.photos/seed/${item.img}/100/100`} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[12px] font-semibold text-zinc-800 dark:text-zinc-200 truncate">{item.name}</div>
                        <div className="text-[11px] text-zinc-400">
                          {item.checkoutReady === false
                            ? getCheckoutBlockReasonText(t, item.checkoutBlockReason)
                            : (<><span className="text-orange-500 font-bold">{item.left}</span> more to unlock</>)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => setActiveTab('square')}
                  className="mt-4 w-full py-2 rounded-xl border border-orange-500/30 text-orange-500 text-[12px] font-semibold hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors flex items-center justify-center gap-1"
                >
                  View All <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Square */}
        {activeTab === 'square' && <DesktopSquarePanel />}

        {/* Lounge */}
        {activeTab === 'lounge' && <DesktopLoungePanel />}

        {/* Fan Center */}
        {activeTab === 'fans' && <DesktopFansPanel />}

        {/* Contacts */}
        {activeTab === 'contacts' && <DesktopContactsPanel />}

      </div>
    </div>
  );
};
