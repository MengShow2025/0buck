import React, { useState, useEffect } from 'react';
import { Package, Search, Scale, CheckCircle2, Share2, Crown, Zap, ShieldCheck, Coins, ArrowRight, Star } from 'lucide-react';
import { useAppContext } from '../AppContext';
import { productApi } from '../../../services/api';

const MOCK_PRODUCTS = [
  {
    id: 'mock-1',
    title: 'Artisan Wireless Earbuds Pro',
    price: 29.99,
    originalPrice: 59.99,
    image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&q=80',
    supplier: 'Nordic Audio Lab',
    dimensions: '10×10×5 cm',
    weight: '0.15 kg'
  },
  {
    id: 'mock-2',
    title: 'Titanium Minimalist Watch',
    price: 149.00,
    originalPrice: 298.00,
    image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500&q=80',
    supplier: 'Swiss Craft Co.',
    dimensions: '4×4×1 cm',
    weight: '0.12 kg'
  },
  {
    id: 'mock-3',
    title: 'Premium Leather Messenger Bag',
    price: 89.00,
    originalPrice: 179.00,
    image: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=500&q=80',
    supplier: 'Vega Leather Works',
    dimensions: '40×30×12 cm',
    weight: '0.85 kg'
  },
  {
    id: 'mock-4',
    title: 'Mechanical Keyboard — Compact TKL',
    price: 119.00,
    originalPrice: 239.00,
    image: 'https://images.unsplash.com/photo-1618384887929-16ec33fab9ef?w=500&q=80',
    supplier: 'MechLab Studio',
    dimensions: '36×13×4 cm',
    weight: '0.92 kg'
  },
  {
    id: 'mock-5',
    title: 'Ceramic Pour-Over Coffee Set',
    price: 54.99,
    originalPrice: 99.99,
    image: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=500&q=80',
    supplier: 'Morning Ritual Co.',
    dimensions: '20×15×12 cm',
    weight: '0.65 kg'
  },
  {
    id: 'mock-6',
    title: 'Handcrafted Walnut Desk Organizer',
    price: 67.00,
    originalPrice: 128.00,
    image: 'https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=500&q=80',
    supplier: 'Forest & Form',
    dimensions: '30×20×10 cm',
    weight: '0.75 kg'
  }
];

