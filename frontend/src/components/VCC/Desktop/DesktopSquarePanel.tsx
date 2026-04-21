import React, { useEffect, useState } from 'react';
import { Search, Flame, Heart, MessageSquare, Share2, Play, TrendingUp, Zap, Send, Trash2 } from 'lucide-react';
import { useAppContext } from '../AppContext';
import { socialApi } from '../../../services/api';
import { mapSocialComments } from '../utils/socialComments';

const CATEGORIES = ['All', 'Electronics', 'Crowdfunding', 'Wearables', 'Lifestyle', 'Food', 'OOTD'];

const TOPICS = [
  { id: 't1', name: 'Must-Buy Gadget List', count: '125k', color: 'text-orange-500', bg: 'bg-orange-50 dark:bg-orange-900/20' },
  { id: 't2', name: 'Crowdfunding Picks',   count: '82k',  color: 'text-blue-500',   bg: 'bg-blue-50 dark:bg-blue-900/20' },
  { id: 't3', name: 'Camping Gear Guide',   count: '41k',  color: 'text-green-500',  bg: 'bg-green-50 dark:bg-green-900/20' },
  { id: 't4', name: 'OOTD Today',           count: '33k',  color: 'text-pink-500',   bg: 'bg-pink-50 dark:bg-pink-900/20' },
];

const GROUP_BUY = [
  { id: 1, img: '1092644', name: 'iPhone 15 Pro Group Buy', left: 5,  tag: 'C2W' },
  { id: 2, img: '3850512', name: 'C2W Minimal Keyboard Workstation', left: 12, tag: 'Crowdfunding' },
  { id: 3, img: '3780681', name: 'Sony WH-1000XM5',    left: 28, tag: 'Wishlist' },
];

