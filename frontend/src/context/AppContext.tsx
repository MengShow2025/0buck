
import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { CartItem, SecurePayPayload, Product, ViewType } from '../types';

interface AppContextType {
  cartItems: CartItem[];
  setCartItems: React.Dispatch<React.SetStateAction<CartItem[]>>;
  agentName: string;
  setAgentName: React.Dispatch<React.SetStateAction<string>>;
  userNickname: string;
  setUserNickname: React.Dispatch<React.SetStateAction<string>>;
  selectedProduct: Product | null;
  setSelectedProduct: React.Dispatch<React.SetStateAction<Product | null>>;
  selectedMerchant: any | null;
  setSelectedMerchant: React.Dispatch<React.SetStateAction<any | null>>;
  securePayPayload: SecurePayPayload | null;
  setSecurePayPayload: React.Dispatch<React.SetStateAction<SecurePayPayload | null>>;
  securePayBackView: ViewType;
  setSecurePayBackView: React.Dispatch<React.SetStateAction<ViewType>>;
  previousView: ViewType;
  setPreviousView: React.Dispatch<React.SetStateAction<ViewType>>;
  sourcingMode: 'LOCAL' | 'GLOBAL';
  setSourcingMode: React.Dispatch<React.SetStateAction<'LOCAL' | 'GLOBAL'>>;
  userCountry: string;
  setUserCountry: React.Dispatch<React.SetStateAction<string>>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cartItems, setCartItems] = useState<CartItem[]>(() => {
    const saved = localStorage.getItem('0buck_cart');
    try {
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [agentName, setAgentName] = useState(() => localStorage.getItem('butlerName') || '');
  const [userNickname, setUserNickname] = useState(() => localStorage.getItem('userNickname') || '');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedMerchant, setSelectedMerchant] = useState<any>(null);
  const [securePayPayload, setSecurePayPayload] = useState<SecurePayPayload | null>(null);
  const [securePayBackView, setSecurePayBackView] = useState<ViewType>('chat');
  const [previousView, setPreviousView] = useState<ViewType>('prime');
  const [sourcingMode, setSourcingMode] = useState<'LOCAL' | 'GLOBAL'>(() => (localStorage.getItem('sourcingMode') as any) || 'LOCAL');
  const [userCountry, setUserCountry] = useState(() => localStorage.getItem('userCountry') || 'US');

  useEffect(() => {
    localStorage.setItem('0buck_cart', JSON.stringify(cartItems));
  }, [cartItems]);

  useEffect(() => {
    localStorage.setItem('sourcingMode', sourcingMode);
  }, [sourcingMode]);

  useEffect(() => {
    localStorage.setItem('userCountry', userCountry);
  }, [userCountry]);

  useEffect(() => {
    const handleNameChange = () => {
      setAgentName(localStorage.getItem('butlerName') || '');
    };
    window.addEventListener('butlerNameChanged', handleNameChange);
    return () => window.removeEventListener('butlerNameChanged', handleNameChange);
  }, []);

  const value = useMemo(() => ({
    cartItems,
    setCartItems,
    agentName,
    setAgentName,
    userNickname,
    setUserNickname,
    selectedProduct,
    setSelectedProduct,
    selectedMerchant,
    setSelectedMerchant,
    securePayPayload,
    setSecurePayPayload,
    securePayBackView,
    setSecurePayBackView,
    previousView,
    setPreviousView,
    sourcingMode,
    setSourcingMode,
    userCountry,
    setUserCountry
  }), [cartItems, agentName, selectedProduct, selectedMerchant, securePayPayload, securePayBackView, previousView, sourcingMode, userCountry]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};
