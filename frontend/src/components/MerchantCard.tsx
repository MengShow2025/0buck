import React from 'react';
import { Merchant, Product } from '../types';
import { useTranslation } from 'react-i18next';
import { MoreHorizontal, ShoppingCart, Star, ChevronDown, Check } from 'lucide-react';

interface MerchantCardProps {
  merchant: Merchant;
  onProductClick?: (product: Product) => void;
}

export const MerchantCard: React.FC<MerchantCardProps> = ({ merchant, onProductClick }) => {
  const { t } = useTranslation();
  
  return (
    <div className="bg-surface border border-outline-variant rounded-[32px] p-6 flex flex-col gap-6 hover:shadow-xl hover:shadow-primary/5 transition-all group overflow-hidden relative">
      {/* Top Section */}
      <div className="flex items-start justify-between">
        <div className="flex gap-4 items-start">
          <div className="relative">
            <img src={merchant.logo} alt={merchant.name} className="w-14 h-14 rounded-2xl object-cover border border-outline-variant shadow-sm" />
            {merchant.isVerified && (
              <div className="absolute -bottom-1 -right-1 bg-primary text-on-primary p-0.5 rounded-lg border-2 border-surface">
                <Check className="w-3 h-3 stroke-[4]" />
              </div>
            )}
          </div>
          <div className="flex flex-col gap-1">
            <h3 className="text-xl font-black text-on-surface tracking-tight leading-tight group-hover:text-primary transition-colors">{merchant.name}</h3>
            <div className="flex items-center gap-2 text-[11px] text-on-surface-variant font-bold uppercase tracking-widest">
              <span className="flex items-center gap-1.5">
                <div className="w-4 h-4 rounded-md bg-black flex items-center justify-center text-[8px] text-white font-black">0B</div>
                0Buck Verified
              </span>
              <span className="w-1 h-1 rounded-full bg-outline-variant"></span>
              <span>{merchant.businessType}</span>
              <span className="w-1 h-1 rounded-full bg-outline-variant"></span>
              <span>{merchant.years} 年</span>
              <span className="w-1 h-1 rounded-full bg-outline-variant"></span>
              <div className="flex items-center gap-1">
                <span className={`fi fi-${merchant.locationCode.toLowerCase()} rounded-sm`}></span>
                {merchant.location}
              </div>
            </div>
          </div>
        </div>
        <button className="w-10 h-10 rounded-full hover:bg-on-surface/[0.05] flex items-center justify-center text-on-surface-variant transition-colors">
          <MoreHorizontal className="w-6 h-6" />
        </button>
      </div>

      {/* Highlights / Matches */}
      <div className="flex items-start gap-4">
        <div className="bg-[#4CAF50] text-white px-3 py-2 rounded-2xl flex flex-col items-center justify-center min-w-[70px] shadow-lg shadow-[#4CAF50]/20">
          <span className="text-[10px] font-black uppercase opacity-80 tracking-tighter">Matches</span>
          <div className="flex items-center gap-1">
            <span className="text-xl font-black leading-none">{merchant.matches}</span>
            <ChevronDown className="w-4 h-4" />
          </div>
        </div>
        <div className="flex flex-col gap-1">
          {merchant.factoryStats.slice(0, 2).map((stat, idx) => (
            <p key={idx} className="text-sm font-bold text-on-surface flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#4CAF50]"></span>
              {stat.value} in {stat.label}
            </p>
          ))}
        </div>
      </div>

      {/* Stats Divider */}
      <div className="h-[1px] bg-outline-variant w-full opacity-50"></div>

      {/* Core Stats */}
      <div className="grid grid-cols-3 gap-2">
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Store rating</span>
          <div className="flex items-center gap-1">
            <span className="font-black text-on-surface">{merchant.rating.toFixed(1)}</span>
            <span className="text-on-surface-variant font-bold">/5.0</span>
            <span className="text-[10px] text-on-surface-variant font-medium ml-1">({merchant.ratingCount})</span>
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Reorder rate</span>
          <span className="font-black text-on-surface">{merchant.reorderRate}</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">On-time delivery</span>
          <span className="font-black text-on-surface">{merchant.onTimeDeliveryRate}</span>
        </div>
      </div>

      {/* Categories */}
      <div className="flex flex-wrap gap-2">
        {merchant.mainCategoryTags.map((tag, idx) => (
          <span key={idx} className="px-4 py-1.5 bg-on-surface/[0.03] text-on-surface-variant text-[11px] font-black rounded-xl tracking-tight">
            {tag}
          </span>
        ))}
      </div>

      {/* Featured Products */}
      <div className="grid grid-cols-3 gap-4">
        {merchant.featuredProducts.slice(0, 3).map((p) => (
          <div key={p.id} className="flex flex-col gap-2 group/product cursor-pointer" onClick={() => onProductClick?.(p)}>
            <div className="aspect-square rounded-[24px] overflow-hidden border border-outline-variant relative">
              <img src={p.image} alt={p.name} className="w-full h-full object-cover group-hover/product:scale-110 transition-transform duration-700" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-black text-on-surface truncate">
                {typeof p.price === 'number' ? `$${p.price.toFixed(2)}` : p.price}
              </span>
              <span className="text-[10px] font-bold text-on-surface-variant uppercase">MOQ: {p.moq || '1 piece'}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Bottom Actions */}
      <div className="flex items-center gap-3 mt-2">
        <div className="flex items-center gap-3">
          <input 
            type="checkbox" 
            className="w-6 h-6 rounded-lg border-2 border-outline-variant text-primary focus:ring-primary focus:ring-offset-0 bg-transparent cursor-pointer"
          />
          <span className="text-xs font-black text-on-surface-variant uppercase tracking-widest">Select</span>
        </div>
        
        <div className="flex-1 flex gap-2">
          <button className="w-12 h-12 rounded-2xl border-2 border-outline-variant flex items-center justify-center text-on-surface-variant hover:border-primary hover:text-primary transition-all">
            <ShoppingCart className="w-6 h-6" />
          </button>
          <button className="flex-1 h-12 bg-white text-black border-2 border-black rounded-full font-black text-sm hover:bg-black hover:text-white transition-all shadow-lg active:scale-95">
            Send inquiry
          </button>
        </div>
      </div>
    </div>
  );
}
