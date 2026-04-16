import React, { useEffect, useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { productService, DiscoveryResponse } from '../services/productService';
import { Product } from '../types';

export default function FeedMobile({ setCurrentView }: { setCurrentView: (view: string) => void }) {
  const { 
    userCountry, sourcingMode, setSourcingMode,
    setSelectedProduct
  } = useAppContext();

  const [discovery, setDiscovery] = useState<DiscoveryResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadDiscovery() {
      setIsLoading(true);
      try {
        const data = await productService.getDiscovery(userCountry, sourcingMode);
        setDiscovery(data);
      } catch (error) {
        console.error('Failed to load discovery:', error);
      } finally {
        setIsLoading(false);
      }
    }
    loadDiscovery();
  }, [userCountry, sourcingMode]);

  const handleProductClick = (product: Product) => {
    setSelectedProduct(product);
    setCurrentView('product-detail');
  };

  return (
    <div className="mobile-app-container w-full min-h-screen bg-background text-on-surface font-body">
      
{/*  TopAppBar  */}
<header className="bg-zinc-950/80 backdrop-blur-xl font-['Plus_Jakarta_Sans'] font-bold tracking-tight docked full-width top-0 sticky shadow-[0_8px_32px_rgba(175,48,0,0.15)] z-50 flex justify-between items-center px-6 py-4 w-full">
<div className="flex items-center gap-2">
<span className="material-symbols-outlined text-orange-600 dark:text-orange-500 text-2xl" data-icon="bubble_chart">bubble_chart</span>
<h1 className="text-2xl font-black italic text-transparent bg-clip-text bg-gradient-to-br from-orange-700 to-orange-400">0Buck</h1>
</div>
<div className="flex items-center gap-4">
<button 
  onClick={() => setSourcingMode(sourcingMode === 'LOCAL' ? 'GLOBAL' : 'LOCAL')}
  className={`px-3 py-1 rounded-full text-[10px] font-bold transition-all ${sourcingMode === 'LOCAL' ? 'bg-orange-500 text-white' : 'bg-zinc-800 text-zinc-400'}`}
>
  {sourcingMode === 'LOCAL' ? 'Local Mode' : 'Global Mode'}
</button>
<button className="hover:bg-orange-500/10 hover:text-orange-400 transition-colors scale-95 active:duration-150 p-2 rounded-full">
<span className="material-symbols-outlined text-orange-500" data-icon="support_agent">support_agent</span>
</button>
</div>
</header>
<main className="pb-32">

{/* Butler Greeting */}
{discovery?.butler_greeting && (
  <section className="px-6 py-4">
    <div className="bg-orange-500/10 border border-orange-500/20 rounded-2xl p-4">
      <p className="text-xs text-orange-400 leading-relaxed italic">
        "{discovery.butler_greeting}"
      </p>
    </div>
  </section>
)}

{/*  IM Style Product Scroller  */}
<section className="mt-2 px-4">
<div className="flex overflow-x-auto gap-4 py-4 no-scrollbar">
{/*  Vortex Featured Products  */}
{discovery?.vortex_featured.map((p) => (
  <div key={p.id} className="flex-shrink-0 flex flex-col items-center gap-2 cursor-pointer" onClick={() => handleProductClick(p)}>
    <div className="w-16 h-16 rounded-2xl bg-surface-container-highest flex items-center justify-center p-1 relative ring-2 ring-primary/20">
      <img alt={p.name} className="w-full h-full object-cover rounded-xl" src={p.image}/>
      {p.product_category_label === 'MAGNET' && (
        <span className="absolute -bottom-1 -right-1 bg-primary text-[10px] px-1.5 py-0.5 rounded-full font-bold text-white">$0.00</span>
      )}
    </div>
  </div>
))}
{isLoading && [1,2,3,4,5].map(i => (
  <div key={i} className="flex-shrink-0 w-16 h-16 rounded-2xl bg-zinc-800 animate-pulse"></div>
))}
</div>
</section>

{/*  New Drops Banner  */}
<section className="px-4 mt-2">
<div className="relative overflow-hidden rounded-3xl h-32 bg-gradient-to-br from-orange-950 to-zinc-950 flex items-center px-8">
<div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1614850523296-d8c1af93d400?auto=format&amp;fit=crop&amp;q=80&amp;w=800')] opacity-20 mix-blend-overlay" data-alt="abstract flowing orange and black silk texture with deep shadows and soft highlights"></div>
<div className="relative z-10 space-y-1">
<div className="inline-flex items-center gap-2 bg-primary/20 text-primary-container text-[10px] font-black tracking-widest uppercase px-2 py-0.5 rounded-full">
<span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
                        Live Now
                    </div>
<h2 className="text-2xl font-black font-headline text-white leading-none">New Drops</h2>
<p className="text-on-secondary-container text-xs font-medium">Flash releases every 15 minutes</p>
</div>
<div className="ml-auto relative z-10 flex -space-x-4">
{discovery?.category_feeds[0]?.products.slice(0, 3).map((p) => (
  <div key={p.id} className="w-12 h-12 rounded-full border-4 border-zinc-950 overflow-hidden">
    <img alt={p.name} className="w-full h-full object-cover" src={p.image}/>
  </div>
))}
<div className="w-12 h-12 rounded-full border-4 border-zinc-950 overflow-hidden bg-orange-600 flex items-center justify-center text-white text-xs font-black">
                        +{discovery?.category_feeds[0]?.products.length || 0}
                    </div>
</div>
</div>
</section>

{/*  Feed Content  */}
<section className="mt-8 px-4 space-y-8">
{/* Category Feed List */}
{discovery?.category_feeds.map((feed) => (
  <div key={feed.category} className="space-y-4">
    <h3 className="text-sm font-bold text-white px-2 flex items-center justify-between">
      {feed.category}
      <span className="text-[10px] text-orange-500 uppercase tracking-widest">See All</span>
    </h3>
    <div className="grid grid-cols-2 gap-4">
      {feed.products.map((p) => (
        <div key={p.id} className="bg-surface-container-high rounded-3xl p-3 space-y-2 cursor-pointer active:scale-95 transition-transform" onClick={() => handleProductClick(p)}>
          <div className="aspect-square rounded-2xl overflow-hidden bg-zinc-800">
            <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
          </div>
          <div className="px-1">
            <h4 className="text-xs font-bold text-white truncate">{p.name || p.title}</h4>
            <div className="flex justify-between items-center mt-1">
              <span className="text-orange-500 font-bold text-sm">${p.price}</span>
              <span className="text-[10px] bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded uppercase font-bold">{p.warehouse_anchor}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
))}
</section>
</main>
{/*  Floating AI Butler Button  */}
<button className="fixed bottom-28 right-6 w-14 h-14 bg-gradient-to-br from-orange-600 to-orange-400 rounded-2xl shadow-[0_0_20px_rgba(255,92,40,0.5)] flex items-center justify-center text-white group active:scale-90 transition-transform z-50">
<span className="material-symbols-outlined text-3xl" data-icon="smart_toy" style={{"fontVariationSettings":"'FILL' 1"}}>smart_toy</span>
</button>
      {/* spacer for bottom nav */}
      <div className="h-10"></div>
    </div>
  );
}
