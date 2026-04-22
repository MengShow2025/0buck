import React, { useState } from 'react';
import { Search, SlidersHorizontal, Star, ShoppingCart, ChevronDown, Zap } from 'lucide-react';
import { useDrawerContext } from '../contexts/DrawerContext';

const PRODUCTS = [
  { id: 'demo-1', name: 'Artisan Wireless Earbuds Pro', price: 29.99, original: 59.99, image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&q=80', supplier: 'Nordic Audio Lab', rating: 4.9, sales: 3821, badge: 'Bestseller' },
  { id: 'demo-2', name: 'Titanium Minimalist Watch', price: 149.00, original: 299.00, image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500&q=80', supplier: 'Swiss Craft Co.', rating: 4.8, sales: 1204, badge: 'Featured' },
  { id: 'demo-3', name: 'Premium Leather Messenger Bag', price: 89.00, original: 159.00, image: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=500&q=80', supplier: 'Vega Leather Works', rating: 4.7, sales: 892, badge: null },
  { id: 'demo-4', name: 'Mechanical Keyboard — Compact TKL', price: 119.00, original: 199.00, image: 'https://images.unsplash.com/photo-1618384887929-16ec33fab9ef?w=500&q=80', supplier: 'MechLab Studio', rating: 4.9, sales: 2156, badge: 'New' },
  { id: 'demo-5', name: 'Ceramic Pour-Over Coffee Set', price: 54.99, original: 89.99, image: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=500&q=80', supplier: 'Morning Ritual Co.', rating: 4.8, sales: 1587, badge: null },
  { id: 'demo-6', name: 'Ultrawide Curved Monitor 34"', price: 599.00, original: 899.00, image: 'https://images.unsplash.com/photo-1527443224154-c4a573d18e43?w=500&q=80', supplier: 'ViewTech Pro', rating: 4.6, sales: 534, badge: 'Crowdfunding' },
  { id: 'demo-7', name: 'Ergonomic Office Chair', price: 299.00, original: 499.00, image: 'https://images.unsplash.com/photo-1596162954151-cdcb4c0f70fb?w=500&q=80', supplier: 'ErgoForm Studio', rating: 4.7, sales: 731, badge: null },
  { id: 'demo-8', name: 'Portable SSD 2TB NVMe', price: 79.99, original: 129.99, image: 'https://images.unsplash.com/photo-1551808525-51a94da548ce?w=500&q=80', supplier: 'DataBlast Tech', rating: 4.9, sales: 4201, badge: 'Bestseller' },
];

const CATEGORIES = ['All', 'Electronics', 'Wearables', 'Home', 'Fashion', 'Beauty', 'Food'];

interface Props {
  onProductSelect: (id: string) => void;
}

export const DesktopShopView: React.FC<Props> = ({ onProductSelect }) => {
    const { setSelectedProductId } = useDrawerContext();
  const [activeCategory, setActiveCategory] = useState('All');
  const [sortBy] = useState('Best Selling');
  const [search, setSearch] = useState('');

  const filtered = PRODUCTS.filter(p =>
    (!search || p.name.toLowerCase().includes(search.toLowerCase()))
  );

  const handleProductClick = (id: string) => {
    setSelectedProductId(id);
    onProductSelect(id);
  };

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left Filter Panel */}
      <aside className="w-[200px] shrink-0 border-r border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-[#0D0D0F] flex flex-col overflow-y-auto">
        <div className="px-4 py-5 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-2 text-zinc-700 dark:text-zinc-300 mb-4">
            <SlidersHorizontal className="w-4 h-4" />
            <span className="text-[13px] font-semibold">Filters</span>
          </div>
          {/* Categories */}
          <div className="space-y-0.5">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`w-full text-left px-3 py-2 rounded-lg text-[13px] font-medium transition-colors ${
                  activeCategory === cat
                    ? 'bg-white dark:bg-white/10 text-zinc-900 dark:text-white font-semibold shadow-sm'
                    : 'text-zinc-500 dark:text-zinc-400 hover:bg-white/50 dark:hover:bg-white/5'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Price Range */}
        <div className="px-4 py-4 border-b border-zinc-200 dark:border-zinc-800">
          <div className="text-[12px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-3">Price Range</div>
          <div className="space-y-2">
            {[['$0 – $50', [0, 50]], ['$50 – $150', [50, 150]], ['$150 – $500', [150, 500]], ['$500+', [500, 9999]]].map(([label]: any) => (
              <label key={label} className="flex items-center gap-2.5 cursor-pointer group">
                <input type="checkbox" className="w-4 h-4 rounded accent-orange-500" />
                <span className="text-[13px] text-zinc-600 dark:text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-zinc-200 transition-colors">{label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Rating */}
        <div className="px-4 py-4">
          <div className="text-[12px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-3">Rating</div>
          {[4.5, 4.0, 3.5].map(r => (
            <label key={r} className="flex items-center gap-2 cursor-pointer mb-1.5">
              <input type="checkbox" className="w-4 h-4 rounded accent-orange-500" />
              <div className="flex items-center gap-1">
                <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                <span className="text-[12px] text-zinc-600 dark:text-zinc-400">{r}+</span>
              </div>
            </label>
          ))}
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-[#0A0A0B]/80 backdrop-blur-xl shrink-0">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              type="text"
              placeholder="Search products..."
              className="w-full bg-zinc-100 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl pl-9 pr-4 py-2 text-[13px] text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-400 outline-none focus:border-orange-400 dark:focus:border-orange-500 transition-colors"
            />
          </div>
          <div className="flex items-center gap-2 text-[13px] text-zinc-500">
            <span>Sort:</span>
            <button className="flex items-center gap-1 px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-lg font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors">
              {sortBy} <ChevronDown className="w-3.5 h-3.5" />
            </button>
          </div>
          <span className="text-[12px] text-zinc-400">{filtered.length} items</span>
        </div>

        {/* Product Grid */}
        <div className="flex-1 overflow-y-auto px-6 py-5" style={{ scrollbarWidth: 'thin', scrollbarColor: '#3f3f46 transparent' }}>
          {/* Flash Banner */}
          <div className="flex items-center gap-3 px-4 py-3 rounded-2xl mb-5 border border-orange-500/20"
            style={{ background: 'linear-gradient(135deg, rgba(255,122,61,0.08) 0%, rgba(232,69,10,0.08) 100%)' }}>
            <Zap className="w-4 h-4 text-orange-500 shrink-0" />
            <span className="text-[13px] font-semibold text-orange-600 dark:text-orange-400">Flash Sale Live</span>
            <span className="text-[12px] text-orange-500/70 ml-auto">Ends at 20:00</span>
          </div>

          <div className="grid grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
            {filtered.map(p => {
              const discount = Math.round((1 - p.price / p.original) * 100);
              return (
                <div
                  key={p.id}
                  onClick={() => handleProductClick(p.id)}
                  className="group bg-white dark:bg-[#18181B] rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 hover:border-orange-300 dark:hover:border-orange-800 transition-all duration-200 cursor-pointer hover:shadow-lg hover:shadow-orange-500/5 active:scale-[0.99]"
                >
                  {/* Image */}
                  <div className="relative aspect-square overflow-hidden bg-zinc-100 dark:bg-zinc-800">
                    <img
                      src={p.image}
                      alt={p.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute top-2 left-2 flex flex-col gap-1">
                      {p.badge && (
                        <span className="px-2 py-0.5 text-[10px] font-black text-white rounded-full shadow-sm"
                          style={{ background: 'linear-gradient(135deg, #FF7A3D 0%, #E8450A 100%)' }}>
                          {p.badge}
                        </span>
                      )}
                      <span className="px-2 py-0.5 text-[10px] font-bold text-orange-600 bg-orange-50 dark:bg-orange-900/30 dark:text-orange-400 rounded-full border border-orange-200 dark:border-orange-800">
                        -{discount}%
                      </span>
                    </div>
                  </div>
                  {/* Info */}
                  <div className="p-3">
                    <div className="text-[13px] font-semibold text-zinc-900 dark:text-white line-clamp-2 leading-snug mb-1.5">
                      {p.name}
                    </div>
                    <div className="text-[11px] text-zinc-400 mb-2">{p.supplier}</div>
                    <div className="flex items-center gap-1 mb-2.5">
                      <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                      <span className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-300">{p.rating}</span>
                      <span className="text-[11px] text-zinc-400 ml-1">{p.sales.toLocaleString()} sold</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-[16px] font-black text-zinc-900 dark:text-white">${p.price}</span>
                        <span className="text-[11px] text-zinc-400 line-through ml-1.5">${p.original}</span>
                      </div>
                      <button
                        onClick={e => { e.stopPropagation(); handleProductClick(p.id); }}
                        className="w-8 h-8 rounded-xl text-white flex items-center justify-center active:scale-90 transition-all shadow-md"
                        style={{ background: 'linear-gradient(135deg, #FF7A3D 0%, #E8450A 100%)' }}
                      >
                        <ShoppingCart className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
