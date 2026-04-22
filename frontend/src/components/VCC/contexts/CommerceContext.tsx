import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import { orderApi, rewardApi } from '../../../services/api';
import { useSessionContext } from './SessionContext';

interface CommerceContextType {
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
  withdrawalMethod: 'PayPal' | 'Bank' | 'USDT';
  setWithdrawalMethod: (v: 'PayPal' | 'Bank' | 'USDT') => void;
  userCountry: string;
}

const CommerceContext = createContext<CommerceContextType | undefined>(undefined);

const TIER_MAP: Record<string, CommerceContextType['userLevel']> = {
  bronze: 'Bronze',
  silver: 'Silver',
  gold: 'Gold',
  platinum: 'Platinum',
};

const normalizeTier = (value: unknown): CommerceContextType['userLevel'] => {
  const normalized = String(value || '').trim().toLowerCase();
  return TIER_MAP[normalized] || 'Bronze';
};

export const CommerceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useSessionContext();
  const [hasCheckedInToday, setHasCheckedInToday] = useState(false);
  const [isShopifyCheckoutOpen, setIsShopifyCheckoutOpen] = useState(false);
  const [shopifyCheckoutUrl, setShopifyCheckoutUrl] = useState<string | null>(null);
  const [onPaymentSuccess, setOnPaymentSuccess] = useState<(orderId: string) => void>();
  const [userBalance, setUserBalance] = useState<number>(0);
  const [userPoints, setUserPoints] = useState<number>(0);
  const [userLevel, setUserLevel] = useState<'Bronze' | 'Silver' | 'Gold' | 'Platinum'>('Bronze');
  const [influencerRatios, setInfluencerRatios] = useState<{ referral: number; fan: number }>({ referral: 0, fan: 0 });
  const [isPrime, setIsPrime] = useState<boolean>(false);
  const [isInfluencer, setIsInfluencer] = useState<boolean>(false);
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

  const [orders, setOrders] = useState<any[]>([]);

  useEffect(() => {
    let isCancelled = false;

    const resetCommercialState = () => {
      setUserBalance(0);
      setUserPoints(0);
      setUserLevel('Bronze');
      setInfluencerRatios({ referral: 0, fan: 0 });
      setIsPrime(false);
      setIsInfluencer(false);
      setOrders([]);
    };

    const hydrateCommercialState = async () => {
      if (!user?.customer_id) {
        resetCommercialState();
        return;
      }

      try {
        const [statusResponse, orderResponse] = await Promise.all([
          rewardApi.getStatus(user.customer_id),
          orderApi.getMyOrders(),
        ]);

        if (isCancelled) return;

        const status = statusResponse.data ?? {};
        const wallet = status.wallet ?? {};

        setUserBalance(Number(wallet.balance) || 0);
        setUserPoints(Number(wallet.points) || 0);
        setUserLevel(normalizeTier(status.user_tier ?? user.user_tier));
        setInfluencerRatios({
          referral: Number(status.dist_rate) || 0,
          fan: Number(status.fan_rate) || 0,
        });
        setIsInfluencer(String(status.user_type || user.user_type || '').toLowerCase() === 'kol');
        setOrders(Array.isArray(orderResponse.data?.items) ? orderResponse.data.items : []);
      } catch (error) {
        if (!isCancelled) {
          resetCommercialState();
        }
      }
    };

    hydrateCommercialState();

    return () => {
      isCancelled = true;
    };
  }, [user?.customer_id, user?.user_tier, user?.user_type]);

  const triggerPaymentSuccess = useCallback((orderId: string) => {
    if (onPaymentSuccess) {
      onPaymentSuccess(orderId);
    }
  }, [onPaymentSuccess]);

  const value = useMemo(() => ({
    hasCheckedInToday, setHasCheckedInToday,
    isShopifyCheckoutOpen, setIsShopifyCheckoutOpen,
    shopifyCheckoutUrl, setShopifyCheckoutUrl,
    triggerPaymentSuccess, onPaymentSuccess, setOnPaymentSuccess,
    userBalance, setUserBalance,
    userPoints, setUserPoints,
    userLevel, setUserLevel,
    influencerRatios, setInfluencerRatios,
    isPrime, setIsPrime,
    isInfluencer, setIsInfluencer,
    orders, setOrders,
    withdrawalMethod, setWithdrawalMethod,
    userCountry
  }), [
    hasCheckedInToday, isShopifyCheckoutOpen, shopifyCheckoutUrl,
    triggerPaymentSuccess, onPaymentSuccess,
    userBalance, userPoints, userLevel, influencerRatios,
    isPrime, isInfluencer, orders, withdrawalMethod, userCountry
  ]);

  return (
    <CommerceContext.Provider value={value}>
      {children}
    </CommerceContext.Provider>
  );
};

export const useCommerceContext = () => {
  const context = useContext(CommerceContext);
  if (!context) throw new Error('useCommerceContext must be used within CommerceProvider');
  return context;
};
