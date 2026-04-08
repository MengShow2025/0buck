import React, { useState, useEffect, useRef } from 'react';
import { X, Sparkles, Send, Mic, Paperclip, Minimize2, Maximize2, Bot, User, ChevronRight, Plus, Image as ImageIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Product } from '../types';
import ChatInput from './ChatInput';
import BongoCat from './BongoCat';
import { useDeviceType } from '../hooks/useDeviceType';
import { useAppContext } from '../context/AppContext';
import { useQuery } from '@tanstack/react-query';

interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  recommendedProducts?: Product[];
}

import { getApiUrl } from '../utils/api';

interface FloatingButlerProps {
  onProductClick?: (product: Product) => void;
}

export default function FloatingButler({ onProductClick }: FloatingButlerProps) {
  const { agentName, userNickname } = useAppContext();
  const { data: authData, refetch: refetchAuth } = useQuery<any>({ queryKey: ['auth-me'] });
  const currentUser = authData?.user;
  const userId = currentUser?.customer_id;
  const butlerName = agentName || 'AI Butler';

  const deviceType = useDeviceType();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<HTMLDivElement>(null);
  const [tooltipPos, setTooltipPos] = useState<'top' | 'bottom' | 'left' | 'right'>('left');

  const updateTooltipPosition = () => {
    if (!dragRef.current) return;
    const rect = dragRef.current.getBoundingClientRect();
    const { innerWidth, innerHeight } = window;
    
    const spaceTop = rect.top;
    const spaceBottom = innerHeight - rect.bottom;
    const spaceLeft = rect.left;
    const spaceRight = innerWidth - rect.right;

    if (spaceRight < 150 && spaceLeft > 150) {
      setTooltipPos('left');
    } else if (spaceLeft < 150 && spaceRight > 150) {
      setTooltipPos('right');
    } else if (spaceTop < 100 && spaceBottom > 100) {
      setTooltipPos('bottom');
    } else {
      setTooltipPos('top');
    }
  };

  useEffect(() => {
    // Handle click outside to close the butler
    const handleClickOutside = (event: MouseEvent) => {
      if (isOpen && dragRef.current && !dragRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  useEffect(() => {
    if (butlerName && messages.length === 0) {
      setMessages([{
        id: '1',
        type: 'assistant',
        content: `Hi! I'm ${butlerName}. How can I help you?`
      }]);
    }
  }, [butlerName, messages.length]);

  const [realProducts, setRealProducts] = useState<Product[]>([]);

  // Fetch real products from DB for recommendations
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const url = getApiUrl('/v1/products/discovery?limit=5');
        const response = await fetch(url);
        if (response.ok) {
          const data = await response.json();
          if (data && Array.isArray(data)) {
            setRealProducts(data);
          }
        }
      } catch (e) {
        console.error('Failed to fetch real products for floating butler:', e);
      }
    };
    fetchProducts();
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) scrollToBottom();
  }, [messages, isOpen]);

  useEffect(() => {
    const handleOpenButler = (event: Event) => {
      const customEvent = event as CustomEvent;
      setIsOpen(true);
      setIsMinimized(false);
      
      const initialMessage = customEvent.detail?.initialMessage;
      if (initialMessage && initialMessage.trim()) {
        setTimeout(() => {
          setInputValue(initialMessage);
          
          // Small delay to ensure state update before submitting
          setTimeout(() => {
            const formEvent = { preventDefault: () => {} } as React.FormEvent;
            handleSendMessage(formEvent, initialMessage);
          }, 50);
        }, 100);
      }
    };

    window.addEventListener('openFloatingButler', handleOpenButler);
    return () => window.removeEventListener('openFloatingButler', handleOpenButler);
  }, [messages, butlerName]); // Need dependencies since handleSendMessage uses them

  useEffect(() => {
    const checkPrefill = () => {
      const params = new URLSearchParams(window.location.search);
      const prefill = params.get('prefill');
      if (prefill) {
        setIsOpen(true);
        setIsMinimized(false);
        setInputValue(prefill);
        
        // Remove parameter from URL
        const newUrl = window.location.pathname;
        window.history.replaceState({}, '', newUrl);
        
        // v5.7.52: Removed auto-send to respect user preference for manual confirmation.
        // Only pre-fill the input and open the UI.
        /* 
        setTimeout(() => {
          const formEvent = { preventDefault: () => {} } as React.FormEvent;
          handleSendMessage(formEvent, prefill);
        }, 500);
        */
      }
    };
    
    checkPrefill();
    // Also listen for URL changes if it's a SPA navigation
    window.addEventListener('popstate', checkPrefill);
    return () => window.removeEventListener('popstate', checkPrefill);
  }, []);

  const handleSendMessage = (e: React.FormEvent, overrideValue?: string) => {
    e.preventDefault();
    const valueToSend = overrideValue !== undefined ? overrideValue : inputValue;
    if (!valueToSend.trim()) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: valueToSend
    };

    setMessages(prev => [...prev, newMessage]);
    setInputValue('');

    // Call to backend AI endpoint
    const fetchAIResponse = async () => {
      try {
        const url = getApiUrl('/v1/butler/chat');
        
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            user_id: userId || 1, // v5.7.3: Pass real user ID for persistent identity
            messages: messages.slice(-5).map(m => ({
              role: m.type === 'assistant' ? 'assistant' : 'user',
              content: m.content
            })).concat({ role: 'user', content: valueToSend }),
            butler_name: butlerName || '0Buck Butler'
          }),
        });
          
        const data = await response.json();
        
        if (!response.ok || data.base_resp?.status_code !== 0) {
          throw new Error(data.base_resp?.status_msg || data.error?.message || 'AI service error');
        }
        
        const content = data.choices?.[0]?.message?.content || "I've processed your request.";

        // v5.7.2: Superpowers Sync - Refresh auth profile if name/nickname might have changed
        if (content.includes('以后我就叫') || content.includes('我就叫') || content.includes('My name is')) {
          setTimeout(() => refetchAuth(), 2000);
        }
        const isRecommending = content.toLowerCase().includes('推荐') || content.toLowerCase().includes('recommend') || content.toLowerCase().includes('buy') || content.toLowerCase().includes('购买');

        setMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          type: 'assistant',
          content: content,
          ...(isRecommending ? {
            recommendedProducts: realProducts.length > 0 ? realProducts.slice(0, 3) : []
          } : {})
        }]);
      } catch (error) {
        setMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          type: 'assistant',
          content: `Sorry, there was an error connecting to the neural network: ${error instanceof Error ? error.message : 'Unknown error'}.`
        }]);
      }
    };

    fetchAIResponse();
  };

  return (
    <motion.div 
      ref={dragRef}
      className={`fixed ${deviceType === 'h5' ? 'bottom-4 right-4' : 'bottom-8 right-8'} z-[100] pointer-events-none flex flex-col items-end`}
      drag
      dragMomentum={false}
      dragConstraints={{
        left: -(typeof window !== 'undefined' ? window.innerWidth - (deviceType === 'h5' ? 48 : 80) : 300),
        right: 0,
        top: -(typeof window !== 'undefined' ? window.innerHeight - (deviceType === 'h5' ? 120 : 160) : 600),
        bottom: 0
      }}
      onDragStart={() => setIsDragging(true)}
      onDragEnd={() => setTimeout(() => setIsDragging(false), 100)}
    >
      <AnimatePresence>
        {!isOpen ? (
          <motion.button
            initial={{ scale: 0, y: 50 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0, y: 50 }}
            onClick={() => {
              if (!isDragging) setIsOpen(true);
            }}
            onMouseEnter={updateTooltipPosition}
            className="pointer-events-auto flex items-center justify-center group relative overflow-visible active:scale-95 transition-all cursor-grab active:cursor-grabbing"
          >
            {/* The Bongo Cat Character replacing the button */}
            <div className="relative">
              <div className={`${deviceType === 'h5' ? 'w-12 h-12' : 'w-16 h-16'} bg-zinc-900 border-2 border-[#FF5C00]/50 rounded-2xl shadow-2xl shadow-primary/40 flex items-center justify-center overflow-hidden transition-all duration-300 group-hover:scale-110 group-hover:border-[#FF5C00]`}>
                <BongoCat isTyping={true} className="w-full h-full" />
              </div>
              {/* Optional Notification Badge */}
              <div className="absolute top-0 right-0 w-4 h-4 bg-red-500 rounded-full border-2 border-zinc-900 shadow-lg animate-pulse" />
              
              {/* Hover Tooltip Bubble */}
              <div className={`absolute ${
                tooltipPos === 'top' ? 'bottom-full mb-3 left-1/2 -translate-x-1/2 origin-bottom' :
                tooltipPos === 'bottom' ? 'top-full mt-3 left-1/2 -translate-x-1/2 origin-top' :
                tooltipPos === 'left' ? 'right-full mr-3 top-1/2 -translate-y-1/2 origin-right' :
                'left-full ml-3 top-1/2 -translate-y-1/2 origin-left'
              } opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none scale-90 group-hover:scale-100 z-50`}>
                <div className="relative bg-zinc-950/80 backdrop-blur-md text-white text-xs font-black px-5 py-3 rounded-full shadow-2xl shadow-primary/20 whitespace-nowrap font-headline tracking-widest uppercase border-2 border-[#FF5C00]/40">
                  Meow? Need help?
                  {/* Tooltip Tail - Cute Cartoon Style */}
                  <div className={`absolute ${
                    tooltipPos === 'top' ? '-bottom-1.5 left-1/2 -translate-x-1/2 border-b-2 border-r-2' :
                    tooltipPos === 'bottom' ? '-top-[7px] left-1/2 -translate-x-1/2 border-t-2 border-l-2' :
                    tooltipPos === 'left' ? '-right-1.5 top-1/2 -translate-y-1/2 border-t-2 border-r-2' :
                    '-left-1.5 top-1/2 -translate-y-1/2 border-b-2 border-l-2'
                  } w-3 h-3 bg-zinc-950/80 backdrop-blur-md border-[#FF5C00]/40 transform rotate-45 rounded-[2px] z-[-1]`} />
                </div>
              </div>
            </div>
          </motion.button>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 100, scale: 0.8 }}
            animate={{ 
              opacity: 1, 
              y: 0, 
              scale: 1,
              height: isMinimized ? '80px' : (deviceType === 'h5' ? '85vh' : '600px'),
              width: isMinimized ? (deviceType === 'h5' ? '280px' : '300px') : (deviceType === 'h5' ? '90vw' : '400px'),
              maxWidth: deviceType === 'h5' ? '90vw' : '400px'
            }}
            exit={{ opacity: 0, y: 100, scale: 0.8 }}
            className="pointer-events-auto bg-zinc-950/90 border border-zinc-800 shadow-[0_0_50px_rgba(0,0,0,0.5)] rounded-[32px] overflow-hidden flex flex-col relative backdrop-blur-2xl"
          >
            {/* Header */}
            <div className="bg-zinc-900/80 p-4 border-b border-zinc-800 flex items-center justify-between sticky top-0 z-10 backdrop-blur-xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#FF5C00]/10 flex items-center justify-center text-[#FF5C00] overflow-hidden border border-white/5">
                  <BongoCat isTyping={true} className="w-full h-full" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white tracking-tight uppercase leading-none">
                    {butlerName || 'AI Butler'}
                  </h3>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="w-2 h-2 rounded-full bg-[#4CAF50] animate-pulse"></span>
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Active now</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button 
                  onClick={() => setIsMinimized(!isMinimized)}
                  className="w-8 h-8 rounded-xl hover:bg-white/5 flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
                >
                  {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
                </button>
                <button 
                  onClick={() => setIsOpen(false)}
                  className="w-8 h-8 rounded-xl hover:bg-white/5 flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {!isMinimized && (
              <>
                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-black/20">
                  {!butlerName && messages.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-center p-8 gap-4">
                      <div className="w-24 h-24 rounded-[32px] bg-[#FF5C00]/10 flex items-center justify-center text-[#FF5C00] mb-4 overflow-hidden shadow-inner border border-white/5">
                        <BongoCat isTyping={true} className="w-full h-full" />
                      </div>
                      <h4 className="text-xl font-black text-white tracking-tighter">Welcome to 0Buck</h4>
                      <p className="text-sm font-bold text-zinc-400 leading-relaxed">
                        I'm your personal AI Butler. Please give me a name to start our journey!
                      </p>
                    </div>
                  )}
                  {messages.map((message) => (
                    <div key={message.id} className={`flex flex-col ${message.type === 'user' ? 'items-end' : 'items-start'} gap-2`}>
                      <div className={`max-w-[85%] p-4 rounded-3xl text-sm font-bold shadow-lg backdrop-blur-md ${
                        message.type === 'user' 
                          ? 'bg-[#FF5C00]/60 text-white rounded-tr-none' 
                          : 'bg-zinc-900/60 text-zinc-200 border border-zinc-800/60 rounded-tl-none'
                      }`}>
                        {message.content}
                      </div>
                      
                      {message.recommendedProducts && (
                        <div className="flex flex-col gap-2 w-full max-w-[85%]">
                          {message.recommendedProducts.map((product) => (
                            <div 
                              key={product.id}
                              onClick={() => {
                                onProductClick?.(product);
                                setIsMinimized(true);
                              }}
                              className="bg-zinc-900/60 backdrop-blur-md border border-zinc-800/60 rounded-2xl p-3 flex gap-3 hover:border-[#FF5C00]/50 cursor-pointer transition-all group shadow-md"
                            >
                              <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 bg-zinc-950 border border-white/5">
                                <img src={product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                              </div>
                              <div className="flex-1 min-w-0 flex flex-col justify-center">
                                <h5 className="text-xs font-black text-white truncate mb-0.5">{product.name}</h5>
                                <div className="flex items-center justify-between">
                                  <span className="text-sm font-black text-[#FF5C00]">{product.price}</span>
                                  <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-[#FF5C00] group-hover:translate-x-1 transition-all" />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
                
                {/* Input */}
              <div className="p-4 bg-zinc-900 border-t border-white/5">
                <ChatInput 
                  value={inputValue}
                  onChange={setInputValue}
                  onSubmit={(e) => handleSendMessage(e)}
                  placeholder={!butlerName ? "Enter my name..." : "Ask anything..."}
                  compact={true}
                />
              </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
