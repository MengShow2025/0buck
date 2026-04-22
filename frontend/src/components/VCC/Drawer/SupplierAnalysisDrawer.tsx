import React, { useEffect, useMemo, useState } from 'react';
import { Star, CheckCircle2, ShieldCheck, Clock, Package, ShoppingCart, Info, ExternalLink, MessageCircle, Send, PlayCircle, Globe, Award, ChevronRight, Zap, MapPin, ChevronLeft, Scale, Box, Share2 } from 'lucide-react';
import { usePreferenceContext } from '../contexts/PreferenceContext';
import { useDrawerContext } from '../contexts/DrawerContext';

import { imApi, productApi } from '../../../services/api';

export const SupplierAnalysisDrawer: React.FC = () => {
    const { t } = usePreferenceContext();
  const { selectedProductId } = useDrawerContext();
  const [detail, setDetail] = useState<any | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const id = Number(selectedProductId);
      if (!Number.isFinite(id) || id <= 0) {
        setDetail(null);
        return;
      }
      try {
        const resp = await productApi.getDetail(id);
        if (!cancelled) setDetail(resp.data);
      } catch (e) {
        if (!cancelled) setDetail(null);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [selectedProductId]);

  const supplier = useMemo(() => {
    if (!detail) {
      return {
    name: 'Huizhou Renhe Premium Bamboo & Wood P...',
    verified: true,
    manufacturer: true,
    rating: 4.8,
    reviews: 41,
    location: t('productdetail.guangdong_cn'),
    joined: `7 ${t('common.years_suffix')}`,
    mainCategories: [t('supplieranalysis.night_lights'), t('supplieranalysis.wood_crafts'), t('supplieranalysis.wooden_boxes')],
    stats: [
      { label: t('supplieranalysis.average_response_time'), value: t('supplieranalysis.2h') },
      { label: t('supplieranalysis.on_time_delivery_rate'), value: t('supplieranalysisdrawer.92_9') },
      { label: t('supplieranalysis.repurchase_rate'), value: t('supplieranalysisdrawer.25_0') },
    ],
    basicInfo: [
      { label: t('supplieranalysis.company_address'), value: t('productdetail.guangdong_cn') },
      { label: t('supplieranalysis.year_founded'), value: t('supplieranalysisdrawer.2017') },
      { label: t('supplieranalysis.business_type'), value: t('supplieranalysis.custom_manufacturer') },
      { label: t('supplieranalysis.total_staff'), value: t('supplieranalysis.80_staff') },
      { label: `${t('supplieranalysis.floor_space')} (㎡)`, value: t('supplieranalysis.3_000_m') },
      { label: t('supplieranalysis.business_profile'), value: t('supplieranalysis.huizhou_renhe_profile') },
    ],
    designCapability: [
      { label: t('supplieranalysis.customization'), value: t('supplieranalysis.sample_processing_graphic_proc') },
      { label: t('supplieranalysis.services'), value: t('supplieranalysis.demand') },
    ],
    productionCapability: [
      { label: t('supplieranalysis.r_d_staff'), value: t('supplieranalysisdrawer.1') },
      { label: t('supplieranalysis.new_products_per_year'), value: t('supplieranalysisdrawer.100') },
      { label: t('supplieranalysis.no_of_production_lines'), value: t('supplieranalysisdrawer.6') },
    ],
    tradePerformance: [
      { label: t('supplieranalysis.online_revenue'), value: t('supplieranalysis.us_1_million_us_3_million') },
      { label: t('supplieranalysis.main_markets'), value: `North America (52%)` },
      { label: t('supplieranalysis.main_client_types'), value: t('supplieranalysis.brand_business_retailer_engine') },
    ],
    reviewExcerpts: [
      { country: '🇺🇸', user: 'w***d', comment: "It does not come with plexiglass. I was expecting the light only so I wasn't disappointed." },
      { country: '🇫🇷', user: 'C***n', comment: "Ce n'est pas exactement ce que je recherchais mais le produit est d'excellente qualité" },
      { country: '🇺🇸', user: 'M***a', comment: "Great quality products and outstanding sales/customer support. Highly recommended!" },
      { country: '🇨🇦', user: 'B***n', comment: "They come exactly as described, all items are in good working order" },
      { country: '🇨🇱', user: 'R***A', comment: "Good product, arrived as expected with its design characteristics and dimensions, good quality." },
    ]
      };
    }

    const name = String(detail.supplier ?? '-');
    const rating = Number(detail.structural_data?.vendor_rating ?? 4.8);
    const location = detail.structural_data?.warehouse_anchor || detail.structural_data?.location || '-';
    const shippingDays = String(detail.structural_data?.shipping_days ?? '-');
    const sourceUrl = String(detail.structural_data?.source_url ?? '');

    return {
      name,
      verified: true,
      manufacturer: true,
      rating: Number.isFinite(rating) ? rating : 4.8,
      reviews: 0,
      location,
      joined: `- ${t('common.years_suffix')}`,
      mainCategories: [],
      stats: [
        { label: t('supplieranalysis.on_time_delivery_rate'), value: shippingDays },
        { label: t('supplieranalysis.average_response_time'), value: '-' },
        { label: t('supplieranalysis.company_address'), value: sourceUrl || '-' },
      ],
      basicInfo: [
        { label: t('supplieranalysis.company_address'), value: sourceUrl || '-' },
      ],
      designCapability: [],
      productionCapability: [],
      tradePerformance: [],
      reviewExcerpts: []
    };
  }, [detail, t]);

  const handleShareSupplier = async () => {
    try {
      const resp = await imApi.generatePromoCard({
        card_type: 'merchant',
        target_type: 'merchant',
        target_id: 1,
        share_category: 'distribution',
        entry_type: 'supplier_share',
      });
      const link = resp.data?.universal_link || resp.data?.link || resp.data?.short_link;
      if (link) {
        await navigator.clipboard.writeText(String(link));
        alert('商家分销链接已复制');
      } else {
        alert('暂未生成分享链接');
      }
    } catch (_e) {
      alert('商家分销链接生成失败，请稍后重试');
    }
  };

  const matchingProducts = [
    { name: t('supplier.matching_product_1'), price: '$1.07-1.12', minOrder: '10 pieces', image: `https://picsum.photos/seed/s1/400/400` },
    { name: t('supplier.matching_product_2'), price: '$1.25-1.30', minOrder: '10 pieces', image: `https://picsum.photos/seed/s2/400/400` },
    { name: t('supplier.matching_product_3'), price: '$2.50-2.55', minOrder: '10 pieces', image: `https://picsum.photos/seed/s3/400/400` },
  ];

  const productGallery = [
    { name: t('supplier.gallery_product_1'), price: '$0.85-0.95', minOrder: '100 pieces', image: `https://picsum.photos/seed/g1/300/300` },
    { name: t('supplier.gallery_product_2'), price: '$0.85-0.95', minOrder: '100 pieces', image: `https://picsum.photos/seed/g2/300/300` },
    { name: t('supplier.gallery_product_3'), price: '$1.18-1.30', minOrder: '100 pieces', image: `https://picsum.photos/seed/g3/300/300` },
    { name: t('supplier.gallery_product_4'), price: '$1.20-1.50', minOrder: '50 pieces', image: `https://picsum.photos/seed/g4/300/300` },
    { name: t('supplier.gallery_product_5'), price: '$2.00-3.00', minOrder: '10 pieces', image: `https://picsum.photos/seed/g5/300/300` },
    { name: t('supplier.gallery_product_6'), price: '$1.50-2.50', minOrder: '100 pieces', image: `https://picsum.photos/seed/g6/300/300` },
    { name: t('supplier.gallery_product_7'), price: '$5.50-6.50', minOrder: '20 pieces', image: `https://picsum.photos/seed/g7/300/300` },
    { name: t('supplier.gallery_product_8'), price: '$3.20-4.50', minOrder: '50 pieces', image: `https://picsum.photos/seed/g8/300/300` },
    { name: t('supplier.gallery_product_9'), price: '$1.80-2.20', minOrder: '200 pieces', image: `https://picsum.photos/seed/g9/300/300` },
    { name: t('supplier.gallery_product_10'), price: '$8.50-10.00', minOrder: '10 pieces', image: `https://picsum.photos/seed/g10/300/300` },
  ];

  return (
    <div className="bg-[#F2F2F7] dark:bg-black h-full overflow-y-auto no-scrollbar pb-32 relative">
      {/* 1. Header (Taobao Style Overhauled) */}
      <div className="bg-white dark:bg-[#1C1C1E] p-5 pb-8 space-y-6 relative shadow-sm border-b border-gray-100 dark:border-white/5">
        {/* Share Button (Global Distribution) */}
        <div className="absolute top-4 right-4 z-30 group/share">
          <button onClick={handleShareSupplier} className="w-10 h-10 bg-gray-50 dark:bg-white/5 rounded-full flex items-center justify-center text-gray-500 border border-gray-100 dark:border-white/10 shadow-sm active:scale-90 transition-all hover:bg-orange-600 hover:text-white hover:border-orange-400">
            <Share2 className="w-5 h-5" />
          </button>
          <div className="absolute right-12 top-1/2 -translate-y-1/2 bg-orange-600 text-white text-[10px] font-black px-2 py-1 rounded opacity-0 group-hover/share:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-lg uppercase tracking-tight">
            {t('common.share_earn')}
          </div>
        </div>
        <div className="flex items-start gap-4 pt-4">
          <div className="w-16 h-16 bg-white rounded-2xl border border-gray-100 dark:border-white/10 flex items-center justify-center p-2 shadow-sm shrink-0">
            <div className="w-full h-full bg-gray-100 rounded-lg flex items-center justify-center text-gray-500 font-black text-xl">R</div>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-[15px] font-black text-gray-900 dark:text-white leading-tight truncate">
              {supplier.name}
            </h3>
            <div className="flex flex-wrap items-center gap-2 mt-1.5">
              <span className="flex items-center gap-1 text-orange-500 bg-orange-50 dark:bg-orange-500/10 px-1.5 py-0.5 rounded text-[10px] font-black uppercase border border-orange-500/20">
                <CheckCircle2 className="w-3 h-3" /> {t('supplier.verified_manufacturer')}
              </span>
              <span className="text-[11px] text-gray-400 font-bold tracking-tight">• {supplier.joined}</span>
              <div className="flex items-center gap-1">
                <MapPin className="w-3 h-3 text-gray-400" />
                <span className="text-[11px] text-gray-400 font-medium">{supplier.location}</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 mt-1.5">
              <Star className="w-3.5 h-3.5 text-orange-400 fill-current" />
              <span className="text-[13px] text-gray-900 dark:text-white font-black">{supplier.rating}</span>
              <span className="text-[12px] text-gray-400 font-bold">({supplier.reviews} {t('product.reviews_title')})</span>
            </div>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {supplier.mainCategories.map(cat => (
            <span key={cat} className="px-2 py-1 bg-gray-50 dark:bg-white/5 text-[10px] text-gray-500 font-bold rounded border border-gray-100 dark:border-white/10 uppercase tracking-tighter">
              {cat}
            </span>
          ))}
        </div>
      </div>

      {/* AI Insights */}
      <div className="mt-2 bg-white dark:bg-[#1C1C1E] p-5">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg, #FF7A3D 0%, #E8450A 100%)' }}>
            <span className="text-white text-[8px] font-black">AI</span>
          </div>
          <h4 className="text-[14px] font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
             {t('supplier.ai_insights')}
          </h4>
        </div>
        <p className="text-[13px] text-gray-600 dark:text-gray-400 font-medium leading-relaxed">
          {t('supplier.ai_insight_full')
            .replace('{supplier}', t('product.verified_supplier'))
            .replace('{expertise}', `7 ${t('supplieranalysis.7_years_of_expertise')}`)
            .replace('{lines}', `6 ${t('supplieranalysis.6_dedicated_production_lines')}`)}
        </p>
      </div>

      {/* Matching Products */}
      <div className="mt-2 bg-white dark:bg-[#1C1C1E] p-5">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-4">{t('supplier.matching_products')}</h4>
          <ChevronRight className="w-4 h-4 text-gray-400" />
        </div>
        <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
          {matchingProducts.map((p, idx) => (
            <div key={idx} className="w-[150px] shrink-0 space-y-2 group cursor-pointer">
              <div className="aspect-square bg-gray-100 dark:bg-white/5 rounded-xl overflow-hidden shadow-sm relative">
                <img src={p.image} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                <div className="absolute top-2 right-2 w-6 h-6 bg-white/80 rounded-full flex items-center justify-center shadow-sm">
                   <ShoppingCart className="w-3.5 h-3.5 text-gray-600" />
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-[11px] text-gray-900 dark:text-white font-black leading-tight line-clamp-2 h-8">{p.name}</p>
                <p className="text-[13px] text-[#E8450A] font-black">{p.price}</p>
                <p className="text-[10px] text-gray-400 font-bold italic">{t('supplier.min_order_prefix')}{p.minOrder}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Company Profile Section */}
      <div className="mt-2 bg-white dark:bg-[#1C1C1E] p-5">
        <h4 className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-4">{t('supplier.company_profile')}</h4>
        
        {/* Basic Information */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-black text-gray-900 dark:text-white">{t('supplier.basic_info')}</span>
            <div className="flex gap-2">
               <ChevronLeft className="w-4 h-4 text-gray-300" />
               <ChevronRight className="w-4 h-4 text-gray-300" />
            </div>
          </div>
          <div className="flex gap-3 overflow-x-auto no-scrollbar">
             {[1, 2, 3].map(i => (
               <div key={i} className="w-52 aspect-video bg-gray-100 dark:bg-white/5 rounded-xl overflow-hidden relative shrink-0 shadow-sm">
                  <img src={`https://picsum.photos/seed/cp${i}/400/225`} className="w-full h-full object-cover" />
                  {i === 1 && <div className="absolute inset-0 flex items-center justify-center bg-black/20"><PlayCircle className="w-10 h-10 text-white opacity-80" /></div>}
               </div>
             ))}
          </div>

          <div className="bg-gray-50 dark:bg-white/5 rounded-[20px] px-4 divide-y-0 mt-4">
            {supplier.basicInfo.map((info, idx) => (
              <div key={idx} className="flex items-start gap-3 py-3 border-b border-gray-50 dark:border-white/5 last:border-0">
                <span className="text-[12px] font-semibold text-gray-400 w-28 shrink-0 pt-0.5">{info.label}</span>
                <span className="text-[12px] font-medium text-gray-900 dark:text-white flex-1 leading-relaxed">
                  {info.label === 'Business profile' ? (
                    <span className="line-clamp-4">{info.value}</span>
                  ) : info.value}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Design & Production Capability */}
        <div className="mt-8 space-y-6">
          <div>
            <h5 className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-4">{t('supplier.capability_title')}</h5>
            <div className="space-y-4">
              <div className="text-[12px] font-bold text-gray-900 dark:text-white uppercase tracking-tighter opacity-70">{t('supplier.design_capability')}</div>
              <div className="bg-gray-50 dark:bg-white/5 rounded-[20px] px-4 divide-y-0">
                {supplier.designCapability.map((item, idx) => (
                  <div key={idx} className="flex items-start gap-3 py-3 border-b border-gray-50 dark:border-white/5 last:border-0">
                    <span className="text-[12px] font-semibold text-gray-400 w-28 shrink-0 pt-0.5">{item.label}</span>
                    <span className="text-[12px] font-medium text-gray-900 dark:text-white flex-1 leading-relaxed">{item.value}</span>
                  </div>
                ))}
              </div>
              <div className="text-[12px] font-bold text-gray-900 dark:text-white uppercase tracking-tighter opacity-70 mt-4">{t('supplier.production_capability')}</div>
              <div className="bg-gray-50 dark:bg-white/5 rounded-[20px] px-4 divide-y-0">
                {supplier.productionCapability.map((item, idx) => (
                  <div key={idx} className="flex items-start gap-3 py-3 border-b border-gray-50 dark:border-white/5 last:border-0">
                    <span className="text-[12px] font-semibold text-gray-400 w-28 shrink-0 pt-0.5">{item.label}</span>
                    <span className="text-[12px] font-medium text-gray-900 dark:text-white flex-1 leading-relaxed">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Certifications and Patents */}
        <div className="mt-8">
          <h5 className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-4">{t('supplier.certifications_patents')}</h5>
          <div className="flex gap-3">
            {['CE', 'CPC'].map(cert => (
              <div key={cert} className="flex flex-col items-center justify-center w-16 h-16 rounded-[16px] bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-500/20">
                <span className="text-[16px] font-black text-emerald-600 dark:text-emerald-400">{cert}</span>
                <span className="text-[8px] text-emerald-500 font-bold uppercase mt-0.5">Valid</span>
              </div>
            ))}
          </div>
        </div>

        {/* Trade Performance */}
        <div className="mt-8">
          <h5 className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-4">{t('supplier.trade_performance')}</h5>
          <div className="bg-gray-50 dark:bg-white/5 rounded-[20px] px-4 divide-y-0">
            {supplier.tradePerformance.map((perf, idx) => (
              <div key={idx} className="flex items-start gap-3 py-3 border-b border-gray-50 dark:border-white/5 last:border-0">
                <span className="text-[12px] font-semibold text-gray-400 w-28 shrink-0 pt-0.5">{perf.label}</span>
                <span className="text-[12px] font-medium text-gray-900 dark:text-white flex-1 leading-relaxed">{perf.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 5. Performance Metrics */}
      <div className="mt-2 bg-white dark:bg-[#1C1C1E] p-5">
        <h4 className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-4">{t('supplier.performance_metrics')}</h4>
        <div className="grid grid-cols-2 gap-4">
          {supplier.stats.map((stat, idx) => (
            <div key={idx} className="bg-gray-50 dark:bg-white/5 p-4 rounded-2xl border border-gray-100 dark:border-white/5">
              <div className="text-[22px] font-black text-gray-900 dark:text-white tracking-tighter leading-none mb-1">{stat.value}</div>
              <div className="text-[10px] text-gray-400 font-semibold uppercase tracking-widest leading-tight">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* 6. Reviews Section */}
      <div className="mt-2 bg-white dark:bg-[#1C1C1E] p-5">
        <h4 className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-4">{t('product.reviews_title')}</h4>
        <div className="flex items-center gap-2 mb-6">
          <span className="text-[13px] font-bold text-gray-900 dark:text-white">{t('supplier.rating_label')}</span>
          <span className="text-[13px] font-black text-gray-900 dark:text-white">4.8/5.0 (41 {t('product.reviews_title')})</span>
        </div>
        <div className="space-y-3">
          {supplier.reviewExcerpts.map((rev, idx) => (
            <div key={idx} className="bg-gray-50 dark:bg-white/5 rounded-[18px] p-4 border border-gray-100 dark:border-white/5">
              <p className="text-[12px] text-gray-600 dark:text-gray-300 font-medium leading-relaxed italic mb-3">"{rev.comment}"</p>
              <div className="flex items-center gap-2">
                <span className="text-lg">{rev.country}</span>
                <span className="text-[11px] font-semibold text-gray-500">{rev.user}</span>
                <div className="flex gap-0.5 ml-auto">
                  {Array.from({length: 5}).map((_,i) => <span key={i} className="text-amber-400 text-[10px]">★</span>)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 7. Product Gallery */}
      <div className="mt-2 bg-white dark:bg-[#1C1C1E] p-5 pb-40">
        <div className="flex flex-col mb-5">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-4">{t('supplier.product_gallery')}</h4>
          </div>
          
          {/* Scrollable Categories / Tags */}
          <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2 text-[11px] text-gray-400 font-black uppercase tracking-tighter w-full">
             <span className="text-gray-900 dark:text-white border-b-2 border-gray-900 dark:border-white pb-1 whitespace-nowrap shrink-0">{t('supplier.all_products')}</span>
             <span className="whitespace-nowrap shrink-0 cursor-pointer hover:text-gray-600 dark:hover:text-gray-300 transition-colors">{t('supplier.tag_wooden_diffuser')}</span>
             <span className="whitespace-nowrap shrink-0 cursor-pointer hover:text-gray-600 dark:hover:text-gray-300 transition-colors">{t('supplier.tag_wooden_frame')}</span>
             <span className="whitespace-nowrap shrink-0 cursor-pointer hover:text-gray-600 dark:hover:text-gray-300 transition-colors">{t('supplier.tag_wooden_base')}</span>
             <span className="whitespace-nowrap shrink-0 cursor-pointer hover:text-gray-600 dark:hover:text-gray-300 transition-colors">{t('supplier.tag_night_lights')}</span>
             <span className="whitespace-nowrap shrink-0 cursor-pointer hover:text-gray-600 dark:hover:text-gray-300 transition-colors">{t('supplier.tag_custom_crafts')}</span>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-3">
           {productGallery.map((p, i) => (
             <div key={i} className="bg-white dark:bg-white/5 rounded-2xl overflow-hidden border border-gray-100 dark:border-white/5 p-3 space-y-2 group cursor-pointer active:scale-95 transition-all">
                <div className="aspect-square bg-gray-50 rounded-xl overflow-hidden shadow-inner relative">
                  <img src={p.image} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                  <div className="absolute top-2 right-2 w-6 h-6 bg-white/80 rounded-full flex items-center justify-center shadow-sm opacity-0 group-hover:opacity-100 transition-opacity">
                     <ShoppingCart className="w-3 h-3 text-gray-600" />
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-[11px] text-gray-900 dark:text-white font-black leading-tight line-clamp-2 h-8 group-hover:underline decoration-gray-300 underline-offset-2">{p.name}</p>
                  <p className="text-[13px] text-[#E8450A] font-black">{p.price}</p>
                  <p className="text-[10px] text-gray-400 font-bold italic">{t('supplier.min_order_prefix')}{p.minOrder}</p>
                  <div className="flex items-center gap-1.5 pt-1 border-t border-gray-50 dark:border-white/5">
                     <div className="w-4 h-4 rounded bg-orange-500 flex items-center justify-center text-[8px] text-white font-bold">R</div>
                     <span className="text-[9px] text-gray-400 font-bold truncate">Huizhou Renhe Premium...</span>
                  </div>
                </div>
             </div>
           ))}
        </div>
        
        {/* Pagination / Load More */}
        <div className="mt-8 flex flex-col items-center gap-3">
          <button className="px-6 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-full text-[12px] font-black text-gray-600 dark:text-gray-300 uppercase tracking-wider active:scale-95 transition-all hover:bg-gray-100 dark:hover:bg-white/10">
            {t('supplier.load_more')}
          </button>
          <div className="text-[10px] text-gray-400 font-bold">
            {t('supplier.showing_prefix')}10{t('supplier.showing_middle')}142{t('supplier.showing_suffix')}
          </div>
        </div>
      </div>

      {/* Bottom Actions */}
      <div className="absolute bottom-0 left-0 right-0 bg-white/95 dark:bg-black/95 backdrop-blur-3xl border-t border-gray-100 dark:border-white/10 p-5 pb-10 flex gap-4 z-50 shadow-2xl">
        <button className="flex-1 h-14 rounded-full border-2 border-[#E8450A] text-[#E8450A] font-semibold text-[14px] flex items-center justify-center gap-2 active:scale-95 transition-all bg-white/50 dark:bg-transparent backdrop-blur-md">
          <MessageCircle className="w-4 h-4" /> {t('supplier.chat_now')}
        </button>
        <button className="flex-1 h-14 rounded-full text-white font-semibold text-[14px] flex items-center justify-center gap-2 active:scale-95 transition-all"
          style={{ background: 'linear-gradient(135deg, #FF7A3D 0%, #E8450A 100%)', boxShadow: '0 8px 20px -4px rgba(232,69,10,0.45)' }}>
          <Send className="w-4 h-4" /> {t('supplier.send_inquiry')}
        </button>
      </div>
    </div>
  );
};
