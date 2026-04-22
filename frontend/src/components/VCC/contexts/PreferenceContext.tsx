import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { translate, normalizeLanguage } from '../../../i18n';
import { Theme, Language, Currency } from './types';

interface PreferenceContextType {
  theme: Theme;
  setTheme: (t: Theme) => void;
  language: Language;
  setLanguage: (l: Language) => void;
  currency: Currency;
  setCurrency: (c: Currency) => void;
  notifications: boolean;
  setNotifications: (v: boolean) => void;
  getExchangeRate: (curr: Currency) => number;
  t: (key: string) => string;
}

const PreferenceContext = createContext<PreferenceContextType | undefined>(undefined);

export const PreferenceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>('system');
  const [language, setLanguage] = useState<Language>(() => {
    const stored = localStorage.getItem('app_language');
    return normalizeLanguage(stored || navigator.language);
  });
  const [notifications, setNotifications] = useState(true);

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
    const sysLang = navigator.language.toLowerCase();
    if (sysLang.includes('jp')) return 'JPY';
    if (sysLang.includes('cn') || sysLang.includes('zh')) return 'CNY';
    if (sysLang.includes('gb') || sysLang.includes('uk')) return 'GBP';
    if (sysLang.includes('eu')) return 'EUR';
    return 'USD';
  });

  const exchangeRates: Record<string, number> = useMemo(() => ({
    USD: 1, CNY: 7.24, JPY: 149.50, EUR: 0.92, GBP: 0.79,
    HKD: 7.81, AUD: 1.53, CAD: 1.36, CHF: 0.88, KRW: 1320.00,
    SGD: 1.34, TWD: 31.50, MYR: 4.72, THB: 35.50, VND: 24500.00,
    PHP: 56.00, IDR: 15700.00, RUB: 92.00, BRL: 4.97, INR: 83.20,
  }), []);

  const getExchangeRate = useCallback((curr: Currency) => {
    if (curr === 'AUTO') return 1;
    return exchangeRates[curr] || 1;
  }, [exchangeRates]);

  const t = useCallback((key: string) => {
    return translate(language, key);
  }, [language]);

  const value = useMemo(() => ({
    theme, setTheme,
    language, setLanguage,
    currency, setCurrency,
    notifications, setNotifications,
    getExchangeRate,
    t
  }), [theme, language, currency, notifications, getExchangeRate, t]);

  return (
    <PreferenceContext.Provider value={value}>
      {children}
    </PreferenceContext.Provider>
  );
};

export const usePreferenceContext = () => {
  const context = useContext(PreferenceContext);
  if (!context) throw new Error('usePreferenceContext must be used within PreferenceProvider');
  return context;
};
