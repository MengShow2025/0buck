import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { userApi, authApi } from '../../services/api';
import { translate, normalizeLanguage } from '../../i18n';

type Theme = 'light' | 'dark' | 'system';
type Language = 'en' | 'zh';
type Currency = 'AUTO' | string; // Use string to support all world currencies dynamically
export type DrawerType = 'none' | 'lounge' | 'square' | 'prime' | 'wallet' | 'fans' | 'product_detail' | 'checkout' | 'orders' | 'address' | 'service' | 'me' | 'cart' | 'all_group_buy' | 'all_fan_feeds' | 'all_topics' | 'chat_room' | 'notification' | 'contacts' | 'my_feeds' | 'user_profile' 
  | 'share_menu' 
  | 'key_attributes'
  | 'product_reviews'
  | 'supplier_analysis'
  | 'coupons'
  | 'auth'
  | 'wishlist_detail'
  | 'new_friends'
  | 'blacklist'
  | 'settings'
  | 'group_buy_detail'
  | 'order_detail'
  | 'order_tracking'
  | 'influencer_apply'
  | 'leaderboard'
  | 'reward_history'
  | 'fan_center'
  | 'points_history'
  | 'points_exchange'
  | 'withdraw'
  | 'api_model_add'
  | 'vouchers'
  | 'personal_info'
  | 'security'
  | 'verification'
  | 'change_password'
  | 'tier_rules'
  | 'google_2fa'
  | 'email_bind_new'
  | 'BackupEmail'
  | 'dual_verification'
  | 'wallet_history'
  | 'ai_persona'
  | 'scan';

export interface UserProfile {
  customer_id: number;
  email: string;
  backup_email?: string;
  first_name?: string;
  last_name?: string;
  nickname?: string;
  avatar_url?: string;
  butler_name?: string;
  user_nickname?: string;
  user_tier: 'Bronze' | 'Silver' | 'Gold' | 'Platinum';
  user_type: string;
  referral_code?: string;
  is_two_factor_enabled: boolean;
}

export interface ChatContext {
  id: string;
  name: string;
  type: 'private' | 'group' | 'topic' | 'group_buy';
  avatar?: string;
  memberCount?: number;
  isOfficial?: boolean;
}

