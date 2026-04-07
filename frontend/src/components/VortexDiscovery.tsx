import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { getApiUrl } from '../utils/api';
import { 
  Zap, 
  Sparkles, 
  ShoppingBag, 
  ArrowRight,
  RefreshCw,
  Heart,
  Bot,
  MessageSquare,
  TrendingUp,
  Cpu,
  Share2
} from 'lucide-react';

interface Product {
  id: string | number;
  title: string;
  price: number;
  image?: string;
  category_type?: 'TRAFFIC' | 'PROFIT';
  strategy_tag?: string;
}

interface DiscoveryData {
  products: Product[];
  butler_greeting: string;
  highlight_index: number;
  persona_id: string;
}

const VortexDiscovery: React.FC<{ userId: number }> = ({ userId }) => {
  const [data, setData] = useState<DiscoveryData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showGreeting, setShowGreeting] = useState(false);

  useEffect(() => {
    fetchDiscovery();
  }, [userId]);

  const fetchDiscovery = async () => {
    setIsLoading(true);
    try {
      const url = getApiUrl(`/v1/products/discovery?user_id=${userId}`);
      const response = await fetch(url);
      const result = await response.json();
      setData(result);
      // Show greeting after a short delay for dramatic effect
      setTimeout(() => setShowGreeting(true), 800);
    } catch (error) {
      console.error('Failed to fetch vortex discovery:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[600px] gap-4">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
          <Sparkles className="absolute inset-0 m-auto text-primary animate-pulse" size={24} />
        </div>
        <p className="text-sm font-black uppercase tracking-widest text-zinc-500 animate-pulse">Synchronizing Vortex...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-8 space-y-12">
      {/* Butler Greeting - Dynamic Bubble (v3.3) */}
      <AnimatePresence>
        {showGreeting && data?.butler_greeting && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.8, x: -50 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            className="flex items-start gap-4 max-w-2xl"
          >
            <div className="relative flex-shrink-0">
              <div className="w-14 h-14 rounded-2xl bg-black border border-primary/40 flex items-center justify-center shadow-2xl">
                <Bot className="text-primary animate-pulse" size={28} />
              </div>
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-[#F5F5F7] rounded-full"></div>
            </div>
            
            <div className="relative bg-white p-6 rounded-3xl rounded-tl-none shadow-xl border border-zinc-100">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Concierge AI</span>
                <span className="w-1 h-1 rounded-full bg-zinc-300"></span>
                <span className="text-[10px] font-bold text-primary uppercase">v3.3 Predictive</span>
              </div>
              <p className="text-zinc-800 text-lg font-medium leading-relaxed">
                "{data.butler_greeting}"
              </p>
              {/* Tooltip triangle */}
              <div className="absolute top-0 -left-2 w-0 h-0 border-t-[10px] border-t-transparent border-r-[15px] border-r-white border-b-[10px] border-b-transparent"></div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2x5 Matrix with 3D Interaction (v3.3) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-6 perspective-1000">
        {data?.products.slice(0, 10).map((product, idx) => (
          <motion.div
            key={product.id}
            initial={{ opacity: 0, rotateY: 45, translateZ: -100 }}
            animate={{ opacity: 1, rotateY: 0, translateZ: 0 }}
            whileHover={{ 
              scale: 1.05, 
              translateZ: 20,
              rotateX: -5,
              rotateY: 5,
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)"
            }}
            transition={{ 
              type: "spring", 
              stiffness: 300, 
              damping: 20,
              delay: idx * 0.05 
            }}
            className={`group relative bg-white rounded-3xl overflow-hidden border-2 transition-colors duration-500 ${
              idx === data.highlight_index 
                ? 'border-primary shadow-[0_0_30px_rgba(var(--primary-rgb),0.2)]' 
                : 'border-zinc-50'
            }`}
          >
            {/* 555 Cashback Badge (v5.4 Brute-force Tiering) */}
            {product.category_type === 'PROFIT' && (
              <div className="absolute top-3 left-3 z-20 flex flex-col gap-1">
                <div className="bg-primary text-black text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-tighter shadow-[0_0_20px_rgba(255,92,40,0.5)] border border-white/20">
                  100% BACK
                </div>
              </div>
            )}

            {/* Source Strategy Indicator */}
            <div className={`absolute ${product.category_type === 'PROFIT' ? 'top-12' : 'top-3'} left-3 z-10 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity`}>
              <span className="bg-black/80 backdrop-blur-md text-white text-[8px] font-black px-2 py-1 rounded-full uppercase tracking-tighter flex items-center gap-1">
                <Cpu size={8} />
                {product.strategy_tag || 'IDS_VORTEX'}
              </span>
            </div>

            {/* Price Tag (Float Effect) */}
            <div className="absolute top-3 right-3 z-10">
              <div className="bg-white/90 backdrop-blur-md text-zinc-900 px-3 py-1.5 rounded-2xl shadow-lg border border-white/20">
                <span className="text-sm font-black tracking-tighter">${product.price.toFixed(2)}</span>
              </div>
            </div>

            {/* Image Section */}
            <div className="aspect-[3/4] bg-zinc-50 relative overflow-hidden">
              <img 
                src={product.image || 'https://via.placeholder.com/400x500'} 
                alt={product.title}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            </div>

            {/* Hover Details Overlay */}
            <div className="absolute bottom-0 left-0 w-full p-4 transform translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out">
              <div className="flex gap-2">
                <button className="flex-1 bg-primary text-black py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl flex items-center justify-center gap-2">
                  <ShoppingBag size={12} />
                  Grab Now
                </button>
                <button className="p-2.5 bg-white/20 backdrop-blur-md rounded-xl text-white hover:bg-white/40 transition-colors">
                  <Share2 size={14} />
                </button>
              </div>
            </div>

            {/* Content Section (Static) */}
            <div className="p-4 group-hover:opacity-0 transition-opacity duration-300">
              <h3 className="font-bold text-zinc-900 text-xs line-clamp-1 mb-1">
                {product.title}
              </h3>
              <div className="flex items-center gap-1">
                <TrendingUp size={10} className="text-green-500" />
                <span className="text-[9px] font-black text-zinc-400 uppercase">Hot Trending</span>
              </div>
            </div>

            {/* Selection Glow (Highlight) */}
            {idx === data.highlight_index && (
              <div className="absolute inset-0 border-4 border-primary/20 pointer-events-none rounded-3xl animate-pulse"></div>
            )}
          </motion.div>
        ))}
      </div>

      <style>{`
        .perspective-1000 {
          perspective: 1000px;
        }
      `}</style>

      {/* Load More / Refresh */}
      <div className="flex flex-col items-center gap-4 pt-4">
        <div className="flex items-center gap-2 text-zinc-400">
          <MessageSquare size={14} />
          <span className="text-[10px] font-black uppercase tracking-[0.3em]">Discovery Stream v3.3</span>
        </div>
        <button 
          onClick={fetchDiscovery}
          className="group relative flex items-center gap-3 px-10 py-5 bg-black hover:bg-primary text-white hover:text-black rounded-3xl font-black text-sm uppercase tracking-[0.2em] transition-all duration-500 shadow-2xl"
        >
          <RefreshCw size={18} className="group-hover:rotate-180 transition-transform duration-700" />
          Refresh Matrix
        </button>
      </div>
    </div>
  );
};

export default VortexDiscovery;