export const DesktopSquarePanel: React.FC = () => {
  const { pushDrawer } = useAppContext();
  const [activeCategory, setActiveCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [feedItems, setFeedItems] = useState<any[]>([]);
  const [feedError, setFeedError] = useState('');
  const [openCommentsId, setOpenCommentsId] = useState<string | null>(null);
  const [commentsByActivity, setCommentsByActivity] = useState<Record<string, any[]>>({});
  const [commentDraftByActivity, setCommentDraftByActivity] = useState<Record<string, string>>({});
  const [replyingToByActivity, setReplyingToByActivity] = useState<Record<string, { id: string; user: string } | null>>({});

  const loadFeeds = async () => {
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
    loadFeeds();
  }, []);

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
      await loadFeeds();
    } catch {}
  };

  const removeComment = async (activityId: string, commentId: string) => {
    try {
      await socialApi.deleteComment(commentId);
      await refreshComments(activityId);
      await loadFeeds();
    } catch {}
  };

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left: Category sidebar */}
      <aside className="w-[180px] shrink-0 border-r border-zinc-200 dark:border-zinc-800 flex flex-col overflow-y-auto bg-zinc-50 dark:bg-[#0D0D0F]">
        <div className="px-3 pt-5 pb-3">
          <div className="text-[11px] font-black text-zinc-400 uppercase tracking-widest mb-3 px-2">Categories</div>
          <div className="space-y-0.5">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`w-full text-left px-3 py-2 rounded-xl text-[13px] font-semibold transition-colors ${
                  activeCategory === cat
                    ? 'bg-white dark:bg-white/10 text-zinc-900 dark:text-white shadow-sm'
                    : 'text-zinc-500 dark:text-zinc-400 hover:bg-white/70 dark:hover:bg-white/5'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="px-3 pt-4 pb-3 border-t border-zinc-200 dark:border-zinc-800 mt-2">
          <div className="text-[11px] font-black text-zinc-400 uppercase tracking-widest mb-3 px-2">Trending Topics</div>
          <div className="space-y-1.5">
            {TOPICS.map((t, i) => (
              <button key={t.id} className="w-full flex items-center gap-2 px-2 py-1.5 rounded-xl hover:bg-white dark:hover:bg-white/5 transition-colors group text-left">
                <span className="text-[10px] font-black text-zinc-300 w-3">{i + 1}</span>
                <span className={`text-[12px] font-semibold truncate ${t.color}`}>#{t.name}</span>
              </button>
            ))}
          </div>
        </div>
      </aside>

      {/* Center: Feed */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Search bar */}
        <div className="px-5 py-3 border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-[#0A0A0B]/80 backdrop-blur-xl shrink-0 flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search posts and topics..."
              className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-xl pl-9 pr-4 py-2 text-[13px] text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-400 outline-none focus:ring-1 focus:ring-orange-400"
            />
          </div>
          <div className="text-[12px] text-zinc-400">{feedItems.length} posts</div>
        </div>

        {/* Feed grid */}
        <div className="flex-1 overflow-y-auto px-5 py-4" style={{ scrollbarWidth: 'thin', scrollbarColor: '#3f3f46 transparent' }}>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {!!feedError && (
              <div className="rounded-xl border border-red-200 bg-red-50 text-red-600 px-3 py-2 text-[12px]">{feedError}</div>
            )}
            {feedItems.map((feed: any) => (
              <article key={feed.id} className="bg-white dark:bg-[#18181B] rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all hover:shadow-md">
                {/* User row */}
                <div className="flex items-center gap-2.5 mb-3">
                  <div
                    onClick={() => pushDrawer('user_profile')}
                    className="w-9 h-9 rounded-xl bg-indigo-500/10 flex items-center justify-center font-black text-indigo-600 text-[13px] shrink-0 cursor-pointer hover:scale-105 transition-transform"
                  >
                    {String(feed.user || 'U').slice(0, 1)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[13px] font-black text-zinc-900 dark:text-white truncate">{feed.user}</span>
                      <span className="px-1.5 py-0.5 text-[9px] font-black rounded italic bg-zinc-100 dark:bg-zinc-800 text-zinc-500">{feed.visibility === 'friends' ? '好友圈' : '公开'}</span>
                    </div>
                    <div className="text-[11px] text-zinc-400">{feed.timestamp || ''}</div>
                  </div>
                  <button onClick={() => pushDrawer('share_menu')} className="text-zinc-300 hover:text-zinc-500 transition-colors">
                    <Share2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Content */}
                <p className="text-[13px] text-zinc-700 dark:text-zinc-300 leading-relaxed mb-3 line-clamp-3">{feed.content || ''}</p>

                {/* Media */}
                {feed.isVideo ? (
                  <div className="relative aspect-video rounded-xl overflow-hidden mb-3 bg-zinc-100 dark:bg-zinc-800 cursor-pointer group">
                    <img src={feed.videoImg} alt="" className="w-full h-full object-cover opacity-70 group-hover:opacity-90 transition-opacity" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-10 h-10 bg-white/30 backdrop-blur rounded-full flex items-center justify-center border border-white/40">
                        <Play className="w-5 h-5 text-white fill-current ml-0.5" />
                      </div>
                    </div>
                  </div>
                ) : (feed.media || []).length > 0 ? (
                  <div className={`grid gap-1 mb-3 ${(feed.media || []).length === 1 ? 'grid-cols-1' : 'grid-cols-3'}`}>
                    {(feed.media || []).slice(0, 3).map((img: any, i: number) => (
                      <div key={i} className={`overflow-hidden rounded-xl bg-zinc-100 dark:bg-zinc-800 ${(feed.media || []).length === 1 ? 'aspect-video' : 'aspect-square'}`}>
                        <img src={img.cdn_url || img.url} alt="" className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
                      </div>
                    ))}
                  </div>
                ) : null}

                {/* Actions */}
                <div className="flex items-center gap-4 text-zinc-400 pt-2 border-t border-zinc-100 dark:border-zinc-800">
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
                    className={`flex items-center gap-1 text-[12px] font-semibold transition-colors ${feed.liked ? 'text-red-500' : 'hover:text-red-500'}`}
                  >
                    <Heart className={`w-3.5 h-3.5 ${feed.liked ? 'fill-current' : ''}`} />
                    {feed.likes}
                  </button>
                  <button
                    onClick={() => toggleComments(feed.id)}
                    className={`flex items-center gap-1 text-[12px] font-semibold transition-colors ${openCommentsId === feed.id ? 'text-blue-500' : 'hover:text-blue-500'}`}
                  >
                    <MessageSquare className="w-3.5 h-3.5" /> {feed.comments}
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
      </div>

      {/* Right: Group buy + trending */}
      <aside className="w-[220px] shrink-0 border-l border-zinc-200 dark:border-zinc-800 overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: '#3f3f46 transparent' }}>
        {/* Group Buy */}
        <div className="px-4 pt-5 pb-4 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-1.5 mb-3">
            <Flame className="w-4 h-4 text-orange-500" />
            <span className="text-[12px] font-black text-zinc-700 dark:text-zinc-200 uppercase tracking-wider">Live C2W</span>
          </div>
          <div className="space-y-3">
            {GROUP_BUY.map(item => (
              <div key={item.id} className="flex items-center gap-2.5 cursor-pointer group">
                <div className="w-11 h-11 rounded-xl overflow-hidden shrink-0 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
                  <img src={`https://picsum.photos/seed/${item.img}/100/100`} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] font-semibold text-zinc-800 dark:text-zinc-200 truncate">{item.name}</div>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="text-[9px] font-black text-white px-1.5 py-0.5 rounded-full" style={{ background: 'linear-gradient(135deg, #FF7A3D 0%, #E8450A 100%)' }}>{item.tag}</span>
                    <span className="text-[10px] text-zinc-400"><span className="text-orange-500 font-bold">{item.left}</span> to go</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Hot Topics */}
        <div className="px-4 pt-4 pb-5">
          <div className="flex items-center gap-1.5 mb-3">
            <TrendingUp className="w-4 h-4 text-orange-500" />
            <span className="text-[12px] font-black text-zinc-700 dark:text-zinc-200 uppercase tracking-wider">Trending Topics</span>
          </div>
          <div className="space-y-2">
            {TOPICS.map((t, i) => (
              <button key={t.id} className="w-full flex items-center gap-2 py-1.5 group text-left">
                <span className="text-[10px] font-black text-zinc-300 w-4">{i + 1}</span>
                <div className={`flex-1 min-w-0 px-2 py-1 rounded-lg ${t.bg} transition-opacity group-hover:opacity-80`}>
                  <div className={`text-[11px] font-bold truncate ${t.color}`}>#{t.name}</div>
                  <div className="text-[10px] text-zinc-400">{t.count} discussions</div>
                </div>
              </button>
            ))}
          </div>

          {/* Activity */}
          <div className="mt-4 p-3 rounded-2xl border border-orange-500/20" style={{ background: 'linear-gradient(135deg, rgba(255,122,61,0.06) 0%, rgba(232,69,10,0.06) 100%)' }}>
            <div className="flex items-center gap-1.5 mb-2">
              <Zap className="w-3.5 h-3.5 text-orange-500" />
              <span className="text-[11px] font-black text-orange-600 dark:text-orange-400">11.11 Limited Event</span>
            </div>
            <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mb-2">Post to join the topic challenge and win exclusive rewards</p>
            <button
              onClick={() => pushDrawer('my_feeds')}
              className="w-full py-1.5 rounded-xl text-white text-[11px] font-semibold"
              style={{ background: 'linear-gradient(135deg, #FF7A3D 0%, #E8450A 100%)' }}
            >
              Join Now
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
};
