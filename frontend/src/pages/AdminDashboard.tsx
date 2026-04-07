import React, { useState, useEffect } from 'react';
import { 
  ShoppingBag, 
  Database, 
  Activity, 
  ArrowLeft,
  TrendingUp,
  RefreshCw,
  Shield,
  Zap,
  Gift,
  Ticket,
  Settings,
  AlertCircle,
  TrendingDown,
  Coins,
  X,
  ChevronRight,
  GripVertical,
  Trash2,
  Edit3,
  Star,
  PlayCircle,
  Truck,
  Layers,
  ExternalLink
} from 'lucide-react';
import { motion, Reorder, AnimatePresence } from 'motion/react';

// v4.6.3: Helper for authenticated fetch (legacy fallback)
const fetchWithAuth = async (url: string, options: any = {}) => {
  const res = await fetch(url, {
    ...options,
    credentials: 'include'
  });
  
  if (res.status === 401 || res.status === 403) {
    console.log("[AdminDashboard] Auth failed, redirecting...");
    window.location.href = '/login';
    throw new Error('Auth failed');
  }
  
  return res;
};

import { Link } from 'react-router-dom';
import WishingWellProgressBar from '../components/WishingWellProgressBar';

interface Summary {
  orders_today: number;
  profit_mtd: number;
  ids_conversion: { [key: string]: number };
  melting_count: number;
  api_status: string;
}

interface Coupon {
  code: string;
  type: string;
  value: number;
  min_requirement: number;
  ai_category: string | null;
  ai_issuance_permission: string;
  is_active: boolean;
  expires_at: string | null;
}

interface AIRules {
  daily_budget: number;
  rules: any;
}

interface PersonaTemplate {
  id: string;
  name: string;
  style_prompt: string;
  empathy_weight: number;
  formality_score: number;
  vibrancy_level: number;
  emoji_density: number;
  is_active: boolean;
}

interface AIUsageStat {
  task_type: string;
  tokens_in: number;
  tokens_out: number;
  cost_usd: number;
}

interface UserWish {
  id: number;
  user_id: number;
  description: string;
  image_url: string | null;
  status: string;
  vote_count: number;
  expiry_at: string;
  created_at: string;
}

interface DemandInsight {
  id: number;
  category: string;
  unmet_need: string;
  frequency: number;
  status: string;
  action_taken: string | null;
}

interface PricingStrategy {
  sale_price_ratio: number;
  compare_at_price_ratio: number;
  amazon_weight: number;
  ebay_weight: number;
}

interface TalentApplication {
  customer_id: number;
  email: string;
  first_name: string;
  last_name: string;
  kol_apply_reason: string | null;
  kol_applied_at: string | null;
  dist_rate: number | null;
  fan_rate: number | null;
}

interface RewardRates {
  silver_rate: number;
  gold_rate: number;
  platinum_rate: number;
  kol_dist_default: number;
  kol_fan_default: number;
  fan_silver_rate: number;
  fan_gold_rate: number;
  fan_platinum_rate: number;
}

interface AuditCandidate {
  id: number;
  name: string;
  product_id_1688: string;
  cost_cny: number;
  comp_price_usd: number;
  estimated_sale_price: number;
  profit_ratio: number;
  status: string;
  discovery_source: string;
  discovery_evidence: any;
  supplier_info: any;
  title_en_preview: string;
  desire_hook?: string;
  desire_logic?: string;
  desire_closing?: string;
  images: string[];
  variants_raw: any[];
  category: string;
  attributes?: any[];
  logistics_data?: any;
  mirror_assets?: any;
  structural_data?: any;
  // v4.7.1 Sourcing mapping
  source_platform?: string;
  source_url?: string;
  backup_source_url?: string;
  alibaba_comparison_price?: number;
}

interface SourcingStrategy {
  arbitrage_threshold: number;
  min_trend_score: number;
  min_supplier_years: number;
  require_gold_supplier: boolean;
  require_trade_assurance: boolean;
}