export const PrimeDrawer: React.FC = () => {
  const { setActiveDrawer, setSelectedProductId, pushDrawer, currency, getExchangeRate, t, userLevel, isPrime, setIsPrime, userCountry } = useAppContext();
  const [isLoading, setIsLoading] = useState(true);
  const [products, setProducts] = useState<any[]>([]);

  useEffect(() => {
    const fetchProducts = async () => {
      setIsLoading(true);
      try {
        const resp = await productApi.getDiscovery(userCountry);
        const normalized = (resp.data?.products || []).map((p: any) => {
          const price = Number(p?.price ?? 0);
          const originalPrice = Number(p?.original_price ?? p?.originalPrice ?? p?.price ?? 0);
          return {
            ...p,
            checkoutReady: p?.checkout_ready !== false,
            checkoutBlockReason: p?.checkout_block_reason,
            price: Number.isFinite(price) ? price : 0,
            originalPrice: Number.isFinite(originalPrice) ? originalPrice : (Number.isFinite(price) ? price : 0),
            dimensions: p?.dimensions ?? p?.structural_data?.dimensions ?? '-',
            weight: p?.weight ?? p?.structural_data?.weight ?? '-',
          };
        });
        setProducts(normalized.length > 0 ? normalized : MOCK_PRODUCTS);
      } catch (error) {
        setProducts(MOCK_PRODUCTS);
      } finally {
        setIsLoading(false);
      }
    };
    fetchProducts();
  }, []);

  const rate = getExchangeRate(currency);
  const currencySymbol = currency === 'JPY' ? '¥' : currency === 'CNY' ? '¥' : currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : '$';

  const formatPrice = (usdPrice: number) => {
    return (usdPrice * rate).toLocaleString(undefined, {
      minimumFractionDigits: currency === 'JPY' ? 0 : 2,
      maximumFractionDigits: currency === 'JPY' ? 0 : 2
    });
  };

  const blockedReasonText = (reason?: string) => {
    if (reason === 'inactive') return t('checkout.block_reason.inactive');
    if (reason === 'missing_price') return t('checkout.block_reason.missing_price');
    if (reason === 'not_published') return t('checkout.block_reason.not_published');
    return t('checkout.blocked_unavailable');
  };

  const handleShare = (e: React.MouseEvent, productId: string) => {
    e.stopPropagation();
    console.log(`Sharing product: ${productId} via Direct Referral link`);
  };

  const benefits = [
    { icon: Zap, title: '1.2x Balance Value', desc: 'Every $1 balance covers $1.2 in checkout', color: 'text-orange-500', bg: 'bg-orange-50' },
    { icon: Coins, title: 'Zero Fee Withdraw', desc: 'No processing fees for all withdrawals', color: 'text-blue-500', bg: 'bg-blue-50' },
    { icon: Star, title: 'Cashback Boost', desc: 'Up to 2x higher odds for daily big wins', color: 'text-purple-500', bg: 'bg-purple-50' },
    { icon: ShieldCheck, title: 'Priority Support', desc: '24/7 dedicated AI & Human concierge', color: 'text-[var(--wa-teal)]', bg: 'bg-[var(--wa-teal)]/10' }
  ];

  return (
    <div className="flex flex-col h-full bg-[#F2F2F7] dark:bg-[#000000] overflow-y-auto no-scrollbar pb-32">
      {/* Verified Artisan Goods Header */}
      <div className="px-4 mb-4 flex items-center justify-between pt-6">
        <h3 className="text-[12px] font-black text-gray-400 uppercase tracking-widest ml-1">Verified Artisan Goods</h3>
        <button className="text-[10px] font-semibold text-[var(--wa-teal)] uppercase tracking-widest flex items-center gap-1 active:scale-95">
          View All <ArrowRight className="w-3 h-3" />
        </button>
      </div>

      {/* Search Bar */}
      <div className="px-4 mb-4">
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-[var(--wa-teal)] transition-colors" />
          <input 
            type="text" 
            placeholder="Search verified artisan goods..." 
            className="w-full bg-white dark:bg-[#1C1C1E] text-gray-800 dark:text-gray-200 text-[15px] rounded-[24px] py-4 pl-11 pr-4 outline-none border border-gray-100 dark:border-white/5 shadow-sm focus:ring-2 focus:ring-[var(--wa-teal)] transition-all"
          />
        </div>
      </div>

      {/* Product Grid - Masonry Layout */}
      <div className="px-3 columns-2 gap-3 space-y-3">
        {isLoading ? (
          // Skeleton Loader for Product Grid
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="break-inside-avoid bg-white dark:bg-[#1C1C1E] rounded-[24px] overflow-hidden border border-gray-100 dark:border-white/5 flex flex-col animate-pulse">
              <div className="aspect-square bg-gray-100 dark:bg-gray-800" />
              <div className="p-3 space-y-2">
                <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded-lg w-full" />
                <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded-lg w-2/3" />
                <div className="flex justify-between pt-2">
                  <div className="h-5 bg-gray-100 dark:bg-gray-800 rounded-lg w-1/3" />
                  <div className="h-5 bg-gray-100 dark:bg-gray-800 rounded-lg w-1/4" />
                </div>
              </div>
            </div>
          ))
        ) : (
          products.map((product) => (
            <div 
              key={product.id} 
              onClick={() => {
                if (product.checkoutReady === false) return;
                setSelectedProductId(String(product.id));
                pushDrawer('product_detail');
              }}
              className={`break-inside-avoid bg-white dark:bg-[#1C1C1E] rounded-[24px] overflow-hidden shadow-[0_10px_30px_-10px_rgba(0,0,0,0.1)] border border-gray-100 dark:border-white/5 flex flex-col transition-all group ${product.checkoutReady === false ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer active:scale-95'}`}
              title={product.checkoutReady === false ? blockedReasonText(product.checkoutBlockReason) : undefined}
            >
              {/* Image (Optimized to 1:1) */}
              <div className="relative bg-gray-100 dark:bg-gray-800 overflow-hidden aspect-square">
                <img 
                  src={product.image} 
                  alt={product.title} 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" 
                  crossOrigin="anonymous"
                  referrerPolicy="no-referrer"
                />

                {product.checkoutReady === false && (
                  <div className="absolute left-2 top-2 z-10 bg-black/55 text-white text-[9px] font-bold px-2 py-1 rounded-full border border-white/15">
                    {blockedReasonText(product.checkoutBlockReason)}
                  </div>
                )}
                
                {/* Floating Share Button on Card - Always Visible */}
                <button 
                  onClick={(e) => handleShare(e, product.id)}
                  className="absolute top-2 right-2 z-10 w-7 h-7 bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center text-white border border-white/10 shadow-lg transition-all hover:bg-orange-600 active:scale-90"
                >
                  <Share2 className="w-3.5 h-3.5" />
                </button>
              </div>
              
              {/* Content */}
              <div className="p-3 flex flex-col flex-1 space-y-2">
                <h3 className="text-[13px] font-black text-gray-900 dark:text-white leading-tight line-clamp-2 italic tracking-tight">
                  {product.title}
                </h3>
                
                {/* Supplier */}
                <div 
                  onClick={(e) => {
                    e.stopPropagation();
                    pushDrawer('supplier_analysis');
                  }}
                  className="flex items-center gap-1 cursor-pointer hover:opacity-80 active:scale-95 transition-all w-fit"
                >
                  <CheckCircle2 className="w-3 h-3 text-[var(--wa-teal)]" />
                  <span className="text-[10px] text-[var(--wa-teal)] font-black uppercase tracking-tighter underline decoration-[var(--wa-teal)]/30 underline-offset-2">
                    {product.supplier}
                  </span>
                </div>

                {/* Info Row: Dimensions & Weight */}
                <div className="flex items-center gap-2 text-[10px] text-gray-400 font-bold">
                  <div className="flex items-center gap-1">
                    <Package className="w-3 h-3" />
                    <span>{product.dimensions}</span>
                  </div>
                  <div className="flex items-center gap-1 border-l border-gray-100 dark:border-white/10 pl-2">
                    <Scale className="w-3 h-3" />
                    <span>{product.weight}</span>
                  </div>
                </div>

                {/* Pricing & Discount Row */}
                <div className="flex items-start justify-between pt-1">
                  <div className="flex flex-col">
                    <div className="flex items-baseline gap-1">
                      <span className="text-[var(--wa-teal)] font-black text-[18px] leading-none tracking-tighter">
                        {currencySymbol}{formatPrice(product.price)}
                      </span>
                      <span className="text-gray-400 text-[10px] line-through font-bold opacity-30">
                        {currencySymbol}{formatPrice(product.originalPrice ?? product.price)}
                      </span>
                    </div>
                    {/* 100% BACK (Small label below price) */}
                    <div className="mt-1 flex">
                      <span className="text-[8px] font-black text-orange-600 dark:text-orange-400 bg-orange-500/10 px-1.5 py-0.5 rounded-full border border-orange-500/10 uppercase tracking-tight">
                        {t('product.full_back')}
                      </span>
                    </div>
                  </div>
                  {/* Prominent Discount Badge (Glassmorphism Red) */}
                  <div className="bg-red-500/10 text-red-500 backdrop-blur-xl border border-red-500/10 text-[10px] font-black px-2 py-1 rounded-lg shadow-sm uppercase tracking-tighter mt-0.5">
                    -{Math.round((1 - product.price / (product.originalPrice || product.price || 1)) * 100)}% OFF
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
