import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { VortexContainer } from './components/VCC/VortexContainer';
import { VCCInput } from './components/VCC/VCCInput';
import { CustomMessageUI } from './components/VCC/CustomMessageUI';
import { GlobalDrawer } from './components/VCC/Drawer/GlobalDrawer';
import { SplashScreen } from './components/VCC/SplashScreen';
import { useAppContext } from './components/VCC/AppContext';
import ArchitectureDiagram from './components/VCC/VisualCompanion';
import { DesktopLayout } from './components/VCC/Desktop/DesktopLayout';
import { aiApi } from './services/api';

import { Routes, Route, Navigate } from 'react-router-dom';
import { AdminLayout } from './components/Admin/Layout/AdminLayout';
import { AdminLoginPage } from './components/Admin/Pages/AdminLoginPage';

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(() => window.innerWidth >= 1024);
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return isDesktop;
}

interface Message {
  id: string;
  text: string;
  created_at: string;
  attachments: any[];
  user: { id: string };
}

// Keep homepage chat clean on first open; recommendations should appear only when backend attaches product cards.
const initialMessages: Message[] = [];

function MainApp() {
  const { 
    activeDrawer, setActiveDrawer, t, setOnPaymentSuccess, 
    hasCheckedInToday, setHasCheckedInToday,
    userBalance, setUserBalance,
    userPoints, setUserPoints,
    isPrime, setIsPrime,
    isInfluencer, setIsInfluencer,
    isAuthenticated,
    orders, pushDrawer,
    setWithdrawalMethod,
    setTheme, setLanguage, setCurrency
  } = useAppContext();

  const initialMessagesWithTranslations = useMemo(() => {
    if (typeof t !== 'function') return []; // Return empty array during initialization to prevent undefined errors
    return initialMessages.map(m => ({
      ...m,
      text: m.text ? (m.text.includes('.') ? t(m.text) : m.text) : ''
    }));
  }, [t]);

  const [messages, setMessages] = useState<Message[]>([]);
  
  useEffect(() => {
    setMessages(initialMessagesWithTranslations);
  }, [initialMessagesWithTranslations]);
  const [showSplash, setShowSplash] = useState(() => {
    if (typeof window === 'undefined') return true;
    return !(
      window.sessionStorage.getItem('recent_oauth_login') === '1' ||
      Boolean(window.localStorage.getItem('access_token'))
    );
  });
  const [isAiTyping, setIsAiTyping] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      setShowSplash(false);
      window.sessionStorage.removeItem('recent_oauth_login');
    }
  }, [isAuthenticated]);

  useEffect(() => {
    // Handle OAuth success redirect
    const params = new URLSearchParams(window.location.search);
    if (params.get('auth_success') === 'true') {
      const accessToken = params.get('access_token');
      if (accessToken) {
        localStorage.setItem('access_token', accessToken);
      }
      // Always dispatch OAuth success event.
      // Even when access_token is absent from URL, backend cookie-based auth may still be valid.
      window.dispatchEvent(new Event('oauth-login-success'));
      
      params.delete('auth_success');
      params.delete('access_token');
      params.delete('email'); // Optional: cleanup email parameter
      const newSearch = params.toString();
      const newUrl = window.location.pathname + (newSearch ? `?${newSearch}` : '');
      window.history.replaceState({}, document.title, newUrl);
      
      // Close the auth drawer if it's open
      setActiveDrawer('none');
      
      // Optionally add a welcome message from the AI Butler to confirm login
      setTimeout(() => {
        const welcomeMsg: Message = {
          id: `ai-login-success-${Date.now()}`,
          text: typeof t === 'function' ? t('auth.login_success_welcome') || 'Welcome back! You have successfully logged in.' : 'Welcome back! You have successfully logged in.',
          created_at: new Date().toISOString(),
          user: { id: 'dumbo' },
          attachments: []
        };
        setMessages(prev => [...prev, welcomeMsg]);
      }, 1000);
    }
  }, [t, setActiveDrawer]);

  useEffect(() => {
    setOnPaymentSuccess(() => (orderId: string) => {
      const aiMsg = {
        id: `ai-success-${Date.now()}`,
        text: typeof t === 'function' ? t('ai.resp.payment_success').replace('{orderId}', orderId) : `Payment successful for ${orderId}`,
        created_at: new Date().toISOString(),
        user: { id: 'dumbo' },
        attachments: [
          {
            type: '0B_CARD_V3',
            component: '0B_CASHBACK_RADAR',
            data: {
              current_phase: 0,
              total_phases: 20,
              amount_returned: 0,
              amount_total: 29.99,
              status: 'pending',
              orderId: orderId
            }
          }
        ]
      };
      setMessages(prev => [...prev, aiMsg]);
    });
  }, [setOnPaymentSuccess, t]);

  useEffect(() => {
    // Sync initial messages when language changes
    if (typeof t !== 'function') return;
    setMessages(prev => {
      // Only update messages that are actually translation keys from initialMessages
      const initialIds = initialMessages.map(m => m.id);
      return prev.map(m => {
        if (initialIds.includes(m.id)) {
          const original = initialMessages.find(om => om.id === m.id);
          return { ...m, text: original?.text ? (original.text.includes('.') ? t(original.text) : original.text) : m.text };
        }
        return m;
      });
    });
  }, [t]);

  useEffect(() => {
    // Listen for custom event from Splash Screen
    const handleOpenAuth = () => {
      setActiveDrawer('auth');
    };
    
    window.addEventListener('open-auth-drawer', handleOpenAuth);
    return () => window.removeEventListener('open-auth-drawer', handleOpenAuth);
  }, [setActiveDrawer]);

  const handleSystemAction = useCallback((action: string, payload: any) => {
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
        setTheme(payload.value);
        break;
      case 'SET_LANGUAGE':
        if (typeof payload?.value === 'string' && allowedLanguages.has(payload.value)) {
          setLanguage(payload.value);
        }
        break;
      case 'SET_CURRENCY':
        setCurrency(payload.value);
        break;
      case 'NAVIGATE':
        if (allowedDrawers.has(normalizedDrawer)) {
          pushDrawer(normalizedDrawer as any);
        }
        break;
      case 'OPEN_DRAWER':
        if (allowedDrawers.has(normalizedDrawer)) {
          pushDrawer(normalizedDrawer as any);
        }
        break;
      case 'OPEN_SHARE_MENU':
      case 'OPEN_PROMO_SHARE':
      case 'OPEN_PROMOTION_SHARE':
        pushDrawer('share_menu');
        break;
      case 'UPDATE_WITHDRAWAL':
        setWithdrawalMethod(payload.value);
        break;
      case 'PERFORM_CHECKIN':
        setHasCheckedInToday(true);
        break;
    }
  }, [setTheme, setLanguage, setCurrency, pushDrawer, setWithdrawalMethod, setHasCheckedInToday]);

  const handleSendMessage = async (text: string) => {
    if (!text.trim()) return;

    const userMsg: Message = {
      id: `msg-${Date.now()}`,
      text,
      created_at: new Date().toISOString(),
      attachments: [],
      user: { id: 'user' }
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsAiTyping(true);

    try {
      const response = await aiApi.chat(text, {
        current_drawer: activeDrawer,
        user_points: userPoints,
        has_checked_in: hasCheckedInToday,
      });

      const aiData = response.data;
      
      // Handle both Minimax-compatible format (choices[0].message.content) and direct format (content)
      let aiContent = '';
      if (aiData.choices && aiData.choices.length > 0 && aiData.choices[0].message) {
        aiContent = aiData.choices[0].message.content;
      } else {
        aiContent = aiData.content;
      }
      
      const aiMsg: Message = {
        id: aiData.id || `ai-${Date.now()}`,
        text: aiContent || t('ai.resp.default'),
        created_at: aiData.timestamp || new Date().toISOString(),
        user: { id: 'dumbo' },
        attachments: aiData.attachments || [] 
      };

      setMessages(prev => [...prev, aiMsg]);

      // Process automatic BAP actions from backend
      if (aiMsg.attachments) {
        aiMsg.attachments.forEach((attachment: any) => {
          if (attachment.type === '0B_SYSTEM_ACTION' && !attachment.requires_confirmation) {
            handleSystemAction(attachment.action, attachment.payload);
          }
        });
      }
    } catch (error) {
      console.error('AI Chat Error:', error);
      const lower = text.toLowerCase();
      const fallback =
        /check[-\s]?in|签到/.test(lower)
          ? t('ai.resp.check_in')
          : /address|地址/.test(lower)
            ? t('ai.resp.address')
            : /wallet|余额|withdraw|提现/.test(lower)
              ? t('ai.resp.payment_success')
              : t('ai.resp.default');
      const errorMsg: Message = {
        id: `err-${Date.now()}`,
        text: `${fallback}\n\n(offline fallback: ${error instanceof Error ? error.message : String(error)})`,
        created_at: new Date().toISOString(),
        user: { id: 'dumbo' },
        attachments: []
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsAiTyping(false);
    }
  };

  const handleSendRichMessage = async (payload: { text: string; attachments: any[]; aiHint?: string }) => {
    const text = String(payload?.text || '').trim();
    if (!text && (!payload?.attachments || payload.attachments.length === 0)) return;

    const userMsg: Message = {
      id: `msg-${Date.now()}`,
      text,
      created_at: new Date().toISOString(),
      attachments: payload.attachments || [],
      user: { id: 'user' },
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsAiTyping(true);

    try {
      const mediaItems = (payload?.attachments || [])
        .filter((a: any) => a?.type === '0B_CARD_V3' && a?.component === '0B_MEDIA_GRID')
        .flatMap((a: any) => (a?.data?.items || []).map((i: any) => ({ url: i?.url, name: i?.name })))
        .slice(0, 1);
      const aiInput = [text || '请根据我发送的内容推荐商品', payload?.aiHint || ''].filter(Boolean).join('\n\n');
      const response = await aiApi.chat(aiInput, {
        current_drawer: activeDrawer,
        user_points: userPoints,
        has_checked_in: hasCheckedInToday,
        media_items: mediaItems,
      });

      const aiData = response.data;
      const aiContent =
        (aiData?.choices && aiData.choices.length > 0 && aiData.choices[0]?.message
          ? aiData.choices[0].message.content
          : aiData?.content) || t('ai.resp.default');

      const aiMsg: Message = {
        id: aiData?.id || `ai-${Date.now()}`,
        text: aiContent,
        created_at: aiData?.timestamp || new Date().toISOString(),
        user: { id: 'dumbo' },
        attachments: aiData?.attachments || [],
      };
      setMessages((prev) => [...prev, aiMsg]);
      aiMsg.attachments?.forEach((attachment: any) => {
        if (attachment.type === '0B_SYSTEM_ACTION' && !attachment.requires_confirmation) {
          handleSystemAction(attachment.action, attachment.payload);
        }
      });
    } catch (error) {
      const errorMsg: Message = {
        id: `err-${Date.now()}`,
        text: `${t('ai.resp.default')}\n\n(offline fallback: ${error instanceof Error ? error.message : String(error)})`,
        created_at: new Date().toISOString(),
        user: { id: 'dumbo' },
        attachments: [],
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsAiTyping(false);
    }
  };

  const isDesktop = useIsDesktop();
  const hasUserMessage = messages.some((m) => m.user.id === 'user');
  const hasAuthSuccessMessage = messages.some((m) => m.id.startsWith('ai-login-success'));
  const showButlerWelcome = !hasUserMessage && !isAiTyping && !hasAuthSuccessMessage;
  const welcomeRaw = t('chat.butler_welcome_shadow') || '';
  const welcomeNormalized = String(welcomeRaw).replace(/^"(.*)"$/s, '$1').replace(/\\n/g, '\n');
  const welcomeParagraphs = welcomeNormalized.split(/\n\s*\n/).filter(Boolean);

  const mobileContent = (
    <div className="flex flex-col h-full w-full bg-[var(--wa-bg)] relative overflow-hidden text-[15px] transition-colors duration-300 transform-gpu">
      {/* Global App Background Pattern */}
      <div
        className="absolute inset-0 z-0 pointer-events-none opacity-[0.025] dark:opacity-[0.04]"
        style={{
          backgroundImage: `radial-gradient(circle, #E8450A 1px, transparent 1px)`,
          backgroundSize: '28px 28px',
          backgroundRepeat: 'repeat',
        }}
      />
      
      <div className="relative z-10 flex flex-col h-full w-full">
        <VortexContainer>
          <div className="flex flex-col gap-2 pb-4">
            {showButlerWelcome && (
              <div className="px-1">
                <div className="max-w-[88%] rounded-3xl p-4 bg-[var(--wa-bubble-out)] text-gray-800 dark:text-white border border-[#FFD9CD] dark:border-white/10">
                  <div className="text-[15px] leading-relaxed">
                    {welcomeParagraphs.map((p, idx) => (
                      <p key={idx} className={idx === 0 ? 'mb-2' : idx === welcomeParagraphs.length - 1 ? '' : 'mb-2'}>
                        {p}
                      </p>
                    ))}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      onClick={() => handleSendMessage(t('chat.butler_quick_relax_prompt'))}
                      className="text-[12px] px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/15 border border-white/15"
                    >
                      {t('chat.butler_quick_relax')}
                    </button>
                    <button
                      onClick={() => handleSendMessage(t('chat.butler_quick_surprise_prompt'))}
                      className="text-[12px] px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/15 border border-white/15"
                    >
                      {t('chat.butler_quick_surprise')}
                    </button>
                    <button
                      onClick={() => handleSendMessage(t('chat.butler_quick_mood_prompt'))}
                      className="text-[12px] px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/15 border border-white/15"
                    >
                      {t('chat.butler_quick_mood')}
                    </button>
                  </div>
                </div>
              </div>
            )}
            {messages.map((msg) => (
              <CustomMessageUI 
                key={msg.id} 
                message={msg} 
                isMyMessage={() => msg.user.id === 'user'} 
              />
            ))}
          </div>
        </VortexContainer>

        {/* Fixed positioned input at the bottom */}
        <div className="w-full bg-transparent pt-2 z-20">
          <VCCInput onSendMessage={handleSendMessage} onSendRichMessage={handleSendRichMessage} isTyping={isAiTyping} uploadMode="ai" />
        </div>
      </div>

      {/* Global Drawer Overlay */}
      <GlobalDrawer />
      
      {/* Splash Screen */}
      {showSplash && <SplashScreen onComplete={() => setShowSplash(false)} />}
    </div>
  );

  return (
    <>
      {isDesktop ? (
        <div className="flex h-screen w-full items-center justify-center bg-gradient-to-br from-[#110C05] via-black to-black py-2 sm:py-4 relative overflow-hidden">
          {/* Ambient Glow Effects */}
          <div className="absolute top-1/4 left-1/4 w-[40vw] h-[40vw] bg-orange-600/10 rounded-full blur-[120px] mix-blend-screen pointer-events-none" />
          <div className="absolute bottom-1/4 right-1/4 w-[30vw] h-[30vw] bg-amber-600/10 rounded-full blur-[100px] mix-blend-screen pointer-events-none" />
          
          {/* Subtle Grid Pattern */}
          <div 
            className="absolute inset-0 z-0 pointer-events-none opacity-[0.03]"
            style={{
              backgroundImage: `linear-gradient(to right, #E8450A 1px, transparent 1px), linear-gradient(to bottom, #E8450A 1px, transparent 1px)`,
              backgroundSize: '4rem 4rem',
            }}
          />
          
          {/* Desktop Wrapper for Mobile UI - Stretches to top/bottom, keeps 9:19.5 smartphone ratio */}
          <div className="relative h-full aspect-[9/19.5] max-w-[480px] bg-white dark:bg-[#0A0A0B] rounded-[2.5rem] shadow-[0_0_80px_-15px_rgba(232,69,10,0.15)] border-[6px] border-[#1A1A1A] overflow-hidden ring-1 ring-white/10 transition-all duration-300 z-10 mx-auto">
            {mobileContent}
          </div>
        </div>
      ) : (
        <div className="h-screen w-full">
          {mobileContent}
        </div>
      )}
    </>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<MainApp />} />
      <Route path="/diagram" element={<ArchitectureDiagram />} />
      <Route path="/admin/login" element={<AdminLoginPage />} />
      <Route path="/admin/*" element={<AdminLayout />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
