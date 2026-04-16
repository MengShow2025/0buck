import React from 'react';
import { useAppContext } from '../context/AppContext';

export default function PrimeProductDetailMobile({ setCurrentView }: { setCurrentView: (view: string) => void }) {
  const { selectedProduct, setCartItems } = useAppContext();

  if (!selectedProduct) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-background text-white">
        <p>Product not found.</p>
        <button onClick={() => setCurrentView('prime')} className="mt-4 text-orange-500 underline">Go Back</button>
      </div>
    );
  }

  const addToCart = () => {
    setCartItems(prev => [...prev, { 
      id: `${selectedProduct.id}-${Date.now()}`, 
      product: selectedProduct, 
      quantity: 1 
    }]);
  };

  return (
    <div className="mobile-app-container w-full min-h-screen bg-background text-on-surface font-body overflow-x-hidden">
      
{/*  IM Mode Header: Persistent Ticker  */}
<header className="fixed top-0 w-full z-50 flex flex-col">
<div className="bg-primary-container text-on-primary-container px-4 py-1.5 flex items-center justify-between text-[10px] font-bold uppercase tracking-widest overflow-hidden">
<div className="flex gap-8 animate-infinite-scroll whitespace-nowrap">
<span>NEW DROP: {selectedProduct.name} • PRIME MEMBER EXCLUSIVE • GLOBAL SHIPPING ACTIVE • 0BUCK VERIFIED</span>
<span>NEW DROP: {selectedProduct.name} • PRIME MEMBER EXCLUSIVE • GLOBAL SHIPPING ACTIVE • 0BUCK VERIFIED</span>
</div>
</div>
{/*  Shared Component: TopAppBar  */}
<nav className="bg-zinc-950/80 backdrop-blur-xl text-orange-600 sticky top-0 w-full z-50 flex flex-col shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] mt-0">
<div className="flex items-center justify-between px-4 py-3">
<div className="flex items-center gap-3">
<button onClick={() => setCurrentView('prime')} className="text-white material-symbols-outlined">arrow_back</button>
<h1 className="font-['Plus_Jakarta_Sans'] font-bold tracking-tight text-white uppercase tracking-tighter text-lg truncate max-w-[200px]">{selectedProduct.name}</h1>
</div>
<div className="flex items-center gap-4">
<button className="text-white material-symbols-outlined">share</button>
<div className="relative" onClick={() => setCurrentView('cart')}>
<span className="material-symbols-outlined text-white">shopping_cart</span>
<span className="absolute -top-2 -right-2 bg-primary-container text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full border-2 border-zinc-950">!</span>
</div>
</div>
</div>
</nav>
</header>

<main className="mt-20 px-0">
{/*  Frosted Image Gallery  */}
<section className="relative w-full aspect-square bg-zinc-900 overflow-hidden">
<div className="absolute inset-0 flex items-center justify-center p-6">
<img className="w-full h-full object-contain rounded-3xl" alt={selectedProduct.name} src={selectedProduct.image}/>
</div>
{/*  Glass Overlay Pagers  */}
<div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 glass-panel bg-white/10 px-3 py-2 rounded-full">
<div className="w-6 h-1 rounded-full bg-primary-container"></div>
<div className="w-2 h-1 rounded-full bg-white/20"></div>
<div className="w-2 h-1 rounded-full bg-white/20"></div>
</div>
</section>

{/*  Product Core Info  */}
<section className="px-5 pt-8 bg-[#0a0a0a]">
<div className="flex items-baseline gap-3 mb-2">
<span className="text-4xl font-headline font-extrabold text-white tracking-tighter">${selectedProduct.price}</span>
{selectedProduct.category_type === 'MAGNET' && (
  <span className="bg-primary/20 text-primary-container text-[11px] font-black px-2 py-0.5 rounded uppercase tracking-wider">FREE GIFT</span>
)}
<span className="text-[10px] bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded uppercase font-bold">{selectedProduct.warehouse_anchor} WAREHOUSE</span>
</div>
<h2 className="text-2xl font-headline font-bold text-white leading-tight mb-4">{selectedProduct.name}</h2>

<div className="flex flex-col gap-3 mb-8">
<div className="bg-zinc-900 p-4 rounded-2xl flex items-center justify-between">
<div className="flex items-center gap-3">
<span className="material-symbols-outlined text-orange-500">local_shipping</span>
<div>
<p className="text-sm font-bold text-white">Truth Logistics</p>
<p className="text-xs text-zinc-400">{selectedProduct.warehouse_anchor === 'US' ? '3-5 Day Delivery (Local)' : '10-15 Day Delivery (Global)'}</p>
</div>
</div>
<span className="text-xs font-bold text-orange-500">CALCULATED</span>
</div>
</div>

{/*  Description / Narrative  */}
<div className="mb-10 text-zinc-400 leading-relaxed text-sm obuck-html-content">
  <div dangerouslySetInnerHTML={{ __html: selectedProduct.description }} />
</div>

{/*  Merchant Info  */}
<div className="bg-zinc-900 p-6 rounded-3xl mb-10 flex items-center justify-between">
<div className="flex items-center gap-4">
<div className="w-14 h-14 rounded-2xl bg-orange-600/20 flex items-center justify-center">
<span className="material-symbols-outlined text-orange-500 text-3xl">hub</span>
</div>
<div>
<h4 className="text-white font-bold">0Buck Verified Artisan</h4>
<div className="flex items-center gap-1 mt-1">
<span className="material-symbols-outlined text-orange-500 text-sm" style={{"fontVariationSettings":"'FILL' 1"}}>star</span>
<span className="text-xs font-bold text-white">4.9</span>
<span className="text-xs text-zinc-500 ml-1">(Audited Source)</span>
</div>
</div>
</div>
<div className="bg-zinc-800 px-3 py-1.5 rounded-full flex items-center gap-1.5">
<span className="material-symbols-outlined text-blue-400 text-sm">verified</span>
<span className="text-[10px] font-black text-white">VERIFIED</span>
</div>
</div>

</section>
</main>

{/*  Sticky Bottom Bar  */}
<div className="fixed bottom-0 left-0 w-full z-50">
<div className="bg-zinc-950/90 backdrop-blur-2xl px-5 pb-8 pt-4 border-t border-white/5 flex gap-4 items-center">
<button className="w-14 h-14 bg-zinc-900 rounded-2xl flex items-center justify-center text-zinc-400 active:scale-95 transition-transform">
<span className="material-symbols-outlined">favorite</span>
</button>
<button onClick={addToCart} className="flex-1 h-14 bg-zinc-800 text-white font-black uppercase tracking-widest text-xs rounded-2xl active:scale-95 transition-transform">
                Add to Cart
            </button>
<button onClick={() => setCurrentView('secure-pay')} className="flex-[1.5] h-14 bg-gradient-to-br from-primary to-primary-container text-white font-black uppercase tracking-widest text-xs rounded-2xl shadow-lg shadow-orange-900/40 active:scale-95 transition-transform">
                Buy Now
            </button>
</div>
</div>

    </div>
  );
}
