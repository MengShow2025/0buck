import React, { useState, useRef, useEffect } from 'react';
import { Plus, Send, X } from 'lucide-react';
import { MagicPocketMenu } from './MagicPocketMenu';
import { useAppContext } from './AppContext';
import BongoCat from './BongoCat';
import { imApi } from '../../services/api';

interface VCCInputProps {
  onSendMessage: (text: string) => void;
  onSendRichMessage?: (payload: { text: string; attachments: any[]; aiHint?: string }) => void;
  isTyping?: boolean;
  uploadMode?: 'ai' | 'social';
}

export const VCCInput: React.FC<VCCInputProps> = ({ onSendMessage, onSendRichMessage, isTyping, uploadMode = 'social' }) => {
  const { t, user } = useAppContext();
  const [text, setText] = useState('');
  const [showPocket, setShowPocket] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const typingName = String(user?.butler_name || t('lounge.ai_butler')).trim() || 'AI Butler';

  // Close pocket when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowPocket(false);
      }
    };

    if (showPocket) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showPocket]);

  const quickReplies = [
    { key: 'ai.quick_reply.check_in', text: t('ai.quick_reply.check_in') },
    { key: 'ai.quick_reply.jpy', text: t('ai.quick_reply.jpy') },
    { key: 'ai.quick_reply.auto_currency', text: t('ai.quick_reply.auto_currency') },
    { key: 'ai.quick_reply.notify_off', text: t('ai.quick_reply.notify_off') },
    { key: 'ai.quick_reply.dark_mode', text: t('ai.quick_reply.dark_mode') },
  ];

  const handleSend = (_evt?: React.MouseEvent | React.KeyboardEvent) => {
    const content = String(text ?? '').trim();
    if (content) {
      onSendMessage(content);
      setText('');
      setShowPocket(false);
    }
  };

  const maxBundleCount = uploadMode === 'ai' ? 1 : 9;

  const filesToMediaItems = async (files: File[]) => {
    const toDataUrl = (file: File) =>
      new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.readAsDataURL(file);
      });
    const limited = files.slice(0, maxBundleCount);
    const urls = await Promise.all(limited.map((f) => toDataUrl(f)));
    return limited.map((f, i) => ({ id: `${Date.now()}-${i}`, url: urls[i], thumb: urls[i], name: f.name }));
  };

  const handlePickMedia = async (fileList: FileList | null) => {
    const files = Array.from(fileList || []).filter((f) => f.type.startsWith('image/')).slice(0, maxBundleCount);
    if (!files.length) return;
    const items = await filesToMediaItems(files);
    const payload = {
      text: files.length > 1 ? `已发送 ${files.length} 张图片，请根据图片帮我找相似商品。` : '已发送 1 张图片，请根据图片帮我找相似商品。',
      aiHint:
        uploadMode === 'ai'
          ? `用户上传了图片文件：${files.map((f) => f.name).join(', ')}。\n你当前无法直接读取像素时，不要回复“看不到图片”。请基于文件名关键词与用户意图直接给出可执行搜物候选（3条）与下一步。`
          : undefined,
      attachments: [{ type: '0B_CARD_V3', component: '0B_MEDIA_GRID', data: { items, count: items.length } }],
    };
    if (onSendRichMessage) onSendRichMessage(payload);
    else onSendMessage(payload.text);
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
    ).slice(0, maxBundleCount);
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
        image: `https://picsum.photos/seed/home-shared-${i}/500/500`,
        supplier: host,
        rating: 4.8,
        sales: 0,
        share_link: link,
        entity_type: cls,
      };
    });
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
      const raw = window.prompt(uploadMode === 'ai' ? '粘贴1个外部链接（YouTube/TikTok/电商链接）用于搜物' : '粘贴商品/商家分享链接，支持最多9个（空格、逗号或换行分隔）') || '';
      const links = parseLinks(raw);
      if (!links.length) return;
      const internalLinks = links.filter(is0buckLink);
      const externalLinks = links.filter((l) => !is0buckLink(l));

      // AI mode: keep text search intent for external links.
      if (uploadMode === 'ai') {
        const payload = {
          text: `已分享 ${links.length} 个外部链接，请帮我提炼关键词并搜相似好物`,
          aiHint: `用户分享外链：${links.join(' , ')}。请提炼可购关键词并给3个候选。`,
          attachments: [],
        };
        if (onSendRichMessage) onSendRichMessage(payload);
        else onSendMessage(payload.text);
        setShowPocket(false);
        return;
      }

      const attachments: any[] = [];
      if (internalLinks.length) {
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
                    image: first.image || `https://picsum.photos/seed/promo-${promoAsProducts.length}/500/500`,
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
                    action_type: 'promo',
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
                action_type: 'promo',
              });
            }
          }
          if (promoAsProducts.length) {
            attachments.push({
              type: '0B_CARD_V3',
              component: '0B_PRODUCT_GRID',
              data: { products: promoAsProducts },
            });
          }
          if (actionCards.length) {
            attachments.push({
              type: '0B_CARD_V3',
              component: '0B_PROMO_ACTIONS',
              data: { actions: actionCards },
            });
          }
        }
      }

      const payload = {
        text: externalLinks.length
          ? `已分享 ${internalLinks.length} 个0Buck链接并附 ${externalLinks.length} 个外部链接（外链按超链接展示）`
          : `已分享 ${internalLinks.length} 个0Buck商品/商家链接`,
        attachments: attachments.length
          ? attachments
          : [{ type: '0B_CARD_V3', component: '0B_LINK_TEXT', data: { links: externalLinks } }],
      };
      if (onSendRichMessage) onSendRichMessage(payload);
      else onSendMessage(payload.text);
      setShowPocket(false);
    }
  };

  return (
    <div className="flex flex-col w-full bg-transparent pb-4 z-20 transition-all border-t-0" ref={containerRef}>
      
      {/* Floating Quick Replies (Capsules) & Typing Indicator */}
      <div className="flex flex-col gap-2 overflow-x-auto px-4 py-3 scrollbar-hide no-scrollbar w-full">
        {/* Typing Indicator */}
        {isTyping && (
          <div className="flex items-center gap-2 px-1 text-xs text-[var(--wa-teal)] italic">
            <div className="w-6 h-6 flex-shrink-0">
              <BongoCat isTyping={true} />
            </div>
            <div className="flex">
              {typingName} is typing
              <span className="w-12 text-left">
                <span className="animate-[ping_1.5s_infinite_0ms] inline-block">.</span>
                <span className="animate-[ping_1.5s_infinite_150ms] inline-block">.</span>
                <span className="animate-[ping_1.5s_infinite_300ms] inline-block">.</span>
                <span className="animate-[ping_1.5s_infinite_450ms] inline-block">.</span>
                <span className="animate-[ping_1.5s_infinite_600ms] inline-block">.</span>
                <span className="animate-[ping_1.5s_infinite_750ms] inline-block">.</span>
              </span>
            </div>
          </div>
        )}
        
        {/* Quick Replies */}
        <div className="flex gap-2">
          {quickReplies.map(reply => (
            <button 
              key={reply.key}
              onClick={() => onSendMessage(reply.text)}
              className="whitespace-nowrap px-3.5 py-1.5 bg-white dark:bg-[#1C1C1E] border border-black/8 dark:border-white/8 rounded-full text-[var(--wa-teal)] text-[13px] font-medium shadow-sm active:opacity-70 flex-shrink-0 transition-all active:scale-95"
            >
              {reply.text}
            </button>
          ))}
        </div>
      </div>

      {/* Main WhatsApp-style Input Bar */}
      <div className="flex items-center gap-2 px-3 pb-2">
        <button 
          onClick={() => setShowPocket(!showPocket)} 
          className="p-2 text-gray-500 dark:text-gray-400 transition-transform active:scale-90"
        >
          {showPocket ? <X className="w-7 h-7 text-[var(--wa-teal)]" /> : <Plus className="w-7 h-7" />}
        </button>
        
        <div className="flex-1 bg-white dark:bg-[#1C1C1E] rounded-2xl border border-black/8 dark:border-white/8 px-4 py-2.5 flex items-center shadow-sm">
          <input 
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend(e)}
            placeholder={t('ai.input_placeholder')}
            className="w-full outline-none text-gray-800 dark:text-white bg-transparent text-[15px] placeholder:text-gray-400 dark:placeholder:text-gray-500"
          />
        </div>
        
        <button 
          onClick={(e) => handleSend(e)}
          className={`w-11 h-11 rounded-full flex items-center justify-center shadow-md transition-all active:scale-90 shrink-0 ${
            text.trim() ? 'bg-[var(--wa-teal)] text-white' : 'bg-gray-200 dark:bg-white/10 text-gray-400'
          }`}
          disabled={!text.trim()}
        >
          <Send className="w-5 h-5 ml-1" />
        </button>
      </div>

      {/* Magic Pocket Drawer (WeChat Extensions) */}
      <div className={`overflow-hidden transition-all duration-300 ease-in-out ${showPocket ? 'max-h-64 opacity-100' : 'max-h-0 opacity-0'}`}>
        <MagicPocketMenu isOpen={showPocket} onAction={handlePocketAction} />
      </div>
      <input
        ref={photoInputRef}
        type="file"
        accept="image/*"
        multiple={maxBundleCount > 1}
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
        multiple={maxBundleCount > 1}
        className="hidden"
        onChange={(e) => {
          handlePickMedia(e.target.files);
          e.currentTarget.value = '';
        }}
      />
      
    </div>
  );
};
