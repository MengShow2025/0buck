import React, { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, Send, Mic, Paperclip, Palette, Ruler, Truck, ArrowRight, 
  Bookmark, Clock, Star, X, ShoppingCart, Zap, ChevronLeft, ChevronRight, 
  Check, Plus, MessageSquare, Mail, Info, Play, Image as ImageIcon,
  Heart, Trash2, Edit2, Share2, Filter, Settings, Search, User, Bot,
  Smile, Camera, Globe, Headphones, Lightbulb, MapPin, Package,
  Shield, CreditCard, ExternalLink, Minimize2, Maximize2, MoreVertical,
  PlusCircle, LayoutGrid, List
} from 'lucide-react';

import { Product } from '../types';
import ChatInput from './ChatInput';
import BAPAttachmentRenderer from './BAPAttachmentRenderer';

import { getApiUrl } from '../utils/api';

interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  status?: 'sending' | 'sent' | 'error';
  attachments?: string[];
  recommendedProducts?: Product[];
  bapData?: {
    type: string;
    data: any;
  };
  isProductScroller?: boolean;
}

interface AIButlerViewProps {
  agentName: string;
  userId?: number | string;
  currentUser?: any;
  onProductClick?: (product: Product) => void;
  onBuyNow?: (product: Product) => void;
  onAddToCart?: (product: Product) => void;
}

