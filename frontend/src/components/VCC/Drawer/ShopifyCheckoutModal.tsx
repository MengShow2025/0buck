import React, { useState, useEffect } from 'react';
import { X, Loader2, Lock, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { usePreferenceContext } from '../contexts/PreferenceContext';

interface ShopifyCheckoutModalProps {
  url: string;
  onClose: () => void;
  onSuccess: () => void;
}

export const ShopifyCheckoutModal: React.FC<ShopifyCheckoutModalProps> = ({ url, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<'loading' | 'browsing' | 'verifying' | 'success'>('loading');
    const { t } = usePreferenceContext();

  useEffect(() => {
    if (!url) {
      onClose();
      return;
    }

    // Simulate loading Shopify form
    const loadTimer = setTimeout(() => {
      setLoading(false);
      setStatus('browsing');
    }, 2000);

    // Simulate user interaction and then verification
    const verificationTimer = setTimeout(() => {
      setStatus('verifying');
    }, 6000);

    const successTimer = setTimeout(() => {
      setStatus('success');
      setTimeout(onSuccess, 1000);
    }, 8000);

    return () => {
      clearTimeout(loadTimer);
      clearTimeout(verificationTimer);
      clearTimeout(successTimer);
    };
  }, [url, onSuccess, onClose]);

  return (
    <div className="absolute inset-0 z-[10000] flex flex-col bg-[#F2F2F7] dark:bg-black animate-in slide-in-from-bottom duration-500">
      {/* Header */}
      <div className="h-14 border-b border-gray-100 dark:border-white/5 flex items-center justify-between px-4 bg-gray-50 dark:bg-[#1C1C1E] z-20">
        <div className="flex items-center gap-2">
          <Lock className="w-4 h-4 text-green-500" />
          <span className="text-[11px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">Shopify Secure Gateway</span>
        </div>
        <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 relative overflow-hidden">
        {/* Loading Overlay */}
        {(status === 'loading' || status === 'verifying' || status === 'success') && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/95 dark:bg-[#111111]/95 z-50 backdrop-blur-sm">
            <div className="relative mb-8">
              <div className="w-20 h-20 border-4 border-gray-100 dark:border-white/5 rounded-full" />
              <div className="absolute inset-0 w-20 h-20 border-4 border-[var(--wa-teal)] rounded-full border-t-transparent animate-spin" />
              {status === 'success' && (
                <div className="absolute inset-0 flex items-center justify-center text-green-500 animate-in zoom-in duration-300">
                  <CheckCircle2 className="w-10 h-10 fill-current" />
                </div>
              )}
            </div>
            <p className="text-[15px] font-black text-gray-900 dark:text-white uppercase tracking-widest mb-2">
              {status === 'loading' ? t('checkout.redirecting_to_shopify') : 
               status === 'verifying' ? 'Verifying Payment...' : 
               'Payment Successful!'}
            </p>
            <p className="text-[12px] text-gray-400 font-bold uppercase tracking-tighter">
              Please do not close this window
            </p>
          </div>
        )}
        
        {/* Embedded Iframe Simulation */}
        <div className="w-full h-full flex flex-col items-center pt-12 px-8 text-center bg-gray-50 dark:bg-[#111111] overflow-y-auto pb-20">
          <div className="w-20 h-20 bg-white dark:bg-[#1C1C1E] rounded-3xl shadow-xl flex items-center justify-center mb-8 border border-gray-100 dark:border-white/5">
            <img src="https://cdn.shopify.com/assets/images/logos/shopify-bag.png" className="w-12 h-12 object-contain" alt="Shopify" />
          </div>
          <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-4">Shopify Checkout</h2>
          <p className="text-gray-500 dark:text-gray-400 font-medium mb-8 leading-relaxed">
            This is a secure checkout powered by Shopify. <br/>
            In a real app, you would see the standard Shopify payment form here.
          </p>
          
          <div className="w-full max-w-xs p-6 bg-white dark:bg-[#1C1C1E] rounded-3xl border border-gray-100 dark:border-white/5 shadow-sm space-y-4">
            <div className="flex justify-between text-sm font-bold">
              <span className="text-gray-400 uppercase">Subtotal</span>
              <span className="text-gray-900 dark:text-white">$29.99</span>
            </div>
            <div className="flex justify-between text-sm font-bold">
              <span className="text-gray-400 uppercase">Shipping</span>
              <span className="text-green-500 uppercase">Free</span>
            </div>
            <div className="pt-4 border-t border-gray-100 dark:border-white/5 flex justify-between items-baseline">
              <span className="text-lg font-black text-gray-900 dark:text-white uppercase">Total</span>
              <span className="text-2xl font-black text-[var(--wa-teal)]">$29.99</span>
            </div>
          </div>
          
          <div className="mt-auto pb-12 flex flex-col items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-green-500" />
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">SSL Secured Payment</span>
          </div>
        </div>
      </div>
    </div>
  );
};
