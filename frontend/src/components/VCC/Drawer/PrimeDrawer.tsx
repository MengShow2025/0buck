import React from 'react';
import { Package, Search } from 'lucide-react';

const DUMMY_PRODUCTS = [
  {
    id: 'p1',
    title: 'Artisan Crafted Wireless Earbuds with Noise Cancellation',
    price: 29.99,
    originalPrice: 59.99,
    weight: '0.15kg',
    dimensions: '10x10x5 cm',
    image: 'https://images.pexels.com/photos/3780681/pexels-photo-3780681.jpeg?auto=compress&cs=tinysrgb&w=400',
  },
  {
    id: 'p2',
    title: 'Minimalist Titanium Mechanical Watch',
    price: 149.00,
    originalPrice: 299.00,
    weight: '0.2kg',
    dimensions: '15x10x8 cm',
    image: 'https://images.pexels.com/photos/2783873/pexels-photo-2783873.jpeg?auto=compress&cs=tinysrgb&w=400',
  },
  {
    id: 'p3',
    title: 'Hand-poured Soy Wax Aromatherapy Candle',
    price: 15.50,
    originalPrice: 25.00,
    weight: '0.4kg',
    dimensions: '8x8x10 cm',
    image: 'https://images.pexels.com/photos/1709923/pexels-photo-1709923.jpeg?auto=compress&cs=tinysrgb&w=400',
  },
  {
    id: 'p4',
    title: 'Ergonomic Aluminum Laptop Stand',
    price: 45.00,
    originalPrice: 89.00,
    weight: '0.8kg',
    dimensions: '25x20x4 cm',
    image: 'https://images.pexels.com/photos/3861969/pexels-photo-3861969.jpeg?auto=compress&cs=tinysrgb&w=400',
  }
];

export const PrimeDrawer: React.FC = () => {
  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-[#111111]">
      {/* Search Bar */}
      <div className="px-4 py-3 bg-white dark:bg-[#1c1c1e] sticky top-0 z-10 border-b border-gray-100 dark:border-gray-800">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search verified artisan goods..." 
            className="w-full bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 text-[15px] rounded-xl py-2 pl-9 pr-4 outline-none placeholder:text-gray-500"
          />
        </div>
      </div>

      {/* Product Grid */}
      <div className="p-4 grid grid-cols-2 gap-3 pb-24">
        {DUMMY_PRODUCTS.map((product) => (
          <div key={product.id} className="bg-white dark:bg-[#1c1c1e] rounded-xl overflow-hidden shadow-sm border border-gray-100 dark:border-gray-800 flex flex-col">
            {/* Image */}
            <div className="relative aspect-square bg-gray-100 dark:bg-gray-800">
              <img src={product.image} alt={product.title} className="w-full h-full object-cover" />
              <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-md text-white text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1">
                <span>⚖️</span>
                <span>{product.weight} Verified</span>
              </div>
            </div>
            
            {/* Content */}
            <div className="p-3 flex flex-col flex-1">
              <h3 className="text-[13px] font-medium text-gray-800 dark:text-gray-200 line-clamp-2 mb-1">
                {product.title}
              </h3>
              
              <div className="flex items-center gap-1 text-[11px] text-gray-500 dark:text-gray-400 mb-2 mt-auto">
                <Package className="w-3 h-3" />
                <span>{product.dimensions}</span>
              </div>

              <div className="flex items-end justify-between mt-1">
                <div>
                  <div className="text-[var(--wa-teal)] font-bold text-[15px] leading-none">
                    ${product.price.toFixed(2)}
                  </div>
                  <div className="text-gray-400 text-[11px] line-through mt-0.5">
                    ${product.originalPrice.toFixed(2)}
                  </div>
                </div>
                <div className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
                  100% BACK
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};