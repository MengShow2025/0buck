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

// Mock data to preview the UI
const initialMessages: Message[] = [
  {
    id: 'msg-1',
    text: 'ai.resp.initial_dumbo',
    created_at: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    attachments: [],
    user: { id: 'dumbo' }
  },
  {
    id: 'msg-2',
    text: 'ai.resp.mock_user_tech',
    created_at: new Date(Date.now() - 1000 * 60 * 4).toISOString(),
    attachments: [],
    user: { id: 'user' }
  },
  {
    id: 'msg-3',
    text: 'ai.resp.show_products',
    created_at: new Date(Date.now() - 1000 * 60 * 3).toISOString(),
    attachments: [
      {
        type: '0B_CARD_V3',
        component: '0B_PRODUCT_GRID',
        data: {
          products: [
            {
              id: 'demo-1',
              name: 'Artisan Wireless Earbuds Pro',
              price: 29.99,
              image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&q=80',
              supplier: 'Nordic Audio Lab',
              rating: 4.9,
              sales: 3821
            },
            {
              id: 'demo-2',
              name: 'Titanium Minimalist Watch',
              price: 149.00,
              image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500&q=80',
              supplier: 'Swiss Craft Co.',
              rating: 4.8,
              sales: 1204
            },
            {
              id: 'demo-3',
              name: 'Premium Leather Messenger Bag',
              price: 89.00,
              image: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=500&q=80',
              supplier: 'Vega Leather Works',
              rating: 4.7,
              sales: 892
            },
            {
              id: 'demo-4',
              name: 'Mechanical Keyboard — Compact TKL',
              price: 119.00,
              image: 'https://images.unsplash.com/photo-1618384887929-16ec33fab9ef?w=500&q=80',
              supplier: 'MechLab Studio',
              rating: 4.9,
              sales: 2156
            },
            {
              id: 'demo-5',
              name: 'Ceramic Pour-Over Coffee Set',
              price: 54.99,
              image: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=500&q=80',
              supplier: 'Morning Ritual Co.',
              rating: 4.8,
              sales: 1587
            }
          ]
        }
      }
    ],
    user: { id: 'dumbo' }
  }
];

function MainApp() {
  const { 
    activeDrawer, setActiveDrawer, t, setOnPaymentSuccess, 
    hasCheckedInToday, setHasCheckedInToday,
    userBalance, setUserBalance,
    userPoints, setUserPoints,
    isPrime, setIsPrime,
    isInfluencer, setIsInfluencer,
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
  const [showSplash, setShowSplash] = useState(true);
  const [isAiTyping, setIsAiTyping] = useState(false);

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
        pushDrawer(payload.value);
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
        text: `${fallback}\n\n(offline fallback)`,
        created_at: new Date().toISOString(),
        user: { id: 'dumbo' },
        attachments: []
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsAiTyping(false);
    }
  };

  const isDesktop = useIsDesktop();

  return (
    <>
      {showSplash && <SplashScreen onComplete={() => setShowSplash(false)} />}
      {isDesktop ? (
        <DesktopLayout
          messages={messages}
          isAiTyping={isAiTyping}
          onSendMessage={handleSendMessage}
        />
      ) : (
        <div className="flex flex-col h-screen w-full bg-[var(--wa-bg)] relative overflow-hidden text-[15px] transition-colors duration-300">
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
            <VCCInput onSendMessage={handleSendMessage} />
          </div>
        </div>

        {/* Global Drawer Overlay */}
        <GlobalDrawer />
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
      <Route path="/admin/*" element={<AdminLayout />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
