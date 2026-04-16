import React, { useState, useEffect } from 'react';
import { CreditCard, MapPin, CheckCircle2, DollarSign, Wallet, ShieldCheck, ShoppingBag, ChevronRight, Ticket, Info, Loader2, ChevronLeft, Tag, Lock } from 'lucide-react';
import { useAppContext } from '../AppContext';
import { mockApi, ShopifyDiscountCode } from '../../../services/mockApi';
import { orderApi } from '../../../services/api';
import { ShopifyCheckoutModal } from './ShopifyCheckoutModal';
import { PaymentSuccessScreen } from './PaymentSuccessScreen';

// Step indicator
const StepBar: React.FC<{ step: number }> = ({ step }) => {
  const steps = ['Review', 'Address', 'Payment'];
  return (
    <div className="flex items-center justify-center gap-0 px-6 py-4">
      {steps.map((label, i) => {
        const idx = i + 1;
        const done = idx < step;
        const active = idx === step;
        return (
          <React.Fragment key={label}>
            <div className="flex flex-col items-center gap-1">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-bold transition-all duration-300 ${
                done ? 'bg-[var(--wa-teal)] text-white' :
                active ? 'bg-[var(--wa-teal)] text-white shadow-[0_2px_10px_rgba(232,69,10,0.4)]' :
                'bg-gray-200 dark:bg-white/10 text-gray-400'
              }`}>
                {done ? <CheckCircle2 className="w-4 h-4" /> : idx}
              </div>
              <span className={`text-[9px] font-semibold uppercase tracking-widest transition-colors ${active ? 'text-[var(--wa-teal)]' : done ? 'text-gray-500' : 'text-gray-300 dark:text-gray-600'}`}>
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={`h-px flex-1 mx-2 mb-4 transition-all duration-300 ${done ? 'bg-[var(--wa-teal)]' : 'bg-gray-200 dark:bg-white/10'}`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

export const CheckoutDrawer: React.FC = () => {
  const {
    setActiveDrawer, pushDrawer, popDrawer, selectedProductId, t,
    setIsShopifyCheckoutOpen, isShopifyCheckoutOpen,
    setShopifyCheckoutUrl, shopifyCheckoutUrl,
    triggerPaymentSuccess, currency, getExchangeRate,
    isPrime, userBalance: globalBalance
  } = useAppContext();

  // Step state: 1 = Review, 2 = Address, 3 = Payment
  const [step, setStep] = useState(1);

  const [paymentMethod, setPaymentMethod] = useState<'balance' | 'usdc' | 'paypal'>('paypal');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccessScreen, setShowSuccessScreen] = useState(false);
  const [paidOrderId, setPaidOrderId] = useState<string | null>(null);
  const [securingStep, setSecuringStep] = useState<string | null>(null);

  const getProduct = () => {
    const products: Record<string, { price: number; name: string; originalPrice: number }> = {
      'p1': { price: 29.99, name: 'Artisan Crafted Wireless Earbuds', originalPrice: 59.99 },
      'p2': { price: 199.00, name: 'Custom Artisan Mechanical Keyboard', originalPrice: 299.00 },
      'p3': { price: 899.00, name: 'iPhone 15 Pro (C2W Collective Pre-order)', originalPrice: 999.00 },
    };
    return products[selectedProductId || 'p1'] || products['p1'];
  };
  const product = getProduct();

  const [availableDiscounts, setAvailableDiscounts] = useState<ShopifyDiscountCode[]>([]);
  const [appliedDiscounts, setAppliedDiscounts] = useState<string[]>([]);
  const [discountBreakdown, setDiscountBreakdown] = useState<{ code: string; discount: number }[]>([]);
  const [totalDiscountAmount, setTotalDiscountAmount] = useState(0);
  const [isLoadingDiscounts, setIsLoadingDiscounts] = useState(true);
  const [showDiscountPanel, setShowDiscountPanel] = useState(false);
  const [useBalance, setUseBalance] = useState(false);
  const [balanceDeduction, setBalanceDeduction] = useState(0);
  const [actualBalanceCost, setActualBalanceCost] = useState(0);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [isPreflightChecking, setIsPreflightChecking] = useState(false);
  const [isCheckoutBlocked, setIsCheckoutBlocked] = useState(false);
  const [quoteSummary, setQuoteSummary] = useState<{
    subtotal: number;
    couponDiscount: number;
    balanceUsed: number;
    finalDue: number;
  } | null>(null);

  useEffect(() => {
    const loadInitialData = async () => {
      setIsLoadingDiscounts(true);
      try {
        const resp = await orderApi.getDiscounts(product.price);
        const items = (resp?.data?.items || []) as ShopifyDiscountCode[];
        setAvailableDiscounts(items);
        const selected = resp?.data?.selected || {};
        setDiscountBreakdown((selected?.breakdown || []) as { code: string; discount: number }[]);
        setTotalDiscountAmount(Number(selected?.total_discount || 0));
      } catch (error) {
        console.error('Failed to load checkout data:', error);
        setAvailableDiscounts([]);
      } finally {
        setIsLoadingDiscounts(false);
      }
    };
    loadInitialData();
  }, [product.price]);

  const subtotal = product.price;
  const taxRate = 0.08;
  const taxAmount = (subtotal - totalDiscountAmount) * taxRate;
  const subtotalWithTax = subtotal - totalDiscountAmount + taxAmount;

  useEffect(() => {
    const recalcDiscounts = async () => {
      try {
        const resp = await orderApi.evaluateDiscounts(subtotal, appliedDiscounts);
        const data = resp?.data || {};
        const selected = data?.selected || {};
        const validCodes = (selected?.valid_codes || []) as string[];
        const breakdown = (selected?.breakdown || []) as { code: string; discount: number }[];
        const total = Number(selected?.total_discount || 0);
        const items = (data?.items || []) as ShopifyDiscountCode[];
        setAvailableDiscounts(items);
        setDiscountBreakdown(breakdown);
        setTotalDiscountAmount(total);
        if (validCodes.length !== appliedDiscounts.length || validCodes.some((c, i) => c !== appliedDiscounts[i])) {
          setAppliedDiscounts(validCodes);
        }
      } catch (error) {
        console.error('Failed to recalc discounts:', error);
        setDiscountBreakdown([]);
        setTotalDiscountAmount(0);
      }
    };
    recalcDiscounts();
  }, [appliedDiscounts, subtotal]);

  useEffect(() => {
    if (useBalance) {
      const multiplier = isPrime ? 1.2 : 1.0;
      const effectiveAvailable = globalBalance * multiplier;
      const deduction = Math.min(subtotalWithTax, effectiveAvailable);
      setBalanceDeduction(deduction);
      setActualBalanceCost(deduction / multiplier);
    } else {
      setBalanceDeduction(0);
      setActualBalanceCost(0);
    }
  }, [useBalance, subtotalWithTax, globalBalance, isPrime]);

  const finalTotal = Math.max(0, subtotalWithTax - balanceDeduction);
  const effectiveSubtotal = quoteSummary?.subtotal ?? subtotal;
  const effectiveDiscountAmount = quoteSummary?.couponDiscount ?? totalDiscountAmount;
  const effectiveBalanceUsed = quoteSummary?.balanceUsed ?? balanceDeduction;
  const effectiveFinalDue = quoteSummary?.finalDue ?? finalTotal;
  const isFullBalancePayment = useBalance && effectiveFinalDue === 0;
  const checkoutProductId = (() => {
    if (selectedProductId && /^\d+$/.test(selectedProductId)) return Number(selectedProductId);
    const fallbackMap: Record<string, number> = { p1: 1, p2: 2, p3: 3 };
    return fallbackMap[selectedProductId || 'p1'] ?? 1;
  })();

  const buildSubmitToken = () =>
    (crypto.randomUUID().replace(/-/g, '') + '00000000000000000000000000000000').slice(0, 32);

  const mapCheckoutError = (detail: string, fallbackMessage?: string) => {
    if (detail.startsWith('product_not_ready_for_checkout')) return '该商品尚未完成上架结算配置，暂不可下单。';
    if (detail.startsWith('invalid_product_price')) return '该商品价格待补全，暂不可下单。';
    if (detail.startsWith('product_not_found')) return '商品不存在或已下架。';
    if (detail.startsWith('quote_')) return '报价已过期或不一致，请重试一次。';
    if (detail.startsWith('duplicate_checkout_submission')) return '检测到重复提交，请稍后查看订单状态。';
    if (detail.startsWith('insufficient_balance_for_full_payment')) return '余额不足，无法完成全额余额支付。';
    if (detail.startsWith('not_authenticated') || detail.startsWith('unauthorized')) return '请先登录后再下单。';
    return fallbackMessage || '下单校验失败，请稍后重试。';
  };

  useEffect(() => {
    let active = true;
    const preflight = async () => {
      setIsPreflightChecking(true);
      try {
        const payload = {
          items: [{ product_id: checkoutProductId, quantity: 1 }],
          balance_used: useBalance ? Number(actualBalanceCost.toFixed(2)) : 0,
          applied_discount_codes: appliedDiscounts,
          is_full_payment: isFullBalancePayment,
          client_submit_token: buildSubmitToken()
        };
        const quoteResp = await orderApi.createQuote(payload);
        if (!active) return;
        const summary = quoteResp?.data?.summary;
        if (summary) {
          setQuoteSummary({
            subtotal: Number(summary.subtotal ?? subtotal),
            couponDiscount: Number(summary.coupon_discount ?? 0),
            balanceUsed: Number(summary.balance_used ?? 0),
            finalDue: Number(summary.final_due ?? finalTotal),
          });
        } else {
          setQuoteSummary(null);
        }
        setIsCheckoutBlocked(false);
        setCheckoutError(null);
      } catch (error: any) {
        if (!active) return;
        const detail = String(error?.response?.data?.detail || '');
        setIsCheckoutBlocked(true);
        setQuoteSummary(null);
        setCheckoutError(mapCheckoutError(detail));
      } finally {
        if (active) setIsPreflightChecking(false);
      }
    };
    preflight();
    return () => {
      active = false;
    };
  }, [checkoutProductId, useBalance, actualBalanceCost, isFullBalancePayment, appliedDiscounts.join(',')]);

  const localRate = getExchangeRate(currency);
  const currencySymbol = currency === 'JPY' ? '¥' : currency === 'CNY' ? '¥' : currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : '$';

  const formatPrice = (usdPrice: number) => (usdPrice * localRate).toLocaleString(undefined, {
    minimumFractionDigits: currency === 'JPY' ? 0 : 2,
    maximumFractionDigits: currency === 'JPY' ? 0 : 2
  });

  const handleToggleDiscount = async (discount: ShopifyDiscountCode) => {
    if (!discount.isEligible) return;
    const code = discount.code;
    if (appliedDiscounts.includes(code)) {
      setAppliedDiscounts(prev => prev.filter(c => c !== code));
    } else {
      setAppliedDiscounts(prev => [...prev, code]);
    }
  };

  const handleRemoveAllDiscounts = () => setAppliedDiscounts([]);

  const handleConfirm = async () => {
    if (isCheckoutBlocked) return;
    setIsProcessing(true);
    setCheckoutError(null);
    setSecuringStep('securing');
    try {
      const submitToken = buildSubmitToken();
      const quotePayload = {
        items: [{ product_id: checkoutProductId, quantity: 1 }],
        balance_used: useBalance ? Number(actualBalanceCost.toFixed(2)) : 0,
        applied_discount_codes: appliedDiscounts,
        is_full_payment: isFullBalancePayment,
        client_submit_token: submitToken
      };
      const quoteResp = await orderApi.createQuote(quotePayload);
      const quoteToken = quoteResp?.data?.quote_token;
      if (!quoteToken) {
        throw new Error('quote_token_missing');
      }
      const quoteS = quoteResp?.data?.summary;
      if (quoteS) {
        setQuoteSummary({
          subtotal: Number(quoteS.subtotal ?? subtotal),
          couponDiscount: Number(quoteS.coupon_discount ?? 0),
          balanceUsed: Number(quoteS.balance_used ?? 0),
          finalDue: Number(quoteS.final_due ?? finalTotal),
        });
      }

      const createResp = await orderApi.create({
        ...quotePayload,
        quote_token: quoteToken
      });
      const createData = createResp?.data || {};

      if (createData?.status === 'error') {
        const msg = Array.isArray(createData?.message)
          ? createData.message.join(', ')
          : String(createData?.message || 'create_order_failed');
        throw new Error(msg);
      }

      if (createData?.invoice_url) {
        setSecuringStep('generating');
        await new Promise(r => setTimeout(r, 700));
        setShopifyCheckoutUrl(createData.invoice_url);
        (window as any)._pendingOrderId = String(createData.draft_order_id || createData.order_id || 'DRAFT');
        setIsShopifyCheckoutOpen(true);
        return;
      }

      if (createData?.order_id) {
        setSecuringStep('generating');
        await new Promise(r => setTimeout(r, 500));
        setPaidOrderId(String(createData.order_id));
        setShowSuccessScreen(true);
        return;
      }

      let giftCardCode = undefined;
      if (balanceDeduction > 0) {
        setSecuringStep('freezing');
        const gc = await mockApi.createGiftCardFromBalance('user123', balanceDeduction);
        giftCardCode = gc.code;
      }
      setSecuringStep('generating');
      const { checkoutUrl, orderId } = await mockApi.createShopifyCheckout(selectedProductId || 'p1', 0, 1, giftCardCode);
      await new Promise(r => setTimeout(r, 1200));
      setShopifyCheckoutUrl(checkoutUrl);
      (window as any)._pendingOrderId = orderId;
      setIsShopifyCheckoutOpen(true);
    } catch (error: any) {
      const detail = String(error?.response?.data?.detail || '');
      const message = String(error?.message || '').toLowerCase();
      const fallback = message.includes('quote_token_missing')
        ? '报价失败，未生成有效报价单。'
        : message.includes('shopify')
        ? '订单创建失败（网关暂不可用），请稍后重试。'
        : undefined;
      setCheckoutError(mapCheckoutError(detail, fallback));
      console.error('Checkout failed:', error);
    } finally {
      setIsProcessing(false);
      setSecuringStep(null);
    }
  };

  const handlePaymentSuccess = () => {
    const orderId = (window as any)._pendingOrderId || 'ORD-999';
    setIsShopifyCheckoutOpen(false);
    setPaidOrderId(orderId);
    setShowSuccessScreen(true);
  };

  const handleSuccessContinue = () => {
    setShowSuccessScreen(false);
    setActiveDrawer('none');
    if (paidOrderId) triggerPaymentSuccess(paidOrderId);
  };

  const ctaLabel = () => {
    if (step === 1) return `Continue to Address`;
    if (step === 2) return `Continue to Payment`;
    if (isPreflightChecking) return '校验商品价格中...';
    if (isCheckoutBlocked) return '当前商品暂不可下单';
    if (isFullBalancePayment) return t('checkout.full_balance_payment');
    return `${t('checkout.place_order')} · ${currencySymbol}${formatPrice(effectiveFinalDue)}`;
  };

  return (
    <div className="flex flex-col h-full bg-[#F2F2F7] dark:bg-black relative">

      {/* Shopify checkout modal */}
      {isShopifyCheckoutOpen && shopifyCheckoutUrl && (
        <ShopifyCheckoutModal
          url={shopifyCheckoutUrl}
          onClose={() => setIsShopifyCheckoutOpen(false)}
          onSuccess={handlePaymentSuccess}
        />
      )}

      {showSuccessScreen && paidOrderId && (
        <PaymentSuccessScreen
          orderId={paidOrderId}
          amount={effectiveFinalDue}
          onContinue={handleSuccessContinue}
        />
      )}

      {/* Securing overlay */}
      {securingStep && (
        <div className="fixed inset-0 z-[10002] bg-white/95 dark:bg-black/95 flex flex-col items-center justify-center backdrop-blur-md animate-in fade-in duration-300">
          <div className="relative mb-8">
            <div className="w-24 h-24 border-4 border-gray-100 dark:border-white/5 rounded-full" />
            <div className="absolute inset-0 w-24 h-24 border-4 border-[var(--wa-teal)] rounded-full border-t-transparent animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Lock className="w-8 h-8 text-[var(--wa-teal)]" />
            </div>
          </div>
          <p className="text-[18px] font-bold text-gray-900 dark:text-white mb-2">
            {t('checkout.securing_connection')}
          </p>
          <p className="text-[12px] text-gray-400 font-medium animate-pulse">
            {securingStep === 'securing' ? 'Authenticating Identity...' :
             securingStep === 'freezing' ? 'Allocating 0Buck Balance Assets...' :
             'Syncing with Shopify Gateway...'}
          </p>
        </div>
      )}

      {/* ── Fixed Header ── */}
      <div className="bg-white dark:bg-[#1C1C1E] border-b border-gray-100 dark:border-white/5 flex-shrink-0">
        <div className="h-14 flex items-center px-4">
          <button
            onClick={() => step > 1 ? setStep(step - 1) : popDrawer()}
            className="p-2 -ml-2 text-gray-500 hover:text-gray-900 dark:hover:text-white active:scale-90 transition-all"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <h2 className="ml-1.5 text-[17px] font-semibold text-gray-900 dark:text-white flex-1">
            {t('checkout.place_order')}
          </h2>
          {/* Price always visible in header */}
          <span className="font-mono font-bold text-[15px] text-[var(--wa-teal)]">
            {currencySymbol}{formatPrice(effectiveFinalDue)}
          </span>
        </div>

        {/* Step progress bar */}
        <StepBar step={step} />
      </div>

      {/* ── Scrollable content ── */}
      <div className="flex-1 overflow-y-auto no-scrollbar px-4 pt-4 pb-32 space-y-3">

        {/* ━━ STEP 1: Review Order ━━ */}
        {step === 1 && (
          <>
            {/* Product card */}
            <div className="bg-white dark:bg-[#1C1C1E] rounded-[22px] p-4 border border-gray-100 dark:border-white/5 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-[10px] bg-[var(--wa-teal)]/10 flex items-center justify-center">
                  <ShoppingBag className="w-4 h-4 text-[var(--wa-teal)]" />
                </div>
                <h3 className="text-[13px] font-semibold text-gray-900 dark:text-white">{t('checkout.order_summary')}</h3>
              </div>

              {/* Product row */}
              <div className="flex items-start justify-between gap-3 pb-4 border-b border-gray-100 dark:border-white/5">
                <div className="flex-1">
                  <p className="text-[14px] font-semibold text-gray-900 dark:text-white leading-snug mb-1">{product.name}</p>
                  <p className="text-[12px] text-gray-400 line-through">{currencySymbol}{formatPrice(product.originalPrice)}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-mono font-bold text-[17px] text-[var(--wa-teal)]">{currencySymbol}{formatPrice(effectiveSubtotal)}</p>
                  <span className="text-[10px] font-semibold text-green-600 bg-green-50 dark:bg-green-900/20 px-1.5 py-0.5 rounded-full">
                    Save {currencySymbol}{formatPrice(product.originalPrice - product.price)}
                  </span>
                </div>
              </div>

              {/* Price breakdown */}
              <div className="pt-3 space-y-2">
                <div className="flex justify-between text-[13px]">
                  <span className="text-gray-500">{t('checkout.tax')} (8%)</span>
                  <span className="font-medium text-gray-700 dark:text-gray-300">{currencySymbol}{formatPrice(taxAmount)}</span>
                </div>
                <div className="flex justify-between text-[13px]">
                  <span className="text-gray-500">{t('order.shipping_cost')}</span>
                  <span className="font-semibold text-green-600">{t('order.free_shipping')}</span>
                </div>
                {discountBreakdown.map((item) => (
                  <div key={item.code} className="flex justify-between text-[13px] text-green-600">
                    <span className="flex items-center gap-1 font-medium">
                      <Tag className="w-3 h-3" /> {item.code}
                    </span>
                    <span className="font-bold">-{currencySymbol}{formatPrice(item.discount)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Voucher selector */}
            <div className="bg-white dark:bg-[#1C1C1E] rounded-[22px] border border-gray-100 dark:border-white/5 shadow-sm overflow-hidden">
              <button
                onClick={() => setShowDiscountPanel(!showDiscountPanel)}
                className="w-full flex items-center px-4 py-3.5 active:bg-gray-50 dark:active:bg-white/5 transition-colors"
              >
                <Ticket className="w-4.5 h-4.5 text-[var(--wa-teal)] mr-3" />
                <span className="flex-1 text-left text-[14px] font-medium text-gray-800 dark:text-gray-200">
                  {appliedDiscounts.length > 0 ? `${appliedDiscounts.length} ${t('checkout.discounts_applied')}` : t('checkout.voucher')}
                </span>
                {appliedDiscounts.length > 0 && (
                  <span className="text-[12px] font-semibold text-green-600 mr-2">-{currencySymbol}{formatPrice(effectiveDiscountAmount)}</span>
                )}
                <ChevronRight className="w-4 h-4 text-gray-300" />
              </button>

              {showDiscountPanel && (
                <div className="border-t border-gray-100 dark:border-white/5 px-4 pb-4 pt-3 space-y-2.5 animate-in slide-in-from-top-2 duration-200">
                  <div className="flex justify-between items-center mb-1">
                    <p className="text-[10px] text-gray-400 font-medium uppercase tracking-widest">
                      Tap to toggle · <span className="text-[var(--wa-teal)]">{t('checkout.can_stack')}</span>
                    </p>
                    {appliedDiscounts.length > 0 && (
                      <button onClick={handleRemoveAllDiscounts} className="text-[10px] text-red-500 font-semibold">
                        {t('common.remove_all')}
                      </button>
                    )}
                  </div>
                  {isLoadingDiscounts ? (
                    <div className="flex items-center justify-center py-4 gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-[var(--wa-teal)]" />
                      <span className="text-[12px] text-gray-400">Loading discounts...</span>
                    </div>
                  ) : availableDiscounts.map((discount) => {
                    const isApplied = appliedDiscounts.includes(discount.code);
                    const isDisabled = !discount.isEligible;
                    return (
                      <div
                        key={discount.id}
                        onClick={() => handleToggleDiscount(discount)}
                        className={`flex items-center justify-between p-3.5 rounded-xl transition-all active:scale-[0.98] ${
                          isDisabled ? 'opacity-40 cursor-not-allowed bg-gray-50 dark:bg-white/3' :
                          isApplied ? 'bg-[var(--wa-teal)]/8 border border-[var(--wa-teal)]/25 cursor-pointer' :
                          'bg-gray-50 dark:bg-white/5 border border-transparent cursor-pointer hover:border-gray-200 dark:hover:border-white/10'
                        }`}
                      >
                        <div>
                          <p className="text-[13px] font-bold text-gray-900 dark:text-white">{discount.code}</p>
                          <p className="text-[11px] text-gray-400 mt-0.5">{discount.description}</p>
                          {isDisabled && <p className="text-[10px] text-red-400 font-medium mt-1">Min. spend ${discount.minimumAmount?.toFixed(2)}</p>}
                        </div>
                        <div className="flex items-center gap-2.5 shrink-0">
                          <span className="font-mono font-bold text-[14px] text-orange-500">
                            {discount.type === 'percentage' ? `-${discount.value}%` : `-$${discount.value.toFixed(2)}`}
                          </span>
                          {isApplied && (
                            <div className="w-5 h-5 bg-[var(--wa-teal)] rounded-full flex items-center justify-center">
                              <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Balance toggle */}
            <div
              onClick={() => setUseBalance(!useBalance)}
              className={`flex items-center justify-between px-4 py-3.5 rounded-[22px] border transition-all cursor-pointer shadow-sm ${
                useBalance
                  ? 'bg-orange-50 dark:bg-orange-500/8 border-[var(--wa-teal)]/30'
                  : 'bg-white dark:bg-[#1C1C1E] border-gray-100 dark:border-white/5'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-[12px] flex items-center justify-center transition-colors ${useBalance ? 'bg-[var(--wa-teal)] text-white' : 'bg-gray-100 dark:bg-white/8 text-gray-500'}`}>
                  <Wallet className="w-4.5 h-4.5" />
                </div>
                <div>
                  <p className={`text-[13px] font-semibold ${useBalance ? 'text-[var(--wa-teal)]' : 'text-gray-700 dark:text-gray-300'}`}>
                    {t('checkout.use_balance')}
                    {isPrime && <span className="ml-1.5 text-[9px] bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 px-1.5 py-0.5 rounded-md font-bold uppercase">1.2× Prime</span>}
                  </p>
                  <p className="text-[11px] text-gray-400 font-medium">
                    {t('checkout.available_balance')}: {currencySymbol}{formatPrice(globalBalance)}
                  </p>
                </div>
              </div>
              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${useBalance ? 'bg-[var(--wa-teal)] border-[var(--wa-teal)]' : 'border-gray-300 dark:border-white/20'}`}>
                {useBalance && <CheckCircle2 className="w-4 h-4 text-white" />}
              </div>
            </div>

            {useBalance && effectiveBalanceUsed > 0 && (
              <div className="px-4 py-2 bg-orange-50/50 dark:bg-orange-500/5 rounded-2xl border border-orange-100 dark:border-orange-500/10 space-y-1">
                <div className="flex justify-between text-[13px] text-orange-600 dark:text-orange-400">
                  <span className="font-medium">{t('checkout.balance_deduction')}</span>
                  <span className="font-bold font-mono">-{currencySymbol}{formatPrice(effectiveBalanceUsed)}</span>
                </div>
                {isPrime && (
                  <div className="flex justify-between text-[10px] text-indigo-500">
                    <span className="font-medium">Prime 1.2× benefit</span>
                    <span className="font-bold">-{currencySymbol}{formatPrice(effectiveBalanceUsed - actualBalanceCost)} free</span>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* ━━ STEP 2: Shipping Address ━━ */}
        {step === 2 && (
          <div
            onClick={() => pushDrawer('address')}
            className="bg-white dark:bg-[#1C1C1E] rounded-[22px] p-5 border border-gray-100 dark:border-white/5 shadow-sm flex items-start justify-between cursor-pointer active:scale-[0.98] transition-transform"
          >
            <div className="flex items-start gap-4">
              <div className="w-11 h-11 bg-orange-50 dark:bg-[var(--wa-teal)]/10 rounded-[14px] flex items-center justify-center shrink-0">
                <MapPin className="w-5 h-5 text-[var(--wa-teal)]" />
              </div>
              <div>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-1">Delivery Address</p>
                <p className="text-[16px] font-semibold text-gray-900 dark:text-gray-100 mb-0.5">
                  Long <span className="text-[13px] font-normal text-gray-400">+1 123-456-7890</span>
                </p>
                <p className="text-[13px] text-gray-500 line-clamp-1">
                  123 Artisan Ave, New York, NY 10001
                </p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-300 shrink-0 mt-1" />
          </div>
        )}

        {/* ━━ STEP 3: Payment Method ━━ */}
        {step === 3 && !isFullBalancePayment && (
          <div className="bg-white dark:bg-[#1C1C1E] rounded-[22px] p-4 border border-gray-100 dark:border-white/5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[13px] font-semibold text-gray-900 dark:text-white">{t('order.payment_method')}</h3>
              <div className="flex items-center gap-1.5 opacity-40 grayscale scale-75 origin-right">
                <img src="https://upload.wikimedia.org/wikipedia/commons/b/b5/PayPal.svg" className="h-3" alt="PayPal" />
                <img src="https://upload.wikimedia.org/wikipedia/commons/5/5e/Visa_Inc._logo.svg" className="h-3" alt="Visa" />
                <img src="https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg" className="h-3" alt="Mastercard" />
              </div>
            </div>

            <div className="space-y-2.5">
              {[
                { id: 'paypal' as const, icon: <CreditCard className="w-5 h-5" />, bg: 'bg-indigo-100 dark:bg-indigo-500/20', color: 'text-indigo-600', title: 'Shopify Secure', subtitle: 'Visa, Apple Pay, PayPal...' },
                { id: 'usdc' as const, icon: <DollarSign className="w-5 h-5" />, bg: 'bg-blue-100 dark:bg-blue-500/20', color: 'text-blue-600', title: t('checkout.crypto_pay'), subtitle: 'USDC · Fast & cheap' },
              ].map(({ id, icon, bg, color, title, subtitle }) => (
                <div
                  key={id}
                  onClick={() => setPaymentMethod(id)}
                  className={`flex items-center justify-between p-3.5 rounded-2xl border-2 transition-all cursor-pointer active:scale-[0.98] ${
                    paymentMethod === id
                      ? 'border-[var(--wa-teal)] bg-orange-50/40 dark:bg-orange-500/8'
                      : 'border-transparent bg-gray-50 dark:bg-white/5'
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    <div className={`w-10 h-10 rounded-[13px] ${bg} flex items-center justify-center ${color}`}>{icon}</div>
                    <div>
                      <p className="text-[14px] font-semibold text-gray-900 dark:text-white">{title}</p>
                      <p className="text-[11px] text-gray-400">{subtitle}</p>
                    </div>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${paymentMethod === id ? 'bg-[var(--wa-teal)] border-[var(--wa-teal)]' : 'border-gray-300 dark:border-white/20'}`}>
                    {paymentMethod === id && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                  </div>
                </div>
              ))}
            </div>

            <p className="mt-3 text-[10px] text-gray-400 text-center">{t('checkout.mixed_payment_desc')}</p>
          </div>
        )}

        {step === 3 && isFullBalancePayment && (
          <div className="bg-green-50 dark:bg-green-900/15 rounded-[22px] p-5 border border-green-200 dark:border-green-900/30 text-center">
            <CheckCircle2 className="w-10 h-10 text-green-500 mx-auto mb-2" />
            <p className="text-[15px] font-semibold text-green-700 dark:text-green-400">{t('checkout.full_balance_payment')}</p>
            <p className="text-[12px] text-green-600/70 dark:text-green-500/70 mt-1">Your 0Buck balance covers the full amount</p>
          </div>
        )}

        {/* Order summary recap — shown on steps 2 & 3 */}
        {step > 1 && (
          <div className="bg-white dark:bg-[#1C1C1E] rounded-[22px] px-4 py-3.5 border border-gray-100 dark:border-white/5 shadow-sm">
            <div className="flex justify-between items-center">
              <p className="text-[12px] text-gray-500 font-medium">{product.name}</p>
              <div className="text-right">
                <p className="font-mono font-bold text-[16px] text-[var(--wa-teal)]">{currencySymbol}{formatPrice(effectiveFinalDue)}</p>
                <p className="text-[10px] text-gray-400 flex items-center gap-1 justify-end mt-0.5">
                  <Info className="w-3 h-3" /> incl. tax + discounts
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Security line */}
        <div className="flex items-center justify-center gap-1.5 opacity-40 pt-2">
          <ShieldCheck className="w-3.5 h-3.5 text-green-500" />
          <p className="text-[10px] font-medium text-gray-500 uppercase tracking-widest">{t('checkout.secure_checkout')}</p>
        </div>
        {checkoutError && (
          <div className="mt-2 text-center">
            <p className="text-[12px] font-medium text-red-500">{checkoutError}</p>
          </div>
        )}
      </div>

      {/* ── Fixed Bottom CTA ── */}
      <div className="absolute bottom-0 left-0 right-0 bg-white/90 dark:bg-[#1C1C1E]/90 backdrop-blur-xl border-t border-gray-100 dark:border-white/5 px-4 pt-3 pb-8">
        <button
          onClick={() => step < 3 ? setStep(step + 1) : handleConfirm()}
          disabled={isProcessing || (step === 3 && (isPreflightChecking || isCheckoutBlocked))}
          className="w-full h-14 rounded-full font-semibold text-[16px] text-white flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-50"
          style={{
            background: isFullBalancePayment && step === 3 ? '#16a34a' : 'linear-gradient(135deg, #FF7A3D 0%, #E8450A 100%)',
            boxShadow: isFullBalancePayment && step === 3 ? '0 4px 16px rgba(22,163,74,0.35)' : '0 4px 16px rgba(232,69,10,0.35)'
          }}
        >
          {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : (
            <>
              {ctaLabel()}
              {step < 3 && <ChevronRight className="w-4 h-4" />}
            </>
          )}
        </button>
      </div>
    </div>
  );
};