interface AppContextType {
  theme: Theme;
  setTheme: (t: Theme) => void;
  language: Language;
  setLanguage: (l: Language) => void;
  currency: Currency;
  setCurrency: (c: Currency) => void;
  activeDrawer: DrawerType;
  setActiveDrawer: (drawer: DrawerType) => void;
  selectedProductId: string | null;
  setSelectedProductId: (id: string | null) => void;
  activeChat: ChatContext | null;
  setActiveChat: (chat: ChatContext | null) => void;
  drawerHistory: DrawerType[];
  pushDrawer: (drawer: DrawerType) => void;
  popDrawer: () => void;
  aiInput: string;
  setAiInput: (text: string) => void;
  user: UserProfile | null;
  isAuthenticated: boolean;
  setUser: (user: UserProfile | null) => void;
  refreshUser: () => Promise<void>;
  pendingAuthAction: (() => void) | null;
  setPendingAuthAction: (action: (() => void) | null) => void;
  requireAuth: (action: () => void) => void;
  notifications: boolean;
  setNotifications: (v: boolean) => void;
  aiPersona: 'professional' | 'friendly' | 'creative' | 'concise' | 'casual' | 'expert' | 'loli' | 'tsundere' | 'butler' | 'mentor';
  setAiPersona: (v: 'professional' | 'friendly' | 'creative' | 'concise' | 'casual' | 'expert' | 'loli' | 'tsundere' | 'butler' | 'mentor') => void;
  aiCustomInstructions: string;
  setAiCustomInstructions: (v: string) => void;
  aiMemoryTags: string[];
  setAiMemoryTags: (v: string[]) => void;
  verificationType: 'login_password' | 'pay_password' | 'email_bind' | 'backup_email_bind' | null;
  setVerificationType: (v: 'login_password' | 'pay_password' | 'email_bind' | 'backup_email_bind' | null) => void;
  dualVerification: {
    requiredMethods: ('primary_email' | 'backup_email' | 'google_2fa' | 'pay_password' | 'login_password')[];
    onSuccess: (tokens: Record<string, string>) => void;
    actionTitle?: string;
  } | null;
  setDualVerification: (v: {
    requiredMethods: ('primary_email' | 'backup_email' | 'google_2fa' | 'pay_password' | 'login_password')[];
    onSuccess: (tokens: Record<string, string>) => void;
    actionTitle?: string;
  } | null) => void;
  hasCheckedInToday: boolean;
  setHasCheckedInToday: (v: boolean) => void;
  isShopifyCheckoutOpen: boolean;
  setIsShopifyCheckoutOpen: (v: boolean) => void;
  shopifyCheckoutUrl: string | null;
  setShopifyCheckoutUrl: (v: string | null) => void;
  triggerPaymentSuccess: (orderId: string) => void;
  onPaymentSuccess?: (orderId: string) => void;
  setOnPaymentSuccess: (fn: (orderId: string) => void) => void;
  userBalance: number;
  setUserBalance: (v: number) => void;
  userPoints: number;
  setUserPoints: (v: number) => void;
  userLevel: 'Bronze' | 'Silver' | 'Gold' | 'Platinum';
  setUserLevel: (v: 'Bronze' | 'Silver' | 'Gold' | 'Platinum') => void;
  influencerRatios?: { referral: number; fan: number };
  setInfluencerRatios: (v: { referral: number; fan: number }) => void;
  isPrime: boolean;
  setIsPrime: (v: boolean) => void;
  isInfluencer: boolean;
  setIsInfluencer: (v: boolean) => void;
  orders: any[];
  setOrders: (v: any[]) => void;
  getExchangeRate: (curr: Currency) => number;
  t: (key: string) => string;
  // Security States
  isGoogle2FAEnabled: boolean;
  setIsGoogle2FAEnabled: (v: boolean) => void;
  google2FASecret: string;
  setGoogle2FASecret: (v: string) => void;
  isFacebookBound: boolean;
  setIsFacebookBound: (v: boolean) => void;
  isTwitterBound: boolean;
  setIsTwitterBound: (v: boolean) => void;
  isGithubBound: boolean;
  setIsGithubBound: (v: boolean) => void;
  mfaRecoveryEnabled: boolean;
  setMfaRecoveryEnabled: (v: boolean) => void;
  withdrawalMethod: 'PayPal' | 'Bank' | 'USDT';
  setWithdrawalMethod: (v: 'PayPal' | 'Bank' | 'USDT') => void;
  userCountry: string;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>('system');
  const [language, setLanguage] = useState<Language>(() => {
    const stored = localStorage.getItem('app_language');
    return normalizeLanguage(stored || navigator.language);
  });

  useEffect(() => {
    const root = window.document.documentElement;
    root.dir = 'ltr';
    root.lang = language;
    localStorage.setItem('app_language', language);
  }, [language]);

  // Handle Theme Changes
  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');

    const updateTheme = () => {
      if (theme === 'system') {
        const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        root.classList.add(systemTheme);
      } else {
        root.classList.add(theme);
      }
    };

