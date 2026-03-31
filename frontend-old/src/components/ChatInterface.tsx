import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Send, 
  Image as ImageIcon, 
  Search, 
  Wallet, 
  User as UserIcon, 
  Bot, 
  ArrowRight, 
  Zap, 
  Menu,
  ChevronRight,
  Sparkles,
  ShoppingBag,
  Clock,
  CheckCircle,
  Settings,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Utility for Tailwind class merging
 */
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface Product {
  id: string;
  shopify_id: string;
  title: string;
  price: number;
  images: string[];
  is_reward_eligible: boolean;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  type?: 'text' | 'products' | 'system';
  products?: Product[];
  timestamp: string;
}

interface UserProfile {
  id: string;
  name: string;
  wallet_balance: number;
  level: string; // Silver, Gold, Platinum
}

export const ChatInterface: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: "Hello! I'm your **0Buck AI assistant**. Send me an image or describe what you're looking for, and I'll find the best deals with **guaranteed rewards** for you.",
      timestamp: new Date().toISOString(),
      type: 'products',
      products: [
        {
          id: '1',
          shopify_id: '14074199736623',
          title: 'Premium Wireless Headphones',
          price: 199.99,
          images: ['https://sc02.alicdn.com/kf/A45093c349ab341d1873379599bdfac0ao.png'],
          is_reward_eligible: true
        },
        {
          id: '2',
          shopify_id: '14074199736624',
          title: 'Smart Watch Series 9',
          price: 399.00,
          images: ['https://sc02.alicdn.com/kf/Abafe897f47f7466ab81e2fd5d542336ce.png'],
          is_reward_eligible: true
        },
        {
          id: '3',
          shopify_id: '14074199736625',
          title: 'Portable Bluetooth Speaker',
          price: 79.50,
          images: ['https://sc02.alicdn.com/kf/A45093c349ab341d1873379599bdfac0ao.png'],
          is_reward_eligible: false
        },
        {
          id: '4',
          shopify_id: '14074199736626',
          title: '4K Ultra HD Projector',
          price: 299.00,
          images: ['https://sc02.alicdn.com/kf/Abafe897f47f7466ab81e2fd5d542336ce.png'],
          is_reward_eligible: true
        },
        {
          id: '5',
          shopify_id: '14074199736627',
          title: 'Ergonomic Gaming Chair',
          price: 150.00,
          images: ['https://sc02.alicdn.com/kf/A45093c349ab341d1873379599bdfac0ao.png'],
          is_reward_eligible: true
        },
        {
          id: '6',
          shopify_id: '14074199736628',
          title: 'Mechanical RGB Keyboard',
          price: 89.99,
          images: ['https://sc02.alicdn.com/kf/Abafe897f47f7466ab81e2fd5d542336ce.png'],
          is_reward_eligible: false
        },
        {
          id: '7',
          shopify_id: '14074199736629',
          title: 'Professional DSLR Camera',
          price: 1200.00,
          images: ['https://sc02.alicdn.com/kf/A45093c349ab341d1873379599bdfac0ao.png'],
          is_reward_eligible: true
        },
        {
          id: '8',
          shopify_id: '14074199736630',
          title: 'Electric Standing Desk',
          price: 450.00,
          images: ['https://sc02.alicdn.com/kf/Abafe897f47f7466ab81e2fd5d542336ce.png'],
          is_reward_eligible: true
        },
        {
          id: '9',
          shopify_id: '14074199736631',
          title: 'Smart Home Security Cam',
          price: 120.00,
          images: ['https://sc02.alicdn.com/kf/A45093c349ab341d1873379599bdfac0ao.png'],
          is_reward_eligible: false
        },
        {
          id: '10',
          shopify_id: '14074199736632',
          title: 'Noise Cancelling Earbuds',
          price: 149.00,
          images: ['https://sc02.alicdn.com/kf/Abafe897f47f7466ab81e2fd5d542336ce.png'],
          is_reward_eligible: true
        }
      ]
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile>({
    id: 'user_123',
    name: '0Buck Explorer',
    wallet_balance: 15.60,
    level: 'Silver'
  });
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setImagePreview(null);
  };

  const handleSendMessage = async (overrideContent?: string) => {
    const messageContent = overrideContent || input;
    if (!messageContent.trim() && !imagePreview && !isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: messageContent || "Sent an image",
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    if (!overrideContent) setInput('');
    setImagePreview(null);
    setIsLoading(true);

    try {
      const response = await fetch('/api/v1/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: messageContent })
      });

      if (!response.ok) throw new Error('API Error');
      
      const data = await response.json();
      setMessages(prev => [...prev, {
        id: data.id,
        role: 'assistant',
        content: data.content,
        type: data.type || 'text',
        products: data.products,
        timestamp: data.timestamp
      }]);
    } catch (error) {
      console.error('Failed to send message:', error);
      setMessages(prev => [...prev, {
        id: 'error-' + Date.now(),
        role: 'assistant',
        content: "Sorry, I encountered an error while processing your request. Please try again.",
        timestamp: new Date().toISOString()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-[#F5F5F7] text-gray-900 font-sans overflow-hidden">
      {/* Sidebar - Desktop / Mobile Drawer */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
            initial={{ x: -300 }}
            animate={{ x: 0 }}
            exit={{ x: -300 }}
            className="fixed inset-0 z-50 flex"
          >
            <div className="w-64 bg-white shadow-2xl h-full flex flex-col">
              <div className="p-6 flex items-center gap-3 border-b border-gray-100">
                <div className="w-10 h-10 bg-black rounded-full flex items-center justify-center text-white">
                  <UserIcon size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-sm">{userProfile.name}</h3>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-orange-600 font-bold uppercase tracking-wider">{userProfile.level} TIER</span>
                  </div>
                </div>
              </div>
              
              <div className="flex-1 p-4 space-y-2">
                <button className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors">
                  <Clock size={18} className="text-gray-400" />
                  <span className="text-sm font-medium">Order History</span>
                </button>
                <button className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors">
                  <ShoppingBag size={18} className="text-gray-400" />
                  <span className="text-sm font-medium">My Collection</span>
                </button>
                <button className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors">
                  <Sparkles size={18} className="text-orange-500" />
                  <span className="text-sm font-medium">Earn More Rewards</span>
                </button>
                <Link to="/admin" className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors">
                  <Settings size={18} className="text-gray-400" />
                  <span className="text-sm font-medium">System Admin</span>
                </Link>
              </div>

              <div className="p-4 border-t border-gray-100">
                <div className="bg-orange-50 p-4 rounded-2xl">
                  <p className="text-xs text-orange-800 font-medium mb-1">Check-in Status</p>
                  <p className="text-sm text-orange-900 font-bold mb-3">Day 12 / 555</p>
                  <div className="w-full bg-orange-200 h-1.5 rounded-full">
                    <div className="bg-orange-600 h-full rounded-full" style={{ width: '15%' }}></div>
                  </div>
                </div>
              </div>
            </div>
            <div 
              className="flex-1 bg-black/20 backdrop-blur-sm" 
              onClick={() => setIsSidebarOpen(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="flex-1 flex flex-col relative max-w-2xl mx-auto bg-white shadow-xl h-full">
        {/* Header */}
        <header className="px-4 py-3 flex items-center justify-between border-b border-gray-100 bg-white sticky top-0 z-10">
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 -ml-2 hover:bg-gray-50 rounded-full transition-colors"
          >
            <Menu size={20} />
          </button>
          
          <div className="flex items-center gap-2">
            <img 
              src="https://sc01.alicdn.com/kf/A45093c349ab341d1873379599bdfac0ao.png" 
              alt="0Buck" 
              className="h-7 w-auto object-contain"
            />
          </div>

          <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-100 shadow-sm">
            <Wallet size={14} className="text-orange-600" />
            <span className="text-sm font-bold">${userProfile.wallet_balance.toFixed(2)}</span>
          </div>
        </header>

        {/* Chat Area */}
        <div 
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto p-4 space-y-6 scroll-smooth pb-32"
        >
          {messages.map((message) => (
            <div 
              key={message.id} 
              className={cn(
                "flex flex-col gap-2 fade-in",
                message.role === 'user' ? "items-end" : "items-start"
              )}
            >
              <div 
                className={cn(
                  "max-w-[85%] px-4 py-3 shadow-sm",
                  message.role === 'user' 
                    ? "bg-black text-white rounded-2xl rounded-tr-none" 
                    : "bg-gray-50 text-gray-800 rounded-2xl rounded-tl-none border border-gray-100"
                )}
              >
                <div className="text-sm leading-relaxed whitespace-pre-wrap font-medium">
                  {message.content}
                </div>
                {message.role === 'assistant' && (
                  <div className="mt-1 flex items-center gap-1 text-[10px] text-gray-400">
                    <CheckCircle size={10} className="text-green-500" />
                    <span>Verified Deal</span>
                  </div>
                )}
              </div>

              {/* Product Cards Grid */}
              {message.products && message.products.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-[90%] mt-2">
                  {message.products.map((product) => (
                    <motion.div 
                      whileHover={{ y: -4 }}
                      key={product.id}
                      className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col group cursor-pointer"
                    >
                      <div className="aspect-square relative overflow-hidden bg-gray-50">
                        <img 
                          src={product.images[0]} 
                          alt={product.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        {product.is_reward_eligible && (
                          <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-md px-2 py-1 rounded-full flex items-center gap-1 shadow-sm">
                            <Zap size={10} className="text-orange-600 fill-orange-600" />
                            <span className="text-[10px] font-bold text-orange-600 uppercase">Rewarding</span>
                          </div>
                        )}
                      </div>
                      <div className="p-3 flex flex-col flex-1">
                        <h4 className="text-sm font-bold text-gray-900 line-clamp-1 mb-1">{product.title}</h4>
                        <div className="flex items-center justify-between mt-auto">
                          <span className="text-lg font-black text-black">${product.price.toFixed(2)}</span>
                          <button className="p-2 bg-gray-900 text-white rounded-xl shadow-md hover:bg-black transition-colors">
                            <ArrowRight size={14} />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          ))}
          {isLoading && (
            <div className="flex items-center gap-2 text-gray-400">
              <Bot size={18} className="animate-pulse" />
              <div className="flex gap-1">
                <div className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce"></div>
                <div className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                <div className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce [animation-delay:0.4s]"></div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Bottom Input Area */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-white via-white/95 to-transparent pb-8">
          <div className="flex flex-col gap-3">
            {/* Image Preview */}
            {imagePreview && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative w-20 h-20 rounded-2xl overflow-hidden shadow-md border-2 border-orange-500"
              >
                <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                <button 
                  onClick={removeImage}
                  className="absolute top-1 right-1 p-1 bg-black/50 text-white rounded-full hover:bg-black transition-colors"
                >
                  <X size={10} />
                </button>
              </motion.div>
            )}

            {/* Quick Suggestions */}
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
              {['Smart Watch', 'Tech Deals', 'Check Rewards', 'Trending'].map((tag) => (
                <button 
                  key={tag}
                  onClick={() => handleSendMessage(tag)}
                  className="whitespace-nowrap px-3 py-1.5 bg-gray-50 border border-gray-100 rounded-full text-xs font-semibold text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  {tag}
                </button>
              ))}
            </div>

            <div className="relative group">
              <div className="absolute inset-0 bg-gray-100 rounded-[24px] transition-all group-focus-within:ring-2 ring-black/5 ring-offset-0"></div>
              <div className="relative flex items-center p-1">
                <input 
                  type="file" 
                  accept="image/*" 
                  id="image-upload" 
                  className="hidden" 
                  onChange={handleImageUpload}
                />
                <label htmlFor="image-upload" className="p-3 text-gray-400 hover:text-black transition-colors cursor-pointer">
                  <ImageIcon size={20} />
                </label>
                <input 
                  type="text" 
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Ask AI or paste product link..."
                  className="flex-1 bg-transparent py-3 px-2 text-sm focus:outline-none placeholder:text-gray-400 font-medium"
                />
                <button 
                  onClick={handleSendMessage}
                  disabled={!input.trim() || isLoading}
                  className={cn(
                    "p-3 rounded-2xl transition-all shadow-sm",
                    input.trim() ? "bg-black text-white" : "bg-gray-100 text-gray-300"
                  )}
                >
                  <ArrowRight size={20} />
                </button>
              </div>
            </div>
            <p className="text-[10px] text-center text-gray-400 font-medium">
              Powered by 0Buck AI Agent • Rewards automatically applied
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
