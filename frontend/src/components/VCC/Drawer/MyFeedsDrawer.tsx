import React, { useEffect, useRef, useState } from 'react';
import { Heart, MessageSquare, Share2, Trash2, Plus, Send, X, Camera, Upload, Play, Crop, Check, ChevronDown } from 'lucide-react';
import { usePreferenceContext } from '../contexts/PreferenceContext';
import { useSessionContext } from '../contexts/SessionContext';
import { useDrawerContext } from '../contexts/DrawerContext';
import { socialApi } from '../../../services/api';
import { mapSocialComments } from '../utils/socialComments';
import { getSocialPostErrorMessage } from '../utils/socialPostError';



const CommentItem: React.FC<{
  comment: any; 
  onReply: (commentId: string, userName: string) => void;
  onDelete: (commentId: string) => void;
  onAvatarClick: () => void;
  isReply?: boolean;
}> = ({ comment, onReply, onDelete, onAvatarClick, isReply }) => {
    const { t } = usePreferenceContext();
  return (
  <div className={`flex flex-col gap-2 ${isReply ? 'ml-10 mt-2 relative' : ''}`}>
    {isReply && (
      <div className="absolute left-[-20px] top-[-10px] bottom-0 w-[1px] bg-gray-200 dark:bg-white/10" />
    )}
    <div 
      className="flex gap-3 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 p-2 rounded-2xl transition-all"
      onClick={(e) => {
        e.stopPropagation();
        onReply(comment.id, comment.user);
      }}
    >
      <div 
        onClick={(e) => {
          e.stopPropagation();
          onAvatarClick();
        }}
        className={`${isReply ? 'w-6 h-6 rounded-[8px] text-[10px]' : 'w-8 h-8 rounded-[12px] text-[12px]'} bg-gray-200 dark:bg-white/10 flex items-center justify-center font-black text-gray-500 shrink-0 hover:scale-110 active:scale-90 transition-transform shadow-sm`}
      >
        {comment.user.charAt(0)}
      </div>
      <div className="flex-1">
        <div className="flex items-center justify-between mb-0.5">
          <div className="flex items-center gap-1.5">
            <span className={`${isReply ? 'text-[12px]' : 'text-[13px]'} font-black text-gray-900 dark:text-white`}>{comment.user}</span>
            {comment.isAuthor && (
              <span className="px-1.5 py-0.5 rounded bg-orange-100 dark:bg-orange-500/20 text-[10px] text-[#E8450A] font-bold">作者</span>
            )}
          </div>
          <span className="text-[10px] text-gray-400 font-bold">{comment.time}</span>
        </div>
        <p className={`${isReply ? 'text-[12px]' : 'text-[13px]'} text-gray-600 dark:text-gray-400 leading-snug font-medium`}>{comment.text}</p>
        <div className="flex items-center gap-3 mt-1">
          {!isReply && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onReply(comment.id, comment.user);
              }}
              className="text-[11px] font-bold text-gray-400 hover:text-[#E8450A] transition-colors"
            >
              {t('feed.reply')}
            </button>
          )}
          {comment.canDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(comment.id);
              }}
              className="text-[11px] font-bold text-gray-400 hover:text-red-500 transition-colors"
            >
              删除
            </button>
          )}
        </div>
      </div>
    </div>
    {comment.replies && comment.replies.length > 0 && (
      <div className="ml-4">
        {comment.replies.map((reply: any) => (
          <CommentItem key={reply.id} comment={reply} onReply={onReply} onDelete={onDelete} onAvatarClick={onAvatarClick} isReply />
        ))}
      </div>
    )}
  </div>
  );
};