    updateTheme();

    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const listener = () => updateTheme();
      mediaQuery.addEventListener('change', listener);
      return () => mediaQuery.removeEventListener('change', listener);
    }
  }, [theme]);

  const [currency, setCurrency] = useState<Currency>(() => {
    // Initial determination based on system language/mock IP logic
    const sysLang = navigator.language.toLowerCase();
    if (sysLang.includes('jp')) return 'JPY';
    if (sysLang.includes('cn') || sysLang.includes('zh')) return 'CNY';
    if (sysLang.includes('gb') || sysLang.includes('uk')) return 'GBP';
    if (sysLang.includes('eu')) return 'EUR';
    return 'USD';
  });
  const [activeDrawer, setActiveDrawer] = useState<DrawerType>('none');
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [activeChat, setActiveChat] = useState<ChatContext | null>(null);
  const [drawerHistory, setDrawerHistory] = useState<DrawerType[]>([]);
  const [aiInput, setAiInput] = useState('');
  const [user, setUser] = useState<UserProfile | null>(null);

  const refreshUser = useCallback(async () => {
    try {
      const response = await userApi.getMe();
      if (response.data.status === 'success') {
        setUser(response.data.user);
      }
    } catch (error) {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const [pendingAuthAction, setPendingAuthAction] = useState<(() => void) | null>(null);
  const [notifications, setNotifications] = useState(true);
  const [aiPersona, setAiPersona] = useState<'professional' | 'friendly' | 'creative' | 'concise' | 'casual' | 'expert' | 'loli' | 'tsundere' | 'butler' | 'mentor'>('professional');
  const [aiCustomInstructions, setAiCustomInstructions] = useState('');
  const [aiMemoryTags, setAiMemoryTags] = useState<string[]>([]);
  const [verificationType, setVerificationType] = useState<'login_password' | 'pay_password' | 'email_bind' | 'backup_email_bind' | null>(null);
  const [dualVerification, setDualVerification] = useState<{
    requiredMethods: ('primary_email' | 'backup_email' | 'google_2fa' | 'pay_password' | 'login_password')[];
    onSuccess: (tokens: Record<string, string>) => void;
    actionTitle?: string;
  } | null>(null);
  const [hasCheckedInToday, setHasCheckedInToday] = useState(false);
  const [isShopifyCheckoutOpen, setIsShopifyCheckoutOpen] = useState(false);
  const [shopifyCheckoutUrl, setShopifyCheckoutUrl] = useState<string | null>(null);
  const [onPaymentSuccess, setOnPaymentSuccess] = useState<(orderId: string) => void>();
  const [userBalance, setUserBalance] = useState<number>(1250.50);
  const [userPoints, setUserPoints] = useState<number>(8500);
  const [userLevel, setUserLevel] = useState<'Bronze' | 'Silver' | 'Gold' | 'Platinum'>('Silver');
  const [influencerRatios, setInfluencerRatios] = useState<{ referral: number; fan: number }>({ referral: 0.15, fan: 0.05 });
  const [isPrime, setIsPrime] = useState<boolean>(false);
  const [isInfluencer, setIsInfluencer] = useState<boolean>(false);
  const [isGoogle2FAEnabled, setIsGoogle2FAEnabled] = useState<boolean>(false);
  const [google2FASecret, setGoogle2FASecret] = useState<string>('JBSWY3DPEHPK3PXP'); // Mock initial secret
  const [isFacebookBound, setIsFacebookBound] = useState<boolean>(false);
  const [isTwitterBound, setIsTwitterBound] = useState<boolean>(false);
  const [isGithubBound, setIsGithubBound] = useState<boolean>(false);
  const [mfaRecoveryEnabled, setMfaRecoveryEnabled] = useState<boolean>(false);
  const [withdrawalMethod, setWithdrawalMethod] = useState<'PayPal' | 'Bank' | 'USDT'>('PayPal');
  const [userCountry, setUserCountry] = useState<string>(() => {
    const sysLang = navigator.language.toLowerCase();
    if (sysLang.includes('jp')) return 'JP';
    if (sysLang.includes('cn') || sysLang.includes('zh')) return 'CN';
    if (sysLang.includes('gb') || sysLang.includes('uk')) return 'GB';
    if (sysLang.includes('de')) return 'DE';
    if (sysLang.includes('fr')) return 'FR';
    return 'US';
  });
  const [orders, setOrders] = useState<any[]>([
    {
      id: '0B-1024',
      productName: 'Handmade Leather Wallet',
      price: 45.00,
      status: 'shipping',
      cashbackStatus: 'pending',
      currentPhase: 0,
      totalPhases: 20,
      image: 'https://picsum.photos/seed/wallet/200/200'
    },
    {
      id: '0B-1025',
      productName: 'Mechanical Keyboard',
      price: 129.00,
      status: 'delivered',
      cashbackStatus: 'active',
      currentPhase: 5,
      totalPhases: 20,
      image: 'https://picsum.photos/seed/kb/200/200'
    }
  ]);

  // Mock exchange rates (base: USD)
  const exchangeRates: Record<string, number> = {
    USD: 1,
    CNY: 7.24,
    JPY: 149.50,
    EUR: 0.92,
    GBP: 0.79,
    HKD: 7.81,
    AUD: 1.53,
    CAD: 1.36,
    CHF: 0.88,
    KRW: 1320.00,
    SGD: 1.34,
    TWD: 31.50,
    MYR: 4.72,
    THB: 35.50,
    VND: 24500.00,
    PHP: 56.00,
    IDR: 15700.00,
    RUB: 92.00,
    BRL: 4.97,
    INR: 83.20,
  };
  const getExchangeRate = useCallback((curr: Currency) => {
    if (curr === 'AUTO') return 1;
    return exchangeRates[curr] || 1;
  }, [exchangeRates]);

  const triggerPaymentSuccess = useCallback((orderId: string) => {
    if (onPaymentSuccess) {
      onPaymentSuccess(orderId);
    }
  }, [onPaymentSuccess]);

  const isAuthenticated = !!user;

  const pushDrawer = useCallback((drawer: DrawerType) => {
    setDrawerHistory(prev => [...prev, activeDrawer]);
    setActiveDrawer(drawer);
  }, [activeDrawer]);

  const popDrawer = useCallback(() => {
    if (drawerHistory.length > 0) {
      const prev = drawerHistory[drawerHistory.length - 1];
      setDrawerHistory(prevHistory => prevHistory.slice(0, -1));
      setActiveDrawer(prev);
    } else {
      setActiveDrawer('none');
    }
  }, [drawerHistory, activeDrawer]);

  const setAndResetActiveDrawer = useCallback((drawer: DrawerType) => {
    setDrawerHistory([]);
    setActiveDrawer(drawer);
  }, []);

  const requireAuth = useCallback((action: () => void) => {
    if (isAuthenticated) {
      action();
    } else {
      setPendingAuthAction(() => action);
      setActiveDrawer('auth');
    }
  }, [isAuthenticated]);

  const t = useCallback((key: string) => {
    return translate(language, key);
  }, [language]);

  return (
    <AppContext.Provider value={{ 
         theme, setTheme, 
         language, setLanguage,
         currency, setCurrency,
         activeDrawer, setActiveDrawer: setAndResetActiveDrawer,
         selectedProductId, setSelectedProductId,
        activeChat, setActiveChat,
        drawerHistory, pushDrawer, popDrawer,
        aiInput, setAiInput,
        user, setUser, isAuthenticated, refreshUser,
        pendingAuthAction, setPendingAuthAction, requireAuth,
        notifications, setNotifications,
        aiPersona, setAiPersona,
        aiCustomInstructions, setAiCustomInstructions,
        aiMemoryTags, setAiMemoryTags,
        verificationType, setVerificationType,
        dualVerification, setDualVerification,
        hasCheckedInToday, setHasCheckedInToday,
        isShopifyCheckoutOpen, setIsShopifyCheckoutOpen,
        shopifyCheckoutUrl, setShopifyCheckoutUrl,
        triggerPaymentSuccess, onPaymentSuccess, setOnPaymentSuccess,
        userBalance, setUserBalance,
        userPoints, setUserPoints,
        userLevel, setUserLevel,
        isPrime, setIsPrime,
        isInfluencer,
        setIsInfluencer,
        influencerRatios,
        setInfluencerRatios,
        orders,
        setOrders,
        getExchangeRate,
        t,
        isGoogle2FAEnabled,
        setIsGoogle2FAEnabled,
        google2FASecret,
        setGoogle2FASecret,
        isFacebookBound,
        setIsFacebookBound,
        isTwitterBound,
        setIsTwitterBound,
        isGithubBound,
        setIsGithubBound,
        mfaRecoveryEnabled,
        setMfaRecoveryEnabled,
        withdrawalMethod,
        setWithdrawalMethod,
        userCountry
      }}>
        {children}
      </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};
