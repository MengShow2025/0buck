import React from 'react';
import { motion } from 'motion/react';
import { 
  CheckCircle2, 
  Clock, 
  Coins, 
  TrendingUp, 
  ChevronRight,
  ShieldCheck,
  Zap,
  ShoppingBag,
  Timer,
  Users,
  Bot,
  Cpu,
  AlertTriangle
} from 'lucide-react';
import WishingWellProgressBar from './WishingWellProgressBar';
import { useTranslation } from 'react-i18next';
import { Product } from '../types';

interface BAPCardProps {
  type: string;
  data: any;
  onAction?: (action: string, params: any) => void;
}

/**
 * 0B_PRODUCT_GRID: 2x5 Matrix (Vortex style) as a chat card
 */
const ProductGridCard = ({ products, comment, onAction, t }: { products: Product[], comment?: string, onAction?: any, t: any }) => (
  <div className="flex flex-col gap-2 max-w-full sm:max-w-2xl w-full overflow-hidden">
    {comment && (
      <div className="flex items-start gap-2 mb-1">
        <div className="w-5 h-5 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 border border-primary/20">
          <Bot size={12} className="text-primary" />
        </div>
        <p className="text-[10px] sm:text-sm text-zinc-400 font-medium leading-relaxed italic">"{comment}"</p>
      </div>
    )}
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-3 w-full">
      {products.slice(0, 10).map((product) => (
        <motion.div
          key={product.id}
          whileHover={{ scale: 1.02 }}
          onClick={() => onAction?.('VIEW_PRODUCT', {
            id: product.id,
            name: product.title,
            price: String(product.price),
            image: product.image,
            description: ''
          })}
          className="group relative bg-zinc-900/60 rounded-xl overflow-hidden border border-white/5 shadow-lg flex flex-col cursor-pointer transition-all hover:border-primary/30"
        >
          {/* 555 Cashback Badge */}
          {product.is_cashback_eligible !== false && (
            <div className="absolute top-1 left-1 z-10 flex flex-col gap-0.5">
              <div className="px-1.5 py-0.5 bg-primary/90 backdrop-blur-md rounded-md border border-white/10 shadow-sm">
                <p className="text-[6px] sm:text-[8px] font-black text-black uppercase leading-none tracking-tighter">100% BACK</p>
              </div>
              <div className="px-1.5 py-0.5 bg-black/80 backdrop-blur-md rounded-md border border-white/5 shadow-sm">
                <p className="text-[6px] sm:text-[8px] font-black text-white uppercase leading-none tracking-tighter">1+3 FREE</p>
              </div>
            </div>
          )}

          <div className="aspect-square w-full overflow-hidden relative bg-zinc-800">
            <img src={product.image} alt={product.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60" />
            <div className="absolute bottom-1 right-1 px-2 py-0.5 bg-black/60 backdrop-blur-sm rounded-lg border border-white/5">
              <p className="text-[10px] sm:text-xs font-black text-white">${product.price}</p>
            </div>
          </div>
          <div className="p-2 sm:p-2.5 flex flex-col gap-1">
             <h5 className="text-[9px] sm:text-[10px] font-bold text-zinc-300 line-clamp-1 group-hover:text-white transition-colors">{product.title}</h5>
             <div className="flex items-center gap-1">
                <div className="w-1 h-1 rounded-full bg-primary animate-pulse" />
                <span className="text-[7px] sm:text-[8px] font-black text-zinc-500 uppercase tracking-widest">In Stock</span>
             </div>
          </div>
        </motion.div>
      ))}
    </div>
  </div>
);

/**
 * 0B_WISH_WELL: Socialized wishing well card
 */
const WishingWellCard = ({ wish, onAction, t }: { wish: any, onAction?: any, t: any }) => (
  <div className="p-3 sm:p-5 bg-zinc-950 border border-orange-500/20 rounded-2xl sm:rounded-[2rem] shadow-2xl max-w-[240px] sm:max-w-sm w-full">
    <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-orange-500/10 flex items-center justify-center border border-orange-500/30">
        <Zap size={16} className="text-orange-500 animate-pulse" />
      </div>
      <div>
        <h4 className="text-xs sm:text-sm font-black text-white uppercase tracking-tight">{t('bap.wishing_well_title')}</h4>
        <p className="text-[8px] sm:text-[10px] text-zinc-500 font-bold uppercase tracking-widest">{t('bap.c2m_protocol_active')}</p>
      </div>
    </div>
    
    <div className="space-y-3 sm:space-y-4">
      <div className="aspect-video rounded-xl overflow-hidden bg-zinc-900 border border-white/5">
        <img src={wish.image_url} alt="wish" className="w-full h-full object-cover opacity-80" />
      </div>
      <p className="text-[10px] sm:text-xs text-zinc-400 font-medium italic leading-relaxed">"{wish.description}"</p>
      
      <WishingWellProgressBar 
        voteCount={wish.vote_count} 
        targetCount={wish.target_count || 10} 
        expiryAt={wish.expiry_at} 
        status={wish.status} 
      />
      
      <button 
        onClick={() => onAction?.('VOTE', wish.id)}
        className="w-full py-2 sm:py-3 bg-white hover:bg-orange-500 text-black rounded-lg sm:rounded-xl font-black text-[9px] sm:text-[10px] uppercase tracking-[0.2em] transition-all shadow-xl"
      >
        {t('bap.support_wish')}
      </button>
    </div>
  </div>
);

/**
 * 0B_CASHBACK_RADAR: 20-period cashback tracker
 */
const CashbackRadarCard = ({ ledger, onAction, t }: { ledger: any, onAction?: any, t: any }) => {
  const currentPeriod = ledger.current_period || 1;
  const totalPeriods = 20;
  
  return (
    <div className="p-6 bg-black border border-blue-500/20 rounded-[2rem] shadow-2xl max-w-sm w-full">
      <div className="flex justify-between items-start mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-blue-500/10 flex items-center justify-center border border-blue-500/30">
            <TrendingUp size={20} className="text-blue-500" />
          </div>
          <div>
            <h4 className="text-sm font-black text-white uppercase tracking-tight">{t('bap.cashback_radar_title')}</h4>
            <p className="text-[10px] text-blue-400/60 font-black uppercase tracking-widest">{t('bap.cashback_20_period')}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-black text-zinc-500 uppercase">{t('bap.total_value')}</p>
          <p className="text-lg font-black text-white">${ledger.total_amount}</p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex flex-wrap gap-1.5">
          {Array.from({ length: totalPeriods }).map((_, i) => {
            const period = i + 1;
            const isCompleted = period < currentPeriod;
            const isCurrent = period === currentPeriod;
            
            return (
              <div 
                key={i} 
                className={`w-6 h-6 rounded-md flex items-center justify-center text-[8px] font-black border transition-all ${
                  isCompleted ? 'bg-blue-600 border-blue-500 text-white' :
                  isCurrent ? 'bg-blue-500/20 border-blue-500 text-blue-500 animate-pulse' :
                  'bg-zinc-900 border-zinc-800 text-zinc-700'
                }`}
              >
                {isCompleted ? <CheckCircle2 size={10} /> : period}
              </div>
            );
          })}
        </div>

        <div className="p-4 bg-zinc-900/50 rounded-2xl border border-white/5 space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-black text-zinc-500 uppercase">{t('bap.current_period')}</span>
            <span className="text-xs font-black text-blue-500">P{currentPeriod} / P20</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-black text-zinc-500 uppercase">{t('bap.next_payout')}</span>
            <span className="text-xs font-black text-white">${ledger.period_amount}</span>
          </div>
        </div>

        <button className="w-full flex items-center justify-center gap-2 py-3 text-[9px] font-black text-zinc-400 uppercase tracking-widest hover:text-white transition-colors">
          {t('bap.view_ledger')} <ChevronRight size={12} />
        </button>
      </div>
    </div>
  );
};

/**
 * 0B_RENEWAL_ALERT: Card for break-in check-in recovery
 */
const RenewalAlertCard = ({ data, onAction, t }: { data: any, onAction?: any, t: any }) => (
  <div className="p-6 bg-red-950/20 border border-red-500/40 rounded-[2rem] shadow-2xl max-w-sm w-full backdrop-blur-md">
    <div className="flex items-center gap-4 mb-6">
      <div className="w-12 h-12 rounded-2xl bg-red-500/20 flex items-center justify-center border border-red-500/50 shadow-[0_0_20px_rgba(239,68,68,0.3)]">
        <AlertTriangle size={24} className="text-red-500 animate-bounce" />
      </div>
      <div>
        <h4 className="text-base font-black text-white uppercase tracking-tight">{t('bap.renewal_alert_title')}</h4>
        <p className="text-[10px] text-red-400 font-black uppercase tracking-widest">{t('bap.break_in_detected')}</p>
      </div>
    </div>

    <div className="p-4 bg-black/40 rounded-2xl border border-red-500/10 mb-6">
      <p className="text-xs text-zinc-300 font-medium leading-relaxed">
        {t('bap.renewal_alert_desc', { days: data.days_missed || 3 })}
      </p>
    </div>

    <div className="flex gap-3">
      <button 
        onClick={() => onAction?.('BUY_RENEWAL_CARD')}
        className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-lg"
      >
        {t('bap.buy_renewal_card')}
      </button>
      <button 
        onClick={() => onAction?.('DISMISS_ALERT')}
        className="px-6 py-3 bg-white/5 hover:bg-white/10 text-zinc-500 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all"
      >
        {t('bap.dismiss')}
      </button>
    </div>
  </div>
);

/**
 * 0B_GROUP_BUY: 1+3 Group buy invitation card
 */
const GroupBuyCard = ({ data, onAction, t }: { data: any, onAction?: any, t: any }) => {
  const { current_count, required_count, product_name, price, product_image } = data;
  const remaining = Math.max(0, required_count - current_count);
  
  return (
    <div className="p-6 bg-zinc-950 border border-primary/30 rounded-[2rem] shadow-2xl max-w-sm w-full">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/30">
          <Users size={20} className="text-primary" />
        </div>
        <div>
          <h4 className="text-sm font-black text-white uppercase tracking-tight">{t('bap.group_buy_title')}</h4>
          <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">{t('bap.free_order_protocol')}</p>
        </div>
      </div>

      <div className="space-y-4">
        <div 
          className="relative aspect-square rounded-2xl overflow-hidden bg-zinc-900 border border-white/5 cursor-pointer"
          onClick={() => onAction?.('VIEW_PRODUCT', {
            id: data.product_id || data.id,
            name: product_name,
            price: String(price),
            image: product_image,
            description: ''
          })}
        >
          <img src={product_image} alt={product_name} className="w-full h-full object-cover" />
          <div className="absolute top-3 right-3">
            <span className="bg-primary text-black text-[10px] font-black px-2 py-1 rounded-lg shadow-lg">
              ${price}
            </span>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-end">
            <span className="text-[10px] font-black text-zinc-500 uppercase">{t('bap.group_progress')}</span>
            <span className="text-xs font-black text-primary">{current_count}/{required_count} INVITES</span>
          </div>
          <div className="w-full bg-zinc-900 h-2 rounded-full overflow-hidden">
            <div 
              className="bg-primary h-full transition-all duration-1000" 
              style={{ width: `${(current_count / required_count) * 100}%`, boxShadow: '0 0 10px rgba(255, 92, 40, 0.5)' }}
            />
          </div>
          <p className="text-[9px] text-zinc-400 text-center font-bold uppercase">
            {remaining > 0 ? t('bap.remaining_invites', { count: remaining }) : t('bap.group_full')}
          </p>
        </div>

        <button 
          onClick={() => onAction?.('JOIN_GROUP', data)}
          disabled={remaining === 0}
          className="w-full py-3 bg-primary hover:bg-primary/80 disabled:bg-zinc-800 disabled:text-zinc-500 text-black rounded-xl font-black text-[10px] uppercase tracking-[0.2em] transition-all shadow-xl"
        >
          {remaining > 0 ? t('bap.join_group_buy') : t('bap.group_completed')}
        </button>
      </div>
    </div>
  );
};

/**
 * v3.4 BAP (Business Attachment Protocol) Renderer
 * Handles rendering of functional business cards within the chat stream.
 */
const BAPAttachmentRenderer: React.FC<BAPCardProps> = ({ type, data, onAction }) => {
  const { t } = useTranslation();
  
  switch (type) {
    case '0B_PRODUCT_GRID':
      return <ProductGridCard products={data.products} comment={data.butler_comment} onAction={onAction} t={t} />;
    case '0B_WISH_WELL':
      return <WishingWellCard wish={data} onAction={onAction} t={t} />;
    case '0B_CASHBACK_RADAR':
      return <CashbackRadarCard ledger={data} onAction={onAction} t={t} />;
    case '0B_RENEWAL_ALERT':
      return <RenewalAlertCard data={data} onAction={onAction} t={t} />;
    case '0B_GROUP_BUY':
      return <GroupBuyCard data={data} onAction={onAction} t={t} />;
    default:
      return (
        <div className="p-4 bg-zinc-900/50 rounded-2xl border border-zinc-800 text-zinc-500 text-xs italic">
          {t('bap.unsupported_component')}: {type}
        </div>
      );
  }
};

export default BAPAttachmentRenderer;
