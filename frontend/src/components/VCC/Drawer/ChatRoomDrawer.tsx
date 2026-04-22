import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, Send, Image as ImageIcon, Mic, Plus, Smile, User, Users as UsersIcon, Megaphone, ShoppingBag, ExternalLink, X, ChevronRight, ShoppingCart, CheckCircle2, Box, Scale, MoreHorizontal, UserMinus, Check, CheckCheck } from 'lucide-react';
import { useSessionContext } from '../contexts/SessionContext';
import { usePreferenceContext } from '../contexts/PreferenceContext';
import { useAIContext } from '../contexts/AIContext';
import { useDrawerContext } from '../contexts/DrawerContext';
import { useCommerceContext } from '../contexts/CommerceContext';
import { ChatContext } from '../contexts/types';
import { motion, AnimatePresence } from 'framer-motion';
import { ProductGridCard } from '../BAPCards/ProductGridCard';
import { MediaGridCard } from '../BAPCards/MediaGridCard';
import { PromoActionCard } from '../BAPCards/PromoActionCard';
import { LinkTextCard } from '../BAPCards/LinkTextCard';
import { MagicPocketMenu } from '../MagicPocketMenu';
import { aiApi, groupsApi, imApi } from '../../../services/api';
import { shouldUseButlerBackend } from '../utils/chatRouting';
import { resolveChatDisplayName } from '../utils/chatIdentity';

const TypingText: React.FC<{ text: string; speedMs?: number }> = ({ text, speedMs = 14 }) => {
  const [visible, setVisible] = useState(text);
  useEffect(() => {
    if (!text) {
      setVisible('');
      return;
    }
    let i = 0;
    setVisible('');
    const timer = setInterval(() => {
      i += 1;
      setVisible(text.slice(0, i));
      if (i >= text.length) clearInterval(timer);
    }, speedMs);
    return () => clearInterval(timer);
  }, [text, speedMs]);
  return <span className="whitespace-pre-wrap">{visible}</span>;
};

