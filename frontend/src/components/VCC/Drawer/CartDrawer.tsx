import React from 'react';
import { ShoppingCart, Minus, Plus, ChevronRight } from 'lucide-react';
import { usePreferenceContext } from '../contexts/PreferenceContext';
import { useDrawerContext } from '../contexts/DrawerContext';

export const CartDrawer = () => {
    const { setActiveDrawer } = useDrawerContext();
  const { t } = usePreferenceContext();

  const cartItems = [
    {
      id: 1,
      name: t('cart.mock_product_1_name'),
      price: 24.00,
      quantity: 2,
      image: `https://picsum.photos/seed/cart1/400/400`,
      variant: t('cart.mock_product_1_variant')
    },
    {
      id: 2,
      name: t('cart.mock_product_2_name'),
      price: 35.00,
      quantity: 1,
      image: `https://picsum.photos/seed/cart2/400/400`,
      variant: t('cart.mock_product_2_variant')
    }
  ];

  const subtotal = cartItems.reduce((acc, item) => acc + item.price * item.quantity, 0);

  return (
    <div className="flex flex-col h-full bg-[#F2F2F7] dark:bg-black">

      {/* Item list */}
      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-2 space-y-3 no-scrollbar">
        {cartItems.length > 0 ? (
          cartItems.map((item) => (
            <div
              key={item.id}
              className="bg-white dark:bg-[#1C1C1E] rounded-[22px] p-3.5 flex items-center gap-3 border border-gray-100 dark:border-white/5 shadow-sm active:scale-[0.99] transition-transform"
            >
              {/* Selection check */}
              <div className="w-5 h-5 rounded-full bg-[var(--wa-teal)] flex items-center justify-center shrink-0 shadow-sm">
                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>

              {/* Product Image — larger, better rounded */}
              <div className="w-[88px] h-[88px] rounded-[16px] overflow-hidden bg-gray-100 dark:bg-gray-800 shrink-0 border border-gray-100 dark:border-white/5">
                <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                {/* Name */}
                <h3 className="text-[14px] font-semibold text-gray-900 dark:text-white line-clamp-2 leading-snug mb-1.5">
                  {item.name}
                </h3>

                {/* Variant as pill chip */}
                <span className="inline-block bg-gray-100 dark:bg-white/8 text-gray-500 dark:text-gray-400 text-[10px] font-medium px-2 py-0.5 rounded-full mb-2.5">
                  {item.variant}
                </span>

                {/* Price + Qty on same line */}
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-[17px] text-[var(--wa-teal)] leading-none">
                    ${item.price.toFixed(2)}
                  </span>

                  {/* Qty stepper */}
                  <div className="flex items-center gap-2 bg-gray-100 dark:bg-white/8 rounded-full px-2.5 py-1">
                    <button className="text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white transition-colors active:scale-90">
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-[14px] font-bold w-5 text-center text-gray-900 dark:text-white tabular-nums">
                      {item.quantity}
                    </span>
                    <button className="text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white transition-colors active:scale-90">
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center h-64 text-gray-400">
            <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-white/5 flex items-center justify-center mb-4">
              <ShoppingCart className="w-8 h-8 opacity-40" />
            </div>
            <p className="text-[15px] font-medium">{t('cart.empty')}</p>
            <button
              onClick={() => setActiveDrawer('prime')}
              className="mt-4 px-5 py-2 text-white rounded-full text-[13px] font-semibold active:scale-95 transition-transform"
              style={{ background: 'linear-gradient(135deg, #FF7A3D 0%, #E8450A 100%)' }}
            >
              {t('cart.go_shopping')}
            </button>
          </div>
        )}
      </div>

      {/* ── Checkout Footer ── */}
      {cartItems.length > 0 && (
        <div className="bg-white dark:bg-[#1C1C1E] border-t border-gray-100 dark:border-white/5 px-4 py-3.5 shadow-[0_-4px_16px_rgba(0,0,0,0.06)]">
          <div className="flex items-center justify-between">
            {/* Select all + total */}
            <div className="flex items-center gap-2">
              <div className="w-4.5 h-4.5 rounded-full bg-[var(--wa-teal)] flex items-center justify-center">
                <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <span className="text-[10px] text-gray-400 block">{t('common.all_selected')}</span>
                <div className="flex items-baseline gap-0.5">
                  <span className="text-[10px] text-gray-400">{t('common.total')}</span>
                  <span className="font-mono font-bold text-[18px] text-[var(--wa-teal)] ml-0.5">${subtotal.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Checkout button */}
            <button
              onClick={() => setActiveDrawer('checkout')}
              className="text-white px-5 py-3 rounded-2xl font-semibold text-[14px] flex items-center gap-1.5 active:scale-95 transition-transform"
              style={{ background: 'linear-gradient(135deg, #FF7A3D 0%, #E8450A 100%)', boxShadow: '0 4px 14px rgba(232,69,10,0.30)' }}
            >
              {t('common.checkout_count').replace('{count}', cartItems.length.toString())}
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