export default function AIButlerView({ agentName, userId, currentUser, onProductClick, onBuyNow, onAddToCart }: AIButlerViewProps) {
  const [messages, setMessages] = useState<Message[]>(() => {
    const saved = localStorage.getItem('butler_messages');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return parsed.map((m: any) => ({
          ...m,
          timestamp: new Date(m.timestamp)
        }));
      } catch (e) {
        console.error('Failed to parse saved messages:', e);
        return [];
      }
    }
    return [];
  });
  const [inputValue, setInputValue] = useState('');
  const [isNaming, setIsNaming] = useState(false);
  const [butlerName, setButlerName] = useState(() => agentName || localStorage.getItem('butlerName') || '');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [realProducts, setRealProducts] = useState<Product[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

    // Fetch real products from DB for recommendations
    useEffect(() => {
      const fetchProducts = async () => {
        try {
          const url = getApiUrl('/v1/products/discovery?limit=10');
          const response = await fetch(url);
          if (response.ok) {
            const data = await response.json();
            if (data && Array.isArray(data)) {
              setRealProducts(data);
            }
          }
        } catch (e) {
          console.error('Failed to fetch real products for butler:', e);
        }
      };
      fetchProducts();
    }, []);

  // Persist messages to localStorage
  useEffect(() => {
    localStorage.setItem('butler_messages', JSON.stringify(messages));
  }, [messages]);

  // Sync butlerName with agentName prop
  useEffect(() => {
    if (agentName) {
      setButlerName(agentName);
    }
  }, [agentName]);

  const handleClearChat = () => {
    if (window.confirm('Clear all conversation history with your butler?')) {
      setMessages([]);
      localStorage.removeItem('butler_messages');
    }
  };

  useEffect(() => {
    const handleNameChange = () => {
      setButlerName(localStorage.getItem('butlerName') || '');
    };
    
    window.addEventListener('butlerNameChanged', handleNameChange);
    return () => window.removeEventListener('butlerNameChanged', handleNameChange);
  }, []);

  useEffect(() => {
    if (!butlerName) {
      setIsNaming(true);
    } else {
      setIsNaming(false);
      
      // Only set initial messages if we don't have any
      setMessages(prev => {
        if (prev.length === 0) {
          return [
            {
              id: 'welcome',
              type: 'assistant',
              content: `Greetings. I am ${butlerName}, your personal 0Buck concierge. How can I assist you with your global procurement or node network today?`,
              timestamp: new Date()
            }
          ];
        }
        return prev;
      });
    }
  }, [butlerName]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    if (isNaming) {
      const newName = inputValue.trim();
      setButlerName(newName);
      localStorage.setItem('butlerName', newName);
      window.dispatchEvent(new Event('butlerNameChanged'));
      setIsNaming(false);
      setInputValue('');
      return;
    }

    const newMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: inputValue,
      timestamp: new Date(),
      status: 'sent'
    };

    setMessages(prev => [...prev, newMessage]);
    setInputValue('');

    // Call to backend AI endpoint (Proxying MiniMax to protect keys)
    try {
      const url = getApiUrl('/v1/butler/chat');
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          butler_name: butlerName || agentName || '0Buck Butler',
          messages: [...messages.slice(-5), newMessage].map(m => ({
            role: m.type === 'assistant' ? 'assistant' : 'user',
            content: m.content
          }))
        }),
      });
        
      const data = await response.json();
      
      if (!response.ok || data.base_resp?.status_code !== 0) {
        console.error('API Error details:', data);
        throw new Error(data.base_resp?.status_msg || data.error?.message || 'AI service error');
      }
      
      const content = data.choices?.[0]?.message?.content || "I've processed your request.";
      const isRecommending = content.toLowerCase().includes('推荐') || content.toLowerCase().includes('recommend') || content.toLowerCase().includes('buy') || content.toLowerCase().includes('购买');

      // Detect if AI output contains a JSON block for BAP Card
      let bapData = null;
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[1]);
          if (parsed.type && parsed.data) {
            bapData = parsed;
          }
        } catch (e) {
          console.warn('Failed to parse BAP JSON from AI:', e);
        }
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: content.replace(/```json\n[\s\S]*?\n```/, '').trim(), // Remove JSON from text content
        timestamp: new Date(),
        bapData: bapData || (isRecommending ? {
          type: '0B_PRODUCT_GRID',
          data: {
            products: realProducts.length > 0 ? realProducts.slice(0, 10) : [],
            butler_comment: "I've selected these items for your node network."
          }
        } : undefined)
      };
      
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Failed to get AI response:', error);
      // Fallback for simulation
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: `Sorry, there was an error connecting to the neural network: ${error instanceof Error ? error.message : 'Unknown error'}.`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, assistantMessage]);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-[#050505] relative h-full overflow-hidden selection:bg-primary/30 font-['Inter'] items-center p-2 sm:p-8">
      <style>{`
        .glass-effect { backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px); }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .material-symbols-outlined { font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24; }
        
        @keyframes scroll-left {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-scroll-left {
          animation: scroll-left 30s linear infinite;
          display: flex;
          width: max-content;
        }
        .animate-scroll-left:hover {
          animation-play-state: paused;
        }
      `}</style>

      {/* Unified Chat Terminal Canvas */}
      <div className="w-full max-w-6xl flex-1 flex flex-col bg-zinc-950/40 border border-zinc-800/60 rounded-[3rem] overflow-hidden shadow-[0_40px_100px_-20px_rgba(0,0,0,0.8)] glass-effect relative z-10">
        
        {/* Integrated Product Scroller (Top of Terminal) */}
        <section className="h-12 sm:h-24 bg-zinc-900/20 border-b border-zinc-800/30 flex-shrink-0 flex flex-col justify-center overflow-hidden">
          <div className="w-full overflow-hidden relative group/scroller-top">
            <div className="animate-scroll-left flex gap-4 px-10">
              {[...realProducts, ...realProducts].map((product, idx) => (
                <div 
                  key={`${product.id}-${idx}`} 
                  onClick={() => onProductClick?.(product as Product)}
                  className="flex-shrink-0 flex items-center gap-2 sm:gap-3 bg-zinc-900/40 border border-white/5 p-1 sm:p-2 rounded-lg sm:rounded-xl pr-3 sm:pr-4 cursor-pointer hover:border-[#FF5C00]/30 transition-all group/item shadow-lg"
                >
                  <img 
                    alt={product.name} 
                    className="w-7 h-7 sm:w-14 h-14 object-cover rounded-md sm:rounded-lg group-hover/item:scale-105 transition-transform" 
                    src={product.image} 
                  />
                  <div>
                    <p className="text-[8px] sm:text-[10px] font-bold text-zinc-400 group-hover/item:text-white uppercase tracking-tighter transition-colors max-w-[80px] sm:max-w-[120px] truncate">{product.name}</p>
                    <p className="text-[#FF5C00] font-black text-[10px] sm:text-sm">{product.price}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Activity Banner */}
        <div className="hidden sm:flex bg-zinc-900/20 border-b border-zinc-800/20 px-10 py-3 items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#FF5C00]"></span>
              </span>
              <span className="text-[10px] font-bold text-[#FF5C00] uppercase tracking-widest">Butler Active</span>
            </div>
            <div className="h-4 w-px bg-zinc-800/50"></div>
            <p className="text-[11px] text-zinc-600 italic">Analyzing global markets for Vanguard Chronograph stock levels...</p>
          </div>
        </div>

        {/* Chat Interface Scroll Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-10 space-y-8 sm:space-y-12 no-scrollbar scroll-smooth">
          <div className="max-w-5xl mx-auto space-y-8 sm:space-y-12">
            {isNaming ? (
              <div className="flex flex-col items-center justify-center h-[50vh] text-center gap-8">
                <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center relative">
                  <Sparkles className="w-12 h-12 text-primary" />
                  <div className="absolute -inset-2 rounded-full border-2 border-primary/20 animate-ping"></div>
                </div>
                <div className="space-y-2">
                  <h2 className="text-4xl font-black text-white tracking-tighter uppercase">Initiating Butler Protocol</h2>
                  <p className="text-lg text-zinc-600 font-bold uppercase tracking-widest">Provide a designation to proceed.</p>
                </div>
              </div>
            ) : (
              <>
                {/* System/Time Marker */}
                <div className="flex justify-center">
                  <span className="text-[10px] uppercase tracking-[0.4em] text-zinc-700 font-bold bg-zinc-900/30 px-6 py-1.5 rounded-full border border-white/5 backdrop-blur-sm">Monday, Oct 24</span>
                </div>

                {messages.map((message) => (
                  <div key={message.id} className={`flex w-full ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`flex gap-2 sm:gap-4 w-full sm:max-w-[85%] ${message.type === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                      {/* Avatar */}
                      <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0 transition-all ${
                        message.type === 'user' 
                          ? 'bg-zinc-800 border border-zinc-700' 
                          : 'bg-[#FF5C00]/10 border border-[#FF5C00]/20'
                      }`}>
                        {message.type === 'user' 
                          ? <User className="w-4 h-4 sm:w-5 h-5 text-zinc-400" /> 
                          : <Bot className="w-4 h-4 sm:w-5 h-5 text-[#FF5C00]" />
                        }
                      </div>
                      
                      {/* Message Bubble Column */}
                      <div className={`flex flex-col gap-1 sm:gap-2 flex-1 ${message.type === 'user' ? 'items-end' : 'items-start'}`}>
                        <div className={`group relative p-[1px] rounded-xl sm:rounded-2xl transition-all duration-500 w-full sm:w-auto ${
                          message.type === 'user' 
                            ? 'bg-gradient-to-br from-[#FF5C00]/30 to-transparent' 
                            : 'bg-gradient-to-br from-zinc-800/50 to-transparent'
                        }`}>
                          <div className={`rounded-[0.7rem] sm:rounded-[0.95rem] transition-all flex flex-col overflow-hidden ${
                            message.type === 'user' 
                              ? 'bg-[#050505] text-zinc-200 border border-[#FF5C00]/10 shadow-[0_0_40px_rgba(255,92,0,0.05)]' 
                              : 'bg-zinc-900/40 text-zinc-300 border border-zinc-800/50 shadow-xl'
                          }`}>
                            <div className="p-2 sm:p-4 flex flex-col gap-2 sm:gap-3 min-w-[100px]">
                              {message.content && <p className="text-[12px] sm:text-sm leading-relaxed font-medium">{message.content}</p>}
                              
                              {message.bapData && (
                                <div className="mt-1 sm:mt-2">
                                  <BAPAttachmentRenderer 
                                    type={message.bapData.type} 
                                    data={message.bapData.data} 
                                    onAction={(action, params) => {
                                      if (action === 'BUY') {
                                        onBuyNow?.({
                                          id: params.id,
                                          name: params.name,
                                          price: params.price,
                                          image: params.image,
                                          description: ''
                                        } as Product);
                                      } else if (action === 'VIEW_PRODUCT') {
                                        onProductClick?.(params as Product);
                                      }
                                    }}
                                  />
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        <span className={`text-[8px] sm:text-[9px] text-zinc-600 px-1 font-bold uppercase tracking-widest`}>
                          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {message.type === 'user' ? 'Delivered' : 'Butler Concierge'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Rich Input (Bottom of Terminal) */}
        <footer className="p-4 sm:p-10 bg-zinc-950/40 border-t border-zinc-800/30 flex-shrink-0">
          <div className="max-w-4xl mx-auto relative">
            <ChatInput 
              value={inputValue}
              onChange={setInputValue}
              onSubmit={handleSendMessage}
              onClear={handleClearChat}
              placeholder={isNaming ? "Assign designation..." : "Query the Luminous Ledger..."}
              compact={false}
            />
            
            <div className="mt-5 flex justify-center gap-8">
              <span className="text-[9px] uppercase tracking-[0.4em] text-zinc-700 flex items-center gap-2 font-black">
                <Shield className="w-3 h-3" /> Secure Link
              </span>
              <span className="text-[9px] uppercase tracking-[0.4em] text-zinc-700 flex items-center gap-2 font-black">
                <Zap className="w-3 h-3" /> Neural Analysis
              </span>
            </div>
          </div>
        </footer>
      </div>

      {/* Decorative Background Blur */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[#FF5C00]/2 rounded-full blur-[200px] pointer-events-none z-0"></div>

      {/* Product Detail Overlay (Functional) */}
      {selectedProduct && (
        <div className="fixed inset-0 z-[100] bg-zinc-950/60 backdrop-blur-md flex items-center justify-center p-12">
          <div className="bg-zinc-900 w-full max-w-4xl h-[819px] rounded-[32px] overflow-hidden flex border border-zinc-800 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.8)]">
            <div className="w-1/2 bg-zinc-800">
              <img 
                alt={selectedProduct.name} 
                className="w-full h-full object-cover" 
                src={selectedProduct.image} 
              />
            </div>
            <div className="w-1/2 p-12 flex flex-col">
              <div className="flex justify-between items-start mb-8">
                <div>
                  <h2 className="text-3xl font-black text-white leading-tight" dangerouslySetInnerHTML={{ __html: selectedProduct.name.replace(' ', '<br/>') }}></h2>
                  <p className="text-orange-500 font-bold mt-2 tracking-widest uppercase text-[10px] underline decoration-orange-500/30 underline-offset-8">Limited Edition 01/50</p>
                </div>
                <button 
                  onClick={() => setSelectedProduct(null)}
                  className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-6 flex-grow">
                <div className="p-6 bg-zinc-950/50 rounded-2xl border border-zinc-800/50">
                  <p className="text-sm text-zinc-400 leading-relaxed">{selectedProduct.description || "The pinnacle of precision. Featuring a 42mm titanium grade 5 case and our proprietary Ledger-Sync movement. Water resistant to 200m."}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-zinc-950/30 p-4 rounded-xl border border-zinc-800/30">
                    <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">Market Value</span>
                    <p className="text-xl font-black text-white mt-1">{selectedProduct.price}</p>
                  </div>
                  <div className="bg-zinc-950/30 p-4 rounded-xl border border-zinc-800/30">
                    <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">0Buck Prime</span>
                    <p className="text-xl font-black text-orange-500 mt-1">{selectedProduct.price}</p>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => {
                  onBuyNow?.(selectedProduct);
                  setSelectedProduct(null);
                }}
                className="w-full bg-orange-600 text-white font-black py-5 rounded-2xl shadow-2xl shadow-orange-950/40 hover:bg-orange-500 active:scale-95 transition-all mt-8 flex items-center justify-center gap-3 uppercase tracking-widest"
              >
                <ShoppingCart className="w-5 h-5" />
                INITIATE ACQUISITION
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}