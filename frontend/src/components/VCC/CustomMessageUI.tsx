import React, { useEffect, useRef, useState } from 'react';
import { ProductGridCard } from './BAPCards/ProductGridCard';
import { MediaGridCard } from './BAPCards/MediaGridCard';
import { PromoActionCard } from './BAPCards/PromoActionCard';
import { LinkTextCard } from './BAPCards/LinkTextCard';
import { CashbackRadarCard } from './BAPCards/CashbackRadarCard';
import { useAppContext } from './AppContext';
import { aiApi } from '../../services/api';
// import { MessageSimple } from 'stream-chat-react'; // Uncomment when stream is installed

interface CustomMessageUIProps {
  message: any; // Type with StreamChat MessageResponse
  isMyMessage: () => boolean;
}

export const CustomMessageUI: React.FC<CustomMessageUIProps> = (props) => {
  const { message, isMyMessage } = props;
  const [recommendationActionsHidden, setRecommendationActionsHidden] = useState(false);
  
  // To avoid crash if AppContext is not yet wrapped globally
  let themeSetter = (v: string) => {};
  let langSetter = (v: string) => {};
  let drawerSetter = (v: string) => {};
  let drawerPusher = (v: string) => {};
  let personaSetter = (v: string) => {};
  let notificationsSetter = (v: boolean) => {};
  let currencySetter = (v: string) => {};
  let memoryClearer = () => {};
  let checkInPerformer = (v: boolean) => {};
  let t = (key: string) => key;
  
  try {
    const { setTheme, setLanguage, setActiveDrawer, pushDrawer, setAiPersona, setAiMemoryTags, setNotifications, setCurrency, setHasCheckedInToday, t: tFromContext } = useAppContext() as any;
    themeSetter = setTheme;
    langSetter = setLanguage;
    drawerSetter = setActiveDrawer;
    drawerPusher = pushDrawer;
    personaSetter = setAiPersona;
    notificationsSetter = setNotifications;
    currencySetter = setCurrency;
    memoryClearer = () => setAiMemoryTags([]);
    checkInPerformer = setHasCheckedInToday;
    t = typeof tFromContext === 'function' ? tFromContext : t;
  } catch (e) {
    console.warn('AppContext not found, system actions disabled');
  }
  
  // 1. Check for AI System Actions
  const systemActions = message.attachments?.filter((a: any) => a.type === '0B_SYSTEM_ACTION') || [];
  const actionsExecuted = useRef<Set<string>>(new Set());
  const allowedLanguages = new Set(['en', 'zh', 'ja', 'ko', 'es', 'fr', 'de', 'ar']);
  const allowedDrawers = new Set([
    'orders', 'checkout', 'reward_history', 'address', 'settings', 'wallet',
    'share_menu', 'contacts', 'notification', 'cart', 'me', 'prime',
    'lounge', 'square', 'fans', 'checkin_hub', 'withdraw', 'vouchers', 'points_history',
    'points_exchange', 'security', 'personal_info', 'ai_persona', 'scan',
  ]);

  useEffect(() => {
    if (!isMyMessage()) {
      systemActions.forEach((systemAction: any, index: number) => {
        const actionKey = `${systemAction.action}-${systemAction.payload?.value || index}`;
        if (!actionsExecuted.current.has(actionKey)) {
          actionsExecuted.current.add(actionKey);
          
          const payloadValue = systemAction.payload?.value;
          const rawDrawer = String(payloadValue || '').trim().toLowerCase().replace(/-/g, '_').replace(/\s+/g, '_');
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
          if (systemAction.action === 'SET_THEME') {
            themeSetter(payloadValue);
          } else if (systemAction.action === 'SET_LANGUAGE') {
            if (typeof payloadValue === 'string' && allowedLanguages.has(payloadValue)) {
              langSetter(payloadValue);
            }
          } else if (systemAction.action === 'SET_CURRENCY') {
            currencySetter(payloadValue);
          } else if (systemAction.action === 'SET_NOTIFICATIONS') {
            notificationsSetter(payloadValue === 'true');
          } else if (systemAction.action === 'NAVIGATE') {
            if (allowedDrawers.has(normalizedDrawer)) {
              drawerPusher(normalizedDrawer);
            }
          } else if (systemAction.action === 'OPEN_DRAWER') {
            if (allowedDrawers.has(normalizedDrawer)) {
              drawerPusher(normalizedDrawer);
            }
          } else if (systemAction.action === 'SET_PERSONA') {
            personaSetter(payloadValue);
          } else if (systemAction.action === 'CLEAR_MEMORY') {
            memoryClearer();
          } else if (systemAction.action === 'PERFORM_CHECKIN') {
            checkInPerformer(true);
          }
        }
      });
    }
  }, [systemActions, themeSetter, langSetter, notificationsSetter, currencySetter, drawerPusher, personaSetter, memoryClearer, checkInPerformer, isMyMessage]);

  // 2. Intercept BAP Protocol Attachments
  // We check if the message has a specific 0Buck Attachment signature
  const bapAttachment = message.attachments?.find((a: any) => a.type === '0B_CARD_V3');
  const normalizeButlerText = (raw: any) => {
    let text = String(raw ?? '');
    text = text.replace(/^"(.*)"$/s, '$1').replace(/\\n/g, '\n');
    text = text.replace(/\*\*(.*?)\*\*/g, '$1');
    text = text.replace(/^#+\s*/gm, '');
    return text.trim();
  };

  if (bapAttachment) {
    if (bapAttachment.component === '0B_PRODUCT_GRID') {
      const handleSkipOnce = async () => {
        try {
          await aiApi.skipRecommendationOnce(String(message?.cid || message?.id || 'global'), 30);
          setRecommendationActionsHidden(true);
        } catch (_e) {
          // non-blocking UI action
        }
      };
      const handleDisableRecommendations = async () => {
        try {
          await aiApi.setRecommendationSettings(false);
          setRecommendationActionsHidden(true);
        } catch (_e) {
          // non-blocking UI action
        }
      };

      return (
        <div className={`flex w-full my-2 ${isMyMessage() ? 'justify-end' : 'justify-start'}`}>
          <div className="w-full max-w-[92%]">
            {!!String(message?.text || '').trim() && (
              <div className="mb-2 max-w-[80%] px-3 py-2 rounded-xl rounded-tl-none bg-[var(--wa-bubble-in)] text-gray-800 dark:text-white border border-gray-100 dark:border-white/5 text-[15px] leading-relaxed whitespace-pre-wrap">
                {normalizeButlerText(t(String(message.text)))}
              </div>
            )}
            <ProductGridCard data={bapAttachment.data} />
            {!isMyMessage() && !recommendationActionsHidden && (
              <div className="mt-2 flex items-center gap-2 justify-end">
                <button
                  onClick={handleSkipOnce}
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
        </div>
      );
    }
    if (bapAttachment.component === '0B_MEDIA_GRID') {
      return (
        <div className={`flex w-full my-2 ${isMyMessage() ? 'justify-end' : 'justify-start'}`}>
          <div className="w-full max-w-[92%]">
            {!!String(message?.text || '').trim() && (
              <div className="mb-2 max-w-[80%] px-3 py-2 rounded-xl rounded-tl-none bg-[var(--wa-bubble-in)] text-gray-800 dark:text-white border border-gray-100 dark:border-white/5 text-[15px] leading-relaxed whitespace-pre-wrap">
                {normalizeButlerText(t(String(message.text)))}
              </div>
            )}
            <MediaGridCard data={bapAttachment.data} />
          </div>
        </div>
      );
    }
    if (bapAttachment.component === '0B_PROMO_ACTIONS') {
      return (
        <div className={`flex w-full my-2 ${isMyMessage() ? 'justify-end' : 'justify-start'}`}>
          <div className="w-full max-w-[92%]">
            {!!String(message?.text || '').trim() && (
              <div className="mb-2 max-w-[80%] px-3 py-2 rounded-xl rounded-tl-none bg-[var(--wa-bubble-in)] text-gray-800 dark:text-white border border-gray-100 dark:border-white/5 text-[15px] leading-relaxed whitespace-pre-wrap">
                {normalizeButlerText(t(String(message.text)))}
              </div>
            )}
            <PromoActionCard data={bapAttachment.data} />
          </div>
        </div>
      );
    }
    if (bapAttachment.component === '0B_LINK_TEXT') {
      return (
        <div className={`flex w-full my-2 ${isMyMessage() ? 'justify-end' : 'justify-start'}`}>
          <div className="w-full max-w-[92%]">
            {!!String(message?.text || '').trim() && (
              <div className="mb-2 max-w-[80%] px-3 py-2 rounded-xl rounded-tl-none bg-[var(--wa-bubble-in)] text-gray-800 dark:text-white border border-gray-100 dark:border-white/5 text-[15px] leading-relaxed whitespace-pre-wrap">
                {normalizeButlerText(t(String(message.text)))}
              </div>
            )}
            <LinkTextCard data={bapAttachment.data} />
          </div>
        </div>
      );
    }
    if (bapAttachment.component === '0B_CASHBACK_RADAR') {
      return (
        <div className={`flex w-full my-2 ${isMyMessage() ? 'justify-end' : 'justify-start'}`}>
          <CashbackRadarCard {...bapAttachment.data} />
        </div>
      );
    }
  }

  // 3. Fallback to Standard WhatsApp-style Text Bubbles
  const timeString = new Date(message.created_at || Date.now()).toLocaleTimeString([], {
    hour: '2-digit', 
    minute:'2-digit'
  });

  return (
    <div className={`flex w-full my-1 ${isMyMessage() ? 'justify-end' : 'justify-start'}`}>
      <div 
        className={`max-w-[80%] px-3 py-2 rounded-xl text-[15px] relative break-words shadow-[0_1px_1px_rgba(0,0,0,0.1)] leading-relaxed ${
          isMyMessage() 
            ? 'bg-[var(--wa-bubble-out)] rounded-tr-none text-gray-800 dark:text-white border border-[#FFD9CD] dark:border-white/5' 
            : 'bg-[var(--wa-bubble-in)] rounded-tl-none text-gray-800 dark:text-white border border-gray-100 dark:border-white/5'
        }`}
      >
        <span className="whitespace-pre-wrap">{normalizeButlerText(t(String(message.text ?? '')))}</span>
        
        {/* Timestamp */}
        <span className={`text-[10px] ml-3 float-right mt-3 font-medium select-none ${
          isMyMessage() ? 'text-orange-800/60 dark:text-white/40' : 'text-gray-400 dark:text-gray-500'
        }`}>
          {timeString}
        </span>
      </div>
    </div>
  );
};