const AdminDashboard: React.FC = () => {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [contributions, setContributions] = useState<any[]>([]);
  const [shieldAudit, setShieldAudit] = useState<any[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [aiRules, setAIRules] = useState<AIRules | null>(null);
  const [personaTemplates, setPersonaTemplates] = useState<PersonaTemplate[]>([]);
  const [aiUsageStats, setAIUsageStats] = useState<AIUsageStat[]>([]);
  const [wishes, setWishes] = useState<UserWish[]>([]);
  const [insights, setInsights] = useState<DemandInsight[]>([]);
  const [c2mConfig, setC2MConfig] = useState<any>({
    enabled: true,
    threshold: 10,
    expiry: 48
  });
  const [auditQueue, setAuditQueue] = useState<AuditCandidate[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [meltedProducts, setMeltedProducts] = useState<any[]>([]);
  const [pricingStrategy, setPricingStrategy] = useState<PricingStrategy | null>(null);
  const [rewardRates, setRewardRates] = useState<RewardRates | null>(null);
  const [sourcingStrategy, setSourcingStrategy] = useState<SourcingStrategy | null>(null);
  const [pendingTalents, setPendingTalents] = useState<TalentApplication[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [editingCandidate, setEditingCandidate] = useState<AuditCandidate | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    fetchSummary();
    if (activeTab === 'ai_mgmt') fetchAIData();
    if (activeTab === 'coupons_mgmt') { fetchCoupons(); fetchAIRules(); }
    if (activeTab === 'persona_os') { fetchPersonaTemplates(); fetchAIUsageStats(); }
    if (activeTab === 'c2m_mgmt') { fetchWishes(); fetchInsights(); fetchC2MConfig(); }
    if (activeTab === 'sourcing') fetchAuditQueue();
    if (activeTab === 'melting') fetchMeltedQueue();
    if (activeTab === 'settings') { fetchPricingStrategy(); fetchRewardRates(); }
    if (activeTab === 'talents_audit') fetchPendingTalents();
  }, [activeTab]);

  const fetchPricingStrategy = async () => {
    try {
      const res = await fetchWithAuth('/api/v1/admin/config/pricing-strategy');
      setPricingStrategy(await res.json());
    } catch (e) { console.error(e); }
  };

  const fetchRewardRates = async () => {
    try {
      const res = await fetchWithAuth('/api/v1/admin/config/reward-rates');
      setRewardRates(await res.json());
    } catch (e) { console.error(e); }
  };

  const fetchSourcingStrategy = async () => {
    try {
      const res = await fetchWithAuth('/api/v1/admin/config/sourcing-strategy');
      setSourcingStrategy(await res.json());
    } catch (e) { console.error(e); }
  };

  const handleUpdateSourcingStrategy = async (strategy: SourcingStrategy) => {
    try {
      setIsUpdating(true);
      const res = await fetchWithAuth('/api/v1/admin/config/sourcing-strategy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(strategy)
      });
      if (res.ok) {
        alert('供应套利策略已更新');
        fetchSourcingStrategy();
      }
    } catch (e) { alert('更新失败'); }
    finally { setIsUpdating(false); }
  };

  const fetchPendingTalents = async () => {
    try {
      const res = await fetchWithAuth('/api/v1/admin/talents/pending');
      setPendingTalents(await res.json());
    } catch (e) { console.error(e); }
  };

  const handleAuditTalent = async (userId: number, status: 'approved' | 'rejected', distRate?: number, fanRate?: number) => {
    try {
      const res = await fetchWithAuth('/api/v1/admin/talents/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, status, dist_rate: distRate, fan_rate: fanRate })
      });
      if (res.ok) {
        alert(status === 'approved' ? '已批准为达人' : '已拒绝申请');
        fetchPendingTalents();
      }
    } catch (e) { alert('操作失败'); }
  };

  const handleUpdatePricingStrategy = async (strategy: PricingStrategy) => {
    try {
      const res = await fetchWithAuth('/api/v1/admin/config/pricing-strategy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(strategy)
      });
      if (res.ok) {
        alert('定价策略已更新');
        fetchPricingStrategy();
      }
    } catch (e) { alert('更新失败'); }
  };

  const handleUpdateRewardRates = async (rates: RewardRates) => {
    try {
      const res = await fetchWithAuth('/api/v1/admin/config/reward-rates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rates)
      });
      if (res.ok) {
        alert('奖励比例已更新');
        fetchRewardRates();
      }
    } catch (e) { alert('更新失败'); }
  };

  const fetchC2MConfig = async () => {
    try {
      const keys = ['C2M_ENABLED', 'C2M_VOTE_THRESHOLD', 'C2M_WISH_EXPIRY_HOURS'];
      const config: any = {};
      for (const k of keys) {
        const res = await fetchWithAuth(`/api/v1/admin/config/global?key=${k}`);
        // This is a simplified fetch, assuming backend handles single key query if needed
        // Or we can just use the existing updateGlobalConfig style
      }
      // For now, mock the config fetch or use a unified endpoint
      setC2MConfig({
        enabled: true,
        threshold: 10,
        expiry: 48
      });
    } catch (e) { console.error(e); }
  };

  const fetchWishes = async () => {
    try {
      const res = await fetchWithAuth('/api/v1/admin/c2m/wishes');
      setWishes(await res.json());
    } catch (e) { console.error(e); }
  };

  const fetchInsights = async () => {
    try {
      const res = await fetchWithAuth('/api/v1/admin/c2m/insights');
      setInsights(await res.json());
    } catch (e) { console.error(e); }
  };

  const fetchAuditQueue = async () => {
    try {
      // v4.6.8: Fetch both 'new' and 'reviewing' to prevent items from "disappearing" during sync
      const res = await fetchWithAuth('/api/v1/admin/sourcing/candidates'); 
      const data = await res.json();
      
      // Filter for new/reviewing on the frontend for better UX
      const activeItems = data.filter((item: any) => ['new', 'reviewing'].includes(item.status));
      
      const formatted = activeItems.map((item: any) => ({
        ...item,
        name: item.title_zh || item.name || '未命名商品'
      }));
      setAuditQueue(formatted);
    } catch (e) { console.error(e); }
  };

  const categories = ['ALL', ...new Set(auditQueue.map(item => item.category || 'OTHER'))];
  const filteredQueue = selectedCategory === 'ALL' 
    ? auditQueue 
    : auditQueue.filter(item => (item.category || 'OTHER') === selectedCategory);

  const fetchMeltedQueue = async () => {
    try {
      const res = await fetchWithAuth('/api/v1/admin/melting/queue');
      setMeltedProducts(await res.json());
    } catch (e) { console.error(e); }
  };

  const handleApprove = async (id: number) => {
    if (!confirm(`确认同步并上架此候选商品吗？\n(注意：这可能需要 5-15 秒，请耐心等待)`)) return;
    try {
      const res = await fetchWithAuth(`/api/v1/admin/sourcing/candidates/${id}/approve`, { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.status === 'success') {
        alert('上架成功！已同步至 Shopify 并备份到 Notion');
        fetchAuditQueue();
      } else {
        alert(`上架失败: ${data.detail || '未知错误'}`);
      }
    } catch (e) { alert('请求超时或网络错误，请稍后刷新重试。'); }
  };

  const handleReject = async (id: number) => {
    const reason = prompt('请输入拒绝原因:');
    if (!reason) return;
    try {
      const res = await fetchWithAuth(`/api/v1/admin/sourcing/candidates/${id}/reject?reason=${encodeURIComponent(reason)}`, { method: 'POST' });
      if (res.ok) {
        alert('已拒绝并归档');
        fetchAuditQueue();
      }
    } catch (e) { alert('操作失败'); }
  };

  const handleUpdateCandidate = async () => {
    if (!editingCandidate) return;
    setIsUpdating(true);
    try {
      const res = await fetchWithAuth(`/api/v1/admin/sourcing/candidates/${editingCandidate.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title_zh: editingCandidate.name,
          title_en_preview: editingCandidate.title_en_preview,
          desire_hook: editingCandidate.desire_hook,
          desire_logic: editingCandidate.desire_logic,
          desire_closing: editingCandidate.desire_closing,
          images: editingCandidate.images,
          variants_raw: editingCandidate.variants_raw,
          attributes: editingCandidate.attributes,
          logistics_data: editingCandidate.logistics_data,
          mirror_assets: editingCandidate.mirror_assets,
          structural_data: editingCandidate.structural_data,
          category: editingCandidate.category,
          source_platform: editingCandidate.source_platform,
          source_url: editingCandidate.source_url
        })
      });
      if (res.ok) {
        alert('修改已保存');
        setEditingCandidate(null);
        fetchAuditQueue();
      }
    } catch (e) {
      alert('保存失败');
    } finally {
      setIsUpdating(false);
    }
  };

  const fetchPersonaTemplates = async () => {
    try {
      const res = await fetchWithAuth('/api/v1/admin/ai/persona-templates');
      setPersonaTemplates(await res.json());
    } catch (e) { console.error(e); }
  };

  const fetchAIUsageStats = async () => {
    try {
      const res = await fetchWithAuth('/api/v1/admin/ai/usage-stats');
      setAIUsageStats(await res.json());
    } catch (e) { console.error(e); }
  };

  const handleUpdateTemplate = async (template: PersonaTemplate) => {
    try {
      await fetchWithAuth('/api/v1/admin/ai/persona-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(template)
      });
      fetchPersonaTemplates();
      alert('模板更新成功');
    } catch (e) { alert('更新失败'); }
  };

  const fetchSummary = async () => {
    setIsLoading(true);
    try {
      const response = await fetchWithAuth('/api/v1/admin/dashboard/kpis');
      const data = await response.json();
      setSummary(data);
    } catch (error) {
      console.error('Failed to fetch admin summary:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAIData = async () => {
    try {
      const [contRes, auditRes] = await Promise.all([
        fetchWithAuth('/api/v1/admin/ai/contributions'),
        fetchWithAuth('/api/v1/admin/ai/shield-audit')
      ]);
      setContributions(await contRes.json());
      setShieldAudit(await auditRes.json());
    } catch (error) {
      console.error('Failed to fetch AI data:', error);
    }
  };

  const fetchCoupons = async () => {
    try {
      const response = await fetchWithAuth('/api/v1/admin/coupons');
      const data = await response.json();
      setCoupons(data);
    } catch (error) {
      console.error('Failed to fetch coupons:', error);
    }
  };

  const fetchAIRules = async () => {
    try {
      const response = await fetchWithAuth('/api/v1/admin/config/ai-rules');
      const data = await response.json();
      setAIRules(data);
    } catch (error) {
      console.error('Failed to fetch AI rules:', error);
    }
  };

  const handleSyncCoupons = async () => {
    try {
      const res = await fetchWithAuth('/api/v1/admin/coupons/sync');
      const data = await res.json();
      alert(`已同步 ${data.synced_count} 个优惠券`);
      fetchCoupons();
    } catch (error) {
      alert('同步失败');
    }
  };

  const handleAssignCategory = async (code: string, category: string, permission: string) => {
    try {
      await fetchWithAuth(`/api/v1/admin/coupons/${code}/assign-category`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ai_category: category, ai_issuance_permission: permission })
      });
      fetchCoupons();
    } catch (error) {
      alert('更新失败');
    }
  };

  const updateGlobalConfig = async (key: string, value: any) => {
    const newValue = prompt(`请输入新的 ${key} 值:`, typeof value === 'object' ? JSON.stringify(value) : value);
    if (newValue === null) return;
    
    try {
      let parsedValue: any = newValue;
      if (typeof value === 'number') parsedValue = parseFloat(newValue);
      if (typeof value === 'object') parsedValue = JSON.parse(newValue);

      await fetchWithAuth('/api/v1/admin/config/global', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value: parsedValue })
      });
      fetchSummary();
      if (activeTab === 'coupons_mgmt') fetchAIRules();
    } catch (error) {
      alert('配置更新失败');
    }
  };

  const stats = [
    { label: '今日订单', value: summary?.orders_today || 0, icon: ShoppingBag, color: 'blue' },
    { label: '本月估算利润', value: `$${(summary?.profit_mtd || 0).toFixed(2)}`, icon: TrendingUp, color: 'green' },
    { label: '爆款策略覆盖', value: Object.keys(summary?.ids_conversion || {}).length, icon: Database, color: 'purple' },
    { label: '熔断预警', value: summary?.melting_count || 0, icon: Activity, color: 'red' },
    { label: 'API 状态', value: summary?.api_status || 'Simulation', icon: Shield, color: 'orange' }
  ];

  return (
    <div className="min-h-screen bg-[#F5F5F7] font-sans">
      {/* Artisan Refinement Modal (v4.1) */}
      {editingCandidate && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-white w-full max-w-5xl max-h-[90vh] rounded-[40px] shadow-2xl overflow-hidden flex flex-col border border-white/20"
          >
            <div className="p-8 border-b border-gray-100 flex items-center justify-between bg-white">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-orange-50 flex items-center justify-center text-orange-600">
                  <Edit3 size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-black italic tracking-tight uppercase">Artisan 精修编辑器 <span className="text-gray-300 ml-2">v4.1</span></h3>
                  <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-0.5">正在编辑: {editingCandidate.product_id_1688}</p>
                </div>
              </div>
              <button 
                onClick={() => setEditingCandidate(null)}
                className="w-10 h-10 rounded-full hover:bg-gray-50 flex items-center justify-center text-gray-400 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-[#FBFBFD]">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                {/* Left: Media & Variants */}
                <div className="space-y-8">
                  <section>
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-[0.2em]">视觉画廊 (拖拽排序预研)</h4>
                      <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">首图锁定</span>
                    </div>
                    <Reorder.Group 
                      axis="x" 
                      values={editingCandidate.images} 
                      onReorder={(newImages) => setEditingCandidate({...editingCandidate, images: newImages})}
                      className="grid grid-cols-4 gap-3"
                    >
                      {editingCandidate.images.map((img, idx) => (
                        <Reorder.Item 
                          key={`${img}-${idx}`} // v4.6.7: Use combination key to handle duplicate URLs if any
                          value={img}
                          className="relative aspect-square group cursor-grab active:cursor-grabbing"
                        >
                          <img 
                            src={img} 
                            alt="gallery" 
                            className={`w-full h-full object-cover rounded-2xl border-2 ${idx === 0 ? 'border-orange-500 shadow-lg shadow-orange-500/20' : 'border-white shadow-sm'}`} 
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 rounded-2xl transition-opacity flex items-center justify-center gap-2">
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                if (confirm('确认删除此图片吗？')) {
                                  const newImages = editingCandidate.images.filter((_, i) => i !== idx);
                                  setEditingCandidate({...editingCandidate, images: newImages});
                                }
                              }}
                              className="p-1.5 bg-white rounded-lg text-red-500 hover:scale-110 transition-transform"
                            >
                              <Trash2 size={14} />
                            </button>
                            <div className="p-1.5 bg-white rounded-lg text-black">
                              <GripVertical size={14} />
                            </div>
                          </div>
                          {idx === 0 && (
                            <div className="absolute top-2 left-2 bg-orange-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded-md shadow-sm uppercase tracking-tighter">Cover</div>
                          )}
                        </Reorder.Item>
                      ))}
                    </Reorder.Group>
                  </section>

                  <section>
                    <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-[0.2em] mb-4">规格名品牌化 (Variants)</h4>
                    <div className="space-y-3">
                      {editingCandidate.variants_raw.map((v, idx) => (
                        <div key={idx} className="flex items-center gap-4 p-4 bg-white rounded-2xl border border-gray-100 shadow-sm">
                          <div className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center overflow-hidden border border-gray-50">
                            {v.image || editingCandidate.images[v.image_index] ? (
                              <img src={v.image || editingCandidate.images[v.image_index]} className="w-full h-full object-cover" />
                            ) : <Database size={16} className="text-gray-200" />}
                          </div>
                          <div className="flex-1">
                            <p className="text-[9px] font-black text-gray-300 uppercase mb-1">原始: {v.spec_attrs || v.title || 'Standard'}</p>
                            <input 
                              type="text"
                              value={v.title || v.spec_attrs || ''}
                              onChange={(e) => {
                                const newVariants = [...editingCandidate.variants_raw];
                                newVariants[idx].title = e.target.value;
                                setEditingCandidate({...editingCandidate, variants_raw: newVariants});
                              }}
                              className="w-full bg-transparent border-none p-0 text-sm font-black focus:ring-0 focus:outline-none"
                              placeholder="输入品牌化规格名..."
                            />
                          </div>
                          <div className="text-right">
                            <p className="text-[9px] font-black text-gray-300 uppercase mb-1">物流 / 估价</p>
                            <div className="flex flex-col items-end">
                              <span className="text-[10px] font-bold text-blue-500 uppercase">{v.logistics?.weight_g || editingCandidate.logistics_data?.weight_g || '0'}g</span>
                              <p className="text-sm font-black text-orange-600">${(editingCandidate.estimated_sale_price || 0).toFixed(2)}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>

                  <section>
                    <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-[0.2em] mb-4">镜像资产与社交证据 (1:1 Mirror & Social Proof)</h4>
                    
                    {/* Video Asset */}
                    {editingCandidate.structural_data?.video_url && (
                      <div className="mb-4 bg-orange-50/50 rounded-2xl p-4 border border-orange-100 flex items-center gap-4">
                        <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center text-orange-600">
                          <PlayCircle size={20} />
                        </div>
                        <div className="flex-1">
                          <p className="text-xs font-black text-orange-900">HD Video Captured</p>
                          <p className="text-[9px] font-bold text-orange-600 uppercase">1:1 High Fidelity Media</p>
                        </div>
                        <button 
                          onClick={() => window.open(editingCandidate.structural_data.video_url, '_blank')}
                          className="px-3 py-1.5 bg-white border border-orange-200 rounded-lg text-[10px] font-black text-orange-600 hover:bg-orange-50 transition-all uppercase tracking-wider"
                        >
                          Preview
                        </button>
                      </div>
                    )}

                    {/* Attributes Grid */}
                    <div className="grid grid-cols-2 gap-3">
                      {editingCandidate.attributes?.slice(0, 12).map((attr, idx) => (
                        <div key={idx} className="p-3 bg-white rounded-xl border border-gray-100 shadow-sm">
                          <p className="text-[9px] font-black text-gray-400 uppercase mb-1">{attr.label}</p>
                          <p className="text-xs font-bold text-gray-600 truncate">{attr.value}</p>
                        </div>
                      ))}
                    </div>

                    {/* Social Proof Snippet */}
                    {editingCandidate.structural_data?.reviews && (
                      <div className="mt-4 p-4 bg-purple-50/30 rounded-2xl border border-purple-100/50">
                        <h5 className="text-[10px] font-black text-purple-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                          <Star size={12} fill="currentColor" /> 社交证据 (Social Proof)
                        </h5>
                        <div className="space-y-3">
                          {editingCandidate.structural_data.reviews.slice(0, 2).map((rev: any, i: number) => (
                            <div key={i} className="text-[10px] text-purple-900/70 font-medium italic leading-relaxed border-l-2 border-purple-200 pl-3">
                              "{rev.text?.substring(0, 80)}..."
                            </div>
                          ))}
                          <div className="flex gap-2 mt-2">
                            {editingCandidate.structural_data.reviews.flatMap((r: any) => r.images || []).slice(0, 4).map((img: string, i: number) => (
                              <div key={i} className="w-10 h-10 rounded-lg bg-gray-100 overflow-hidden border border-white shadow-sm">
                                <img src={img} className="w-full h-full object-cover" />
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Logistics Radar */}
                    {editingCandidate.logistics_data && (
                      <div className="mt-4 p-4 bg-blue-50/30 rounded-2xl border border-blue-100/50">
                        <h5 className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                          <Shield size={12} /> 物流雷达 (Logistics Data)
                        </h5>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-[9px] font-black text-blue-400 uppercase mb-1">预估重量</p>
                            <p className="text-xs font-black text-blue-900">{editingCandidate.logistics_data.weight_g || '1800'}g</p>
                          </div>
                          <div>
                            <p className="text-[9px] font-black text-blue-400 uppercase mb-1">货物属性</p>
                            <p className="text-xs font-black text-blue-900">普货 (General)</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </section>
                </div>

                {/* Right: Desire Engine Texts */}
                <div className="space-y-8">
                  <section className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-[0.2em]">欲望文案精修 (Desire Engine v4.0)</h4>
                      <button 
                        onClick={() => {
                          // v4.6.5: Smart AI Auto-fill Simulation
                          setEditingCandidate({
                            ...editingCandidate,
                            desire_hook: "Stop paying for brand tax! This high-fidelity curtain motor delivers industrial performance at 1/4 the retail cost.",
                            desire_logic: "Direct from the source. We deconstruct the BOM to prove that quality doesn't have to be expensive.",
                            desire_closing: "Limited stock for the first batch. Secure your node in the smart home ecosystem today."
                          });
                        }}
                        className="flex items-center gap-1.5 px-3 py-1 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-[9px] font-black uppercase tracking-widest transition-all shadow-sm shadow-orange-500/20"
                      >
                        <Zap size={10} fill="currentColor" /> AI 自动润色
                      </button>
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-blue-500 uppercase tracking-widest ml-1">The Hook (痛点重现)</label>
                      <textarea 
                        value={editingCandidate.desire_hook}
                        onChange={(e) => setEditingCandidate({...editingCandidate, desire_hook: e.target.value})}
                        className="w-full h-24 bg-white border border-gray-100 rounded-2xl p-4 text-sm font-medium leading-relaxed focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 transition-all outline-none custom-scrollbar"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-orange-500 uppercase tracking-widest ml-1">The Logic (价值解构)</label>
                      <textarea 
                        value={editingCandidate.desire_logic}
                        onChange={(e) => setEditingCandidate({...editingCandidate, desire_logic: e.target.value})}
                        className="w-full h-32 bg-white border border-gray-100 rounded-2xl p-4 text-sm font-medium leading-relaxed focus:border-orange-500 focus:ring-4 focus:ring-orange-500/5 transition-all outline-none custom-scrollbar"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-purple-500 uppercase tracking-widest ml-1">The Closing (仪式契约)</label>
                      <textarea 
                        value={editingCandidate.desire_closing}
                        onChange={(e) => setEditingCandidate({...editingCandidate, desire_closing: e.target.value})}
                        className="w-full h-24 bg-white border border-gray-100 rounded-2xl p-4 text-sm font-medium leading-relaxed focus:border-purple-500 focus:ring-4 focus:ring-purple-500/5 transition-all outline-none custom-scrollbar"
                      />
                    </div>
                  </section>

                  <div className="pt-6 border-t border-gray-100">
                    <div className="bg-orange-50/50 p-4 rounded-2xl border border-orange-100 mb-6">
                      <div className="flex gap-3">
                        <AlertCircle className="text-orange-600 shrink-0" size={18} />
                        <p className="text-[11px] text-orange-800 font-medium leading-relaxed">
                          提示：点击“保存并准备批准”将更新本地候选池。最终上架前，系统会再次执行红线毛利核算，确保 0.5% 的汇率 Buffer 依然安全。
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex gap-4">
                      <button 
                        onClick={() => setEditingCandidate(null)}
                        className="flex-1 py-4 rounded-2xl bg-gray-100 text-gray-500 font-black text-xs uppercase tracking-widest hover:bg-gray-200 transition-all"
                      >
                        取消修改
                      </button>
                      <button 
                        onClick={handleUpdateCandidate}
                        disabled={isUpdating}
                        className="flex-[2] py-4 rounded-2xl bg-black text-white font-black text-xs uppercase tracking-[0.2em] hover:bg-orange-600 shadow-xl shadow-orange-600/20 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                      >
                        {isUpdating ? <RefreshCw size={16} className="animate-spin" /> : <Shield size={16} />}
                        保存并准备批准
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      <div className="flex flex-col lg:flex-row h-screen overflow-hidden">
        {/* Sidebar */}
        <aside className="w-full lg:w-64 bg-white border-r border-gray-100 p-6 flex flex-col h-auto lg:h-full">
          <div className="flex items-center gap-2 mb-10">
            <Link to="/" className="p-2 hover:bg-gray-50 rounded-full transition-colors">
              <ArrowLeft size={20} />
            </Link>
            <h1 className="text-xl font-black tracking-tighter uppercase italic">0Buck <span className="text-orange-600">Admin</span></h1>
          </div>

          <nav className="space-y-2 flex-1 overflow-y-auto pr-2 custom-scrollbar">
            {[
              { id: 'overview', label: '运营看板', icon: Activity },
              { id: 'sourcing', label: '选品审核', icon: ShoppingBag },
              { id: 'talents_audit', label: '达人审核', icon: Star },
              { id: 'c2m_mgmt', label: 'C2M 需求洞察', icon: Zap },
              { id: 'melting', label: '熔断预警', icon: AlertCircle },
              { id: 'persona_os', label: 'AI 人格与进化', icon: Zap },
              { id: 'ai_mgmt', label: 'AI 安全与奖励', icon: Shield },
              { id: 'coupons_mgmt', label: '优惠券与 AI 发券', icon: Ticket },
              { id: 'settings', label: '策略配置', icon: Settings }
            ].map((item) => (
              <button 
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all font-semibold text-sm ${
                  activeTab === item.id 
                    ? "bg-black text-white shadow-md" 
                    : "text-gray-500 hover:bg-gray-50"
                }`}
              >
                <item.icon size={18} />
                {item.label}
              </button>
            ))}
          </nav>

          <div className="mt-6 p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-4">
            <div>
              <p className="text-[10px] uppercase font-black text-gray-400 mb-1 tracking-widest">v4.6 系统状态</p>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-xs font-bold">工业级运行中</span>
              </div>
            </div>
            
            <div className="pt-4 border-t border-gray-200">
              <p className="text-[10px] uppercase font-black text-gray-400 mb-1 tracking-widest">1688 API 引擎</p>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${stats.find(s => s.label === 'API 状态')?.value === 'Active' ? 'bg-blue-500' : 'bg-orange-400'}`}></div>
                <span className="text-xs font-bold">{stats.find(s => s.label === 'API 状态')?.value || '模拟模式'}</span>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Panel */}
        <main className="flex-1 overflow-y-auto p-6 lg:p-10 bg-[#F5F5F7]">
          <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div>
              <h2 className="text-2xl font-black text-gray-900">0Buck v3.1 指挥中心</h2>
              <p className="text-sm text-gray-500 font-medium">爆款发现与自动化运营监控</p>
            </div>
            <button 
              onClick={fetchSummary}
              className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl border border-gray-100 shadow-sm font-bold text-sm hover:bg-gray-50 transition-colors"
            >
              <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
              立即刷新
            </button>
          </header>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {stats.map((stat, i) => (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                key={stat.label}
                className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col gap-2"
              >
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center mb-2 bg-${stat.color}-50 text-${stat.color}-600`}>
                  <stat.icon size={20} />
                </div>
                <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">{stat.label}</p>
                <h3 className="text-2xl font-black text-gray-900 tracking-tighter">{stat.value}</h3>
              </motion.div>
            ))}
          </div>

          {activeTab === 'sourcing' && (
            <div className="space-y-8">
              {/* Category Filter Tabs */}
              <div className="flex gap-2 p-1 bg-gray-100 rounded-2xl w-fit">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
                      selectedCategory === cat ? 'bg-white text-black shadow-sm' : 'text-gray-400 hover:text-gray-600'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
                <div className="p-6 border-b border-gray-50 flex items-center justify-between">
                  <div>
                    <h3 className="font-black text-lg">IDS 选品审核中枢 (Autonomous Selection)</h3>
                    <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">v4.1 Desire Engine & Multidimensional Audit</p>
                  </div>
                  <div className="flex gap-4">
                    <button 
                      onClick={fetchAuditQueue}
                      className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-400"
                    >
                      <RefreshCw size={18} />
                    </button>
                    <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-xs font-black flex items-center">
                      待审核: {filteredQueue.length} / {auditQueue.length}
                    </span>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left min-w-[1400px]">
                    <thead className="bg-gray-50 text-[10px] uppercase text-gray-400 font-black tracking-widest">
                      <tr>
                        <th className="px-6 py-4">ID / 状态</th>
                        <th className="px-6 py-4">商品预览 / 趋势证据 (Selection & Evidence)</th>
                        <th className="px-6 py-4">供应商 (Supplier)</th>
                        <th className="px-6 py-4">分类 / 策略</th>
                        <th className="px-6 py-4">对比价 / 财务模型 (Financials)</th>
                        <th className="px-6 py-4">欲望文案预览 (Psychological Sniper)</th>
                        <th className="px-6 py-4 text-right">决策控制 (Control)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {filteredQueue.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-6 py-12 text-center text-gray-400 font-black italic">
                            该分类下没有待审核选品，请尝试切换分类或刷新同步。
                          </td>
                        </tr>
                      ) : filteredQueue.map((item) => (
                        <tr key={item.id} className="hover:bg-gray-50/50 transition-colors group">
                          <td className="px-6 py-4">
                            <span className="text-[10px] font-black text-gray-300">#{item.id}</span>
                            <div className="mt-1 flex flex-col gap-1.5">
                              <div className="flex items-center gap-1.5">
                                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                <span className="text-[9px] font-black uppercase text-blue-600">Pending</span>
                              </div>
                              {/* v4.7.1 Sourcing Badge */}
                              <div className={`px-2 py-0.5 rounded-lg text-[8px] font-black uppercase w-fit ${
                                item.source_platform === 'ALIBABA' 
                                  ? 'bg-amber-100 text-amber-700 border border-amber-200' 
                                  : 'bg-orange-100 text-orange-700 border border-orange-200'
                              }`}>
                                {item.source_platform || '1688'}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-4">
                              <div className="relative">
                                {item.images && item.images.length > 0 ? (
                                  <img src={item.images[0]} alt="prod" className="w-20 h-20 rounded-2xl object-cover bg-gray-100 shadow-md border-2 border-white group-hover:scale-110 transition-transform" />
                                ) : (
                                  <div className="w-20 h-20 rounded-2xl bg-gray-100 flex items-center justify-center text-gray-300">
                                    <ShoppingBag size={24} />
                                  </div>
                                )}
                                {item.discovery_evidence?.trend_score >= 95 && (
                                  <div className="absolute -top-2 -right-2 bg-orange-600 text-white p-1 rounded-full shadow-lg">
                                    <TrendingUp size={12} />
                                  </div>
                                )}
                              </div>
                              <div className="max-w-[280px]">
                                <p className="font-black text-sm leading-tight mb-2">{item.name}</p>
                                <div className="flex flex-wrap gap-1">
                                  {item.discovery_evidence?.trend_score && (
                                    <span className="px-2 py-0.5 bg-green-50 text-green-600 rounded-lg text-[8px] font-black uppercase">
                                      Score: {item.discovery_evidence.trend_score}
                                    </span>
                                  )}
                                  {item.discovery_evidence?.tiktok_views && (
                                    <span className="px-2 py-0.5 bg-pink-50 text-pink-600 rounded-lg text-[8px] font-black uppercase">
                                      TikTok: {item.discovery_evidence.tiktok_views}
                                    </span>
                                  )}
                                  {item.discovery_evidence?.reddit_upvotes && (
                                    <span className="px-2 py-0.5 bg-orange-50 text-orange-600 rounded-lg text-[8px] font-black uppercase">
                                      Reddit: {item.discovery_evidence.reddit_upvotes}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="max-w-[200px]">
                              <p className="text-xs font-black text-gray-800 truncate">{item.supplier_info?.name || '未知源工厂'}</p>
                              <div className="flex flex-col gap-1 mt-2">
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] font-bold text-gray-400">
                                    {item.source_platform === 'ALIBABA' ? 'Alibaba ID:' : '1688 ID:'} {item.product_id_1688}
                                  </span>
                                  {item.supplier_info?.is_strength && (
                                    <span className="bg-amber-100 text-amber-700 text-[8px] px-1.5 py-0.5 rounded-full font-black uppercase">实力商家</span>
                                  )}
                                </div>
                                {item.source_url && (
                                  <a 
                                    href={item.source_url} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-[9px] text-blue-500 hover:underline flex items-center gap-1 font-bold truncate"
                                  >
                                    <ExternalLink size={10} />
                                    访问源链接
                                  </a>
                                )}
                              </div>
                              {item.backup_source_url && (
                                <div className="mt-3 p-3 bg-amber-50 rounded-2xl border border-amber-100 shadow-sm">
                                  <p className="text-[10px] font-black text-amber-800 uppercase flex items-center gap-1.5 mb-1.5">
                                    <Zap size={12} fill="#d97706" /> Alibaba.com 备选源已锁定
                                  </p>
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs font-black text-amber-600">RTS Price: ${item.alibaba_comparison_price || '0.00'}</span>
                                    <a 
                                      href={item.backup_source_url} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="px-2 py-1 bg-white text-[9px] text-amber-700 hover:bg-amber-100 rounded-lg border border-amber-200 font-black shadow-xs transition-colors"
                                    >
                                      对比链接
                                    </a>
                                  </div>
                                </div>
                              )}
                              {item.supplier_info?.rating && (
                                <div className="mt-1 flex gap-0.5 text-amber-400">
                                  {[...Array(5)].map((_, i) => (
                                    <span key={i} className={`text-xs ${i < Math.floor(item.supplier_info.rating) ? 'opacity-100' : 'opacity-20'}`}>★</span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="space-y-2">
                              <div>
                                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Market Category</p>
                                <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-lg text-[10px] font-black uppercase">{item.category || 'OTHER'}</span>
                              </div>
                              <div>
                                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Signal Source</p>
                                <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase ${
                                  item.discovery_source === 'IDS_SPY' ? 'bg-orange-100 text-orange-600' : 
                                  item.discovery_source === 'C2M_WISH' ? 'bg-purple-100 text-purple-600' : 
                                  'bg-blue-100 text-blue-600'
                                }`}>
                                  {item.discovery_source}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="w-[220px] p-3 bg-gray-50 rounded-2xl space-y-2 border border-gray-100">
                              <div className="flex justify-between items-center">
                                <span className="text-[9px] font-black text-gray-400 uppercase">1688 Cost</span>
                                <span className="text-xs font-bold text-gray-700">¥{item.cost_cny}</span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-[9px] font-black text-gray-400 uppercase">Amazon Price</span>
                                <span className="text-xs font-bold text-gray-700">${(item as any).amazon_price || 'N/A'}</span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-[9px] font-black text-gray-400 uppercase">eBay Price</span>
                                <span className="text-xs font-bold text-gray-700">${(item as any).ebay_price || 'N/A'}</span>
                              </div>
                              <div className="pt-2 border-t border-gray-200 flex justify-between items-center">
                                <span className="text-[9px] font-black text-blue-500 uppercase">0Buck Sale</span>
                                <span className="text-sm font-black text-black">${(item.estimated_sale_price || 0).toFixed(2)}</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="max-w-[320px] space-y-2 group/text">
                              <div className="p-2 bg-blue-50/30 rounded-lg border border-blue-50">
                                <p className="text-[9px] font-black text-blue-400 uppercase mb-1">The Hook</p>
                                <p className="text-[11px] text-gray-600 leading-tight line-clamp-2">{item.desire_hook || 'AI 润色中...'}</p>
                              </div>
                              <div className="p-2 bg-orange-50/30 rounded-lg border border-orange-50">
                                <p className="text-[9px] font-black text-orange-400 uppercase mb-1">The Logic</p>
                                <p className="text-[11px] text-gray-600 leading-tight line-clamp-2">{item.desire_logic || 'AI 逻辑计算中...'}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex flex-col gap-2 items-end">
                              <button 
                                onClick={() => handleApprove(item.id)}
                                className="w-full px-5 py-3 bg-black text-white rounded-2xl text-[11px] font-black hover:bg-orange-600 shadow-lg shadow-black/10 transition-all flex items-center justify-center gap-2 group/btn active:scale-95"
                              >
                                <Zap size={14} fill="currentColor" className="group-hover/btn:animate-pulse" />
                                立即批准上架
                              </button>
                              <div className="flex gap-2">
                                <button 
                                  onClick={() => setEditingCandidate(item)}
                                  className="flex-1 py-2 px-4 rounded-xl bg-gray-50 text-gray-400 hover:bg-blue-50 hover:text-blue-600 transition-all text-[10px] font-black uppercase flex items-center justify-center gap-2 border border-gray-100"
                                >
                                  <Edit3 size={12} />
                                  精修
                                </button>
                                <button 
                                  onClick={() => handleReject(item.id)}
                                  className="px-4 py-2 bg-gray-50 text-gray-400 rounded-xl text-[10px] font-bold hover:bg-red-50 hover:text-red-600 transition-colors"
                                >
                                  不符合要求
                                </button>
                                <button className="p-2 bg-gray-50 text-gray-300 rounded-xl hover:bg-gray-100 hover:text-gray-500 transition-colors">
                                  <Settings size={14} />
                                </button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'talents_audit' && (
            <div className="space-y-8">
              <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
                <div className="p-6 border-b border-gray-50 flex items-center justify-between">
                  <div>
                    <h3 className="font-black text-lg">达人申请审核 (Talent Audit)</h3>
                    <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">管理用户晋升达人及分销比例设置</p>
                  </div>
                  <button 
                    onClick={fetchPendingTalents}
                    className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-400"
                  >
                    <RefreshCw size={18} />
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-gray-50 text-[10px] uppercase text-gray-400 font-black tracking-widest">
                      <tr>
                        <th className="px-6 py-4">用户信息</th>
                        <th className="px-6 py-4">申请理由</th>
                        <th className="px-6 py-4">申请时间</th>
                        <th className="px-6 py-4">奖励比例 (默认)</th>
                        <th className="px-6 py-4 text-right">操作控制</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {pendingTalents.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-6 py-12 text-center text-gray-400 font-black italic">
                            暂无待审核的达人申请
                          </td>
                        </tr>
                      ) : pendingTalents.map((t) => (
                        <tr key={t.customer_id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-6 py-4">
                            <p className="font-black text-sm">{t.first_name} {t.last_name}</p>
                            <p className="text-[10px] text-gray-400 font-bold uppercase">{t.email}</p>
                            <p className="text-[9px] text-gray-300">ID: {t.customer_id}</p>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-xs text-gray-600 italic max-w-xs">{t.kol_apply_reason || '未填写理由'}</p>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-xs font-bold text-gray-400">
                              {t.kol_applied_at ? new Date(t.kol_applied_at).toLocaleString() : 'N/A'}
                            </p>
                          </td>
                          <td className="px-6 py-4">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="text-[9px] font-black text-gray-400 uppercase w-10">分销:</span>
                                <span className="text-xs font-black text-green-600">{((t.dist_rate || 0.1) * 100).toFixed(0)}%</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-[9px] font-black text-gray-400 uppercase w-10">粉丝:</span>
                                <span className="text-xs font-black text-blue-600">{((t.fan_rate || 0.05) * 100).toFixed(0)}%</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex justify-end gap-2">
                              <button 
                                onClick={() => {
                                  const dist = prompt('设置分销奖励比例 (0.01-0.99):', '0.15');
                                  const fan = prompt('设置粉丝奖励比例 (0.01-0.99):', '0.05');
                                  if (dist && fan) handleAuditTalent(t.customer_id, 'approved', parseFloat(dist), parseFloat(fan));
                                }}
                                className="px-4 py-2 bg-black text-white rounded-xl text-[10px] font-black hover:bg-green-600 transition-colors"
                              >
                                批准并设置比例
                              </button>
                              <button 
                                onClick={() => handleAuditTalent(t.customer_id, 'rejected')}
                                className="px-4 py-2 bg-gray-100 text-gray-400 rounded-xl text-[10px] font-bold hover:bg-red-50 hover:text-red-600 transition-colors"
                              >
                                拒绝
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'c2m_mgmt' && (
            <div className="space-y-8">
              {/* C2M Global Controls (v3.3.2) */}
              <div className="bg-black text-white p-8 rounded-3xl shadow-xl flex flex-col lg:flex-row justify-between items-center gap-8 border border-white/5">
                <div className="flex items-center gap-6">
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center bg-white/10 ${c2mConfig.enabled ? 'text-green-400' : 'text-red-400'}`}>
                    <Zap size={32} fill="currentColor" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black italic uppercase tracking-tight">C2M 活动控制台</h3>
                    <p className="text-xs text-gray-400 font-medium">配置全局众筹阈值、有效期及功能开关</p>
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-4">
                  <div className="px-6 py-3 bg-white/5 rounded-2xl border border-white/10 text-center">
                    <p className="text-[10px] font-black text-gray-500 uppercase mb-1">众筹阈值</p>
                    <p className="text-lg font-black">{c2mConfig.threshold} 人</p>
                    <button onClick={() => updateGlobalConfig('C2M_VOTE_THRESHOLD', 10)} className="text-[10px] font-black text-orange-500 uppercase mt-1">修改</button>
                  </div>
                  <div className="px-6 py-3 bg-white/5 rounded-2xl border border-white/10 text-center">
                    <p className="text-[10px] font-black text-gray-500 uppercase mb-1">窗口效期</p>
                    <p className="text-lg font-black">{c2mConfig.expiry} 小时</p>
                    <button onClick={() => updateGlobalConfig('C2M_WISH_EXPIRY_HOURS', 48)} className="text-[10px] font-black text-orange-500 uppercase mt-1">修改</button>
                  </div>
                  <button 
                    onClick={() => updateGlobalConfig('C2M_ENABLED', !c2mConfig.enabled)}
                    className={`px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all ${
                      c2mConfig.enabled ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-green-600 hover:bg-green-700 text-white'
                    }`}
                  >
                    {c2mConfig.enabled ? '紧急关闭 C2M' : '开启 C2M 许愿池'}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Demand Insights */}
                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
                  <div className="p-6 border-b border-gray-50 flex items-center justify-between">
                    <h3 className="font-black text-lg flex items-center gap-2">
                      <Zap size={20} className="text-yellow-500" />
                      AI 聚类需求洞察 (LTM)
                    </h3>
                  </div>
                  <div className="p-6 space-y-4">
                    {insights.map((ins) => (
                      <div key={ins.id} className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex justify-between items-center">
                        <div>
                          <span className="text-[10px] font-black uppercase text-blue-600 tracking-widest">{ins.category}</span>
                          <p className="font-bold text-sm text-gray-900 mt-1">{ins.unmet_need}</p>
                          <p className="text-[10px] text-gray-400 font-bold uppercase mt-1">命中频次: {ins.frequency} 次</p>
                        </div>
                        <button className="text-xs font-black text-blue-600 hover:underline">发起寻源</button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Wishing Well */}
                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
                  <div className="p-6 border-b border-gray-50 flex items-center justify-between">
                    <h3 className="font-black text-lg">许愿池广场 (Wishing Well)</h3>
                  </div>
                  <div className="p-6 space-y-4">
                    {wishes.map((wish) => (
                      <div key={wish.id} className="flex flex-col gap-4 p-4 border-b border-gray-50 last:border-0">
                        <div className="flex gap-4">
                          {wish.image_url && (
                            <img src={wish.image_url} alt="wish" className="w-16 h-16 rounded-xl object-cover bg-gray-100" />
                          )}
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-800">{wish.description}</p>
                            <div className="flex items-center gap-3 mt-2">
                              <span className="text-[10px] font-black text-gray-400 uppercase">User #{wish.user_id}</span>
                              <span className={`text-[10px] font-black uppercase ${
                                wish.status === 'pre_order' ? 'text-green-500' : 'text-orange-500'
                              }`}>{wish.status}</span>
                            </div>
                          </div>
                        </div>
                        <WishingWellProgressBar 
                          voteCount={wish.vote_count || 1} 
                          targetCount={10} 
                          expiryAt={wish.expiry_at || new Date(Date.now() + 86400000).toISOString()}
                          status={wish.status}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'melting' && (
            <div className="space-y-8">
              <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
                <div className="p-6 border-b border-gray-50 flex items-center justify-between">
                  <h3 className="font-black text-lg flex items-center gap-2">
                    <AlertCircle size={20} className="text-red-600" />
                    价格熔断预警队列
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-gray-50 text-[10px] uppercase text-gray-400 font-black tracking-widest">
                      <tr>
                        <th className="px-6 py-4">商品名</th>
                        <th className="px-6 py-4">波动 (CNY)</th>
                        <th className="px-6 py-4">熔断原因</th>
                        <th className="px-6 py-4">触发时间</th>
                        <th className="px-6 py-4 text-right">操作</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {meltedProducts.map((p) => (
                        <tr key={p.product_id} className="hover:bg-red-50/30 transition-colors">
                          <td className="px-6 py-4">
                            <p className="font-black text-sm">{p.title}</p>
                            <p className="text-[10px] text-gray-400 font-bold">1688 ID: {p.id_1688}</p>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-xs font-bold text-red-600">¥{p.old_price} → ¥{p.current_price}</p>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-xs font-medium text-gray-500 italic">{p.melting_reason}</p>
                          </td>
                          <td className="px-6 py-4 text-xs font-bold text-gray-400">
                            {new Date(p.melted_at).toLocaleString()}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button className="text-xs font-black text-blue-600 hover:underline">解除熔断并同步</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'persona_os' && (
            <div className="space-y-8">
              {/* L1 & Token Economics Overview */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                  <h3 className="font-black text-lg mb-4 flex items-center gap-2">
                    <Zap size={20} className="text-yellow-500" />
                    Token 经济性与算力分布 (v3.2)
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {aiUsageStats.map((stat) => (
                      <div key={stat.task_type} className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                        <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">{stat.task_type}</p>
                        <p className="text-xl font-black">${(stat.cost_usd || 0).toFixed(4)}</p>
                        <p className="text-[10px] text-gray-500 font-bold">{(stat.tokens_in + stat.tokens_out).toLocaleString()} Tokens</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-black text-white p-6 rounded-3xl shadow-xl">
                  <h3 className="font-black text-lg mb-2">L1 强行层规则 (宪法)</h3>
                  <p className="text-xs text-gray-400 mb-4">Admin 管理的底层硬逻辑，优先级最高。</p>
                  <button 
                    onClick={() => updateGlobalConfig('AI_GLOBAL_ENFORCEMENT_L1', '### L1: SYSTEM ENFORCEMENT...')}
                    className="w-full py-2 bg-white/10 border border-white/20 rounded-xl text-xs font-black hover:bg-white/20 transition-colors"
                  >
                    编辑全局 L1 指令
                  </button>
                </div>
              </div>

              {/* L2 Persona Templates Management */}
              <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-50 flex items-center justify-between">
                  <h3 className="font-black text-lg">L2 人格模板管理 (Persona Library)</h3>
                  <button 
                    onClick={() => handleUpdateTemplate({
                      id: `persona_${Date.now()}`,
                      name: '新的人格',
                      style_prompt: '请在这里输入人格描述...',
                      empathy_weight: 0.5,
                      formality_score: 0.5,
                      vibrancy_level: 0.5,
                      emoji_density: 0.5,
                      is_active: true
                    })}
                    className="bg-black text-white px-4 py-2 rounded-xl text-xs font-black"
                  >
                    创建新模板
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-gray-50 text-[10px] uppercase text-gray-400 font-black tracking-widest">
                      <tr>
                        <th className="px-6 py-4">模板 ID / 名称</th>
                        <th className="px-6 py-4">风格权重 (Vectors)</th>
                        <th className="px-6 py-4">状态</th>
                        <th className="px-6 py-4 text-right">操作</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {personaTemplates.map((t) => (
                        <tr key={t.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-6 py-4">
                            <p className="font-black text-sm">{t.name}</p>
                            <p className="text-[10px] text-gray-400 font-bold uppercase">{t.id}</p>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex gap-2">
                              <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-[9px] font-black">EMP: {t.empathy_weight}</span>
                              <span className="px-2 py-0.5 bg-purple-50 text-purple-600 rounded text-[9px] font-black">FORM: {t.formality_score}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-1 rounded-full text-[10px] font-black uppercase ${t.is_active ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                              {t.is_active ? '已启用' : '已禁用'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button 
                              onClick={() => {
                                const newPrompt = prompt('修改 Style Prompt:', t.style_prompt);
                                if (newPrompt) handleUpdateTemplate({ ...t, style_prompt: newPrompt });
                              }}
                              className="text-xs font-black text-blue-600 hover:underline mr-4"
                            >
                              编辑风格
                            </button>
                            <button className="text-xs font-black text-gray-400 hover:underline">实验室预览</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'overview' && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
                  <div className="p-6 border-b border-gray-50 flex items-center justify-between">
                    <h3 className="font-black text-lg flex items-center gap-2">
                      <TrendingUp size={20} className="text-orange-600" />
                      选品策略转化统计 (IDS)
                    </h3>
                  </div>
                  <div className="p-8 grid grid-cols-1 sm:grid-cols-3 gap-6">
                    {Object.entries(summary?.ids_conversion || {}).map(([tag, count]) => (
                      <div key={tag} className="p-6 bg-gray-50 rounded-2xl border border-gray-100 text-center">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">{tag}</p>
                        <p className="text-3xl font-black text-black">{count}</p>
                        <p className="text-xs text-gray-500 mt-1 font-bold">已同步 SKU</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-black rounded-3xl p-6 shadow-xl flex flex-col text-white gap-6">
                  <h3 className="font-black text-xl mb-1 tracking-tight">快速操作</h3>
                  <div className="space-y-3">
                    <button 
                      onClick={() => setActiveTab('sourcing')}
                      className="w-full p-4 bg-white/10 rounded-2xl border border-white/5 flex items-center justify-between hover:bg-white/20 transition-all"
                    >
                      <span className="text-sm font-black">前往选品审核</span>
                      <ChevronRight size={16} />
                    </button>
                    <button 
                      onClick={() => setActiveTab('settings')}
                      className="w-full p-4 bg-white/10 rounded-2xl border border-white/5 flex items-center justify-between hover:bg-white/20 transition-all"
                    >
                      <span className="text-sm font-black">配置定价策略</span>
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Token ROI Section (v3.3) */}
              <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden p-8">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h3 className="font-black text-xl flex items-center gap-2">
                      <Coins size={24} className="text-yellow-600" />
                      AI 算力 ROI 深度报表 (Token vs Conversion)
                    </h3>
                    <p className="text-sm text-gray-400 font-medium">衡量每一分算力投入带来的业务增长</p>
                  </div>
                  <div className="flex gap-4">
                    <div className="text-right">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">平均转化成本 (CPA)</p>
                      <p className="text-xl font-black text-green-600">$0.12 <TrendingDown size={14} className="inline ml-1" /></p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {[
                    { label: '对话辅助转化', value: '12.4%', roi: '8.2x', cost: '$42.10', icon: Zap, color: 'orange' },
                    { label: '反射选品贡献', value: '34.1%', roi: '15.5x', cost: '$12.50', icon: TrendingUp, color: 'blue' },
                    { label: 'C2M 需求拉动', value: '8.5%', roi: '4.1x', cost: '$5.20', icon: Coins, color: 'yellow' },
                    { label: '影子物流节省', value: 'N/A', roi: 'Infinite', cost: '$0.00', icon: Shield, color: 'green' }
                  ].map((metric) => (
                    <div key={metric.label} className="p-6 bg-gray-50 rounded-2xl border border-gray-100">
                      <div className={`w-8 h-8 rounded-xl bg-${metric.color}-50 text-${metric.color}-600 flex items-center justify-center mb-4`}>
                        <metric.icon size={16} />
                      </div>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{metric.label}</p>
                      <div className="flex items-baseline justify-between">
                        <h4 className="text-xl font-black">{metric.value}</h4>
                        <span className="text-xs font-black text-green-600">ROI: {metric.roi}</span>
                      </div>
                      <p className="text-[10px] text-gray-400 font-bold mt-2">算力消耗: {metric.cost}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'ai_mgmt' && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
                  <div className="p-6 border-b border-gray-50 flex items-center justify-between">
                    <h3 className="font-black text-lg flex items-center gap-2">
                      <Gift size={20} className="text-purple-600" />
                      AI 贡献度与奖励进度 (BYOK)
                    </h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead className="bg-gray-50 text-[10px] uppercase text-gray-400 font-black tracking-widest">
                        <tr>
                          <th className="px-6 py-4">用户 ID</th>
                          <th className="px-6 py-4">节省 (USD)</th>
                          <th className="px-6 py-4">碎片进度</th>
                          <th className="px-6 py-4 text-right">已兑换卡片</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {contributions.map((c) => (
                          <tr key={c.user_id} className="hover:bg-gray-50/50 transition-colors">
                            <td className="px-6 py-4 font-bold text-sm">#{c.user_id}</td>
                            <td className="px-6 py-4 font-black text-green-600">${(c.usd_saved || 0).toFixed(2)}</td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <div className="flex gap-1">
                                  {[0, 1, 2].map((i) => (
                                    <div key={i} className={`w-3 h-3 rounded-full ${i < c.shards ? 'bg-purple-500 shadow-sm' : 'bg-gray-200'}`}></div>
                                  ))}
                                </div>
                                <span className="text-xs font-bold text-gray-500">{c.shards}/3</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <span className="bg-purple-50 text-purple-700 px-3 py-1 rounded-full text-xs font-black">
                                {c.total_cards} 枚
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
                  <div className="p-6 border-b border-gray-50 flex items-center justify-between">
                    <h3 className="font-black text-lg flex items-center gap-2">
                      <Shield size={20} className="text-orange-600" />
                      Zone 2 影子 ID 映射审计 (Shield)
                    </h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead className="bg-gray-50 text-[10px] uppercase text-gray-400 font-black tracking-widest">
                        <tr>
                          <th className="px-6 py-4">影子 ID</th>
                          <th className="px-6 py-4">真实内容</th>
                          <th className="px-6 py-4">类型</th>
                          <th className="px-6 py-4 text-right">状态</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {shieldAudit.map((m) => (
                          <tr key={m.shadow_id} className="hover:bg-gray-50/50 transition-colors">
                            <td className="px-6 py-4 font-black text-sm text-orange-600">{m.shadow_id}</td>
                            <td className="px-6 py-4 font-medium text-xs text-gray-400 truncate max-w-[150px]">{m.real_id}</td>
                            <td className="px-6 py-4">
                              <span className="px-2 py-1 bg-gray-100 rounded-md text-[10px] font-black uppercase">{m.type}</span>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <span className="flex items-center justify-end gap-1.5 text-xs font-bold text-green-500">
                                <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                                保护中
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'coupons_mgmt' && (
            <div className="space-y-8">
              <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
                <div className="p-6 border-b border-gray-50 flex items-center justify-between">
                  <h3 className="font-black text-lg flex items-center gap-2">
                    <Ticket size={20} className="text-orange-600" />
                    优惠券库与 AI 派发权限
                  </h3>
                  <button 
                    onClick={handleSyncCoupons}
                    className="bg-black text-white px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2"
                  >
                    <RefreshCw size={14} />
                    从 Shopify 同步
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-gray-50 text-[10px] uppercase text-gray-400 font-black tracking-widest">
                      <tr>
                        <th className="px-6 py-4">券码 (Code)</th>
                        <th className="px-6 py-4">面值 / 门槛</th>
                        <th className="px-6 py-4">AI 类别</th>
                        <th className="px-6 py-4">发放权限</th>
                        <th className="px-6 py-4 text-right">操作控制</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {coupons.map((c) => (
                        <tr key={c.code} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-6 py-4">
                            <span className="font-black text-sm px-2 py-1 bg-orange-50 text-orange-700 rounded-lg">{c.code}</span>
                          </td>
                          <td className="px-6 py-4">
                            <p className="font-black text-sm">{c.type === 'percentage' ? `${c.value}% OFF` : `$${c.value} OFF`}</p>
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Min: ${c.min_requirement}</p>
                          </td>
                          <td className="px-6 py-4">
                            <select 
                              value={c.ai_category || ''} 
                              onChange={(e) => handleAssignCategory(c.code, e.target.value, c.ai_issuance_permission)}
                              className="text-xs font-bold bg-gray-50 border-none rounded-lg p-1 outline-none"
                            >
                              <option value="">未分配</option>
                              <option value="SERVICE_RECOVERY">服务补偿</option>
                              <option value="UPSELL">加购引导</option>
                              <option value="ABANDONED_CART">弃单挽回</option>
                            </select>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-1 rounded-full text-[10px] font-black uppercase ${
                              c.ai_issuance_permission === 'LOW' ? 'bg-green-50 text-green-600' :
                              c.ai_issuance_permission === 'MEDIUM' ? 'bg-orange-50 text-orange-600' : 'bg-red-50 text-red-600'
                            }`}>
                              {c.ai_issuance_permission}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button 
                              onClick={() => {
                                const p = prompt("设置权限 (LOW, MEDIUM, HIGH):", c.ai_issuance_permission);
                                if (p) handleAssignCategory(c.code, c.ai_category || '', p.toUpperCase());
                              }}
                              className="text-xs font-black text-blue-600 hover:underline"
                            >
                              设置权限
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Pricing Strategy */}
                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8">
                  <h3 className="font-black text-xl mb-6 flex items-center gap-2">
                    <TrendingUp size={24} className="text-orange-600" />
                    全球定价策略配置
                  </h3>
                  <div className="space-y-6">
                    <div>
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">定制销售价比例 (对比价的 %)</label>
                      <div className="flex items-center gap-4">
                        <input 
                          type="range" min="0.1" max="1.5" step="0.05"
                          value={pricingStrategy?.sale_price_ratio || 0.6}
                          onChange={(e) => setPricingStrategy({...pricingStrategy!, sale_price_ratio: parseFloat(e.target.value)})}
                          className="flex-1 accent-orange-500"
                        />
                        <span className="text-lg font-black w-16">{(pricingStrategy?.sale_price_ratio || 0.6) * 100}%</span>
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">划线价比例 (对比价的 %)</label>
                      <div className="flex items-center gap-4">
                        <input 
                          type="range" min="0.5" max="2.0" step="0.05"
                          value={pricingStrategy?.compare_at_price_ratio || 0.95}
                          onChange={(e) => setPricingStrategy({...pricingStrategy!, compare_at_price_ratio: parseFloat(e.target.value)})}
                          className="flex-1 accent-blue-500"
                        />
                        <span className="text-lg font-black w-16">{(pricingStrategy?.compare_at_price_ratio || 0.95) * 100}%</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-50">
                      <div>
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">亚马逊权重</label>
                        <input 
                          type="number" step="0.1"
                          value={pricingStrategy?.amazon_weight || 0.5}
                          onChange={(e) => setPricingStrategy({...pricingStrategy!, amazon_weight: parseFloat(e.target.value)})}
                          className="w-full bg-gray-50 border-none rounded-xl p-3 font-bold"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">eBay 权重</label>
                        <input 
                          type="number" step="0.1"
                          value={pricingStrategy?.ebay_weight || 0.5}
                          onChange={(e) => setPricingStrategy({...pricingStrategy!, ebay_weight: parseFloat(e.target.value)})}
                          className="w-full bg-gray-50 border-none rounded-xl p-3 font-bold"
                        />
                      </div>
                    </div>
                    <button 
                      onClick={() => pricingStrategy && handleUpdatePricingStrategy(pricingStrategy)}
                      className="w-full py-4 bg-black text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-orange-600 transition-all shadow-xl shadow-orange-600/10"
                    >
                      保存定价策略
                    </button>
                  </div>
                </div>

                {/* Sourcing & Arbitrage Strategy */}
                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8">
                  <h3 className="font-black text-xl mb-6 flex items-center gap-2">
                    <Layers size={24} className="text-blue-600" />
                    供应与套利策略 (v4.7.3)
                  </h3>
                  <div className="space-y-6">
                    <div>
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Alibaba 套利阈值 (Arb Threshold)</label>
                      <div className="flex items-center gap-4">
                        <input 
                          type="range" min="0.05" max="0.30" step="0.01"
                          value={sourcingStrategy?.arbitrage_threshold || 0.15}
                          onChange={(e) => setSourcingStrategy({...sourcingStrategy!, arbitrage_threshold: parseFloat(e.target.value)})}
                          className="flex-1 accent-blue-600"
                        />
                        <span className="text-lg font-black w-16">{(sourcingStrategy?.arbitrage_threshold || 0.15) * 100}%</span>
                      </div>
                      <p className="text-[10px] text-gray-400 mt-1">若 Alibaba RTS 价格低于 (1688落地成本 * 1+阈值)，则推荐直发。</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">最小 Trend Score</label>
                        <input 
                          type="number"
                          value={sourcingStrategy?.min_trend_score || 85}
                          onChange={(e) => setSourcingStrategy({...sourcingStrategy!, min_trend_score: parseInt(e.target.value)})}
                          className="w-full bg-gray-50 border-none rounded-xl p-3 font-bold"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">最小供应商年限</label>
                        <input 
                          type="number"
                          value={sourcingStrategy?.min_supplier_years || 2}
                          onChange={(e) => setSourcingStrategy({...sourcingStrategy!, min_supplier_years: parseInt(e.target.value)})}
                          className="w-full bg-gray-50 border-none rounded-xl p-3 font-bold"
                        />
                      </div>
                    </div>

                    <div className="space-y-3 pt-4 border-t border-gray-50">
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input 
                          type="checkbox"
                          checked={sourcingStrategy?.require_gold_supplier || true}
                          onChange={(e) => setSourcingStrategy({...sourcingStrategy!, require_gold_supplier: e.target.checked})}
                          className="w-5 h-5 rounded-md border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm font-bold text-gray-700">强制金牌供应商 (Gold Supplier)</span>
                      </label>
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input 
                          type="checkbox"
                          checked={sourcingStrategy?.require_trade_assurance || true}
                          onChange={(e) => setSourcingStrategy({...sourcingStrategy!, require_trade_assurance: e.target.checked})}
                          className="w-5 h-5 rounded-md border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm font-bold text-gray-700">强制贸易保障 (Trade Assurance)</span>
                      </label>
                    </div>

                    <button 
                      onClick={() => sourcingStrategy && handleUpdateSourcingStrategy(sourcingStrategy)}
                      disabled={isUpdating}
                      className="w-full py-4 bg-black text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-blue-600 transition-all shadow-xl shadow-blue-600/10 disabled:opacity-50"
                    >
                      {isUpdating ? '同步中...' : '保存供应策略'}
                    </button>
                  </div>
                </div>
                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8">
                  <h3 className="font-black text-xl mb-6 flex items-center gap-2">
                    <Gift size={24} className="text-purple-600" />
                    达人与用户奖励比例
                  </h3>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">KOL 默认分销 (Dist)</label>
                        <input 
                          type="number" step="0.01"
                          value={rewardRates?.kol_dist_default || 0.15}
                          onChange={(e) => setRewardRates({...rewardRates!, kol_dist_default: parseFloat(e.target.value)})}
                          className="w-full bg-gray-50 border-none rounded-xl p-3 font-bold"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">KOL 默认粉丝 (Fan)</label>
                        <input 
                          type="number" step="0.01"
                          value={rewardRates?.kol_fan_default || 0.05}
                          onChange={(e) => setRewardRates({...rewardRates!, kol_fan_default: parseFloat(e.target.value)})}
                          className="w-full bg-gray-50 border-none rounded-xl p-3 font-bold"
                        />
                      </div>
                    </div>
                    <div className="pt-4 border-t border-gray-50">
                      <p className="text-[10px] font-black text-gray-300 uppercase mb-4 tracking-widest">普通用户等级奖励 (Referral)</p>
                      <div className="grid grid-cols-3 gap-3">
                        {['silver', 'gold', 'platinum'].map((tier) => (
                          <div key={tier}>
                            <label className="text-[9px] font-black text-gray-400 uppercase block mb-1">{tier}</label>
                            <input 
                              type="number" step="0.001"
                              value={(rewardRates as any)?.[`${tier}_rate`] || 0.01}
                              onChange={(e) => setRewardRates({...rewardRates!, [`${tier}_rate`]: parseFloat(e.target.value)} as any)}
                              className="w-full bg-gray-50 border-none rounded-xl p-2 text-xs font-bold"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                    <button 
                      onClick={() => rewardRates && handleUpdateRewardRates(rewardRates)}
                      className="w-full py-4 bg-purple-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-purple-700 transition-all shadow-xl shadow-purple-600/10"
                    >
                      保存奖励比例
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default AdminDashboard;