const normalizeButlerText = (raw: any) => {
  let text = String(raw ?? '');
  text = text.replace(/^"(.*)"$/s, '$1').replace(/\\n/g, '\n');
  text = text.replace(/\*\*(.*?)\*\*/g, '$1');
  text = text.replace(/^#+\s*/gm, '');
  return text.trim();
};

export const ChatRoomDrawer: React.FC = () => {
    const { activeChat, setActiveChat, setActiveDrawer, pushDrawer } = useDrawerContext();
  const { aiInput, setAiInput } = useAIContext();
  const { t, setTheme, setLanguage, setCurrency, setNotifications } = usePreferenceContext();
  const { user } = useSessionContext();
  const { setWithdrawalMethod, setHasCheckedInToday } = useCommerceContext();
  const [messages, setMessages] = useState<any[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [replyTarget, setReplyTarget] = useState<any | null>(null);
  const [actionMenuMsgId, setActionMenuMsgId] = useState<string | null>(null);
  const [peerTyping, setPeerTyping] = useState(false);
  const [showPinned, setShowPinned] = useState(true);
  const [showPocket, setShowPocket] = useState(false);
  const [groupRole, setGroupRole] = useState<'owner' | 'admin' | 'member' | null>(null);
  const [groupPinned, setGroupPinned] = useState<any | null>(null);
  const [groupAnnouncement, setGroupAnnouncement] = useState('');
  const [groupCanSpeak, setGroupCanSpeak] = useState(true);
  const [groupMuteHint, setGroupMuteHint] = useState('');
  const [isAiTyping, setIsAiTyping] = useState(false);
  const [recommendationActionsHidden, setRecommendationActionsHidden] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const typingTimerRef = useRef<number | null>(null);
  const longPressTimerRef = useRef<number | null>(null);

  const managedGroupId = (() => {
    const raw = String(activeChat?.id || '');
    const match = raw.match(/^group_(\d+)$/);
    return match ? Number(match[1]) : null;
  })();
  const isManagedGroup = activeChat?.type === 'group' && !!managedGroupId;
  const chatStorageKey = activeChat ? `vcc_chat_history_${activeChat.id}` : '';
  const privatePeerUserId = activeChat?.type === 'private'
    ? Number((activeChat as any)?.peerUserId || String(activeChat?.id || '').match(/^private_(\d+)$/)?.[1] || 0)
    : 0;

  // Close pocket/menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowPocket(false);
      }
    };
    if (showPocket) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showPocket]);

  // Sync external aiInput to internal inputValue when drawer opens or aiInput changes
  useEffect(() => {
    if (aiInput) {
      setInputValue(aiInput);
      // Optional: clear it after syncing so it doesn't stick if we switch chats
      // setAiInput(''); 
    }
  }, [aiInput]);

  const getPinnedContent = () => {
    if (!activeChat) return null;
    if (isManagedGroup && groupPinned) {
      return {
        type: 'owner',
        icon: <Megaphone className="w-4 h-4 text-blue-500" />,
        title: groupPinned.title || 'Pinned Message',
        content: groupPinned.content || '',
        image: '',
        action: '查看消息',
        bg: 'bg-blue-50/90 dark:bg-blue-500/10',
        border: 'border-blue-100 dark:border-blue-500/20',
        message_id: groupPinned.message_id,
        link: groupPinned.link || '',
      };
    }
    if (activeChat.type === 'topic' || activeChat.isOfficial) {
      return {
        type: 'official',
        icon: <Megaphone className="w-4 h-4 text-blue-500" />,
        title: t('chat.official_announcement'),
        content: t('chat.geek_week'),
        image: 'https://picsum.photos/seed/promo1/100/100',
        action: t('chat.view_activity'),
        bg: 'bg-blue-50/90 dark:bg-blue-500/10',
        border: 'border-blue-100 dark:border-blue-500/20'
      };
    }
    return null;
  };

  const pinned = getPinnedContent();
  const showRecommendPlaceholder = isManagedGroup && !pinned && showPinned && (groupRole === 'owner' || groupRole === 'admin');
  const chatDisplayName = resolveChatDisplayName(activeChat, user?.butler_name, t('lounge.ai_butler'));

  const applySystemAction = (action: string, payload: any) => {
    const allowedLanguages = new Set(['en', 'zh', 'ja', 'ko', 'es', 'fr', 'de', 'ar']);
    const allowedDrawers = new Set([
      'orders', 'checkout', 'reward_history', 'address', 'settings', 'wallet',
      'share_menu', 'contacts', 'notification', 'cart', 'me', 'prime',
      'lounge', 'square', 'fans', 'checkin_hub', 'withdraw', 'vouchers', 'points_history',
      'points_exchange', 'security', 'personal_info', 'ai_persona', 'scan',
    ]);
    const rawDrawer = String(payload?.value || '').trim().toLowerCase().replace(/-/g, '_').replace(/\s+/g, '_');
    const drawerAlias: Record<string, string> = {
      share: 'share_menu',
      order: 'orders',
      order_center: 'orders',
      payment: 'checkout',
      cashback: 'reward_history',
      rewards: 'reward_history',
      checkin: 'checkin_hub',
      check_in: 'checkin_hub',
      sign_in: 'checkin_hub',
      profile: 'me',
      shop: 'prime',
      mall: 'prime',
      community: 'square',
      salon: 'lounge',
      notifications: 'notification',
    };
    const normalizedDrawer = drawerAlias[rawDrawer] || rawDrawer;
    switch (action) {
      case 'SET_THEME':
        setTheme(payload?.value);
        break;
      case 'SET_LANGUAGE':
        if (typeof payload?.value === 'string' && allowedLanguages.has(payload.value)) {
          setLanguage(payload.value);
        }
        break;
      case 'SET_CURRENCY':
        setCurrency(payload?.value);
        break;
      case 'NAVIGATE':
      case 'OPEN_DRAWER':
        if (allowedDrawers.has(normalizedDrawer)) {
          pushDrawer(normalizedDrawer as any);
        }
        break;
      case 'UPDATE_WITHDRAWAL':
        setWithdrawalMethod(payload?.value);
        break;
      case 'PERFORM_CHECKIN':
        setHasCheckedInToday(true);
        break;
      case 'SET_NOTIFICATIONS':
        setNotifications(String(payload?.value).toLowerCase() === 'true');
        break;
      case 'CLEAR_LOCAL_CACHE':
        localStorage.removeItem('vcc_left_groups');
        localStorage.removeItem('vcc_closed_groups');
        break;
    }
  };

  useEffect(() => {
    if (activeChat) {
      const fromStorage = chatStorageKey ? localStorage.getItem(chatStorageKey) : null;
      if (fromStorage) {
        try {
          const parsed = JSON.parse(fromStorage);
          setMessages(Array.isArray(parsed) ? parsed : []);
        } catch {
          setMessages([]);
        }
      } else {
        // Seed a minimal welcome message only for first-time entry.
        const initialMessages = activeChat.isAiButler
          ? []
          : [
              { id: '1', sender: 'system', content: `${t('chat.welcome_to')} ${activeChat.name}`, time: '10:00' },
              {
                id: '2',
                sender: activeChat.type === 'private' ? activeChat.name : 'User_A',
                avatar: activeChat.avatar || `https://ui-avatars.com/api/?name=${activeChat.name}&background=random`,
                content: activeChat.type === 'topic' ? t('chat.topic_opinion') : t('chat.anyone_there'),
                time: '10:05'
              }
            ];
        setMessages(initialMessages);
      }
      setRecommendationActionsHidden(false);
      setReplyTarget(null);
      setPeerTyping(false);
    }
  }, [activeChat, t, chatStorageKey]);

  useEffect(() => {
    if (!isManagedGroup || !managedGroupId) {
      setGroupRole(null);
      setGroupPinned(null);
      setGroupAnnouncement('');
      setGroupCanSpeak(true);
      setGroupMuteHint('');
      return;
    }
    (async () => {
      try {
        const [res, membersRes] = await Promise.all([groupsApi.detail(managedGroupId), groupsApi.members(managedGroupId)]);
        setGroupRole((res.data?.item?.my_role || 'member') as any);
        setGroupPinned(res.data?.item?.settings?.pinned_message || null);
        setGroupAnnouncement(String(res.data?.item?.settings?.announcement || ''));
        const muteAll = Boolean(res.data?.item?.settings?.mute_all);
        const me = (membersRes.data?.items || []).find((x: any) => Number(x.user_id) === Number(user?.customer_id));
        const meRole = String(me?.role || res.data?.item?.my_role || 'member');
        const mutedUntilRaw = me?.muted_until;
        const mutedUntilTs = mutedUntilRaw ? new Date(mutedUntilRaw).getTime() : 0;
        const isPersonalMuted = mutedUntilTs > Date.now();
        const blockedByMuteAll = muteAll && meRole !== 'owner' && meRole !== 'admin';
        const canSpeak = !(isPersonalMuted || blockedByMuteAll);
        setGroupCanSpeak(canSpeak);
        if (blockedByMuteAll) setGroupMuteHint('群主已开启全员禁言');
        else if (isPersonalMuted) setGroupMuteHint('你已被禁言，暂时无法发言');
        else setGroupMuteHint('');
      } catch {
        setGroupRole(null);
        setGroupPinned(null);
        setGroupAnnouncement('');
        setGroupCanSpeak(true);
        setGroupMuteHint('');
      }
    })();
  }, [isManagedGroup, managedGroupId, activeChat?.id, user?.customer_id]);

  useEffect(() => {
    if (!activeChat || isAiSearchChat()) return;
    const myId = `u-${user?.customer_id || 'guest'}`;
    const consume = (payload: any) => {
      if (!payload || payload.chatId !== activeChat.id || payload.senderId === myId) return;
      const stillValid = Date.now() - Number(payload.at || 0) < 5000;
      setPeerTyping(Boolean(payload.typing) && stillValid);
      if (typingTimerRef.current) window.clearTimeout(typingTimerRef.current);
      typingTimerRef.current = window.setTimeout(() => setPeerTyping(false), 2200);
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key !== 'vcc_typing_signal' || !e.newValue) return;
      try { consume(JSON.parse(e.newValue)); } catch {}
    };
    const onLocal = (e: Event) => {
      try { consume((e as CustomEvent).detail); } catch {}
    };
    window.addEventListener('storage', onStorage);
    window.addEventListener('vcc_typing_signal_local', onLocal as EventListener);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('vcc_typing_signal_local', onLocal as EventListener);
      if (typingTimerRef.current) window.clearTimeout(typingTimerRef.current);
    };
  }, [activeChat, user?.customer_id]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (!chatStorageKey) return;
    try {
      localStorage.setItem(chatStorageKey, JSON.stringify(messages || []));
    } catch {}
  }, [chatStorageKey, messages]);

  const handleSend = async (seedText?: string | React.MouseEvent) => {
    const raw = typeof seedText === 'string' ? seedText : inputValue;
    const content = String(raw ?? '').trim();
    if (!content) return;
    if (isManagedGroup && !groupCanSpeak) return;
    // Social chats: if message is links-only, parse links into cards instead of plain text bubble.
    if (!isAiSearchChat()) {
      const links = parseLinks(content);
      const linksOnly = links.length > 0 && content.replace(/https?:\/\/\S+/gi, '').trim() === '';
      if (linksOnly) {
        await sendSocialLinkCards(links);
        setInputValue('');
        return;
      }
    }
    const newMessage = {
      id: Date.now().toString(),
      sender: 'me',
      content,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'sent',
      reply_to: replyTarget ? { id: replyTarget.id, sender: replyTarget.sender, content: replyTarget.content } : undefined,
    };
    setMessages((prev) => [...prev, newMessage]);
    setReplyTarget(null);
    setInputValue('');

    if (!shouldUseButlerBackend(activeChat)) {
      const id = newMessage.id;
      window.setTimeout(() => setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, status: 'delivered' } : m))), 500);
      window.setTimeout(() => setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, status: 'read' } : m))), 1800);
      return;
    }

    setIsAiTyping(true);
    try {
      const response = await aiApi.chat(content, {
        current_drawer: 'chat_room',
        chat_context_id: activeChat?.id,
      });
      const aiData = response.data;
      const aiContent =
        aiData?.choices?.[0]?.message?.content
        || aiData?.content
        || t('ai.resp.default');
      const attachments = aiData?.attachments || [];
      const aiReply = {
        id: `ai-${Date.now()}`,
        sender: chatDisplayName,
        avatar: activeChat?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(chatDisplayName || 'AI')}&background=random`,
        content: aiContent,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        attachments,
      };
      setMessages((prev) => [...prev, aiReply]);
      attachments.forEach((attachment: any) => {
        if (attachment?.type === '0B_SYSTEM_ACTION' && !attachment?.requires_confirmation) {
          applySystemAction(attachment.action, attachment.payload);
        }
      });
    } catch (error) {
      const errReply = {
        id: `ai-err-${Date.now()}`,
        sender: chatDisplayName,
        avatar: activeChat?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(chatDisplayName || 'AI')}&background=random`,
        content: `${t('ai.resp.default')}\n\n(offline fallback: ${error instanceof Error ? error.message : String(error)})`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errReply]);
    } finally {
      setIsAiTyping(false);
    }
  };

  const handleUpgradePrivateToGroup = async () => {
    if (!activeChat || activeChat.type !== 'private') return;
    if (!privatePeerUserId) {
      window.alert('当前私聊未绑定对方用户ID，无法升级群聊。');
      return;
    }
    const raw = window.prompt('输入要添加的用户ID（可选，多个逗号分隔）');
    const extra = String(raw || '')
      .split(',')
      .map((x) => Number(x.trim()))
      .filter((x) => Number.isFinite(x) && x > 0);
    const memberIds = Array.from(new Set([privatePeerUserId, ...extra]));
    try {
      const nameSeed = `${activeChat.name || '群聊'}等人的群`;
      const res = await groupsApi.create({
        name: nameSeed.slice(0, 120),
        group_type: 'private',
        member_user_ids: memberIds,
      });
      const gid = Number(res.data?.group_id || 0);
      if (!gid) throw new Error('创建群聊失败');
      setActiveChat({
        id: `group_${gid}`,
        name: nameSeed,
        type: 'group',
        avatar: activeChat.avatar,
      } as any);
      window.alert('已升级为群聊');
    } catch {
      window.alert('升级群聊失败，请稍后重试');
    }
  };

  const applyReaction = (msgId: string, reaction: 'heart' | 'up' | 'down') => {
    setMessages((prev) => prev.map((m) => (String(m.id) === msgId ? { ...m, reaction } : m)));
    setActionMenuMsgId(null);
  };

  const reactionEmoji = (reaction?: string) => {
    if (reaction === 'heart') return '❤️';
    if (reaction === 'up') return '👍';
    if (reaction === 'down') return '👎';
    return '';
  };

  const appendLocalMessage = (payload: { text?: string; attachments?: any[] }) => {
    setMessages((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        sender: 'me',
        content: payload.text || '',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        attachments: payload.attachments || [],
        status: 'sent',
      },
    ]);
  };

  const isAiSearchChat = () =>
    Boolean(
      activeChat?.isAiButler
      || (activeChat?.type === 'private' && (
        activeChat?.id === '2'
        || activeChat?.name === (user?.butler_name || t('lounge.ai_butler'))
      ))
    );

  const filesToMediaItems = async (files: File[]) => {
    const toDataUrl = (file: File) =>
      new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.readAsDataURL(file);
      });
    const maxCount = isAiSearchChat() ? 1 : 9;
    const limited = files.slice(0, maxCount);
    const urls = await Promise.all(limited.map((f) => toDataUrl(f)));
    return limited.map((f, i) => ({ id: `${Date.now()}-${i}`, url: urls[i], thumb: urls[i], name: f.name }));
  };

  const handlePickMedia = async (fileList: FileList | null) => {
    const maxCount = isAiSearchChat() ? 1 : 9;
    const files = Array.from(fileList || []).filter((f) => f.type.startsWith('image/')).slice(0, maxCount);
    if (!files.length) return;
    const items = await filesToMediaItems(files);
    appendLocalMessage({
      text: files.length > 1 ? `已发送 ${files.length} 张图片` : '已发送 1 张图片，请帮我根据图片搜同款好物。',
      attachments: [{ type: '0B_CARD_V3', component: '0B_MEDIA_GRID', data: { items, count: items.length } }],
    });
    setShowPocket(false);
  };

  const parseLinks = (raw: string): string[] => {
    return Array.from(
      new Set(
        raw
          .split(/[\n,\s]+/)
          .map((s) => s.trim())
          .filter((s) => /^https?:\/\//i.test(s))
      )
    ).slice(0, isAiSearchChat() ? 1 : 9);
  };

  const is0buckLink = (link: string) => {
    try {
      const host = new URL(link).hostname.toLowerCase();
      return host === '0buck.com' || host.endsWith('.0buck.com');
    } catch {
      return false;
    }
  };
  const isPromoShareLink = (link: string) => /\/api\/v1\/im\/promo\/links\/[^/?#]+/i.test(link);
  const isInternalBusinessLink = (link: string) => is0buckLink(link) || isPromoShareLink(link);
  const classify0buckLink = (link: string): 'product' | 'merchant' | 'promo' | 'unknown' => {
    if (isPromoShareLink(link)) return 'promo';
    const lowered = link.toLowerCase();
    if (/\/product(s)?\/|[?&](product_id|pid)=/i.test(lowered)) return 'product';
    if (/\/merchant(s)?\/|\/supplier(s)?\/|[?&](merchant_id|supplier_id)=/i.test(lowered)) return 'merchant';
    return 'unknown';
  };

  const buildProductItemsFromLinks = (links: string[]) => {
    return links.map((link, i) => {
      let host = 'Shared Link';
      try {
        host = new URL(link).hostname.replace(/^www\./, '');
      } catch {}
      const cls = is0buckLink(link) ? classify0buckLink(link) : 'unknown';
      return {
        id: `shared-${Date.now()}-${i}`,
        name: cls === 'merchant' ? `0Buck Merchant ${i + 1}` : `0Buck Product ${i + 1}`,
        price: 0,
        image: `https://picsum.photos/seed/shared-${i}/500/500`,
        supplier: host,
        rating: 4.8,
        sales: 0,
        share_link: link,
        entity_type: cls,
      };
    });
  };

  const sendSocialLinkCards = async (links: string[]) => {
    const internalLinks = links.filter(isInternalBusinessLink);
    const externalLinks = links.filter((l) => !isInternalBusinessLink(l));
    const attachments: any[] = [];

    const promoLinks = internalLinks.filter((l) => classify0buckLink(l) === 'promo');
    const normalLinks = internalLinks.filter((l) => classify0buckLink(l) !== 'promo');
    if (normalLinks.length) {
      attachments.push({
        type: '0B_CARD_V3',
        component: '0B_PRODUCT_GRID',
        data: { products: buildProductItemsFromLinks(normalLinks) },
      });
    }
    if (promoLinks.length) {
      const actionCards: any[] = [];
      const promoAsProducts: any[] = [];
      for (const link of promoLinks.slice(0, 9)) {
        try {
          const res = await imApi.buildTemplatesFromLink(link);
          const templates = (res.data?.templates || []) as any[];
          const parsed = res.data?.parsed || {};
          const first = templates[0];
          if (first) {
            const linkOut = first.link || link;
            const shouldRenderAsProductCard =
              parsed.card_type === 'product'
              || parsed.card_type === 'merchant'
              || parsed.share_category === 'group_buy'
              || parsed.share_category === 'distribution';
            if (shouldRenderAsProductCard) {
              promoAsProducts.push({
                id: `shared-${Date.now()}-${promoAsProducts.length}`,
                name: first.title || (parsed.card_type === 'merchant' ? '0Buck Merchant' : '0Buck Product'),
                price: 0,
                image: first.image || `https://picsum.photos/seed/promo-social-${promoAsProducts.length}/500/500`,
                supplier: parsed.card_type === 'merchant' ? '0Buck Merchant' : '0Buck Product',
                rating: 4.8,
                sales: 0,
                share_link: linkOut,
                entity_type: parsed.card_type === 'merchant' ? 'merchant' : 'product',
              });
            } else {
              actionCards.push({
                id: `promo-${Date.now()}-${actionCards.length}`,
                title: first.title,
                subtitle: first.subtitle,
                cta_text: first.cta_text,
                link: linkOut,
              });
            }
          }
        } catch (_e) {
          actionCards.push({
            id: `promo-${Date.now()}-${actionCards.length}`,
            title: '0Buck 推广卡',
            subtitle: '拼团 / 分销 / 注册入口',
            cta_text: '立即参与',
            link,
          });
        }
      }
      if (promoAsProducts.length) {
        attachments.push({ type: '0B_CARD_V3', component: '0B_PRODUCT_GRID', data: { products: promoAsProducts } });
      }
      if (actionCards.length) {
        attachments.push({ type: '0B_CARD_V3', component: '0B_PROMO_ACTIONS', data: { actions: actionCards } });
      }
    }
    if (externalLinks.length) {
      attachments.push({ type: '0B_CARD_V3', component: '0B_LINK_TEXT', data: { links: externalLinks } });
    }
    appendLocalMessage({ text: '', attachments });
  };

  const handlePocketAction = async (action: string) => {
    if (action === 'photos') {
      photoInputRef.current?.click();
      return;
    }
    if (action === 'camera') {
      cameraInputRef.current?.click();
      return;
    }
    if (action === 'gift') {
      const raw = window.prompt(isAiSearchChat() ? '粘贴1个外部链接（YouTube/TikTok/电商链接）用于搜物' : '粘贴商品/商家分享链接，支持最多9个（用空格、逗号或换行分隔）') || '';
      const links = parseLinks(raw);
      if (!links.length) return;

      if (isAiSearchChat()) {
        appendLocalMessage({ text: `已分享 ${links.length} 个外部链接，请帮我提炼关键词并搜相似好物。` });
        setShowPocket(false);
        return;
      }

      const internalLinks = links.filter(isInternalBusinessLink);
      const externalLinks = links.filter((l) => !isInternalBusinessLink(l));
      const attachments: any[] = [];

      const promoLinks = internalLinks.filter((l) => classify0buckLink(l) === 'promo');
      const normalLinks = internalLinks.filter((l) => classify0buckLink(l) !== 'promo');
      if (normalLinks.length) {
        attachments.push({
          type: '0B_CARD_V3',
          component: '0B_PRODUCT_GRID',
          data: { products: buildProductItemsFromLinks(normalLinks) },
        });
      }
      if (promoLinks.length) {
        const actionCards: any[] = [];
        const promoAsProducts: any[] = [];
        for (const link of promoLinks.slice(0, 9)) {
          try {
            const res = await imApi.buildTemplatesFromLink(link);
            const templates = (res.data?.templates || []) as any[];
            const parsed = res.data?.parsed || {};
            const first = templates[0];
            if (first) {
              const linkOut = first.link || link;
              const shouldRenderAsProductCard =
                parsed.card_type === 'product'
                || parsed.card_type === 'merchant'
                || parsed.share_category === 'group_buy'
                || parsed.share_category === 'distribution';
              if (shouldRenderAsProductCard) {
                promoAsProducts.push({
                  id: `shared-${Date.now()}-${promoAsProducts.length}`,
                  name: first.title || (parsed.card_type === 'merchant' ? '0Buck Merchant' : '0Buck Product'),
                  price: 0,
                  image: first.image || `https://picsum.photos/seed/promo-gift-${promoAsProducts.length}/500/500`,
                  supplier: parsed.card_type === 'merchant' ? '0Buck Merchant' : '0Buck Product',
                  rating: 4.8,
                  sales: 0,
                  share_link: linkOut,
                  entity_type: parsed.card_type === 'merchant' ? 'merchant' : 'product',
                });
              } else {
                actionCards.push({
                  id: `promo-${Date.now()}-${actionCards.length}`,
                  title: first.title,
                  subtitle: first.subtitle,
                  cta_text: first.cta_text,
                  link: linkOut,
                });
              }
            }
          } catch (_e) {
            actionCards.push({
              id: `promo-${Date.now()}-${actionCards.length}`,
              title: '0Buck 推广卡',
              subtitle: '拼团 / 分销 / 注册入口',
              cta_text: '立即参与',
              link,
            });
          }
        }
        if (promoAsProducts.length) {
          attachments.push({ type: '0B_CARD_V3', component: '0B_PRODUCT_GRID', data: { products: promoAsProducts } });
        }
        if (actionCards.length) {
          attachments.push({ type: '0B_CARD_V3', component: '0B_PROMO_ACTIONS', data: { actions: actionCards } });
        }
      }

      if (externalLinks.length) {
        attachments.push({ type: '0B_CARD_V3', component: '0B_LINK_TEXT', data: { links: externalLinks } });
      }
      appendLocalMessage({ text: '', attachments });
      setShowPocket(false);
    }
  };

  if (!activeChat) return null;
  const emitTypingSignal = (nextValue: string) => {
    setInputValue(nextValue);
    if (!activeChat || isAiSearchChat()) return;
    const payload = {
      chatId: activeChat.id,
      senderId: `u-${user?.customer_id || 'guest'}`,
      typing: nextValue.trim().length > 0,
      at: Date.now(),
    };
    localStorage.setItem('vcc_typing_signal', JSON.stringify(payload));
    window.dispatchEvent(new CustomEvent('vcc_typing_signal_local', { detail: payload }));
  };

  const isButlerChat = isAiSearchChat();
  const isTouchDevice = typeof window !== 'undefined' && ('ontouchstart' in window || (navigator?.maxTouchPoints || 0) > 0);
  const hasUserMessage = messages.some((m) => m.sender === 'me');
  const showWelcomePanel = isButlerChat && !hasUserMessage && !isAiTyping;
  const welcomeRaw = t('chat.butler_welcome_shadow') || '';
  const welcomeNormalized = String(welcomeRaw)
    .replace(/^"(.*)"$/s, '$1')
    .replace(/\\n/g, '\n');
  const welcomeParagraphs = welcomeNormalized.split(/\n\s*\n/).filter(Boolean);

  const handleSkipOnce = async (msgId: string) => {
    try {
      await aiApi.skipRecommendationOnce(msgId || activeChat.id || 'global', 30);
      setRecommendationActionsHidden(true);
    } catch (_e) {}
  };
  const handleDisableRecommendations = async () => {
    try {
      await aiApi.setRecommendationSettings(false);
      setRecommendationActionsHidden(true);
    } catch (_e) {}
  };

  return (
    <div className="flex flex-col h-full bg-[var(--wa-bg)] dark:bg-black relative overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between h-14 px-3 text-white shadow-sm shrink-0 z-[70] relative" style={{ background: 'linear-gradient(135deg, #FF7A3D 0%, #E8450A 100%)' }}>
        {/* Left Side: Back Arrow */}
        <div className="flex-none w-10">
          <button 
            onClick={() => setActiveDrawer('lounge')}
            className="p-1 -ml-1 hover:bg-white/10 rounded-full transition-colors"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        </div>

        {/* Center: Avatar & Info (Absolute Centered) */}
        <div 
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-2 cursor-pointer hover:bg-white/5 px-2 py-1 rounded-lg transition-colors max-w-[60%]"
          onClick={() => pushDrawer('user_profile')}
        >
          <div className="w-8 h-8 rounded-full bg-white/20 overflow-hidden shrink-0 shadow-sm">
            {activeChat.avatar ? (
              <img src={activeChat.avatar} alt={activeChat.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                {activeChat.type === 'private' ? <User className="w-5 h-5" /> : <UsersIcon className="w-5 h-5" />}
              </div>
            )}
          </div>

          <div className="flex flex-col justify-center min-w-0">
            <h2 className="font-bold text-[15px] truncate leading-tight tracking-tight">{chatDisplayName}</h2>
            <div className="flex items-center">
              {activeChat.memberCount ? (
                <span className="text-[10px] opacity-90 font-medium truncate">{activeChat.memberCount} {t('common.members')}</span>
              ) : activeChat.type === 'private' ? (
                <span className="text-[10px] text-gray-400 font-bold bg-gray-50 dark:bg-white/5 px-2 py-0.5 rounded-full border border-gray-100 dark:border-white/5">
                  {t('chat.online')}
                </span>
              ) : null}
            </div>
          </div>
        </div>

        {/* Right Side: Group Menu */}
        <div className="flex-none w-10 flex justify-end relative">
          {(activeChat.type === 'group' || isManagedGroup || (activeChat.type === 'private' && !activeChat.isAiButler)) && (
            <button
              onClick={() => {
                if (activeChat.type === 'private') {
                  handleUpgradePrivateToGroup();
                } else {
                  pushDrawer('group_manage');
                }
              }}
              className="p-1.5 hover:bg-white/10 rounded-full transition-colors active:scale-95"
              title={activeChat.type === 'private' ? '添加成员成群聊' : '群聊信息'}
              aria-label={activeChat.type === 'private' ? '添加成员成群聊' : '群聊信息'}
            >
              <MoreHorizontal className="w-5 h-5 text-white" />
            </button>
          )}
        </div>
      </div>

      {isManagedGroup && !!groupAnnouncement.trim() && (
        <div className="shrink-0 px-3 py-2 bg-amber-50 border-b border-amber-100 text-[12px] text-amber-700">
          <span className="font-semibold mr-1">群公告：</span>
          {groupAnnouncement}
        </div>
      )}

      {/* Pinned Announcement / Product Area */}
      <AnimatePresence>
        {(pinned && showPinned) && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className={`shrink-0 border-b border-white/20 dark:border-white/10 relative overflow-hidden group cursor-pointer active:opacity-90 transition-all`}
            onClick={() => {
              if ((pinned as any)?.link) window.open(String((pinned as any).link), '_blank', 'noopener,noreferrer');
              else pushDrawer(pinned.type === 'official' ? 'all_topics' : 'product_detail');
            }}
          >
            {/* Glassmorphism Background Layer */}
            <div className={`absolute inset-0 backdrop-blur-xl ${pinned.type === 'official' ? 'bg-blue-50/90 dark:bg-blue-900/40' : 'bg-orange-50/90 dark:bg-orange-900/40'}`} />
            
            <div className="px-4 py-3 flex items-start gap-3 relative z-10">
              {pinned.image ? (
                <div className="w-14 h-14 rounded-xl overflow-hidden shadow-sm border border-white/30 shrink-0">
                  <img src={pinned.image} alt="pinned" className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="mt-0.5">{pinned.icon}</div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-[9px] font-black uppercase tracking-tighter px-1.5 py-0.5 rounded-md shadow-sm ${pinned.type === 'official' ? 'bg-blue-500 text-white' : 'bg-orange-500 text-white'}`}>
                    {pinned.title}
                  </span>
                </div>
                <p className="text-[13px] font-black text-gray-800 dark:text-gray-100 leading-snug line-clamp-1 italic tracking-tight">
                  {pinned.content}
                </p>
              </div>
              
              <div className="flex items-center gap-2 self-center shrink-0">
                <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-[var(--wa-teal)] transition-colors" />
                {isManagedGroup && (groupRole === 'owner' || groupRole === 'admin') && !!pinned?.message_id && (
                  <button
                    onClick={async (e) => {
                      e.stopPropagation();
                      if (!managedGroupId) return;
                      await groupsApi.unpinMessage(managedGroupId, String(pinned.message_id));
                      setGroupPinned(null);
                    }}
                    className="px-2 py-1 text-[10px] rounded-full border border-blue-200 text-blue-600 bg-white/70 dark:bg-white/5"
                  >
                    Unpin
                  </button>
                )}
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowPinned(false);
                  }}
                  className="p-1 text-gray-300 hover:text-gray-500 dark:hover:text-gray-100 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            {/* Background Accent */}
            {!pinned.image && (
              <div className={`absolute -right-4 -bottom-4 w-16 h-16 opacity-10 pointer-events-none`}>
                {pinned.icon}
              </div>
            )}
          </motion.div>
        )}
        {showRecommendPlaceholder && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="shrink-0 border-b border-white/20 dark:border-white/10 relative overflow-hidden bg-orange-50/90 dark:bg-orange-900/30"
          >
            <div className="px-4 py-3 flex items-center justify-between gap-3">
              <div>
                <div className="text-[11px] font-bold text-orange-600">群主推荐</div>
                <div className="text-[12px] text-gray-700 dark:text-gray-200">暂无推荐，去群设置发布分销/拼团推荐</div>
              </div>
              <button
                onClick={() => pushDrawer('group_manage')}
                className="px-3 py-1.5 rounded-full text-[12px] bg-orange-500 text-white"
              >
                去设置
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Messages Area */}
      <div className="flex-1 relative overflow-hidden bg-[var(--wa-bg)] dark:bg-black">
        {/* Background Layer (Static) */}
        <div
          className="absolute inset-0 z-0 pointer-events-none opacity-30 dark:opacity-[0.035]"
          style={{
            backgroundImage:
              'url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")',
            backgroundSize: '400px',
            backgroundRepeat: 'repeat',
            backgroundBlendMode: 'multiply'
          }}
        />
        
        {/* Content Scroll Layer */}
        <div 
          ref={scrollRef}
          className="absolute inset-0 overflow-y-auto p-4 space-y-4 no-scrollbar z-10 flex flex-col"
        >
          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.sender === 'me' ? 'justify-end' : msg.sender === 'system' && msg.type !== 'bap_card' ? 'justify-center' : msg.type === 'bap_card' ? 'justify-center' : 'justify-start'}`}>
              {msg.sender === 'system' && msg.type !== 'bap_card' ? (
                <div className="bg-black/10 dark:bg-white/10 text-black/60 dark:text-white/60 text-[11px] px-3 py-1 rounded-full backdrop-blur-sm uppercase font-bold tracking-wider">
                  {t(String(msg.content ?? ''))}
                </div>
              ) : msg.type === 'bap_card' ? (
                <div className="w-full flex justify-center py-4 px-2">
                  <ProductGridCard 
                    data={{
                      title: msg.data.title,
                      price: parseFloat(msg.data.price),
                      original_price: parseFloat(msg.data.originalPrice),
                      supplier_name: msg.data.supplierName,
                      physical_verification: {
                        weight_kg: parseFloat(msg.data.weight) / 1000,
                        dimensions_cm: msg.data.dimensions
                      },
                      image_url: msg.data.image
                    }} 
                  />
                </div>
              ) : (
                <div
                  className={`flex gap-2 min-w-0 ${msg.sender === 'me' ? 'max-w-[85%] justify-end' : 'w-full max-w-[85%]'}`}
                  onMouseEnter={() => {
                    if (!isTouchDevice && msg.sender !== 'system') setActionMenuMsgId(String(msg.id));
                  }}
                  onMouseLeave={() => {
                    if (!isTouchDevice) setActionMenuMsgId((curr) => (curr === String(msg.id) ? null : curr));
                  }}
                  onTouchStart={() => {
                    if (msg.sender === 'system') return;
                    if (longPressTimerRef.current) window.clearTimeout(longPressTimerRef.current);
                    longPressTimerRef.current = window.setTimeout(() => {
                      setActionMenuMsgId(String(msg.id));
                    }, 420);
                  }}
                  onTouchEnd={() => {
                    if (longPressTimerRef.current) window.clearTimeout(longPressTimerRef.current);
                  }}
                  onTouchCancel={() => {
                    if (longPressTimerRef.current) window.clearTimeout(longPressTimerRef.current);
                  }}
                >
                  {msg.sender !== 'me' && (
                    <div className="w-8 h-8 rounded-full bg-gray-300 overflow-hidden shrink-0 mt-1 shadow-sm">
                      <img src={msg.avatar || `https://ui-avatars.com/api/?name=${msg.sender}&background=random`} alt={msg.sender} className="w-full h-full object-cover" />
                    </div>
                  )}
                  <div className={`flex flex-col min-w-0 ${msg.sender === 'me' ? 'items-end' : 'w-full'}`}>
                    {msg.sender !== 'me' && (
                      <span className="text-[11px] text-gray-500 dark:text-gray-400 ml-1 mb-1 font-medium">{msg.sender}</span>
                    )}
                    {actionMenuMsgId === String(msg.id) && msg.sender !== 'system' && (
                      <div className="mb-1 inline-flex items-center gap-1 rounded-full border border-gray-200 dark:border-white/15 bg-white/95 dark:bg-[#26262b] shadow-sm px-1.5 py-1 w-fit">
                        <button onClick={() => applyReaction(String(msg.id), 'heart')} className="text-[14px] leading-none px-1">❤️</button>
                        <button onClick={() => applyReaction(String(msg.id), 'up')} className="text-[14px] leading-none px-1">👍</button>
                        <button onClick={() => applyReaction(String(msg.id), 'down')} className="text-[14px] leading-none px-1">👎</button>
                        <button
                          onClick={() => {
                            setReplyTarget({ id: msg.id, sender: msg.sender, content: msg.content });
                            setActionMenuMsgId(null);
                          }}
                          className="text-[11px] px-2 py-0.5 rounded-full border border-gray-200 dark:border-white/15 text-gray-600 dark:text-white/80 bg-gray-50 dark:bg-white/5"
                        >
                          Quote
                        </button>
                        {isManagedGroup && (groupRole === 'owner' || groupRole === 'admin') && (
                          <button
                            onClick={async () => {
                              if (!managedGroupId) return;
                              await groupsApi.pinMessage(managedGroupId, {
                                message_id: String(msg.id),
                                title: msg.sender === 'me' ? '我的置顶消息' : `来自 ${msg.sender} 的消息`,
                                content: String(msg.content || '').slice(0, 240),
                                sender: msg.sender,
                                time: msg.time,
                              });
                              setGroupPinned({
                                message_id: String(msg.id),
                                title: msg.sender === 'me' ? '我的置顶消息' : `来自 ${msg.sender} 的消息`,
                                content: String(msg.content || '').slice(0, 240),
                                sender: msg.sender,
                                time: msg.time,
                              });
                              setShowPinned(true);
                              setActionMenuMsgId(null);
                            }}
                            className="text-[11px] px-2 py-0.5 rounded-full border border-blue-200 text-blue-600 bg-blue-50/70 dark:bg-blue-500/10"
                          >
                            Pin
                          </button>
                        )}
                      </div>
                    )}
                    {(() => {
                      const cleanText = normalizeButlerText(t(String(msg.content ?? '')));
                      if (!cleanText.trim()) return null;
                      return (
                        <div className={`relative inline-block w-fit max-w-full px-3 py-2 rounded-2xl shadow-sm text-[15px] leading-relaxed break-words whitespace-pre-wrap overflow-hidden ${
                          msg.sender === 'me'
                            ? 'bg-[var(--wa-bubble-out)] text-gray-800 dark:text-white rounded-tr-none border border-[#FFD9CD] dark:border-white/5'
                            : 'bg-[var(--wa-bubble-in)] text-gray-800 dark:text-white rounded-tl-none border border-gray-100 dark:border-white/5'
                        }`}>
                          {!!msg.reply_to && (
                            <div className="mb-1 text-[11px] px-2 py-1 rounded-lg bg-black/5 dark:bg-white/10 text-gray-600 dark:text-white/80 border border-black/5 dark:border-white/10">
                              回复 {msg.reply_to.sender}: {String(msg.reply_to.content || '').slice(0, 60)}
                            </div>
                          )}
                          {msg.sender === 'me' ? cleanText : <TypingText text={cleanText} speedMs={12} />}
                          <div className={`text-[9px] text-right mt-1 font-medium ${msg.sender === 'me' ? 'text-orange-800/60 dark:text-white/40' : 'text-gray-400 dark:text-gray-500'}`}>
                            {msg.time}
                            {msg.sender === 'me' && (
                              <span className="inline-flex items-center ml-1">
                                {msg.status === 'read' ? <CheckCheck className="w-3 h-3" /> : msg.status === 'delivered' ? <CheckCheck className="w-3 h-3 opacity-70" /> : <Check className="w-3 h-3 opacity-70" />}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })()}
                    {!!reactionEmoji(msg.reaction) && (
                      <div className="mt-1 text-[13px] leading-none">{reactionEmoji(msg.reaction)}</div>
                    )}
                    {(() => {
                      const productGrid = msg.attachments?.find((a: any) => a?.type === '0B_CARD_V3' && a?.component === '0B_PRODUCT_GRID');
                      const mediaGrid = msg.attachments?.find((a: any) => a?.type === '0B_CARD_V3' && a?.component === '0B_MEDIA_GRID');
                      const promoActions = msg.attachments?.find((a: any) => a?.type === '0B_CARD_V3' && a?.component === '0B_PROMO_ACTIONS');
                      const linkText = msg.attachments?.find((a: any) => a?.type === '0B_CARD_V3' && a?.component === '0B_LINK_TEXT');
                      if (!productGrid && !mediaGrid && !promoActions && !linkText) return null;
                      return (
                        <div className="mt-2 w-full max-w-full overflow-hidden">
                          {productGrid ? <ProductGridCard data={productGrid.data} /> : null}
                          {mediaGrid ? <MediaGridCard data={mediaGrid.data} /> : null}
                          {promoActions ? <PromoActionCard data={promoActions.data} /> : null}
                          {linkText ? <LinkTextCard data={linkText.data} /> : null}
                          {productGrid && isButlerChat && !recommendationActionsHidden && (
                            <div className="mt-2 flex items-center gap-2 justify-end">
                              <button
                                onClick={() => handleSkipOnce(String(msg.id))}
                                className="text-[11px] px-2.5 py-1 rounded-full border border-gray-200 dark:border-white/15 text-gray-500 dark:text-white/70 bg-white/80 dark:bg-white/5 hover:bg-gray-50 dark:hover:bg-white/10 transition-colors"
                              >
                                忽略本次
                              </button>
                              <button
                                onClick={handleDisableRecommendations}
                                className="text-[11px] px-2.5 py-1 rounded-full border border-gray-200 dark:border-white/15 text-gray-500 dark:text-white/70 bg-white/80 dark:bg-white/5 hover:bg-gray-50 dark:hover:bg-white/10 transition-colors"
                              >
                                以后闭嘴
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}
            </div>
          ))}
          {showWelcomePanel && (
            <div className="flex justify-start">
              <div className="max-w-[88%] rounded-3xl p-4 bg-[var(--wa-bubble-out)] text-gray-800 dark:text-white border border-[#FFD9CD] dark:border-white/10">
                <div className="text-[15px] leading-relaxed">
                  {welcomeParagraphs.map((p, idx) => (
                    <p key={idx} className={idx === 0 ? 'mb-2' : idx === welcomeParagraphs.length - 1 ? '' : 'mb-2'}>
                      {p}
                    </p>
                  ))}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button onClick={() => handleSend(t('chat.butler_quick_relax_prompt'))} className="text-[12px] px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/15 border border-white/15">
                    {t('chat.butler_quick_relax')}
                  </button>
                  <button onClick={() => handleSend(t('chat.butler_quick_surprise_prompt'))} className="text-[12px] px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/15 border border-white/15">
                    {t('chat.butler_quick_surprise')}
                  </button>
                  <button onClick={() => handleSend(t('chat.butler_quick_mood_prompt'))} className="text-[12px] px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/15 border border-white/15">
                    {t('chat.butler_quick_mood')}
                  </button>
                </div>
              </div>
            </div>
          )}
          {isAiTyping && shouldUseButlerBackend(activeChat) && (
            <div className="flex justify-start">
              <div className="flex gap-2 max-w-[85%]">
                <div className="w-8 h-8 rounded-full bg-gray-300 overflow-hidden shrink-0 mt-1 shadow-sm animate-pulse [animation-duration:2.2s]">
                  <img src={activeChat?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(chatDisplayName || 'AI')}&background=random`} alt={chatDisplayName || 'AI'} className="w-full h-full object-cover" />
                </div>
                <div className="relative px-3 py-2 rounded-2xl rounded-tl-none border border-white/10 shadow-sm text-[14px] text-white bg-[linear-gradient(160deg,rgba(56,56,58,0.95)_0%,rgba(28,28,30,0.96)_55%,rgba(20,20,22,0.98)_100%)]">
                  <TypingText text={t('ai.thinking')} speedMs={24} />
                </div>
              </div>
            </div>
          )}
          {peerTyping && !isButlerChat && (
            <div className="flex justify-start">
              <div className="flex gap-2 max-w-[70%]">
                <div className="w-8 h-8 rounded-full bg-gray-300 overflow-hidden shrink-0 mt-1 shadow-sm" />
                <div className="relative px-3 py-2 rounded-2xl rounded-tl-none border border-white/10 shadow-sm text-[13px] text-gray-700 dark:text-white bg-white/90 dark:bg-[#1f1f22]">
                  对方正在输入...
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Input Area */}
      <div ref={containerRef} className="bg-white/90 dark:bg-[#1c1c1e]/95 backdrop-blur-2xl flex flex-col border-t border-gray-100 dark:border-white/5 shrink-0 pb-8">
        {isManagedGroup && !groupCanSpeak && (
          <div className="px-4 pt-2">
            <div className="rounded-xl border border-amber-200 bg-amber-50 text-amber-700 px-3 py-2 text-[12px]">
              {groupMuteHint || '当前无法发言'}
            </div>
          </div>
        )}
        {replyTarget && (
          <div className="px-4 pt-2">
            <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 px-3 py-2 text-[12px] text-gray-700 dark:text-white/80 flex items-center justify-between gap-2">
              <span className="truncate">引用 {replyTarget.sender}: {String(replyTarget.content || '').slice(0, 80)}</span>
              <button onClick={() => setReplyTarget(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-white">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
        <div className="p-3 flex items-center gap-2">
          <div className="flex items-center gap-1">
            <button 
              onClick={() => setShowPocket(!showPocket)}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-transform active:scale-90"
            >
              {showPocket ? <X className="w-6 h-6 text-[var(--wa-teal)]" /> : <Plus className="w-6 h-6" />}
            </button>
          </div>
          
          <div className="flex-1 bg-gray-100/50 dark:bg-black/40 rounded-[24px] flex items-center px-4 py-2.5 border border-transparent focus-within:border-[var(--wa-teal)] transition-all">
            <input 
              type="text" 
              value={inputValue}
              onChange={(e) => emitTypingSignal(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder={t('chat.input_placeholder')} 
              className="flex-1 bg-transparent border-none outline-none text-[15px] text-gray-800 dark:text-white placeholder:text-gray-400"
            />
            <button className="ml-2 text-gray-400 hover:text-[var(--wa-teal)] transition-colors">
              <Smile className="w-5 h-5" />
            </button>
          </div>

          <button 
            onClick={() => handleSend()}
            className={`w-11 h-11 rounded-full flex items-center justify-center transition-all active:scale-90 shadow-md shrink-0 ${
              inputValue.trim()
                ? 'text-white'
                : 'bg-gray-100 dark:bg-white/5 text-gray-400'
            }`}
            style={inputValue.trim() ? { background: 'linear-gradient(135deg, #FF7A3D 0%, #E8450A 100%)' } : {}}
          >
            {inputValue.trim() ? <Send className="w-5 h-5 ml-0.5" /> : <Mic className="w-5 h-5" />}
          </button>
        </div>

        {/* Magic Pocket Drawer */}
        <div className={`overflow-hidden transition-all duration-300 ease-in-out ${showPocket ? 'max-h-64 opacity-100' : 'max-h-0 opacity-0'}`}>
          <MagicPocketMenu isOpen={showPocket} onAction={handlePocketAction} />
        </div>
        <input
          ref={photoInputRef}
          type="file"
          accept="image/*"
          multiple={!isButlerChat}
          className="hidden"
          onChange={(e) => {
            handlePickMedia(e.target.files);
            e.currentTarget.value = '';
          }}
        />
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          multiple={!isButlerChat}
          className="hidden"
          onChange={(e) => {
            handlePickMedia(e.target.files);
            e.currentTarget.value = '';
          }}
        />
      </div>
    </div>
  );
};
