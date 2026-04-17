import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, Send, Image as ImageIcon, Mic, Plus, Smile, User, Users as UsersIcon, Megaphone, ShoppingBag, ExternalLink, X, ChevronRight, ShoppingCart, CheckCircle2, Box, Scale, MoreHorizontal, UserMinus, LogOut, ShieldOff } from 'lucide-react';
import { useAppContext, ChatContext } from '../AppContext';
import { motion, AnimatePresence } from 'framer-motion';
import { ProductGridCard } from '../BAPCards/ProductGridCard';
import { MagicPocketMenu } from '../MagicPocketMenu';

export const ChatRoomDrawer: React.FC = () => {
  const { activeChat, setActiveDrawer, pushDrawer, aiInput, setAiInput, t } = useAppContext();
  const [messages, setMessages] = useState<any[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [showPinned, setShowPinned] = useState(true);
  const [showPocket, setShowPocket] = useState(false);
  const [showGroupMenu, setShowGroupMenu] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close pocket/menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowPocket(false);
        setShowGroupMenu(false);
      }
    };
    if (showPocket || showGroupMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showPocket, showGroupMenu]);

  // Sync external aiInput to internal inputValue when drawer opens or aiInput changes
  useEffect(() => {
    if (aiInput) {
      setInputValue(aiInput);
      // Optional: clear it after syncing so it doesn't stick if we switch chats
      // setAiInput(''); 
    }
  }, [aiInput]);

  const getPinnedContent = () => {
    if (!activeChat) return null;
    if (activeChat.type === 'topic' || activeChat.isOfficial) {
      return {
        type: 'official',
        icon: <Megaphone className="w-4 h-4 text-blue-500" />,
        title: t('chat.official_announcement'),
        content: t('chat.geek_week'),
        image: 'https://picsum.photos/seed/promo1/100/100',
        action: t('chat.view_activity'),
        bg: 'bg-blue-50/90 dark:bg-blue-500/10',
        border: 'border-blue-100 dark:border-blue-500/20'
      };
    }
    if (activeChat.type === 'group') {
      return {
        type: 'owner',
        icon: <ShoppingBag className="w-4 h-4 text-orange-500" />,
        title: t('chat.owner_recommend'),
        content: t('chat.keyboard_desc'),
        image: 'https://picsum.photos/seed/kbd1/100/100',
        action: t('chat.order_now'),
        bg: 'bg-orange-50/90 dark:bg-orange-500/10',
        border: 'border-orange-100 dark:border-orange-500/20'
      };
    }
    return null;
  };

  const pinned = getPinnedContent();

  useEffect(() => {
    if (activeChat) {
      // Mock initial messages based on chat type
      const initialMessages = [
        { id: '1', sender: 'system', content: `${t('chat.welcome_to')} ${activeChat.name}`, time: '10:00' },
        { 
          id: '2', 
          sender: activeChat.type === 'private' ? activeChat.name : 'User_A', 
          avatar: activeChat.avatar || `https://ui-avatars.com/api/?name=${activeChat.name}&background=random`,
          content: activeChat.type === 'topic' ? t('chat.topic_opinion') : t('chat.anyone_there'), 
          time: '10:05' 
        },
        {
          id: '3',
          sender: 'system',
          type: 'bap_card',
          bapType: 'product',
          data: {
            title: 'Artisan Crafted Wireless Earbuds with Noise Cancellation',
            supplierName: 'Vortex Precision Manufacturing',
            price: '29.99',
            originalPrice: '59.99',
            image: `https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&q=80&w=800`,
            dimensions: '10x10x5 cm',
            weight: '150g'
          },
          time: '10:10'
        }
      ];
      setMessages(initialMessages);
    }
  }, [activeChat, t]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = () => {
    if (!inputValue.trim()) return;
    const newMessage = {
      id: Date.now().toString(),
      sender: 'me',
      content: inputValue,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setMessages([...messages, newMessage]);
    setInputValue('');
  };

  if (!activeChat) return null;

  return (
    <div className="flex flex-col h-full bg-[var(--wa-bg)] dark:bg-black relative overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between h-14 px-3 text-white shadow-sm shrink-0 z-10 relative" style={{ background: 'linear-gradient(135deg, #FF7A3D 0%, #E8450A 100%)' }}>
        {/* Left Side: Back Arrow */}
        <div className="flex-none w-10">
          <button 
            onClick={() => setActiveDrawer('lounge')}
            className="p-1 -ml-1 hover:bg-white/10 rounded-full transition-colors"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        </div>

        {/* Center: Avatar & Info (Absolute Centered) */}
        <div 
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-2 cursor-pointer hover:bg-white/5 px-2 py-1 rounded-lg transition-colors max-w-[60%]"
          onClick={() => pushDrawer('user_profile')}
        >
          <div className="w-8 h-8 rounded-full bg-white/20 overflow-hidden shrink-0 shadow-sm">
            {activeChat.avatar ? (
              <img src={activeChat.avatar} alt={activeChat.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                {activeChat.type === 'private' ? <User className="w-5 h-5" /> : <UsersIcon className="w-5 h-5" />}
              </div>
            )}
          </div>

          <div className="flex flex-col justify-center min-w-0">
            <h2 className="font-bold text-[15px] truncate leading-tight tracking-tight">{activeChat.name}</h2>
            <div className="flex items-center">
              {activeChat.memberCount ? (
                <span className="text-[10px] opacity-90 font-medium truncate">{activeChat.memberCount} {t('common.members')}</span>
              ) : activeChat.type === 'private' ? (
                <span className="text-[10px] text-gray-400 font-bold bg-gray-50 dark:bg-white/5 px-2 py-0.5 rounded-full border border-gray-100 dark:border-white/5">
                  {t('chat.online')}
                </span>
              ) : null}
            </div>
          </div>
        </div>

        {/* Right Side: Group Menu */}
        <div className="flex-none w-10 flex justify-end relative">
          {activeChat.type === 'group' && (
            <>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setShowGroupMenu(!showGroupMenu);
                }}
                className="p-1.5 hover:bg-white/10 rounded-full transition-colors active:scale-95"
              >
                <MoreHorizontal className="w-5 h-5 text-white" />
              </button>
              
              <AnimatePresence>
                {showGroupMenu && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95, y: -10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                    transition={{ duration: 0.15 }}
                    className="absolute top-full right-0 mt-2 w-48 bg-white dark:bg-[#1C1C1E] rounded-2xl shadow-xl border border-gray-100 dark:border-white/10 overflow-hidden z-50 origin-top-right"
                  >
                    <div className="flex flex-col py-1">
                      <button className="flex items-center gap-3 px-4 py-3 text-[14px] font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                        <UsersIcon className="w-4 h-4" />
                        {t('chat.member_management') || 'Members'}
                      </button>
                      <div className="h-px bg-gray-100 dark:bg-white/5 my-1 mx-4" />
                      <button 
                        className="flex items-center gap-3 px-4 py-3 text-[14px] font-semibold text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-500/10 transition-colors"
                        onClick={() => {
                          const leftGroups = JSON.parse(localStorage.getItem('vcc_left_groups') || '[]');
                          if (!leftGroups.includes(activeChat.id)) {
                            leftGroups.push(activeChat.id);
                            localStorage.setItem('vcc_left_groups', JSON.stringify(leftGroups));
                          }
                          setActiveDrawer('lounge');
                        }}
                      >
                        <LogOut className="w-4 h-4" />
                        {t('chat.leave_group') || 'Leave Group'}
                      </button>
                      <button 
                        className="flex items-center gap-3 px-4 py-3 text-[14px] font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                        onClick={() => {
                          const closedGroups = JSON.parse(localStorage.getItem('vcc_closed_groups') || '[]');
                          if (!closedGroups.includes(activeChat.id)) {
                            closedGroups.push(activeChat.id);
                            localStorage.setItem('vcc_closed_groups', JSON.stringify(closedGroups));
                          }
                          setActiveDrawer('lounge');
                        }}
                      >
                        <ShieldOff className="w-4 h-4" />
                        {t('chat.close_group') || 'Close Group'}
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          )}
        </div>
      </div>

      {/* Pinned Announcement / Product Area */}
      <AnimatePresence>
        {pinned && showPinned && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className={`shrink-0 border-b border-white/20 dark:border-white/10 relative overflow-hidden group cursor-pointer active:opacity-90 transition-all`}
            onClick={() => pushDrawer(pinned.type === 'official' ? 'all_topics' : 'product_detail')}
          >
            {/* Glassmorphism Background Layer */}
            <div className={`absolute inset-0 backdrop-blur-xl ${pinned.type === 'official' ? 'bg-blue-50/90 dark:bg-blue-900/40' : 'bg-orange-50/90 dark:bg-orange-900/40'}`} />
            
            <div className="px-4 py-3 flex items-start gap-3 relative z-10">
              {pinned.image ? (
                <div className="w-14 h-14 rounded-xl overflow-hidden shadow-sm border border-white/30 shrink-0">
                  <img src={pinned.image} alt="pinned" className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="mt-0.5">{pinned.icon}</div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-[9px] font-black uppercase tracking-tighter px-1.5 py-0.5 rounded-md shadow-sm ${pinned.type === 'official' ? 'bg-blue-500 text-white' : 'bg-orange-500 text-white'}`}>
                    {pinned.title}
                  </span>
                </div>
                <p className="text-[13px] font-black text-gray-800 dark:text-gray-100 leading-snug line-clamp-1 italic tracking-tight">
                  {pinned.content}
                </p>
              </div>
              
              <div className="flex items-center gap-2 self-center shrink-0">
                <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-[var(--wa-teal)] transition-colors" />
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowPinned(false);
                  }}
                  className="p-1 text-gray-300 hover:text-gray-500 dark:hover:text-gray-100 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            {/* Background Accent */}
            {!pinned.image && (
              <div className={`absolute -right-4 -bottom-4 w-16 h-16 opacity-10 pointer-events-none`}>
                {pinned.icon}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Messages Area */}
      <div className="flex-1 relative overflow-hidden bg-[var(--wa-bg)] dark:bg-black">
        {/* Background Layer (Static) */}
        <div
          className="absolute inset-0 z-0 pointer-events-none opacity-30 dark:opacity-[0.035]"
          style={{
            backgroundImage:
              'url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")',
            backgroundSize: '400px',
            backgroundRepeat: 'repeat',
            backgroundBlendMode: 'multiply'
          }}
        />
        
        {/* Content Scroll Layer */}
        <div 
          ref={scrollRef}
          className="absolute inset-0 overflow-y-auto p-4 space-y-4 no-scrollbar z-10 flex flex-col"
        >
          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.sender === 'me' ? 'justify-end' : msg.sender === 'system' && msg.type !== 'bap_card' ? 'justify-center' : msg.type === 'bap_card' ? 'justify-center' : 'justify-start'}`}>
              {msg.sender === 'system' && msg.type !== 'bap_card' ? (
                <div className="bg-black/10 dark:bg-white/10 text-black/60 dark:text-white/60 text-[11px] px-3 py-1 rounded-full backdrop-blur-sm uppercase font-bold tracking-wider">
                  {t(String(msg.content ?? ''))}
                </div>
              ) : msg.type === 'bap_card' ? (
                <div className="w-full flex justify-center py-4 px-2">
                  <ProductGridCard 
                    data={{
                      title: msg.data.title,
                      price: parseFloat(msg.data.price),
                      original_price: parseFloat(msg.data.originalPrice),
                      supplier_name: msg.data.supplierName,
                      physical_verification: {
                        weight_kg: parseFloat(msg.data.weight) / 1000,
                        dimensions_cm: msg.data.dimensions
                      },
                      image_url: msg.data.image
                    }} 
                  />
                </div>
              ) : (
                <div className={`flex gap-2 max-w-[85%] ${msg.sender === 'me' ? 'flex-row-reverse' : ''}`}>
                  {msg.sender !== 'me' && (
                    <div className="w-8 h-8 rounded-full bg-gray-300 overflow-hidden shrink-0 mt-1 shadow-sm">
                      <img src={msg.avatar || `https://ui-avatars.com/api/?name=${msg.sender}&background=random`} alt={msg.sender} className="w-full h-full object-cover" />
                    </div>
                  )}
                  <div className="flex flex-col">
                    {msg.sender !== 'me' && (
                      <span className="text-[11px] text-gray-500 dark:text-gray-400 ml-1 mb-1 font-medium">{msg.sender}</span>
                    )}
                    <div className={`relative px-3 py-2 rounded-2xl shadow-sm text-[15px] leading-relaxed ${
                      msg.sender === 'me' 
                        ? 'bg-[var(--wa-bubble-out)] text-gray-800 dark:text-white rounded-tr-none border border-[#FFD9CD] dark:border-white/5' 
                        : 'bg-[var(--wa-bubble-in)] text-gray-800 dark:text-white rounded-tl-none border border-gray-100 dark:border-white/5'
                    }`}>
                      {t(String(msg.content ?? ''))}
                      <div className={`text-[9px] text-right mt-1 font-medium ${msg.sender === 'me' ? 'text-orange-800/60 dark:text-white/40' : 'text-gray-400 dark:text-gray-500'}`}>
                        {msg.time}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Input Area */}
      <div ref={containerRef} className="bg-white/90 dark:bg-[#1c1c1e]/95 backdrop-blur-2xl flex flex-col border-t border-gray-100 dark:border-white/5 shrink-0 pb-8">
        <div className="p-3 flex items-center gap-2">
          <div className="flex items-center gap-1">
            <button 
              onClick={() => setShowPocket(!showPocket)}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-transform active:scale-90"
            >
              {showPocket ? <X className="w-6 h-6 text-[var(--wa-teal)]" /> : <Plus className="w-6 h-6" />}
            </button>
          </div>
          
          <div className="flex-1 bg-gray-100/50 dark:bg-black/40 rounded-[24px] flex items-center px-4 py-2.5 border border-transparent focus-within:border-[var(--wa-teal)] transition-all">
            <input 
              type="text" 
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder={t('chat.input_placeholder')} 
              className="flex-1 bg-transparent border-none outline-none text-[15px] text-gray-800 dark:text-white placeholder:text-gray-400"
            />
            <button className="ml-2 text-gray-400 hover:text-[var(--wa-teal)] transition-colors">
              <Smile className="w-5 h-5" />
            </button>
          </div>

          <button 
            onClick={handleSend}
            className={`w-11 h-11 rounded-full flex items-center justify-center transition-all active:scale-90 shadow-md shrink-0 ${
              inputValue.trim()
                ? 'text-white'
                : 'bg-gray-100 dark:bg-white/5 text-gray-400'
            }`}
            style={inputValue.trim() ? { background: 'linear-gradient(135deg, #FF7A3D 0%, #E8450A 100%)' } : {}}
          >
            {inputValue.trim() ? <Send className="w-5 h-5 ml-0.5" /> : <Mic className="w-5 h-5" />}
          </button>
        </div>

        {/* Magic Pocket Drawer */}
        <div className={`overflow-hidden transition-all duration-300 ease-in-out ${showPocket ? 'max-h-64 opacity-100' : 'max-h-0 opacity-0'}`}>
          <MagicPocketMenu isOpen={showPocket} />
        </div>
      </div>
    </div>
  );
};
