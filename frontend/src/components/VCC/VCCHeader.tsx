import React, { useState, useRef, useEffect } from 'react';
import { ShoppingCart, Plus, ChevronLeft, MessageCircle, Trophy, ShoppingBag, Scan, Settings, Users, Bell } from 'lucide-react';
import { useAppContext } from './AppContext';
import { motion, AnimatePresence } from 'framer-motion';

export const VCCHeader = () => {
  const { setActiveDrawer, pushDrawer, t, isAuthenticated, user } = useAppContext();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  
  // Try to use the user's custom butler name, fallback to i18n default
  const aiName = user?.butler_name || t('ai_name'); 
  const cartItemCount = 3; // Mock cart count
  const hasNewNotifications = true; // Mock notification dot

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMenuClick = (action: () => void) => {
    setIsMenuOpen(false);
    action();
  };

  return (
    <div className="flex items-center justify-between h-16 px-4 text-white shadow-md z-20 relative bg-[var(--wa-teal)] dark:bg-black border-b border-black/5 dark:border-white/5">
      {/* Left Action (Back & Notification) */}
      <div className="flex-none flex items-center gap-3 w-20">
        <ChevronLeft className="w-6 h-6 cursor-pointer opacity-90 hover:opacity-100 transition-opacity" onClick={() => setActiveDrawer('none')} />
        <div className="relative cursor-pointer group" onClick={() => pushDrawer('notification')}>
          <Bell className="w-5 h-5 opacity-90 group-hover:opacity-100 transition-opacity" />
          {hasNewNotifications && (
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full border border-[var(--wa-teal)] dark:border-black shadow-sm animate-pulse" />
          )}
        </div>
      </div>

      {/* Center Content (0Buck Brand Logo) */}
      <div className="flex-1 flex justify-center items-center">
        <div className="ob-wordmark text-[24px]">
          <span className="ob-zero mr-[0.02em]">0</span>
          <span className="ob-buck text-white">Buck</span>
        </div>
      </div>
      
      {/* Right Actions */}
      <div className="flex-none w-auto flex items-center justify-end gap-4">
        <div className="relative cursor-pointer group" onClick={() => pushDrawer('cart')}>
          <ShoppingCart className="w-6 h-6 opacity-90 group-hover:opacity-100 transition-opacity" />
          {cartItemCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full border border-[var(--wa-teal)] shadow-sm min-w-[18px] text-center">
              {cartItemCount > 99 ? '99+' : cartItemCount}
            </span>
          )}
        </div>
        
        <div 
            className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden cursor-pointer"
            onClick={() => {
              if (!isAuthenticated) {
                pushDrawer('auth');
              } else {
                pushDrawer('me');
              }
            }}
          >
            <img src={user?.avatar_url || "https://ui-avatars.com/api/?name=Guest&background=e5e7eb&color=374151"} alt="User Avatar" className="w-full h-full object-cover" />
          </div>

        <div className="relative" ref={menuRef}>
          <div 
            className="w-7 h-7 flex items-center justify-center border-2 border-white rounded-full cursor-pointer"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            <Plus className="w-5 h-5" />
          </div>

          <AnimatePresence>
            {isMenuOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 top-12 w-48 bg-white/95 dark:bg-[#2C2C2E]/98 text-gray-900 dark:text-white rounded-2xl shadow-xl overflow-hidden z-50 origin-top-right backdrop-blur-xl border border-black/5 dark:border-white/8"
              >
                {/* WeChat-style Dropdown Menu */}
                <div className="flex flex-col">
                  <button 
                    onClick={() => handleMenuClick(() => pushDrawer('lounge'))}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-black/5 dark:hover:bg-white/8 transition-colors border-b border-black/5 dark:border-white/5"
                  >
                    <MessageCircle className="w-5 h-5" />
                    <span className="text-[15px] text-gray-800 dark:text-gray-100">{t('salon')}</span>
                  </button>
                  <button 
                    onClick={() => handleMenuClick(() => pushDrawer('square'))}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-black/5 dark:hover:bg-white/8 transition-colors border-b border-black/5 dark:border-white/5"
                  >
                    <Users className="w-5 h-5" />
                    <span className="text-[15px]">{t('community')}</span>
                  </button>
                  <button 
                    onClick={() => handleMenuClick(() => pushDrawer('fans'))}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-black/5 dark:hover:bg-white/8 transition-colors border-b border-black/5 dark:border-white/5"
                  >
                    <Trophy className="w-5 h-5" />
                    <span className="text-[15px]">{t('ranking')}</span>
                  </button>
                  <button 
                    onClick={() => handleMenuClick(() => pushDrawer('prime'))}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-black/5 dark:hover:bg-white/8 transition-colors border-b border-black/5 dark:border-white/5"
                  >
                    <ShoppingBag className="w-5 h-5" />
                    <span className="text-[15px]">{t('mall')}</span>
                  </button>
                  <button 
                    onClick={() => handleMenuClick(() => console.log('Scan clicked'))}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-black/5 dark:hover:bg-white/8 transition-colors border-b border-black/5 dark:border-white/5"
                  >
                    <Scan className="w-5 h-5" />
                    <span className="text-[15px]">{t('scan')}</span>
                  </button>
                  <button 
                    onClick={() => handleMenuClick(() => pushDrawer('settings'))}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-black/5 dark:hover:bg-white/8 transition-colors"
                  >
                    <Settings className="w-5 h-5" />
                    <span className="text-[15px]">{t('settings')}</span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};
