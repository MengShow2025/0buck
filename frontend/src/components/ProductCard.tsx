import React from 'react';
import { Product } from '../types';
import { ShoppingCart, Star, Zap } from 'lucide-react';
import { motion } from 'framer-motion';

interface ProductCardProps {
  product: Product;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const shopifyUrl = `https://shop.0buck.com/products/${product.shopify_id || product.id}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 group transition-all hover:shadow-md max-w-sm relative"
    >
      <div className="relative aspect-square overflow-hidden bg-gray-50">
        <img
          src={product.images[0]}
          alt={product.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        {product.is_reward_eligible && (
          <div className="absolute top-3 left-3 bg-black/90 backdrop-blur-md text-white text-[10px] font-black px-2.5 py-1.5 rounded-full flex items-center gap-1.5 uppercase tracking-widest z-10 shadow-lg border border-white/20">
            <Zap size={10} className="fill-orange-400 text-orange-400 animate-pulse" />
            Rewarding
          </div>
        )}
      </div>
      
      <div className="p-4 space-y-3">
        <div className="flex justify-between items-start gap-2">
          <h3 className="font-bold text-gray-900 text-[13px] leading-tight line-clamp-2 min-h-[32px] group-hover:text-orange-600 transition-colors">
            {product.title}
          </h3>
          <div className="flex items-center gap-1 text-[10px] text-gray-500 font-bold bg-gray-50 px-1.5 py-0.5 rounded-md">
            <Star size={10} fill="#FFB800" className="text-[#FFB800]" />
            4.8
          </div>
        </div>
        
        <div className="flex items-end justify-between pt-1">
          <div className="flex flex-col">
            <span className="text-xl font-black text-black tracking-tighter">${product.price.toFixed(2)}</span>
            <span className="text-[10px] text-gray-400 font-medium line-through">
              ${(product.price * 1.5).toFixed(2)}
            </span>
          </div>
          
          <a
            href={shopifyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-black text-white p-2.5 rounded-2xl hover:bg-orange-600 transition-all shadow-md active:scale-95"
          >
            <ShoppingCart size={20} />
          </a>
        </div>
      </div>
    </motion.div>
  );
};
