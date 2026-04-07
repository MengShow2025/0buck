import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { 
  ArrowLeft, Share2, Star, MessageSquare, 
  Mail, ShoppingCart, ShieldCheck,
  ChevronRight, Info, ExternalLink,
  ChevronLeft, Heart, MapPin,
  CheckCircle, Shield, PlayCircle,
  Zap, X, Bot, Activity, Bell
} from 'lucide-react';
import { Product } from '../types';
import { useTheme } from '../context/ThemeContext';

interface ProductDetailViewProps {
  product: Product;
  onBack: () => void;
  onAddToCart: (product: Product) => void;
  onBuyNow: (product: Product) => void;
  cartItemsCount?: number;
}

export default function ProductDetailView({ product, onBack, onAddToCart, onBuyNow, cartItemsCount = 0 }: ProductDetailViewProps) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedVariant, setSelectedVariant] = useState('Neon Burst');
  const [showReviewsModal, setShowReviewsModal] = useState(false);

  const anonymizeName = (name: string) => {
    if (name.length <= 2) return name;
    return `${name[0]}***${name[name.length - 1]}`;
  };

  const thumbnails = [
    product.image,
    'https://lh3.googleusercontent.com/aida-public/AB6AXuAEbjBbmp3vZiPo_cVv5HrvsP9aQuDgzU2zC8I6dHd4cd1Gqd6IglieV3gCRgyf5Nbg4aTzUQhevm79a_PggGBsqzoqm3rcJ4YEEqJXAd-owHbgitRnFtq3n4s8byfSDZZLbHCV50Ny06KKia3mn-lSzELsNJurPkb4jKwdrF7cM7jpipq_ohBL5jlWpH9MPTr9FZTKy_vBiKXdnH1OiLw7o4J8uitL9vw_aU2lw8KqmX3pCycwYVElUSR5d5Ql-OGKQl35MmmvhLxs',
    'https://lh3.googleusercontent.com/aida-public/AB6AXuBRpwURpotnpzNT6MZC5UeZA1tRXCTg1JW3VeprLxyEK1fiVW9RWrK5CbqUvylaSanp1l_3tHdaLXk5u2yNXvwilRPFFcRemUBq1LmvS6EpZCZIuqjZcRr-y1Bw3iW8sOb-JwO6ZcRsjxM7MEwnV_H_so9fyleJax9B6ULY101N8aj4BWS2Tu8bzqMG8l90PrTcJcb9RWGqubMFP0KhEG6lt2-cU1kvlYUF1R0gGDSrT5trTiTXLJXr6JLwU-TZkm6dhV5m9uVoa76o',
    'https://lh3.googleusercontent.com/aida-public/AB6AXuCRIccoXZk9t5P6r95MwJJqcX_JBzkAiA-_WI4GnjXYDU-Fr3bngPu7XAvv28FIyzTIAIGD4ICOVKnjxYDsTBnp51Rnpa0qQpn5mEeZ8MgNDuv3nAsmEVxHbLi6yAcGDhgSC79_kxKo7yxueezhU3uXzjXhm10aNlEXKkEVK9bjoNsUDcaJSZWCGFfNzgm7TQGPHMgnL9glGrvl7DNAyhshRSPFmzFnlVW-mqP3gldutPK6-MxyWDk__gfK6wTBl1YaYYGdO6jVDMoB'
  ];

  const reviews = [
    { 
      date: 'February 2, 2026', 
      user: 'TechOps Global', 
      avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuALYkiJFv_mJ-feVOL_a5qsi9gstMZn48i69SUncTVpDhk5SQwnvrBF2EynnANm-nKWEBJTAIyMhRekA5bzTrSlVyqb_JN-TAuDNBQpZexEHKYohMN4MF5XnHAd5b6kwwJchCThkHMUTkpU9iaL_fKm8aUmyvhhQayu7zhJpw6lCOYCAgdIwczggzvXt5uKXCNL7HUWZ0IRUJvJbq4CGlvkGHhvoW9QSy557n45hld9ymhLgYflEHRvFrFbKqoQHPwAOkRZw3lSj5Kk', 
      flag: 'https://flagcdn.com/w40/us.png',
      content: "The battery longevity in high-performance modes exceeded our enterprise benchmarks. Seamless integration." 
    },
    { 
      date: 'January 20, 2026', 
      user: 'LogiSync Ltd', 
      avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBAGvACccaowURsjsAfrrRCTVan3mrq_I4hY9Tz2qqhFJ9dIaeEVxCKWltvo7W_ugbFixzix7XxFY6o7n7S76N5D-tpoeayZBOG0uPyr747ljUxfpQNuTVE2udf1jnl-eWbzCOfK2ksj2V2jD-1nqgAXb1GMsWzg02ndi0h4X6uD5CSPMwKLSfpaflEjd80T-9NB7tB6vdo_H-GWP5ETjVlTUxoPSHK-EuWWaTBBwFDDnxEbxyZ5QEqz8kYifYmqcsQP_rEK92OtFZF', 
      flag: 'https://flagcdn.com/w40/de.png',
      content: "Wholesale pricing is unmatched. The packaging is premium and minimizes damage during transit." 
    }
  ];

  return (
    <div className={`flex-1 overflow-auto font-body selection:bg-primary/30 min-h-screen no-scrollbar pb-32 ${isDark ? 'bg-[#050505] text-[#ffffff]' : 'bg-[#fff8f6] text-[#271814]'}`}>
      <style>{`
        .glass-panel { backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        @keyframes marquee {
          0% { transform: translateX(100%); }
          100% { transform: translateX(-100%); }
        }
        .animate-marquee {
          animation: marquee 30s linear infinite;
          display: flex;
          align-items: center;
          gap: 3rem;
          width: max-content;
        }
        .marquee-container:hover .animate-marquee,
        .marquee-container:active .animate-marquee {
          animation-play-state: paused;
        }
      `}</style>

      {/* TopAppBar */}
      <header className={`fixed top-0 w-full z-50 transition-all shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] flex flex-col ${isDark ? 'bg-zinc-950/80 backdrop-blur-xl border-b border-white/5' : 'bg-white/80 backdrop-blur-xl border-b border-black/5'}`}>
        <div className="flex items-center justify-between px-6 py-4 w-full max-w-7xl mx-auto">
          <div className="flex items-center gap-4">
            <button onClick={onBack} className="h-10 w-10 rounded-full bg-[#ff5c28] flex items-center justify-center text-white cursor-pointer hover:scale-105 transition-transform">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <span className={`text-xl font-extrabold uppercase tracking-tighter ${isDark ? 'text-white' : 'text-zinc-900'}`}>ProductDetail</span>
          </div>
          <div className="flex items-center gap-6">
            <Bell className="w-5 h-5 text-zinc-400 cursor-pointer hover:text-[#af3000] transition-colors" />
            <Share2 className="w-5 h-5 text-zinc-400 cursor-pointer hover:text-[#af3000] transition-colors" />
            <div className="relative p-2 text-[#af3000] hover:bg-white/5 transition-colors rounded-full cursor-pointer">
              <ShoppingCart className="w-6 h-6" />
              {cartItemsCount > 0 && (
                <span className="absolute top-1 right-1 bg-[#af3000] text-white text-[10px] font-bold h-4 w-4 flex items-center justify-center rounded-full">
                  {cartItemsCount}
                </span>
              )}
            </div>
          </div>
        </div>
        {/* IM Mode Activity Banner */}
        <div className="bg-[#af3000]/10 border-t border-white/5 py-2 px-6 overflow-hidden marquee-container cursor-help h-10 flex items-center">
          <div className="animate-marquee whitespace-nowrap">
            <div className="flex items-center gap-3 flex-shrink-0">
              <span className="flex h-2 w-2 rounded-full bg-[#af3000]"></span>
              <p className="text-[10px] font-black text-[#af3000] tracking-widest uppercase">Live: 14 Suppliers bidding on similar items right now</p>
            </div>
            <div className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full flex-shrink-0">
              <img className="h-4 w-4 rounded-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAHNXfHnCCAXRPWuPN71Cij0sN9pnFZUtn4rDLeYCvH7qjgUQsSvH8rpIVr_m1sM4ZiFw2cCDOb5UKcLlzwb8E81j1HEU570MevxymMv5zY9Ish5DxKV3L-zOBwEc62p4Ygk6hdohQqJPpl3kfcDx33qDQ9PjHPitoxK7oh-gOTZQcqo51ADzMV60LDisr6OkqCH4HJtN2NilClgY08ujXFjOUOEzf_l7wH483yldRR8QH1ipgm3m-i51UijCBsakx1PyE6-qufdxpQ" alt="User" />
              <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Prime Member secured -15% Bulk Discount</span>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              <span className="flex h-2 w-2 rounded-full bg-[#af3000]"></span>
              <p className="text-[10px] font-black text-[#af3000] tracking-widest uppercase">NEW INVENTORY: HIGH-GRADE SEMICONDUCTORS AVAILABLE</p>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              <span className="flex h-2 w-2 rounded-full bg-[#af3000]"></span>
              <p className="text-[10px] font-black text-[#af3000] tracking-widest uppercase">SUPPLIER VERIFIED: SHENZHEN QUANTUM PRECISION</p>
            </div>
            {/* Duplicate for seamless loop */}
            <div className="flex items-center gap-3 flex-shrink-0">
              <span className="flex h-2 w-2 rounded-full bg-[#af3000]"></span>
              <p className="text-[10px] font-black text-[#af3000] tracking-widest uppercase">Live: 14 Suppliers bidding on similar items right now</p>
            </div>
          </div>
        </div>
      </header>

      <main className="pt-[116px] md:pt-[130px] pb-24 px-6 max-w-7xl mx-auto flex flex-col gap-2">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-2 items-start">
          {/* Left Column: Media Gallery */}
          <div className="lg:col-span-7 flex flex-col gap-2">
            <div className={`relative rounded-3xl overflow-hidden group shadow-2xl ${isDark ? 'bg-zinc-900 border border-white/5' : 'bg-zinc-200 border border-black/5'}`}>
              <AnimatePresence mode="wait">
                <motion.img 
                  key={selectedImage}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  drag="x"
                  dragConstraints={{ left: 0, right: 0 }}
                  onDragEnd={(_, info) => {
                    const swipeThreshold = 50;
                    if (info.offset.x < -swipeThreshold) {
                      // Next image
                      setSelectedImage((prev) => (prev + 1) % thumbnails.length);
                    } else if (info.offset.x > swipeThreshold) {
                      // Previous image
                      setSelectedImage((prev) => (prev - 1 + thumbnails.length) % thumbnails.length);
                    }
                  }}
                  alt="Product Hero" 
                  className="w-full aspect-square object-cover transform cursor-grab active:cursor-grabbing" 
                  src={thumbnails[selectedImage]} 
                />
              </AnimatePresence>

              {/* PC Navigation Arrows */}
              <div className="absolute inset-y-0 left-0 right-0 flex items-center justify-between px-4 pointer-events-none">
                <button 
                  onClick={() => setSelectedImage((prev) => (prev - 1 + thumbnails.length) % thumbnails.length)}
                  className="h-12 w-12 rounded-full bg-black/20 backdrop-blur-md border border-white/10 flex items-center justify-center text-white pointer-events-auto opacity-0 group-hover:opacity-100 transition-all hover:bg-primary/80 hidden lg:flex"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button 
                  onClick={() => setSelectedImage((prev) => (prev + 1) % thumbnails.length)}
                  className="h-12 w-12 rounded-full bg-black/20 backdrop-blur-md border border-white/10 flex items-center justify-center text-white pointer-events-auto opacity-0 group-hover:opacity-100 transition-all hover:bg-primary/80 hidden lg:flex"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </div>

              <div className="absolute bottom-6 left-6 flex gap-3 pointer-events-none">
                <span className="px-4 py-2 glass-panel bg-white/10 text-white rounded-full text-[10px] font-black uppercase tracking-widest border border-white/10">In Stock</span>
                <span className="px-4 py-2 glass-panel bg-[#af3000]/20 text-[#af3000] rounded-full text-[10px] font-black uppercase tracking-widest border border-[#af3000]/30">Prime Exclusive</span>
              </div>
            </div>
            
            <div className="grid grid-cols-5 gap-3 md:gap-4">
              {thumbnails.map((thumb, idx) => (
                <button 
                  key={idx}
                  onClick={() => setSelectedImage(idx)}
                  className={`aspect-square rounded-2xl overflow-hidden border-2 transition-all hover:scale-105 ${
                    selectedImage === idx ? 'border-[#af3000] shadow-[0_0_20px_rgba(175,48,0,0.3)]' : 'border-transparent opacity-60 hover:opacity-100'
                  }`}
                >
                  <img className="w-full h-full object-cover" src={thumb} />
                </button>
              ))}
              <div className="aspect-square rounded-2xl bg-zinc-950 flex flex-col items-center justify-center text-white gap-1 cursor-pointer hover:bg-zinc-900 transition-colors">
                <PlayCircle className="w-6 h-6 text-[#af3000]" />
                <span className="text-[9px] font-black uppercase tracking-tighter">View 3D</span>
              </div>
            </div>

            {/* Market Sentiment Section */}
            <section 
              onClick={() => setShowReviewsModal(true)}
              className={`rounded-[2rem] p-8 border cursor-pointer hover:border-[#af3000]/30 transition-all ${isDark ? 'bg-zinc-900/50 border-white/5' : 'bg-white border-black/5 shadow-xl'}`}
            >
              <div className="flex items-end justify-between mb-8">
                <div>
                  <h2 className="text-2xl font-black tracking-tight mb-2 uppercase">Market Sentiment</h2>
                  <div className="flex items-center gap-3">
                    <span className="text-4xl font-black text-[#af3000]">4.9</span>
                    <div className="flex text-[#af3000]">
                      {[1, 2, 3, 4].map(s => <Star key={s} className="w-5 h-5 fill-current" />)}
                      <Star className="w-5 h-5 fill-current opacity-50" />
                    </div>
                    <span className="text-xs text-zinc-500 font-bold uppercase tracking-widest">(2.4k Verfied Suppliers)</span>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                {[
                  { label: 'Audio', value: '9.5', width: '95%' },
                  { label: 'Build', value: '8.8', width: '88%' },
                  { label: 'Value', value: '9.2', width: '92%' }
                ].map((stat, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 w-12">{stat.label}</span>
                    <div className={`flex-1 h-2 rounded-full overflow-hidden ${isDark ? 'bg-zinc-950' : 'bg-zinc-100'}`}>
                      <div className="h-full bg-[#af3000]" style={{ width: stat.width }}></div>
                    </div>
                    <span className="text-xs font-black w-8">{stat.value}</span>
                  </div>
                ))}
              </div>
              <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-4">
                {reviews.map((review, i) => (
                  <div key={i} className={`p-6 rounded-2xl border ${isDark ? 'bg-zinc-950/50 border-white/5' : 'bg-zinc-50 border-black/5'}`}>
                    <div className="flex items-center gap-3 mb-4">
                      <img className="h-10 w-10 rounded-full object-cover" src={review.avatar} alt={review.user} />
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-black">{anonymizeName(review.user)}</p>
                          <img className="h-2.5 w-3.5 object-cover rounded-sm opacity-80" src={review.flag} alt="flag" />
                        </div>
                        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Verified Tier 1 Buyer</p>
                      </div>
                    </div>
                    <p className="text-sm leading-relaxed text-zinc-400 italic font-medium">"{review.content}"</p>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* Right Column: Info/Buying */}
          <div className="lg:col-span-5 flex flex-col gap-2">
            <div className="sticky top-40 flex flex-col gap-2">
              <div className={`p-8 rounded-[2.5rem] border ${isDark ? 'bg-zinc-900/50 border-white/5' : 'bg-white border-black/5 shadow-xl'}`}>
                <div className="flex items-center gap-3 mb-4">
                  <span className="px-2 py-0.5 bg-[#af3000]/10 text-[#af3000] rounded text-[10px] font-black uppercase tracking-widest border border-[#af3000]/20">New Arrival</span>
                  <span className="text-zinc-500 text-[10px] font-black tracking-widest uppercase">SKU: 0B-PRIME-77X</span>
                </div>
                <h1 className="text-4xl md:text-5xl font-black tracking-tighter uppercase leading-none mb-4">{product.name}</h1>
                <p className="text-lg text-zinc-500 leading-relaxed font-medium">{product.description || "High-fidelity acoustic isolation meets decentralized ledger tracking. The ultimate tool for the modern supplier network."}</p>
              </div>

              <div className="bg-zinc-950 p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden border border-white/5">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                  <Shield className="w-24 h-24 text-[#af3000]" />
                </div>
                <div className="relative z-10">
                  <p className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.2em] mb-2">Prime Wholesale Price</p>
                  <div className="flex items-baseline gap-2 mb-8">
                    <span className="text-5xl font-black text-white">{product.price}</span>
                    <span className="bg-[#af3000] text-white px-2 py-1 rounded text-[10px] font-black ml-4">SAVE 17%</span>
                    {product.is_cashback_eligible && (
                      <span className="bg-primary text-black px-3 py-1 rounded-full text-[10px] font-black ml-4 animate-pulse shadow-[0_0_15px_rgba(255,92,40,0.5)]">
                        100% BACK
                      </span>
                    )}
                  </div>
                  <div className="space-y-4 mb-8">
                    <button 
                      onClick={() => onAddToCart(product)}
                      className="w-full py-5 bg-gradient-to-br from-[#af3000] to-[#ff5c28] text-white rounded-2xl font-black text-lg shadow-lg hover:brightness-110 active:scale-[0.98] transition-all uppercase tracking-widest"
                    >
                      Secure Units (Add to Cart)
                    </button>
                    <button className="w-full py-5 bg-white/5 text-zinc-300 rounded-2xl font-bold text-lg hover:bg-white/10 transition-colors border border-white/10 uppercase tracking-widest">
                      Flash Lease: $110/mo
                    </button>
                  </div>
                  <div className="flex items-center justify-between text-[10px] font-black text-zinc-500 border-t border-white/5 pt-6 uppercase tracking-widest">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span>Instant Delivery</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-green-500" />
                      <span>2-Year Prime Warranty</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Specs Card */}
              <div className={`rounded-3xl p-8 border ${isDark ? 'bg-zinc-900/50 border-white/5' : 'bg-white border-black/5 shadow-xl'}`}>
                <h3 className="text-lg font-black mb-6 flex items-center gap-2 uppercase">
                  <Activity className="w-5 h-5 text-[#af3000]" />
                  Core Specifications
                </h3>
                <div className="grid grid-cols-2 gap-y-6 gap-x-4">
                  {[
                    { label: 'Audio Profile', value: '32-bit Hi-Res Crystal' },
                    { label: 'Battery Cell', value: '120-Hr Active Cycle' },
                    { label: 'Connectivity', value: 'Quantum-Link 5.0' },
                    { label: 'Weight', value: '245g Carbon Fiber' }
                  ].map((spec, i) => (
                    <div key={i}>
                      <p className="text-[9px] uppercase font-black text-zinc-500 mb-1 tracking-widest">{spec.label}</p>
                      <p className="text-sm font-bold">{spec.value}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Supplier Scorecard */}
              <div className={`rounded-3xl p-6 border ${isDark ? 'bg-zinc-900/50 border-white/5' : 'bg-[#af3000]/5 border-[#af3000]/10'}`}>
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-xl bg-zinc-950 flex items-center justify-center text-[#af3000] font-black text-xl">S.X</div>
                    <div>
                      <p className="font-black text-sm uppercase">Sentient X-Port</p>
                      <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Primary Hub Supplier</p>
                    </div>
                  </div>
                  <span className="text-green-500 bg-green-500/10 px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest">A+ Rating</span>
                </div>
                <div className="flex items-center justify-around py-4 border-y border-zinc-800/30 text-center">
                  {[
                    { val: '99.8%', label: 'Fulfillment' },
                    { val: '<12h', label: 'Response' },
                    { val: '5.2k', label: 'Contracts' }
                  ].map((s, i) => (
                    <React.Fragment key={i}>
                      <div>
                        <p className="text-xs font-black">{s.val}</p>
                        <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest">{s.label}</p>
                      </div>
                      {i < 2 && <div className="w-px h-6 bg-zinc-800/30"></div>}
                    </React.Fragment>
                  ))}
                </div>
                <button className="w-full mt-6 text-[10px] font-black text-[#af3000] hover:underline uppercase tracking-widest">View Verified Supplier Dossier</button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Floating AI Butler */}
      <div className="fixed bottom-8 right-8 z-50 group">
        <div className="absolute inset-0 bg-[#af3000] rounded-full blur-xl opacity-20 group-hover:opacity-40 transition-opacity"></div>
        <button className="relative h-16 w-16 bg-zinc-950 rounded-full flex items-center justify-center text-white shadow-2xl hover:scale-110 active:scale-95 transition-all border border-white/10">
          <Bot className="w-8 h-8 text-[#af3000]" />
        </button>
        <div className="absolute bottom-20 right-0 w-72 bg-zinc-950/95 backdrop-blur-xl p-6 rounded-[2rem] shadow-2xl border border-white/5 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all translate-y-4 group-hover:translate-y-0 duration-500">
          <div className="flex items-center gap-2 mb-4">
            <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
            <p className="text-[10px] font-black text-white uppercase tracking-[0.2em]">Prime Butler Active</p>
          </div>
          <p className="text-sm text-zinc-400 mb-6 font-medium italic leading-relaxed">"I've analyzed 24 current biddings. This is the lowest price for this SKU in the last 14 days."</p>
          <div className="space-y-2">
            <button className="w-full py-3 bg-white/5 hover:bg-white/10 rounded-xl text-[10px] font-black text-zinc-300 transition-all uppercase tracking-widest border border-white/5">Compare Prices</button>
            <button className="w-full py-3 bg-[#af3000]/10 hover:bg-[#af3000]/20 rounded-xl text-[10px] font-black text-[#af3000] transition-all uppercase tracking-widest border border-[#af3000]/20">Bulk Negotiation</button>
          </div>
        </div>
      </div>

      {/* Reviews Modal */}
      <AnimatePresence>
        {showReviewsModal && (
          <ReviewsModal 
            onClose={() => setShowReviewsModal(false)} 
            isDark={isDark} 
            reviews={reviews} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function ReviewsModal({ onClose, isDark, reviews: initialReviews }: { onClose: () => void; isDark: boolean; reviews: any[] }) {
  const [visibleCount, setVisibleCount] = useState(15);
  const [isLoading, setIsLoading] = useState(false);
  const observerTarget = useRef(null);

  const anonymizeName = (name: string) => {
    if (name.length <= 2) return name;
    return `${name[0]}***${name[name.length - 1]}`;
  };

  // Generate mock reviews to simulate a large dataset
  const allReviews = React.useMemo(() => {
    const extended = [...initialReviews];
    const templates = [
      "The procurement process was exceptionally streamlined. Highly recommended for bulk orders.",
      "High-fidelity output confirmed via laboratory testing. Perfect for our next product line.",
      "Impressive lead times and consistent quality across multiple shipments.",
      "The automated bidding system secured us a price point we couldn't find elsewhere.",
      "Professional packaging and clear documentation. A top-tier supplier."
    ];
    const users = ["Nexus Logistics", "Quant-Supply", "GlobalTrade Co", "Industrial Core", "Streamline Hub"];
    const avatars = [
      "https://lh3.googleusercontent.com/aida-public/AB6AXuALYkiJFv_mJ-feVOL_a5qsi9gstMZn48i69SUncTVpDhk5SQwnvrBF2EynnANm-nKWEBJTAIyMhRekA5bzTrSlVyqb_JN-TAuDNBQpZexEHKYohMN4MF5XnHAd5b6kwwJchCThkHMUTkpU9iaL_fKm8aUmyvhhQayu7zhJpw6lCOYCAgdIwczggzvXt5uKXCNL7HUWZ0IRUJvJbq4CGlvkGHhvoW9QSy557n45hld9ymhLgYflEHRvFrFbKqoQHPwAOkRZw3lSj5Kk",
      "https://lh3.googleusercontent.com/aida-public/AB6AXuBAGvACccaowURsjsAfrrRCTVan3mrq_I4hY9Tz2qqhFJ9dIaeEVxCKWltvo7W_ugbFixzix7XxFY6o7n7S76N5D-tpoeayZBOG0uPyr747ljUxfpQNuTVE2udf1jnl-eWbzCOfK2ksj2V2jD-1nqgAXb1GMsWzg02ndi0h4X6uD5CSPMwKLSfpaflEjd80T-9NB7tB6vdo_H-GWP5ETjVlTUxoPSHK-EuWWaTBBwFDDnxEbxyZ5QEqz8kYifYmqcsQP_rEK92OtFZF"
    ];
    const flags = [
      "https://flagcdn.com/w40/us.png",
      "https://flagcdn.com/w40/gb.png",
      "https://flagcdn.com/w40/de.png",
      "https://flagcdn.com/w40/fr.png",
      "https://flagcdn.com/w40/jp.png",
      "https://flagcdn.com/w40/cn.png"
    ];

    for (let i = 0; i < 100; i++) {
      extended.push({
        id: `mock-${i}`,
        date: `January ${Math.floor(Math.random() * 30) + 1}, 2026`,
        user: users[i % users.length],
        avatar: avatars[i % avatars.length],
        flag: flags[i % flags.length],
        content: templates[i % templates.length]
      });
    }
    return extended;
  }, [initialReviews]);

  const loadMore = useCallback(() => {
    if (visibleCount < allReviews.length && !isLoading) {
      setIsLoading(true);
      setTimeout(() => {
        setVisibleCount(prev => Math.min(prev + 15, allReviews.length));
        setIsLoading(false);
      }, 800);
    }
  }, [visibleCount, allReviews.length, isLoading]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting) {
          loadMore();
        }
      },
      { threshold: 1.0 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [loadMore]);

  const visibleReviews = allReviews.slice(0, visibleCount);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 cursor-pointer"
    >
      <motion.div 
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-2xl h-[90vh] sm:h-[80vh] rounded-t-[3rem] sm:rounded-[3rem] overflow-hidden flex flex-col shadow-2xl cursor-default border border-white/5 ${isDark ? 'bg-zinc-950 text-white' : 'bg-white text-[#271814]'}`}
      >
        {/* Modal Header */}
        <div className="relative px-8 py-6 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 rounded-xl bg-[#af3000]/10 flex items-center justify-center text-[#af3000]">
              <Star className="w-5 h-5 fill-current" />
            </div>
            <div>
              <h2 className="text-xl font-black uppercase tracking-tight">Market Reviews</h2>
              <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-[0.2em]">Verified Supplier Feedback</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-10 h-10 rounded-full hover:bg-white/5 flex items-center justify-center transition-colors group"
          >
            <X className="w-5 h-5 text-zinc-500 group-hover:text-white transition-colors" />
          </button>
        </div>

        {/* Modal Content Scroll Area */}
        <div className="flex-1 overflow-y-auto p-8 space-y-10 no-scrollbar">
          {/* Rating Summary */}
          <div className="flex flex-col md:flex-row items-center gap-10 p-8 rounded-[2rem] bg-white/5 border border-white/5">
            <div className="text-center md:text-left">
              <span className="text-6xl font-black text-[#af3000]">4.9</span>
              <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest mt-2">Overall Score</p>
            </div>
            <div className="flex-1 w-full space-y-4">
              {[
                { label: 'Audio Quality', score: '9.5', width: '95%' },
                { label: 'Build Material', score: '8.8', width: '88%' },
                { label: 'Market Value', score: '9.2', width: '92%' }
              ].map((stat, i) => (
                <div key={i} className="flex items-center gap-6">
                  <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 w-24">{stat.label}</span>
                  <div className="flex-1 h-1.5 bg-zinc-900 rounded-full overflow-hidden">
                    <div className="h-full bg-[#af3000]" style={{ width: stat.width }}></div>
                  </div>
                  <span className="text-xs font-black w-8 text-right">{stat.score}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Review List */}
          <div className="space-y-6">
            <h3 className="text-sm font-black uppercase tracking-[0.2em] text-zinc-500 pl-2">Supplier Dossiers ({allReviews.length})</h3>
            {visibleReviews.map((review, i) => (
              <div key={i} className={`p-8 rounded-[2rem] border transition-all hover:border-[#af3000]/20 ${isDark ? 'bg-zinc-900/30 border-white/5' : 'bg-zinc-50 border-black/5'}`}>
                <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center gap-4">
                      <img className="h-12 w-12 rounded-2xl object-cover border border-white/10" src={review.avatar} alt={review.user} />
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-black text-sm uppercase">{anonymizeName(review.user)}</h4>
                        <img className="h-3 w-4 object-cover rounded-sm opacity-80" src={review.flag} alt="flag" />
                      </div>
                      <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Verified Tier 1 Buyer</p>
                    </div>
                    </div>
                  <div className="text-right">
                    <div className="flex text-[#af3000] gap-0.5 mb-1">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star key={s} className="w-3 h-3 fill-current" />
                      ))}
                    </div>
                    <span className="text-[9px] text-zinc-600 font-bold uppercase tracking-widest">{review.date}</span>
                  </div>
                </div>
                <p className="text-sm leading-relaxed text-zinc-400 italic font-medium px-2 border-l-2 border-[#af3000]/30 ml-2">
                  "{review.content}"
                </p>
              </div>
            ))}

            {/* Loading Indicator / Intersection Target */}
            <div ref={observerTarget} className="py-10 flex flex-col items-center justify-center gap-4">
              {isLoading ? (
                <>
                  <div className="w-6 h-6 border-2 border-[#af3000] border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest animate-pulse">Decrypting more dossiers...</p>
                </>
              ) : visibleCount < allReviews.length ? (
                <div className="h-px w-full bg-transparent"></div>
              ) : (
                <div className="flex flex-col items-center gap-2 py-4">
                  <div className="h-px w-24 bg-zinc-800"></div>
                  <p className="text-[10px] font-black text-zinc-700 uppercase tracking-[0.2em]">End of Dossier Hub</p>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Footer */}
        <div className="p-8 border-t border-white/5 bg-zinc-950/50 backdrop-blur-md">
          <button 
            onClick={onClose}
            className="w-full py-4 bg-[#af3000] text-white rounded-2xl font-black uppercase tracking-[0.2em] text-xs shadow-2xl shadow-[#af3000]/20 hover:scale-[1.02] active:scale-95 transition-all"
          >
            Close Dossier
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