export const MyFeedsDrawer: React.FC = () => {
    const { pushDrawer } = useDrawerContext();
  const { t } = usePreferenceContext();
  const { user } = useSessionContext();
  
  const INITIAL_MY_FEEDS: any[] = [
    {
      id: 'mf1',
      content: t('feed.mock_content_1'),
      time: `2 ${t('square.post_time_suffix')}`,
      likes: 128,
      comments: [
        { 
          id: 'c1', 
          user: t('contacts.alex'), 
          text: t('feed.mock_comment_1'), 
          time: `1 ${t('square.post_time_suffix')}`,
          replies: [
            { id: 'r1', user: t('contacts.lorna'), text: t('feed.mock_comment_2'), time: `30 ${t('common.now')}`, replies: [] }
          ]
        },
        { id: 'c2', user: t('contacts.lorna'), text: t('feed.mock_comment_3'), time: `30 ${t('common.now')}`, replies: [] }
      ],
      media: [
        { type: 'image', url: 'https://picsum.photos/seed/mf1_1/400/300', source: 'shopify_cdn' },
        { type: 'image', url: 'https://picsum.photos/seed/mf1_2/400/300', source: 'shopify_cdn' }
      ]
    },
    {
      id: 'mf2',
      content: t('feed.mock_content_2'),
      time: t('common.yesterday'),
      likes: 56,
      comments: [],
      media: [
        { type: 'image', url: 'https://picsum.photos/seed/mf2_1/400/300', source: 'shopify_cdn' }
      ]
    },
    {
      id: 'mf3',
      content: t('feed.mock_content_3'),
      time: `2 ${t('common.yesterday')}`,
      likes: 89,
      comments: [],
      media: [
        { type: 'video', url: 'https://picsum.photos/seed/video_mf3/800/450', source: 'shopify_cdn' }
      ]
    }
  ];

  const [feeds, setFeeds] = useState(INITIAL_MY_FEEDS);
  const [isPosting, setIsPosting] = useState(false);
  const [newPostContent, setNewPostContent] = useState('');
  const [selectedMedia, setSelectedMedia] = useState<{ type: 'image' | 'video', url: string, isCropped?: boolean, file?: File }[]>([]);
  const [croppingIndex, setCroppingIndex] = useState<number | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [replyingTo, setReplyingTo] = useState<{ feedId: string, commentId?: string, userName?: string } | null>(null);
  const [expandedFeedIds, setExpandedFeedIds] = useState<Set<string>>(new Set());
  const [replyContent, setReplyContent] = useState('');
  const [previewMedia, setPreviewMedia] = useState<{ type: 'image' | 'video', url: string } | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [visibility, setVisibility] = useState<'public' | 'friends'>('public');
  const [showVisibilityMenu, setShowVisibilityMenu] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const loadMyActivities = async () => {
    try {
      const res = await socialApi.listActivities({ limit: 100 });
      const items = (res.data?.items || []).filter((x: any) => Number(x.user_id) === Number(user?.customer_id));
      const mapped = items.map((x: any) => ({
        id: String(x.id),
        content: String(x.content || ''),
        time: String(x.timestamp || ''),
        likes: Number(x.likes || 0),
        liked: Boolean(x.liked),
        commentsCount: Number(x.comments || 0),
        visibility: String(x.visibility || 'public'),
        comments: [],
        media: (x.media || []).slice(0, 9).map((m: any) => ({ type: 'image', url: m.cdn_url || m.url })),
      }));
      setFeeds(mapped);
    } catch {
      setErrorMsg('动态加载失败，请稍后重试');
    }
  };

  useEffect(() => {
    loadMyActivities();
  }, [user?.customer_id]);

  const toggleComments = async (feedId: string) => {
    const newSet = new Set(expandedFeedIds);
    if (newSet.has(feedId)) {
      newSet.delete(feedId);
      if (replyingTo?.feedId === feedId) setReplyingTo(null);
    } else {
      newSet.add(feedId);
      try {
        const cRes = await socialApi.listComments(feedId);
        const comments = mapSocialComments(cRes.data?.items || []).map((x: any) => ({
          id: x.id,
          user: x.user,
          text: x.content,
          time: x.timestamp,
          canDelete: x.canDelete,
          isAuthor: x.isAuthor,
          replies: (x.replies || []).map((r: any) => ({
            id: r.id,
            user: r.user,
            text: r.content,
            time: r.timestamp,
            canDelete: r.canDelete,
            isAuthor: r.isAuthor,
            replies: [],
          })),
        }));
        setFeeds((prev: any[]) => prev.map((f: any) => (f.id === feedId ? { ...f, comments } : f)));
      } catch {}
    }
    setExpandedFeedIds(newSet);
  };

  const handleMediaUpload = (type: 'image' | 'video') => {
    if (type !== 'image') {
      setErrorMsg('本期仅支持图文发布');
      return;
    }
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const picked = files
      .filter((f) => f.type.startsWith('image/'))
      .slice(0, 9)
      .map((f) => ({ type: 'image' as const, url: URL.createObjectURL(f), isCropped: false, file: f }));
    const updatedMedia = [...selectedMedia, ...picked].slice(0, 9);
    setSelectedMedia(updatedMedia);
    setCroppingIndex(updatedMedia.length ? updatedMedia.length - 1 : null);
    e.currentTarget.value = '';
  };

  const applyCrop = (index: number) => {
    setSelectedMedia(selectedMedia.map((m, i) => {
      if (i === index) {
        return { 
          ...m, 
          url: `https://picsum.photos/seed/cropped_${Date.now()}/400/400`, // Simulated 1:1 crop
          isCropped: true 
        };
      }
      return m;
    }));
    setCroppingIndex(null);
  };

  const removeMedia = (index: number) => {
    setSelectedMedia(selectedMedia.filter((_, i) => i !== index));
    if (croppingIndex === index) setCroppingIndex(null);
  };

  const handlePost = async () => {
    if (!newPostContent.trim() && selectedMedia.length === 0) return;
    
    setIsUploading(true);
    setErrorMsg('');
    try {
      const committedMedia = [];
      for (const m of selectedMedia) {
        if (!m.file) continue;
        const ticketRes = await socialApi.uploadTicket({
          file_name: m.file.name || `feed-${Date.now()}.jpg`,
          mime_type: m.file.type || 'image/jpeg',
          file_size: m.file.size || 1,
        });
        const ticket = ticketRes.data?.ticket;
        if (!ticket?.upload_url || !ticket?.resource_url) throw new Error('ticket_failed');
        const formData = new FormData();
        for (const p of ticket.parameters || []) {
          formData.append(String(p.name), String(p.value));
        }
        formData.append('file', m.file);
        const uploadResp = await fetch(String(ticket.upload_url), { method: 'POST', body: formData });
        if (!uploadResp.ok) throw new Error('upload_failed');
        const commitRes = await socialApi.commitMedia({
          cdn_url: String(ticket.resource_url),
          mime_type: m.file.type || 'image/jpeg',
          size: m.file.size || 0,
        });
        committedMedia.push(commitRes.data?.item);
      }
      await socialApi.createActivity({
        content: newPostContent,
        visibility,
        media: committedMedia,
      });
      setNewPostContent('');
      setSelectedMedia([]);
      setIsPosting(false);
      await loadMyActivities();
    } catch (err: any) {
      setErrorMsg(getSocialPostErrorMessage(err));
    } finally {
      setIsUploading(false);
    }
  };

  const handleReply = async (feedId: string) => {
    if (!replyContent.trim()) return;
    try {
      await socialApi.createComment(feedId, replyContent, replyingTo?.commentId);
      const cRes = await socialApi.listComments(feedId);
      const comments = mapSocialComments(cRes.data?.items || []).map((x: any) => ({
        id: x.id,
        user: x.user,
        text: x.content,
        time: x.timestamp,
        canDelete: x.canDelete,
        isAuthor: x.isAuthor,
        replies: (x.replies || []).map((r: any) => ({
          id: r.id,
          user: r.user,
          text: r.content,
          time: r.timestamp,
          canDelete: r.canDelete,
          isAuthor: r.isAuthor,
          replies: [],
        })),
      }));
      setFeeds(feeds.map((f: any) => (f.id === feedId ? { ...f, comments } : f)));
    } catch {
      setErrorMsg('评论失败，请稍后重试');
    }
    setReplyContent('');
    setReplyingTo(null);
  };

  const handleLike = async (feedId: string, liked: boolean) => {
    try {
      if (liked) await socialApi.unlike(feedId);
      else await socialApi.like(feedId);
      await loadMyActivities();
    } catch {
      setErrorMsg('点赞失败，请稍后重试');
    }
  };

  const handleDeleteFeed = async (feedId: string) => {
    try {
      await socialApi.deleteActivity(feedId);
      setFeeds((prev: any[]) => prev.filter((f: any) => f.id !== feedId));
    } catch {
      setErrorMsg('删除失败，请稍后重试');
    }
  };

  const handleDeleteComment = async (feedId: string, commentId: string) => {
    try {
      await socialApi.deleteComment(commentId);
      const cRes = await socialApi.listComments(feedId);
      const comments = mapSocialComments(cRes.data?.items || []).map((x: any) => ({
        id: x.id,
        user: x.user,
        text: x.content,
        time: x.timestamp,
        canDelete: x.canDelete,
        isAuthor: x.isAuthor,
        replies: (x.replies || []).map((r: any) => ({
          id: r.id,
          user: r.user,
          text: r.content,
          time: r.timestamp,
          canDelete: r.canDelete,
          isAuthor: r.isAuthor,
          replies: [],
        })),
      }));
      setFeeds((prev: any[]) => prev.map((f: any) => (f.id === feedId ? { ...f, comments } : f)));
    } catch {
      setErrorMsg('删除评论失败，请稍后重试');
    }
  };

  const handleDragStart = (index: number) => (e: React.DragEvent) => {
    e.dataTransfer.setData('draggedIndex', index.toString());
  };

  const handleDrop = (index: number) => (e: React.DragEvent) => {
    const draggedIndex = parseInt(e.dataTransfer.getData('draggedIndex'));
    if (draggedIndex === index) return;
    
    const newMedia = [...selectedMedia];
    const [removed] = newMedia.splice(draggedIndex, 1);
    newMedia.splice(index, 0, removed);
    setSelectedMedia(newMedia);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  return (
    <div 
      className="flex flex-col h-full bg-[#F2F2F7] dark:bg-[#000000] overflow-y-auto pb-24"
      onClick={() => {
        setExpandedFeedIds(new Set());
        setReplyingTo(null);
        setShowVisibilityMenu(false);
      }}
    >
      {/* Post Header */}
      <div className="px-4 py-6 relative z-20 overflow-visible">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleFileChange}
        />
        {!!errorMsg && (
          <div className="mb-3 rounded-xl border border-red-200 bg-red-50 text-red-600 px-3 py-2 text-[12px]">
            {errorMsg}
          </div>
        )}
        {!isPosting ? (
          <button 
            onClick={() => setIsPosting(true)}
            className="w-full bg-white/70 dark:bg-white/5 backdrop-blur-xl rounded-[28px] p-4 flex items-center justify-between border border-white/40 dark:border-white/10 shadow-sm active:scale-[0.98] transition-all duration-200"
          >
            <span className="text-gray-400 font-bold">{t('square.post_placeholder')}</span>
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-lg" style={{ background: 'linear-gradient(135deg, #FF7A3D 0%, #E8450A 100%)' }}>
              <Plus className="w-6 h-6" />
            </div>
          </button>
        ) : (
          <div className="bg-white/70 dark:bg-white/5 backdrop-blur-xl rounded-[32px] p-5 border border-white/40 dark:border-white/10 shadow-lg relative z-30 overflow-visible">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[15px] font-black text-gray-900 dark:text-white">{t('feed.post_title')}</span>
              <button onClick={() => setIsPosting(false)} className="text-gray-400"><X className="w-5 h-5" /></button>
            </div>
            <textarea 
              autoFocus
              value={newPostContent}
              onChange={(e) => setNewPostContent(e.target.value)}
              placeholder={t('feed.post_placeholder')}
              className="w-full bg-transparent text-[15px] text-gray-800 dark:text-gray-200 min-h-[100px] outline-none resize-none font-medium"
            />
            
            {/* Media Previews & Cropping */}
            {selectedMedia.length > 0 && (
              <div className="grid grid-cols-3 gap-2 mb-4">
                {selectedMedia.map((m, idx) => (
                  <div 
                    key={idx} 
                    draggable
                    onDragStart={handleDragStart(idx)}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop(idx)}
                    className="relative aspect-square rounded-xl overflow-hidden border border-white/20 shadow-sm group cursor-move active:opacity-50 transition-opacity"
                  >
                    <img src={m.url} alt="preview" className={`w-full h-full object-cover pointer-events-none ${croppingIndex === idx ? 'opacity-50 blur-sm' : ''}`} />
                    
                    {/* Crop Overlay */}
                    {m.type === 'image' && !m.isCropped && croppingIndex !== idx && (
                      <button 
                        onClick={() => setCroppingIndex(idx)}
                        className="absolute inset-0 flex flex-col items-center justify-center bg-black/20 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Crop className="w-6 h-6 mb-1" />
                        <span className="text-[10px] font-bold">{t('feed.crop_1_1')}</span>
                      </button>
                    )}

                    {/* Active Cropping UI */}
                    {croppingIndex === idx && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
                        <div className="w-12 h-12 border-2 border-white rounded-lg flex items-center justify-center bg-black/40 backdrop-blur-sm animate-pulse">
                          <Crop className="w-6 h-6 text-white" />
                        </div>
                        <button 
                          onClick={() => applyCrop(idx)}
                          className="mt-2 text-white p-1.5 rounded-full shadow-lg"
                          style={{ background: 'linear-gradient(135deg, #FF7A3D 0%, #E8450A 100%)' }}
                        >
                          <Check className="w-4 h-4" />
                        </button>
                      </div>
                    )}

                    {m.type === 'video' && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                        <Play className="w-6 h-6 text-white fill-current" />
                      </div>
                    )}
                    <button 
                      onClick={() => removeMedia(idx)}
                      className="absolute top-1 right-1 w-5 h-5 bg-black/50 rounded-full flex items-center justify-center text-white z-20"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between mt-4">
              <div className="flex items-center gap-4">
                <div className="relative z-[80]" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    onClick={() => {
                      setShowVisibilityMenu((v) => !v);
                    }}
                    className="min-w-[120px] h-10 px-3 rounded-xl text-[14px] font-semibold bg-gray-100 dark:bg-white/10 border border-gray-200 dark:border-white/10 text-gray-800 dark:text-gray-100 flex items-center justify-between"
                  >
                    <span>{visibility === 'friends' ? '仅好友可看' : '完全公开'}</span>
                    <ChevronDown className="w-4 h-4" />
                  </button>
                  {showVisibilityMenu && (
                    <div className="absolute left-0 top-[44px] z-[120] w-[200px] rounded-xl border border-gray-200 dark:border-white/15 bg-white dark:bg-[#1C1C1E] shadow-2xl overflow-hidden">
                      <button
                        type="button"
                        onClick={() => {
                          setVisibility('public');
                          setShowVisibilityMenu(false);
                        }}
                        className={`w-full text-left px-3 py-2.5 text-[14px] ${visibility === 'public' ? 'bg-orange-50 dark:bg-orange-500/20 text-[#E8450A]' : 'text-gray-700 dark:text-gray-200'}`}
                      >
                        完全公开
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setVisibility('friends');
                          setShowVisibilityMenu(false);
                        }}
                        className={`w-full text-left px-3 py-2.5 text-[14px] ${visibility === 'friends' ? 'bg-orange-50 dark:bg-orange-500/20 text-[#E8450A]' : 'text-gray-700 dark:text-gray-200'}`}
                      >
                        仅好友可看
                      </button>
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  aria-label={t('feed.upload_photo')}
                  onClick={() => handleMediaUpload('image')}
                  className="text-gray-400 hover:text-[#E8450A] transition-colors"
                >
                  <div className="w-10 h-10 bg-gray-100 dark:bg-white/5 rounded-xl flex items-center justify-center">
                    <Camera className="w-5 h-5" />
                  </div>
                </button>
                <button
                  type="button"
                  aria-label={t('feed.upload')}
                  onClick={() => handleMediaUpload('image')}
                  className="text-gray-400 hover:text-blue-500 transition-colors"
                >
                  <div className="w-10 h-10 bg-gray-100 dark:bg-white/5 rounded-xl flex items-center justify-center">
                    <Upload className="w-5 h-5" />
                  </div>
                </button>
              </div>
              <button 
                onClick={handlePost}
                disabled={isUploading || (!newPostContent.trim() && selectedMedia.length === 0)}
                className="text-white px-6 py-2 rounded-full text-[14px] font-semibold shadow-md active:scale-90 transition-all disabled:opacity-50 flex items-center gap-2"
                style={{ background: 'linear-gradient(135deg, #FF7A3D 0%, #E8450A 100%)' }}
              >
                {isUploading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    发布中
                  </>
                ) : t('feed.post_action')}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Feeds List */}
      <div className="px-4 space-y-6">
        {feeds.map((feed) => (
          <div key={feed.id} className="bg-white/70 dark:bg-white/5 backdrop-blur-xl rounded-[36px] overflow-hidden border border-white/40 dark:border-white/10 shadow-sm flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-[20px] flex items-center justify-center text-xl font-black text-white shadow-lg" style={{ background: 'linear-gradient(135deg, #FF7A3D 0%, #E8450A 100%)' }}>{t('common.me')}</div>
                  <div>
                    <div className="text-[16px] font-black text-gray-900 dark:text-white tracking-tight">{t('feed.my_feeds')}</div>
                    <div className="text-[11px] text-gray-400 font-bold uppercase tracking-widest">{feed.time}</div>
                  </div>
                </div>
                <button 
                  onClick={() => handleDeleteFeed(feed.id)}
                  className="w-9 h-9 flex items-center justify-center bg-red-500/10 text-red-500 rounded-[14px] active:scale-90 transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <p className="text-[15px] text-gray-800 dark:text-gray-200 leading-relaxed font-medium mb-4">
                {feed.content}
              </p>

              {feed.media && feed.media.length > 0 && (
                <div className={`grid gap-1.5 mb-4 ${feed.media.length === 1 ? 'grid-cols-1' : 'grid-cols-3'}`}>
                  {feed.media.map((m: any, idx: number) => (
                    <div 
                      key={idx} 
                      onClick={() => setPreviewMedia({ type: m.type as any, url: m.url })}
                      className="relative aspect-square rounded-[20px] overflow-hidden border border-white/20 shadow-sm group cursor-pointer"
                    >
                      <img src={m.url} alt="feed" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      {m.type === 'video' && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition-all">
                          <div className="w-10 h-10 bg-white/30 backdrop-blur-md rounded-full flex items-center justify-center text-white border border-white/40 shadow-xl">
                            <Play className="w-5 h-5 fill-current ml-1" />
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-6 pt-2">
                <button
                  onClick={() => handleLike(feed.id, !!feed.liked)}
                  className={`flex items-center gap-1.5 text-[13px] font-bold transition-colors ${feed.liked ? 'text-red-500' : 'text-gray-400 hover:text-red-500'}`}
                >
                  <Heart className="w-4 h-4" /> {feed.likes}
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); toggleComments(feed.id); }}
                  className={`flex items-center gap-1.5 text-[13px] font-bold active:scale-95 transition-all duration-200 ${expandedFeedIds.has(feed.id) ? 'text-blue-500 scale-110' : 'text-gray-400 hover:text-blue-500'}`}
                >
                  <MessageSquare className={`w-4 h-4 ${expandedFeedIds.has(feed.id) ? 'fill-current' : ''}`} /> {(feed.commentsCount || feed.comments.length)}
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); pushDrawer('share_menu'); }}
                  className="flex items-center gap-1.5 text-[13px] font-bold text-gray-400 ml-auto hover:text-[#E8450A] transition-colors"
                >
                  <Share2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Comments Section */}
            {expandedFeedIds.has(feed.id) && (
              <div className="bg-gray-50/50 dark:bg-white/5 border-t border-gray-100/50 dark:border-white/5 p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
                {feed.comments.map((comment: any) => (
                  <CommentItem
                    key={comment.id}
                    comment={comment}
                    onReply={(commentId, userName) => setReplyingTo({ feedId: feed.id, commentId, userName })}
                    onDelete={(commentId) => handleDeleteComment(feed.id, commentId)}
                    onAvatarClick={() => pushDrawer('user_profile')}
                  />
                ))}

                <div className="flex items-center gap-2 pt-2">
                  <input 
                    autoFocus
                    type="text"
                    value={replyContent}
                    onChange={(e) => setReplyContent(e.target.value)}
                    placeholder={replyingTo?.userName ? `${t('feed.reply')} @${replyingTo.userName}...` : t('feed.write_reply')}
                    className="flex-1 bg-white/70 dark:bg-white/5 rounded-full px-4 py-2 text-[13px] outline-none border border-white/20 focus:border-[#E8450A] transition-all"
                  />
                  <button 
                    onClick={() => handleReply(feed.id)}
                    className="w-9 h-9 text-white rounded-full flex items-center justify-center shadow-md active:scale-90 transition-all"
                    style={{ background: 'linear-gradient(135deg, #FF7A3D 0%, #E8450A 100%)' }}
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Media Preview Overlay */}
      {previewMedia && (
        <div 
          className="absolute inset-0 z-[100] bg-black/90 backdrop-blur-2xl flex items-center justify-center p-4 animate-in fade-in duration-300"
          onClick={() => setPreviewMedia(null)}
        >
          <button 
            className="absolute top-10 right-6 text-white/60 hover:text-white transition-colors"
            onClick={() => setPreviewMedia(null)}
          >
            <X className="w-8 h-8" />
          </button>
          
          {previewMedia.type === 'image' ? (
            <img 
              src={previewMedia.url} 
              alt="Preview" 
              className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl animate-in zoom-in-95 duration-300" 
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <div 
              className="w-full max-w-4xl aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl relative group"
              onClick={(e) => e.stopPropagation()}
            >
              <img src={previewMedia.url} alt="Video Cover" className="w-full h-full object-cover opacity-50" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-20 h-20 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white border border-white/40 shadow-xl scale-110">
                  <Play className="w-10 h-10 fill-current ml-1" />
                </div>
              </div>
              <div className="absolute bottom-6 left-6 right-6 flex flex-col gap-2">
                <div className="h-1 w-full bg-white/20 rounded-full overflow-hidden">
                  <div className="h-full w-1/3 bg-[#E8450A]" />
                </div>
                <div className="flex justify-between text-white/60 text-[12px] font-bold">
                  <span>0:15</span>
                  <span>0:45</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
