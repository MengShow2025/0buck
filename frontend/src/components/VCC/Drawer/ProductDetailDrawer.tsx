import { Package, ShieldCheck, ShoppingCart, ChevronLeft, ChevronRight, Star, MapPin, Calendar, Info, Zap, Award, CheckCircle2, Truck, Timer, Minus, Plus, Scale, Box, Users, TrendingUp, Share2 } from 'lucide-react';
import { useAppContext } from '../AppContext';
import { useEffect, useMemo, useState } from 'react';
import { imApi, productApi } from '../../../services/api';
import { getCheckoutBlockReasonText } from '../utils/checkoutBlockReason';

export const ProductDetailDrawer: React.FC = () => {
  const { setActiveDrawer, pushDrawer, popDrawer, selectedProductId, t, currency, getExchangeRate } = useAppContext();
  const [quantity, setQuantity] = useState(1);
  const [selectedVarIndex, setSelectedVarIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [detail, setDetail] = useState<any | null>(null);

  const rate = getExchangeRate(currency);
  const currencySymbol = currency === 'JPY' ? '¥' : currency === 'CNY' ? '¥' : currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : '$';

  const formatPrice = (usdPrice: number | string) => {
    const val = typeof usdPrice === 'string' ? parseFloat(usdPrice) : usdPrice;
    return (val * rate).toLocaleString(undefined, {
      minimumFractionDigits: currency === 'JPY' ? 0 : 2,
      maximumFractionDigits: currency === 'JPY' ? 0 : 2
    });
  };

  const handleShare = async () => {
    try {
      const numericId = Number(selectedProductId);
      const payload =
        Number.isFinite(numericId) && numericId > 0
          ? {
              card_type: 'product' as const,
              target_type: 'product' as const,
              target_id: numericId,
              share_category: 'distribution' as const,
              entry_type: 'product_detail_share',
            }
          : {
              card_type: 'invite' as const,
              target_type: 'none' as const,
              share_category: 'distribution' as const,
              entry_type: 'product_detail_share',
            };
      const resp = await imApi.generatePromoCard(payload);
      const link = resp.data?.universal_link || resp.data?.link || resp.data?.short_link;
      if (link) {
        await navigator.clipboard.writeText(String(link));
        alert('分销本商品链接已复制');
      } else {
        alert('暂未生成分享链接');
      }
    } catch (_e) {
      alert('分享链接生成失败，请稍后重试');
    }
  };

  const DEMO_PRODUCTS: Record<string, any> = {
    'demo-1': { title: 'Artisan Wireless Earbuds Pro', price: 29.99, original_price: 59.99, image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80', mirror_assets: ['https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80','https://images.unsplash.com/photo-1484704849700-f032a568e944?w=800&q=80','https://images.unsplash.com/photo-1606220945770-b5b6c2c55bf1?w=800&q=80'], supplier: 'Nordic Audio Lab', structural_data: { dimensions: '10×10×5 cm', weight: '0.15 kg', freight_fee: 0, shipping_days: '5-7 days', vendor_rating: 4.9 } },
    'demo-2': { title: 'Titanium Minimalist Watch', price: 149.00, original_price: 298.00, image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&q=80', mirror_assets: ['https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&q=80','https://images.unsplash.com/photo-1614164185128-e4ec99c436d7?w=800&q=80','https://images.unsplash.com/photo-1542496658-e33a6d0d48f6?w=800&q=80'], supplier: 'Swiss Craft Co.', structural_data: { dimensions: '4×4×1 cm', weight: '0.12 kg', freight_fee: 0, shipping_days: '7-10 days', vendor_rating: 4.8 } },
    'demo-3': { title: 'Premium Leather Messenger Bag', price: 89.00, original_price: 179.00, image: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=800&q=80', mirror_assets: ['https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=800&q=80','https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&q=80','https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=800&q=80'], supplier: 'Vega Leather Works', structural_data: { dimensions: '40×30×12 cm', weight: '0.85 kg', freight_fee: 4.99, shipping_days: '5-8 days', vendor_rating: 4.7 } },
    'demo-4': { title: 'Mechanical Keyboard — Compact TKL', price: 119.00, original_price: 239.00, image: 'https://images.unsplash.com/photo-1618384887929-16ec33fab9ef?w=800&q=80', mirror_assets: ['https://images.unsplash.com/photo-1618384887929-16ec33fab9ef?w=800&q=80','https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=800&q=80','https://images.unsplash.com/photo-1600861194942-f883de0dfe96?w=800&q=80'], supplier: 'MechLab Studio', structural_data: { dimensions: '36×13×4 cm', weight: '0.92 kg', freight_fee: 0, shipping_days: '3-5 days', vendor_rating: 4.9 } },
    'demo-5': { title: 'Ceramic Pour-Over Coffee Set', price: 54.99, original_price: 99.99, image: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800&q=80', mirror_assets: ['https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800&q=80','https://images.unsplash.com/photo-1459755486867-b55449bb39ff?w=800&q=80','https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&q=80'], supplier: 'Morning Ritual Co.', structural_data: { dimensions: '20×15×12 cm', weight: '0.65 kg', freight_fee: 2.99, shipping_days: '4-6 days', vendor_rating: 4.8 } },
  };

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      // Check demo product IDs first (string-based, no API call needed)
      if (selectedProductId && DEMO_PRODUCTS[selectedProductId]) {
        if (!cancelled) {
          setDetail(DEMO_PRODUCTS[selectedProductId]);
          setIsLoading(false);
        }
        return;
      }
      const id = Number(selectedProductId);
      if (!Number.isFinite(id) || id <= 0) {
        setIsLoading(false);
        setDetail(null);
        return;
      }
      setIsLoading(true);
      try {
        const resp = await productApi.getDetail(id);
        if (!cancelled) setDetail(resp.data);
      } catch (e) {
        if (!cancelled) setDetail(null);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [selectedProductId]);

  const product = useMemo(() => {
    if (!detail) {
      const fallbackImage = 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&q=80&w=800&fm=jpg';
      return {
        id: selectedProductId || '1',
        type: 'normal',
        title: '-',
        dimensions: '-',
        weight: '-',
        originalPrice: '0',
        shipping: { price: '0', time: '-' },
        rating: 4.5,
        reviewsCount: 0,
        company: '-',
        location: '-',
        joined: '-',
        images: [fallbackImage],
        variations: [{ name: 'Default', price: '0', image: fallbackImage }],
        keyAttributes: [],
        customization: [],
        supplier: { name: '-', verified: true, manufacturer: true, stats: [] },
        c2w: { target: 0, current: 0, endDate: '', price_discount: 0, priceDropRule: 'percent' }
      };
    }

    const images = Array.isArray(detail.mirror_assets) && detail.mirror_assets.length
      ? detail.mirror_assets
      : (detail.image ? [detail.image] : []);

    const safeImages = images.length ? images : ['https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&q=80&w=800&fm=jpg'];

    const priceNum = Number(detail.price ?? 0);
    const originalNum = Number(detail.original_price ?? detail.price ?? 0);

    // Build variation names based on images count
    const variationNames = ['Main', 'Detail', 'Lifestyle', 'Packaging', 'Color'];

    return {
      id: String(detail.id ?? selectedProductId ?? '1'),
      checkoutReady: Boolean(detail.checkout_ready ?? true),
      checkoutBlockReason: String(detail.checkout_block_reason ?? ''),
      type: 'normal',
      title: String(detail.title ?? '-'),
      dimensions: String(detail.structural_data?.dimensions ?? '-'),
      weight: String(detail.structural_data?.weight ?? '-'),
      originalPrice: String(Number.isFinite(originalNum) ? originalNum : (Number.isFinite(priceNum) ? priceNum : 0)),
      shipping: {
        price: String(detail.structural_data?.freight_fee ?? '0'),
        time: String(detail.structural_data?.shipping_days ?? '-')
      },
      rating: Number(detail.structural_data?.vendor_rating ?? 4.5),
      reviewsCount: 0,
      company: String(detail.supplier ?? '-'),
      location: '-',
      joined: '-',
      images: safeImages,
      warehouse_anchor: String(detail.warehouse_anchor ?? 'CN'),
      inventory: Number(detail.inventory ?? 0),
      variations: safeImages.map((img: string, idx: number) => ({
        name: variationNames[idx] ?? `Option ${idx + 1}`,
        price: String(Number.isFinite(priceNum) ? priceNum : 0),
        image: img
      })),
      keyAttributes: detail.structural_data?.key_attributes ?? [],
      customization: [],
      supplier: {
        name: String(detail.supplier ?? '-'),
        verified: true,
        manufacturer: true,
        stats: [
          { label: t('supplieranalysis.on_time_delivery_rate'), value: String(detail.structural_data?.shipping_days ?? '-') },
          { label: t('supplieranalysis.average_response_time'), value: '-' },
        ]
      },
      c2w: { target: 0, current: 0, endDate: '', price_discount: 0, priceDropRule: 'percent' }
    };
  }, [detail, selectedProductId, t]);

  const isCampaign = product.type === 'presale' || product.type === 'crowdfunding';
  const themeBg = isCampaign ? 'bg-orange-600' : 'bg-[#E8450A]';
  const themeBorder = isCampaign ? 'border-orange-600' : 'border-[#E8450A]';
  const themeText = isCampaign ? 'text-orange-600' : 'text-[#E8450A]';

  // Calculate dynamic price drop based on participation
  const safeVarIndex = Math.max(0, Math.min(selectedVarIndex, product.variations.length - 1));
  const safeVariation = product.variations[safeVarIndex] || product.variations[0];
  const basePrice = parseFloat(safeVariation.price);
  const maxDropPercent = 30;
  let finalPrice = basePrice;
  let priceDropPercent = 0;
  let dropAmount = 0;
  
  if (isCampaign && product.c2w.current > product.c2w.target) {
    const extraCount = product.c2w.current - product.c2w.target;
    
    if (product.c2w.priceDropRule === 'percent') {
      // Rule 1: 1% over = 2% drop
      const overflowPercent = (extraCount / product.c2w.target) * 100;
      priceDropPercent = Math.min(overflowPercent * 2, maxDropPercent);
      finalPrice = basePrice * (1 - priceDropPercent / 100);
    } else {
      // Rule 2: $1 per extra person
      dropAmount = Math.min(extraCount, basePrice * (maxDropPercent / 100));
      finalPrice = basePrice - dropAmount;
      priceDropPercent = (dropAmount / basePrice) * 100;
    }
  }

  const currentPriceDisplay = finalPrice.toFixed(2);
  const totalPrice = (finalPrice * quantity).toFixed(2);

  if (isLoading) return (
    <div className="flex flex-col bg-[#F2F2F7] dark:bg-[#000000] relative pb-40 animate-pulse">
      {/* Top image skeleton */}
      <div className="aspect-square w-full bg-gray-200 dark:bg-white/5 animate-pulse shrink-0" />

      {/* Thumbnail strip skeleton */}
      <div className="flex gap-3 px-5 py-4 bg-white dark:bg-[#1C1C1E] border-b border-gray-50 dark:border-white/5">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className="w-20 h-20 rounded-xl bg-gray-200 dark:bg-white/5 shrink-0" />
        ))}
      </div>

      {/* Title and rating skeleton */}
      <div className="bg-white dark:bg-[#1C1C1E] p-5 space-y-3 mt-2">
        <div className="h-5 bg-gray-200 dark:bg-white/5 rounded-full w-3/4" />
        <div className="h-4 bg-gray-200 dark:bg-white/5 rounded-full w-1/3" />
        <div className="h-3 bg-gray-200 dark:bg-white/5 rounded-full w-1/2" />
      </div>

      {/* Price skeleton */}
      <div className="mt-2 bg-white dark:bg-[#1C1C1E] p-5 space-y-3">
        <div className="h-10 bg-gray-200 dark:bg-white/5 rounded-full w-2/5" />
        <div className="h-4 bg-gray-200 dark:bg-white/5 rounded-full w-1/4" />
      </div>

      {/* Action buttons skeleton */}
      <div className="absolute bottom-0 left-0 right-0 bg-white/80 dark:bg-[#000000]/80 backdrop-blur-3xl border-t border-white/40 dark:border-white/10 p-6 pb-12 flex gap-4 z-40">
        <div className="flex-1 h-16 rounded-[32px] bg-gray-200 dark:bg-white/5" />
        <div className="flex-1 h-16 rounded-[32px] bg-gray-200 dark:bg-white/5" />
      </div>
    </div>
  );

  return (
    <div className="flex flex-col bg-[#F2F2F7] dark:bg-[#000000] relative pb-40">
      {/* 1. Main Product Featured Image (Explicit aspect ratio) */}
      <div className="relative w-full aspect-square bg-gray-200 dark:bg-white/5 overflow-hidden shrink-0 shadow-inner">
        {/* Campaign Label Badge */}
        {isCampaign && (
          <div className="absolute top-4 right-4 z-30 bg-orange-600 text-white text-[11px] font-black px-4 py-1.5 rounded-full shadow-xl uppercase tracking-widest animate-pulse border border-white/20">
            {product.type === 'presale' ? t('product.presale_in_progress') : t('product.crowdfunding_in_progress')}
          </div>
        )}

        {/* Global Share Button */}
        <div className="absolute top-4 left-4 z-30 group/share">
          <button onClick={handleShare} className="w-10 h-10 bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center text-white border border-white/20 shadow-xl active:scale-90 transition-all hover:bg-orange-600 hover:border-orange-400">
            <Share2 className="w-5 h-5" />
          </button>
          <div className="absolute left-12 top-1/2 -translate-y-1/2 bg-orange-600 text-white text-[10px] font-black px-2 py-1 rounded opacity-0 group-hover/share:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-lg uppercase tracking-tight">
            {t('common.share_earn')}
          </div>
        </div>

        <img
          src={safeVariation.image}
          alt="Featured"
          className="w-full h-full object-cover transition-all duration-700 ease-in-out transform hover:scale-105"
          crossOrigin="anonymous"
          referrerPolicy="no-referrer"
          onError={(e) => {
            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&q=80&w=800&fm=jpg';
          }}
        />
        
        <div className="absolute bottom-4 right-4 bg-black/40 backdrop-blur-md text-white text-[11px] px-3 py-1 rounded-full border border-white/10 font-bold z-10 shadow-lg">
          {safeVarIndex + 1} / {product.variations.length}
        </div>
      </div>

      {/* 2. Horizontal Gallery Slider (Selection) - Use relative to ensure shadow and z-index if needed, but remove z-0/z-10 for now */}
      <div className="flex gap-3 px-5 py-4 overflow-x-auto no-scrollbar bg-white dark:bg-[#1C1C1E] border-b border-gray-50 dark:border-white/5 relative shrink-0 shadow-sm">
        {product.variations.map((v, idx) => (
          <div 
            key={idx} 
            onClick={() => setSelectedVarIndex(idx)}
            className={`w-20 h-20 rounded-xl overflow-hidden border-2 shrink-0 transition-all cursor-pointer ${
              selectedVarIndex === idx ? `${themeBorder} scale-105 shadow-xl z-10` : 'border-white/20 opacity-90'
            }`}
          >
            <img 
              src={v.image} 
              className="w-full h-full object-cover" 
              crossOrigin="anonymous"
              referrerPolicy="no-referrer"
            />
          </div>
        ))}
      </div>

      {/* C2W / Crowdfunding Progress Bar (Only for specific types) */}
      {isCampaign && (
        <div className="bg-white dark:bg-[#1C1C1E] px-5 pt-4 pb-2 relative shrink-0">
          <div className="bg-orange-500/5 dark:bg-orange-500/10 rounded-[24px] p-4 border border-orange-500/10 shadow-sm">
            <div className="flex justify-between items-center mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center text-white shadow-md animate-pulse">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[14px] font-black text-gray-900 dark:text-white uppercase tracking-tight">
                    {product.type === 'presale' ? t('product.presale_in_progress') : t('product.crowdfunding_in_progress')}
                  </span>
                  <div className="flex items-center gap-1.5 text-[11px] text-orange-600 font-bold">
                    <Timer className="w-3.5 h-3.5" />
                    <span>{t('product.time_remaining')} 12d 04:23:15</span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-[18px] font-black text-orange-600 dark:text-orange-400 tracking-tighter leading-none">
                  {Math.round((product.c2w.current / product.c2w.target) * 100)}%
                </div>
                <span className="text-[10px] text-gray-400 font-bold uppercase">{t('product.goal_reached')}</span>
              </div>
            </div>
            
            <div className="h-3 w-full bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden relative shadow-inner mb-2">
              <div 
                className="h-full bg-gradient-to-r from-orange-400 to-orange-600 rounded-full shadow-[0_0_15px_rgba(249,115,22,0.4)] transition-all duration-1000 ease-out" 
                style={{ width: `${(product.c2w.current / product.c2w.target) * 100}%` }} 
              />
            </div>
            
            <div className="flex justify-between text-[11px] font-black uppercase tracking-tight">
              <span className="text-gray-500">{t('product.current_participants')}{product.c2w.current}</span>
              <span className="text-gray-900 dark:text-white">{t('product.target_participants')}{product.c2w.target}</span>
            </div>
            
            {/* Dynamic Price Drop Message */}
            {priceDropPercent > 0 && (
              <div className="mt-3 bg-orange-600 text-white p-2.5 rounded-xl flex items-center gap-2 animate-bounce shadow-lg">
                <TrendingUp className="w-4 h-4" />
                <span className="text-[12px] font-black uppercase tracking-tight">
                  {t('product.price_dropping')}{priceDropPercent.toFixed(1)}%
                </span>
              </div>
            )}

            {/* Price Drop Curve Visualization */}
            <div className="mt-6 space-y-3">
              <div className="flex justify-between items-center">
                <h4 className="text-[11px] font-black text-gray-500 uppercase tracking-widest">{t('product.price_curve_title') || 'Price Drop Forecast'}</h4>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                  <span className="text-[10px] text-orange-600 font-bold uppercase">Live Updates</span>
                </div>
              </div>
              
              <div className="relative h-24 bg-gray-50 dark:bg-black/20 rounded-2xl border border-orange-500/5 overflow-hidden p-4">
                {/* SVG Curve */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="none">
                  <path 
                    d="M 0 60 Q 100 55, 200 45 T 400 20" 
                    fill="none" 
                    stroke="url(#curveGradient)" 
                    strokeWidth="3" 
                    className="animate-draw-curve"
                  />
                  <defs>
                    <linearGradient id="curveGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#f97316" stopOpacity="0.2" />
                      <stop offset="100%" stopColor="#f97316" stopOpacity="1" />
                    </linearGradient>
                  </defs>
                  
                  {/* Current Position Marker */}
                  <circle 
                    cx={`${(product.c2w.current / (product.c2w.target * 1.5)) * 100}%`} 
                    cy={45} 
                    r="4" 
                    fill="#f97316" 
                    className="animate-pulse"
                  />
                </svg>

                {/* Milestones Labels */}
                <div className="absolute inset-x-4 bottom-2 flex justify-between text-[8px] font-black text-gray-400 uppercase tracking-tighter">
                  <span>Target ({product.c2w.target})</span>
                  <span>10% OFF</span>
                  <span>20% OFF</span>
                  <span>30% MAX</span>
                </div>
              </div>
            </div>
            
            <p className="mt-3 text-[11px] text-gray-400 font-medium leading-relaxed italic border-t border-orange-500/5 pt-2">
              {t('product.refund_note')}
            </p>
          </div>
        </div>
      )}

      {/* 3. Product Header Info */}
      <div className="bg-white dark:bg-[#1C1C1E] p-5 space-y-3">
        <h1 className="text-[18px] font-black text-gray-900 dark:text-white leading-tight tracking-tight">
          {product.title}
        </h1>
        
        {/* Supplier Name */}
        <div className="flex items-center gap-1.5 -mt-1">
          <CheckCircle2 className={`w-3.5 h-3.5 ${themeText}`} />
          <span className={`text-[12px] ${themeText} font-black uppercase tracking-tight`}>
            {product.supplier.name}
          </span>
        </div>

        <div className="flex items-center gap-3 text-[14px] text-gray-500 font-bold">
          <div className="flex items-center gap-1.5">
            <Package className="w-4 h-4 text-gray-400" />
            <span>{product.dimensions}</span>
          </div>
          <div className="flex items-center gap-1.5 border-l border-gray-200 dark:border-white/10 pl-3">
            <Scale className="w-4 h-4 text-gray-400" />
            <span>{product.weight}</span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 pt-1">
          <div className="flex gap-0.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} className={`w-3.5 h-3.5 ${i < 4 ? 'text-amber-400 fill-amber-400' : 'text-gray-300'}`} />
            ))}
          </div>
          <span className="text-[13px] text-gray-500 font-black ml-1">{product.rating}</span>
          <span className="text-[12px] text-gray-400 font-bold ml-1">{t('product.reviews_count').replace('{count}', product.reviewsCount.toString())}</span>
        </div>
      </div>

      {/* 4. Variations Selection */}
      <div className="mt-2 bg-white dark:bg-[#1C1C1E] p-5">
        <h3 className="text-[14px] font-black text-gray-900 dark:text-white mb-3 uppercase tracking-wider">{t('product.variations_title')}</h3>
        <div className="flex flex-wrap gap-2">
          {product.variations.map((v, idx) => (
            <button 
              key={idx}
              onClick={() => setSelectedVarIndex(idx)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold border-2 transition-all ${
                selectedVarIndex === idx
                ? 'text-white border-transparent shadow-md'
                : 'bg-gray-50 dark:bg-white/5 border-transparent text-gray-500'
              }`}
              style={selectedVarIndex === idx ? { background: 'linear-gradient(135deg, #FF7A3D 0%, #E8450A 100%)' } : {}}
            >
              {v.name}
            </button>
          ))}
        </div>
      </div>

      {/* 5. Price Bar (Below Variations) */}
      <div className="mt-2 bg-white dark:bg-[#1C1C1E] p-5 border-t border-gray-50 dark:border-white/5">
        <div className="flex items-start justify-between">
          <div className="flex flex-col">
            <div className="flex items-baseline gap-3">
              <span className={`text-[36px] font-black ${themeText} tracking-tighter`}>{currencySymbol}{formatPrice(finalPrice)}</span>
              <span className="text-[18px] text-gray-400 line-through font-bold opacity-30">{currencySymbol}{formatPrice(product.originalPrice)}</span>
            </div>
            
            {/* Combined Info Row (100% BACK and Phases on the same line) */}
            <div className="mt-2 flex items-center gap-2">
              <span className="text-[11px] font-black text-orange-600 dark:text-orange-400 bg-orange-500/10 px-2.5 py-1 rounded-full border border-orange-500/10 uppercase tracking-tight shadow-sm">
                {t('product.full_back')}
              </span>
              <div className="flex items-center gap-1 text-[12px] text-gray-400 font-bold bg-gray-50 dark:bg-white/5 px-3 py-1 rounded-full border border-gray-100 dark:border-white/5">
                <Zap className="w-3.5 h-3.5 text-orange-400 fill-current" />
                <span>{t('product.phases_rewards')}</span>
              </div>
            </div>
          </div>
          
          {/* Prominent Discount Badge (Glassmorphism Red) */}
          <div className="bg-red-500/10 text-red-600 backdrop-blur-3xl border border-red-500/20 text-[16px] font-black px-4 py-2 rounded-2xl shadow-sm transform rotate-[-1deg] uppercase tracking-tighter mt-1">
            -{Math.round((1 - parseFloat(currentPriceDisplay) / parseFloat(product.originalPrice)) * 100)}% {t('product.off_tag')}
          </div>
        </div>
      </div>

      {/* 2.5 Fulfillment Route (v8.0 Truth Protocol) */}
      <div className="mt-2 bg-white dark:bg-[#1C1C1E] p-5">
        <div className="border border-gray-100 dark:border-white/10 rounded-2xl overflow-hidden">
          <div className="bg-gray-50 dark:bg-white/5 px-4 py-2 border-b border-gray-100 dark:border-white/10 flex items-center justify-between">
            <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Fulfillment Route</span>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              <span className="text-[10px] text-green-600 font-black uppercase">Verified Inventory</span>
            </div>
          </div>
          <div className="grid grid-cols-2 divide-x divide-gray-100 dark:divide-white/10">
            <div className="p-4">
              <span className="block text-[10px] text-gray-400 font-bold uppercase mb-1">Origin</span>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-orange-500" />
                <span className="text-[14px] font-black text-gray-900 dark:text-white uppercase">{product.warehouse_anchor}</span>
              </div>
            </div>
            <div className="p-4">
              <span className="block text-[10px] text-gray-400 font-bold uppercase mb-1">Speed</span>
              <div className="flex items-center gap-2">
                <Timer className="w-4 h-4 text-orange-500" />
                <span className="text-[14px] font-black text-gray-900 dark:text-white">{product.shipping.time}</span>
              </div>
            </div>
          </div>
          <div className="bg-orange-500/5 dark:bg-orange-500/10 px-4 py-3 flex items-start gap-3">
            <ShieldCheck className="w-4 h-4 text-orange-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="block text-[11px] font-black text-orange-600 uppercase tracking-tight">Truth Protocol v8.0</span>
              <p className="text-[10px] text-gray-500 dark:text-gray-400 leading-relaxed font-medium">
                Verified local inventory. Ships directly from source to minimize carbon & cost. No ghost stock.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Shipping & Quantity */}
      <div className="mt-2 bg-white dark:bg-[#1C1C1E] divide-y divide-gray-50 dark:divide-white/5">
        <div className="px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Truck className="w-5 h-5 text-gray-400" />
            <div className="flex flex-col">
              <span className="text-[13px] font-black text-gray-900 dark:text-white">{t('product.shipping_title')}</span>
              <span className="text-[11px] text-gray-400 font-bold">{t('product.standard_delivery')}: {currencySymbol}{formatPrice(parseFloat(product.shipping.price) * quantity)}</span>
            </div>
          </div>
          <div className="flex flex-col items-end">
            <div className="flex items-center gap-1 text-[13px] font-black text-gray-900 dark:text-white">
              <Timer className="w-3.5 h-3.5" />
              <span>{product.shipping.time}</span>
            </div>
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{t('product.est_delivery_title')}</span>
          </div>
        </div>

        <div className="px-5 py-4 flex items-center justify-between">
          <span className="text-[15px] font-semibold text-gray-900 dark:text-white">{t('product.quantity_title')}</span>
          <div className="flex items-center bg-gray-100 dark:bg-white/5 rounded-xl p-1 border border-gray-200 dark:border-white/10">
            <button 
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-gray-900 dark:hover:text-white active:scale-90 transition-all"
            >
              <Minus className="w-4 h-4" />
            </button>
            <span className="w-10 text-center text-[14px] font-black text-gray-900 dark:text-white">{quantity}</span>
            <button 
              onClick={() => setQuantity(quantity + 1)}
              className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-gray-900 dark:hover:text-white active:scale-90 transition-all"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 4. Key Attributes */}
      <div className="mt-2 bg-white dark:bg-[#1C1C1E]">
        <div 
          onClick={() => pushDrawer('key_attributes')}
          className="px-5 py-4 flex items-center justify-between border-b border-gray-50 dark:border-white/5 cursor-pointer active:bg-gray-50 dark:active:bg-white/5 transition-colors"
        >
          <span className="text-[15px] font-semibold text-gray-900 dark:text-white">{t('product.key_attributes_title')}</span>
          <ChevronRight className="w-5 h-5 text-gray-400" />
        </div>
        <div className="p-5 space-y-3">
          <ul className="space-y-2.5">
            {product.keyAttributes.slice(0, 5).map((attr, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-gray-300 mt-2 shrink-0" />
                <div className="text-[13px] leading-relaxed">
                  <span className="font-black text-gray-900 dark:text-white">{attr.label}: </span>
                  <span className="text-gray-600 dark:text-gray-400 font-medium italic">{attr.value}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* 5. Customization */}
      <div className="mt-2 bg-white dark:bg-[#1C1C1E] p-5">
        <h3 className="text-[14px] font-black text-gray-900 dark:text-white mb-3">{t('product.customization_title')}</h3>
        <div className="flex gap-2">
          {product.customization.map(opt => (
            <span key={opt} className="px-3 py-1.5 bg-gray-100 dark:bg-white/5 text-[12px] font-bold text-gray-600 dark:text-gray-400 rounded-lg">
              {opt}
            </span>
          ))}
        </div>
      </div>

      {/* 6. More Pictures */}
      <div className="mt-2 bg-white dark:bg-[#1C1C1E]">
        <div className="px-5 py-4 flex items-center justify-between border-b border-gray-50 dark:border-white/5">
          <span className="text-[15px] font-semibold text-gray-900 dark:text-white">{t('product.more_pictures_title')}</span>
          <ChevronRight className="w-5 h-5 text-gray-400" />
        </div>
        <div className="p-5 flex gap-2 overflow-x-auto no-scrollbar">
          {product.images.map((img, idx) => (
            <div key={idx} className="w-20 h-20 rounded-xl overflow-hidden border border-gray-100 dark:border-white/5 shrink-0 shadow-sm active:scale-95 transition-transform">
              <img 
                src={img} 
                className="w-full h-full object-cover" 
                crossOrigin="anonymous"
                referrerPolicy="no-referrer"
              />
            </div>
          ))}
        </div>
      </div>

      {/* 7. Reviews */}
      <div className="mt-2 bg-white dark:bg-[#1C1C1E]">
        <div 
          onClick={() => pushDrawer('product_reviews')}
          className="px-5 py-4 flex items-center justify-between border-b border-gray-50 dark:border-white/5 cursor-pointer active:bg-gray-50 dark:active:bg-white/5 transition-colors"
        >
          <span className="text-[15px] font-semibold text-gray-900 dark:text-white">{t('product.reviews_title')}</span>
          <ChevronRight className="w-5 h-5 text-gray-400" />
        </div>
        <div className="p-5">
          <div className="flex items-center gap-4 mb-6">
            <div className="text-center">
              <div className="text-[28px] font-black text-gray-900 dark:text-white leading-none">4.6<span className="text-[16px] text-gray-400">/5.0</span></div>
              <div className="flex justify-center gap-0.5 mt-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="w-2.5 h-2.5 text-amber-400 fill-amber-400" />
                ))}
              </div>
            </div>
            <div className="flex-1 space-y-1.5">
              {[t('product.supplier_service'), t('product.on_time_shipment'), t('product.item_quality')].map((label, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <span className="text-[11px] text-gray-500 w-24 font-bold">{label}</span>
                  <div className="flex-1 h-1 bg-gray-100 dark:bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-gray-800 dark:bg-white/40 rounded-full" style={{ width: `${90 - idx * 2}%` }} />
                  </div>
                  <span className="text-[11px] text-gray-900 dark:text-white font-black">{(4.7 - idx * 0.1).toFixed(1)}</span>
                </div>
              ))}
            </div>
          </div>
          
          <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="min-w-[240px] bg-gray-50 dark:bg-white/5 p-4 rounded-[24px] space-y-2 border border-gray-100 dark:border-white/5 shadow-sm">
                <div className="flex justify-between items-start">
                  <div className="flex gap-0.5">
                    {Array.from({ length: 5 }).map((_, j) => <Star key={j} className="w-2.5 h-2.5 text-amber-400 fill-amber-400" />)}
                  </div>
                  <span className="text-[10px] text-gray-400 font-bold">Feb 2, 2026</span>
                </div>
                <p className="text-[12px] text-gray-600 dark:text-gray-400 font-medium line-clamp-3 italic leading-relaxed">
                  {i % 2 === 0 ? "The build quality is exceptional. You can really feel the artisan craftsmanship in every detail." : "Delivery was very fast. Quality is really good, can recommend it!"}
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <div className="w-5 h-5 rounded-full bg-gray-200 overflow-hidden">
                    <img src={`https://ui-avatars.com/api/?name=User${i}&background=random`} className="w-full h-full object-cover" />
                  </div>
                  <span className="text-[11px] text-gray-500 font-black">User_{i}***</span>
                  <span className="text-[12px]">🇳🇱</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="px-5">
        {/* Product Rules Section (Only for Campaigns) */}
        {isCampaign && (
          <div className="space-y-4 pt-4 mb-8">
            <h3 className={`text-[13px] font-black ${themeText} uppercase tracking-widest flex items-center gap-2`}>
              <ShieldCheck className="w-4 h-4" />
              {t('product.campaign_rules_title')}
            </h3>
            <div className="grid gap-3">
              {[
                { title: t('product.lock_in_phase_title'), content: 'We need to reach the target number of participants to unlock this exclusive price. More people means lower prices for everyone!' },
                { title: t('product.refund_policy_title'), content: 'You can request a full refund at any time before the campaign is locked. If the target is not met, 100% will be automatically refunded.' },
                { title: t('product.price_protection_title'), content: 'If the final price is lower than what you paid, the difference will be automatically refunded to your platform wallet upon locking.' },
                { title: t('product.production_logistics_title'), content: 'Once locked, the order goes directly to the artisan. Shipping typically starts 7-14 days after campaign ends.' }
              ].map((rule, i) => (
                <div key={i} className="bg-orange-500/5 dark:bg-orange-500/10 p-4 rounded-2xl border border-orange-500/10 flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-orange-500/10 flex items-center justify-center shrink-0">
                    <span className="text-[12px] font-black text-orange-600">{i + 1}</span>
                  </div>
                  <div>
                    <h4 className="text-[13px] font-black text-gray-900 dark:text-white uppercase tracking-tight mb-1">{rule.title}</h4>
                    <p className="text-[12px] text-gray-500 dark:text-gray-400 font-medium leading-snug">{rule.content}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 8. Know your supplier */}
        <div className="mt-2 bg-white dark:bg-[#1C1C1E] pb-8">
          <div 
            onClick={() => pushDrawer('supplier_analysis')}
            className="px-5 py-4 flex items-center justify-between border-b border-gray-100/50 dark:border-white/5 cursor-pointer active:bg-gray-50 dark:active:bg-white/5 transition-colors"
          >
            <span className="text-[15px] font-semibold text-gray-900 dark:text-white">{t('product.know_your_supplier')}</span>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </div>
          <div className="p-5">
            <div 
              onClick={() => pushDrawer('supplier_analysis')}
              className="flex items-center gap-3 mb-4 cursor-pointer"
            >
              <div className="w-12 h-12 bg-white rounded-xl border border-gray-100 flex items-center justify-center p-2 shadow-sm shrink-0">
                <img src="https://ui-avatars.com/api/?name=Supplier&background=random" className="w-full h-full object-contain" />
              </div>
              <div className="flex-1">
                <h4 className="text-[14px] font-black text-gray-900 dark:text-white tracking-tight">{product.supplier.name}</h4>
                <div className="flex items-center gap-2 mt-0.5 text-[11px] font-bold">
                  <span className="text-blue-500">{t('product.manufacturer')}</span>
                  <span className="text-gray-400">• {product.joined}</span>
                </div>
                <div className="flex items-center gap-1 mt-0.5">
                  <MapPin className="w-3 h-3 text-gray-400" />
                  <span className="text-[11px] text-gray-400 font-medium">{t('productdetail.guangdong_cn')}</span>
                </div>
              </div>
            </div>

            <div className="flex gap-2 mb-4">
              <span className="px-3 py-1 bg-gray-50 dark:bg-white/5 text-[10px] font-black text-gray-500 dark:text-gray-400 rounded-full border border-gray-100 dark:border-white/5">Quick service (reviews 2)</span>
              <span className="px-3 py-1 bg-gray-50 dark:bg-white/5 text-[10px] font-black text-gray-500 dark:text-gray-400 rounded-full border border-gray-100 dark:border-white/5">Fast delivery (reviews 1)</span>
            </div>

            <div className="bg-gray-50 dark:bg-white/5 rounded-[24px] p-4 grid grid-cols-2 gap-y-4 gap-x-2 border border-white/10 shadow-inner">
              {product.supplier.stats.map((stat, idx) => (
                <div key={idx}>
                  <div className="text-[14px] font-black text-gray-900 dark:text-white leading-tight">{stat.value}</div>
                  <div className="flex items-center gap-1 text-[10px] text-gray-400 font-bold uppercase tracking-tighter mt-0.5">
                    {stat.label} <Info className="w-2.5 h-2.5" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Actions (Unified Brand Style) */}
      <div className="absolute bottom-0 left-0 right-0 bg-white/80 dark:bg-[#000000]/80 backdrop-blur-3xl border-t border-white/40 dark:border-white/10 p-6 pb-12 flex gap-4 z-40 shadow-[0_-20px_50px_rgba(0,0,0,0.1)]">
        <button className={`flex-1 h-16 rounded-[32px] font-semibold text-[16px] active:scale-95 transition-all flex items-center justify-center gap-2 bg-white dark:bg-[#1C1C1E] border-2 border-transparent text-[#E8450A]`}
          style={{ backgroundImage: 'linear-gradient(white, white), linear-gradient(135deg, #FF7A3D, #E8450A)', backgroundOrigin: 'border-box', backgroundClip: 'padding-box, border-box' }}
        >
          <ShoppingCart className="w-5 h-5" />
          {product.type === 'normal' ? t('product.add_to_cart') : t('product.add_to_wishlist')}
        </button>
        <button
          onClick={() => product.checkoutReady && setActiveDrawer('checkout')}
          disabled={!product.checkoutReady}
          className={`flex-1 h-16 rounded-[32px] text-white font-semibold text-[16px] transition-all border border-white/20 flex items-center justify-center gap-2 ${product.checkoutReady ? 'active:scale-95' : 'opacity-60 cursor-not-allowed'}`}
          style={{ background: 'linear-gradient(135deg, #FF7A3D 0%, #E8450A 100%)', boxShadow: '0 15px 30px -10px rgba(232,69,10,0.50)' }}
          title={product.checkoutReady ? undefined : getCheckoutBlockReasonText(t, product.checkoutBlockReason)}
        >
          <Zap className="w-5 h-5 fill-current" />
          {product.checkoutReady
            ? (product.type === 'presale' ? t('product.participate_presale') : product.type === 'crowdfunding' ? t('product.support_crowdfunding') : t('product.buy_now'))
            : getCheckoutBlockReasonText(t, product.checkoutBlockReason)}
        </button>
      </div>
    </div>
  );
};
