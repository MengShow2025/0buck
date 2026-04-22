import React, { useRef } from 'react';
import { ShoppingCart, Star, TrendingUp, ShieldCheck, ChevronLeft, ChevronRight } from 'lucide-react';
import { usePreferenceContext } from '../contexts/PreferenceContext';
import { useSessionContext } from '../contexts/SessionContext';
import { useDrawerContext } from '../contexts/DrawerContext';
import { getCheckoutBlockReasonText } from '../utils/checkoutBlockReason';

interface Product {
  id: string;
  name: string;
  price: number;
  image: string;
  supplier: string;
  rating: number;
  sales: number;
  checkoutReady?: boolean;
  checkoutBlockReason?: string;
  share_link?: string;
  entity_type?: string;
}

const currencyMap: Record<string, string> = {
  'USD': '$', 'JPY': '¥', 'EUR': '€', 'GBP': '£',
  'CNY': '¥', 'HKD': 'HK$', 'KRW': '₩', 'AUTO': '$'
};

export const ProductGridCard: React.FC<{ data: any }> = ({ data }) => {
    const { pushDrawer, setSelectedProductId } = useDrawerContext();
  const { currency, getExchangeRate, t } = usePreferenceContext();
  const { isAuthenticated, requireAuth } = useSessionContext();
  const scrollRef = useRef<HTMLDivElement>(null);
  const symbol = currencyMap[currency] || '$';
  const rate = getExchangeRate(currency);

  const products: Product[] = (data?.products || (data?.title ? [{
    id: 'legacy-id',
    name: data.title,
    price: data.price,
    image: data.image_url,
    supplier: data.supplier_name || t('verified_artisan'),
    rating: 4.8,
    sales: 1200
  }] : [])).map((p: any) => ({
    ...p,
    checkoutReady: p?.checkoutReady ?? p?.checkout_ready ?? true,
    checkoutBlockReason: p?.checkoutBlockReason ?? p?.checkout_block_reason,
  }));

  if (products.length === 0) return null;

  const scroll = (dir: 'left' | 'right') => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollBy({ left: dir === 'left' ? -180 : 180, behavior: 'smooth' });
  };

  return (
    <div className="w-full max-w-full my-1 relative group/strip overflow-hidden">
      {/* Scroll hint arrows — only show when hovered */}
      {products.length > 2 && (
        <>
          <button
            onClick={() => scroll('left')}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-7 h-7 bg-white/90 dark:bg-[#1C1C1E]/90 rounded-full shadow-lg flex items-center justify-center opacity-0 group-hover/strip:opacity-100 transition-opacity -ml-1 border border-black/5 dark:border-white/10"
          >
            <ChevronLeft className="w-4 h-4 text-gray-600 dark:text-gray-300" />
          </button>
          <button
            onClick={() => scroll('right')}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-7 h-7 bg-white/90 dark:bg-[#1C1C1E]/90 rounded-full shadow-lg flex items-center justify-center opacity-0 group-hover/strip:opacity-100 transition-opacity -mr-1 border border-black/5 dark:border-white/10"
          >
            <ChevronRight className="w-4 h-4 text-gray-600 dark:text-gray-300" />
          </button>
        </>
      )}

      {/* Horizontal scroll strip */}
      <div
        ref={scrollRef}
        className="w-full flex gap-3 overflow-x-auto no-scrollbar snap-x snap-mandatory px-1 pb-1 touch-pan-x"
      >
        {products.map((product, idx) => {
          const displayPrice = (product.price * rate).toLocaleString(undefined, {
            minimumFractionDigits: currency === 'JPY' ? 0 : 2,
            maximumFractionDigits: currency === 'JPY' ? 0 : 2
          });

          return (
            <div
              key={product.id}
              onClick={() => {
                if (product.checkoutReady === false) return;
                if (product.share_link) {
                  const open = () => window.open(product.share_link, '_blank', 'noopener,noreferrer');
                  if (isAuthenticated) open();
                  else requireAuth(open);
                  return;
                }
                if (product.entity_type === 'merchant') {
                  pushDrawer('supplier_analysis');
                  return;
                }
                setSelectedProductId(String(product.id));
                pushDrawer('product_detail');
              }}
              className={`relative shrink-0 snap-start rounded-[22px] overflow-hidden transition-all duration-200 w-[160px] h-[240px] ${product.checkoutReady === false ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer active:scale-[0.96]'}`}
              title={product.checkoutReady === false ? getCheckoutBlockReasonText(t, product.checkoutBlockReason) : undefined}
              style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.12)' }}
            >
              {/* Full-bleed image */}
              <img
                src={product.image}
                alt={t(String(product.name ?? ''))}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 hover:scale-105"
              />

              {product.checkoutReady === false && (
                <div className="absolute left-2.5 top-2.5 z-20 bg-black/55 text-white text-[9px] font-bold px-2 py-0.5 rounded-full border border-white/15">
                  {getCheckoutBlockReasonText(t, product.checkoutBlockReason)}
                </div>
              )}

              {/* Top badges */}
              <div className="absolute top-2.5 left-2.5 right-2.5 flex items-start justify-between z-20">
                {product.sales > 1000 ? (
                  <div className="text-white text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-0.5 shadow-sm" style={{ background: 'linear-gradient(135deg, #FF7A3D 0%, #E8450A 100%)' }}>
                    <TrendingUp size={8} />
                    <span>{t('productgridcard.hot')}</span>
                  </div>
                ) : <div />}

                {/* Cart button — floats top-right */}
                <button
                  onClick={(e) => { e.stopPropagation(); }}
                  className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white hover:bg-[var(--wa-teal)] active:scale-90 transition-all duration-150 shadow-sm border border-white/20"
                >
                  <ShoppingCart size={14} />
                </button>
              </div>

              {/* Frosted glass info bar — bottom */}
              <div
                className="absolute inset-x-0 bottom-0 z-10 px-3 pt-8 pb-3"
                style={{
                  background: 'linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.4) 60%, transparent 100%)',
                }}
              >
                {/* Supplier */}
                <div
                  className="flex items-center gap-1 mb-1"
                  onClick={(e) => { e.stopPropagation(); pushDrawer('supplier_analysis'); }}
                >
                  <ShieldCheck size={8} className="text-white/70 shrink-0" />
                  <span className="text-[9px] text-white/70 truncate">
                    {t(String(product.supplier ?? ''))}
                  </span>
                </div>

                {/* Name */}
                <h4 className="text-[12px] font-semibold text-white leading-tight line-clamp-2 mb-1.5">
                  {t(String(product.name ?? ''))}
                </h4>

                {/* Price + Rating row */}
                <div className="flex items-end justify-between">
                  <div className="font-mono flex items-baseline gap-0.5">
                    <span className="text-[10px] font-bold text-white/80">{symbol}</span>
                    <span className="text-[17px] font-black text-white leading-none">
                      {displayPrice}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Star size={9} className="text-amber-400 fill-amber-400" />
                    <span className="text-[10px] text-white/80 font-semibold">{product.rating}</span>
                    <span className="text-[10px] text-white/50">·</span>
                    <span className="text-[10px] text-white/60">{product.sales}</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {/* If only one product, show normal single card wider */}
        {products.length === 1 && (
          <div className="w-px shrink-0" /> // spacer
        )}
      </div>

      {/* Scroll dots indicator */}
      {products.length > 2 && (
        <div className="flex justify-center gap-1 mt-2">
          {products.map((_, i) => (
            <div key={i} className={`rounded-full transition-all ${i === 0 ? 'w-3 h-1 bg-[var(--wa-teal)]' : 'w-1 h-1 bg-gray-300 dark:bg-gray-600'}`} />
          ))}
        </div>
      )}
    </div>
  );
};
