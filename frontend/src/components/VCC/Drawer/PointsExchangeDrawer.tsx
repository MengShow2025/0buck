import React, { useEffect, useState } from 'react';
import { Gift, Bot, TicketCheck, Zap, CheckCircle2 } from 'lucide-react';
import { useAppContext } from '../AppContext';
import api from '../../../services/api';

interface CatalogItem {
  code: string;
  name: string;
  description: string;
  points_cost: number;
  type: string;
}

interface Plan {
  id: string;
  order_id: string;
  raw_status: string;
}

export const PointsExchangeDrawer: React.FC = () => {
  const { t, showToast, user } = useAppContext();
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<CatalogItem | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [showPlanSelector, setShowPlanSelector] = useState(false);
  const [redeeming, setRedeeming] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [catalogRes, statusRes] = await Promise.all([
          api.getPointsExchangeCatalog(),
          user?.id ? api.getStatus(user.id) : Promise.resolve({ data: { plans: [] } })
        ]);
        
        if (catalogRes.data?.status === 'success') {
          setItems(catalogRes.data.items || []);
        }
        if (statusRes.data?.plan_items) {
          // Filter for active or failed plans only
          setPlans(statusRes.data.plan_items.filter((p: any) => p.raw_status === 'active' || p.raw_status === 'failed'));
        }
      } catch (e) {
        console.error(e);
        showToast(t('common.error'), 'error');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user?.id, t, showToast]);

  const handleExchangeClick = (item: CatalogItem) => {
    if (item.type === 'checkin_renewal') {
      setSelectedItem(item);
      setShowPlanSelector(true);
      setSelectedPlanId(null);
    } else {
      executeRedemption(item.code);
    }
  };

  const executeRedemption = async (itemCode: string, planId?: string) => {
    if (!user?.id) return;
    setRedeeming(true);
    try {
      const res = await api.redeemPointsItem(user.id, itemCode, planId);
      if (res.data?.status === 'success') {
        showToast(t('points.exchange_success') || 'Exchange Successful!', 'success');
        setShowPlanSelector(false);
      } else {
        showToast(res.data?.message || t('common.error'), 'error');
      }
    } catch (e: any) {
      showToast(e.response?.data?.detail || t('common.error'), 'error');
    } finally {
      setRedeeming(false);
    }
  };

  const getIcon = (type: string) => {
    switch(type) {
      case 'checkin_renewal': return <TicketCheck className="w-6 h-6 text-amber-500" />;
      case 'shopify_balance_voucher': return <Zap className="w-6 h-6 text-blue-500" />;
      case 'ai_pts': return <Bot className="w-6 h-6 text-cyan-500" />;
      default: return <Gift className="w-6 h-6 text-gray-500" />;
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-500">{t('common.loading')}</div>;
  }

  return (
    <div className="flex flex-col h-full bg-[#F2F2F7] dark:bg-[#000000] pb-32 relative">
      {/* Hero Section */}
      <div className="bg-gradient-to-b from-amber-500/20 to-transparent p-8 text-center space-y-3">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-amber-500 rounded-[32px] shadow-xl shadow-amber-500/30 mb-2">
          <Gift className="w-10 h-10 text-white" />
        </div>
        <h2 className="text-[24px] font-black text-gray-900 dark:text-white tracking-tight">{t('points.exchange_center')}</h2>
        <p className="text-[13px] text-gray-500 font-bold px-6 leading-relaxed">
          {t('points.exchange_desc')}
        </p>
      </div>

      <div className="px-4 space-y-4 flex-1 overflow-y-auto no-scrollbar">
        {items.length === 0 ? (
          <div className="text-center text-gray-400 py-10 text-sm font-bold">
            No items available for exchange right now.
          </div>
        ) : (
          items.map(item => (
            <div key={item.code} className="bg-white dark:bg-[#1C1C1E] p-5 rounded-[32px] shadow-sm border border-gray-100 dark:border-white/5 flex items-center justify-between group active:scale-[0.98] transition-all">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-gray-50 dark:bg-white/5 rounded-2xl flex items-center justify-center shrink-0">
                  {getIcon(item.type)}
                </div>
                <div className="space-y-0.5">
                  <div className="text-[11px] font-black text-amber-600 uppercase tracking-widest">{item.type.replace(/_/g, ' ')}</div>
                  <div className="text-[16px] font-black text-gray-900 dark:text-white">{item.name}</div>
                  <div className="text-[12px] text-gray-400 font-bold line-clamp-2">{item.description}</div>
                </div>
              </div>
              <div className="text-right space-y-2 shrink-0">
                <div className="flex items-center justify-end gap-1">
                  <span className="text-[18px] font-black text-gray-900 dark:text-white">{item.points_cost}</span>
                  <span className="text-[10px] font-black text-amber-500 uppercase tracking-tighter">PTS</span>
                </div>
                <button 
                  onClick={() => handleExchangeClick(item)}
                  disabled={redeeming}
                  className="bg-gray-900 dark:bg-white text-white dark:text-black text-[12px] font-black px-4 py-2 rounded-full shadow-lg group-hover:bg-amber-500 group-hover:text-white transition-all disabled:opacity-50"
                >
                  {t('points.exchange_action')}
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {showPlanSelector && selectedItem && (
        <div className="absolute inset-x-0 bottom-0 bg-white dark:bg-[#1C1C1E] rounded-t-[32px] shadow-[0_-10px_40px_rgba(0,0,0,0.1)] p-6 z-50 animate-in slide-in-from-bottom-full">
          <h3 className="text-lg font-black mb-4 dark:text-white">Select a Plan to Renew</h3>
          <div className="space-y-3 max-h-60 overflow-y-auto mb-6">
            {plans.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4 font-bold">No eligible plans found.</p>
            ) : (
              plans.map(plan => (
                <button
                  key={plan.id}
                  onClick={() => setSelectedPlanId(plan.id)}
                  className={`w-full flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${selectedPlanId === plan.id ? 'border-amber-500 bg-amber-50 dark:bg-amber-500/10' : 'border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-white/5'}`}
                >
                  <div className="text-left">
                    <div className="font-bold dark:text-white">Order #{plan.order_id}</div>
                    <div className="text-xs text-gray-500 font-bold mt-1">Status: {plan.raw_status}</div>
                  </div>
                  {selectedPlanId === plan.id && <CheckCircle2 className="w-5 h-5 text-amber-500" />}
                </button>
              ))
            )}
          </div>
          <div className="flex gap-3">
            <button 
              onClick={() => setShowPlanSelector(false)}
              className="flex-1 py-3.5 rounded-full font-bold text-gray-500 bg-gray-100 dark:bg-white/5"
            >
              {t('common.cancel')}
            </button>
            <button 
              onClick={() => selectedPlanId && executeRedemption(selectedItem.code, selectedPlanId)}
              disabled={!selectedPlanId || redeeming}
              className="flex-1 py-3.5 rounded-full font-bold text-white bg-amber-500 disabled:opacity-50"
            >
              {t('common.confirm')}
            </button>
          </div>
        </div>
      )}
      
      {showPlanSelector && (
        <div 
          className="absolute inset-0 bg-black/20 dark:bg-black/40 z-40 backdrop-blur-sm" 
          onClick={() => setShowPlanSelector(false)}
        />
      )}
    </div>
  );
};
