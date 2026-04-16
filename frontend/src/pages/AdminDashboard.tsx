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
  title_en: string;
  product_id_1688: string;
  cost_cny: number;
  comp_price_usd: number;
  estimated_sale_price: number;
  profit_ratio: number;
  status: string;
  discovery_source: string;
  discovery_evidence: any;
  source_platform?: string;
  source_url?: string;
  images?: string[];
  structural_data?: any;
  cj_landed_cost?: number;
  cj_sourcing_price?: number;
  cj_shipping_cost?: number;
}

const SummaryCard: React.FC<{ icon: React.ReactNode, title: string, value: string | number, color: string }> = ({ icon, title, value, color }) => (
  <div className="bg-white p-6 rounded-[24px] border border-gray-100 shadow-sm flex items-center gap-4">
    <div className={`p-3 rounded-2xl ${color} text-white`}>
      {icon}
    </div>
    <div>
      <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider">{title}</p>
      <p className="text-2xl font-black text-gray-900">{value}</p>
    </div>
  </div>
);

const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [summary, setSummary] = useState<Summary | null>(null);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [aiRules, setAiRules] = useState<AIRules | null>(null);
  const [personas, setPersonas] = useState<PersonaTemplate[]>([]);
  const [usageStats, setUsageStats] = useState<AIUsageStat[]>([]);
  const [wishes, setWishes] = useState<UserWish[]>([]);
  const [insights, setInsights] = useState<DemandInsight[]>([]);
  const [auditQueue, setAuditQueue] = useState<AuditCandidate[]>([]);
  const [pricingStrategy, setPricingStrategy] = useState<PricingStrategy>({
    sale_price_ratio: 0.6,
    compare_at_price_ratio: 1.5,
    amazon_weight: 0.8,
    ebay_weight: 0.2
  });
  const [talentApplications, setTalentApplications] = useState<TalentApplication[]>([]);
  const [rewardRates, setRewardRates] = useState<RewardRates | null>(null);
  
  // UI States
  const [loading, setLoading] = useState(true);
  const [isAuditMode, setIsAuditMode] = useState(true);
  const [selectedCandidateIds, setSelectedCandidateIds] = useState<number[]>([]);
  const [filterCategory, setFilterCategory] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const endpoints = [
        '/api/v1/admin/summary',
        '/api/v1/admin/coupons',
        '/api/v1/admin/ai/rules',
        '/api/v1/admin/ai/personas',
        '/api/v1/admin/ai/usage',
        '/api/v1/admin/wishes',
        '/api/v1/admin/demand/insights',
        '/api/v1/admin/sourcing/candidates?status=pending',
        '/api/v1/admin/pricing/strategy',
        '/api/v1/admin/talent/applications',
        '/api/v1/admin/reward/rates'
      ];

      const responses = await Promise.all(endpoints.map(ep => fetchWithAuth(ep).catch(e => null)));
      
      const data = await Promise.all(responses.map(async (res) => {
        if (res && res.ok) return await res.json();
        return null;
      }));

      const [sum, coup, rule, pers, usage, wish, insight, audit, price, talent, reward] = data;

      setSummary(sum || null);
      setCoupons(Array.isArray(coup) ? coup : []);
      setAiRules(rule || null);
      setPersonas(Array.isArray(pers) ? pers : []);
      setUsageStats(Array.isArray(usage) ? usage : []);
      setWishes(Array.isArray(wish) ? wish : []);
      setInsights(Array.isArray(insight) ? insight : []);
      setAuditQueue(Array.isArray(audit) ? audit : []);
      setPricingStrategy(price || {
        sale_price_ratio: 0.6,
        compare_at_price_ratio: 1.5,
        amazon_weight: 0.8,
        ebay_weight: 0.2
      });
      setTalentApplications(Array.isArray(talent) ? talent : []);
      setRewardRates(reward || null);
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: number) => {
    try {
      await fetchWithAuth(`/api/v1/admin/sourcing/candidates/${id}/approve`, { method: 'POST' });
      setAuditQueue(prev => prev.filter(c => c.id !== id));
    } catch (err) {
      console.error("Approve error:", err);
    }
  };

  const handleBatchApprove = async () => {
    try {
      await fetchWithAuth('/api/v1/admin/sourcing/candidates/batch-approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedCandidateIds })
      });
      setAuditQueue(prev => prev.filter(c => !selectedCandidateIds.includes(c.id)));
      setSelectedCandidateIds([]);
    } catch (err) {
      console.error("Batch approve error:", err);
    }
  };

  const toggleSelectAll = (ids: number[]) => {
    if (selectedCandidateIds.length === ids.length) {
      setSelectedCandidateIds([]);
    } else {
      setSelectedCandidateIds(ids);
    }
  };

  const toggleSelectCandidate = (id: number) => {
    setSelectedCandidateIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const filteredQueue = auditQueue.filter(c => {
    const matchesCat = filterCategory === 'ALL' || c.status === filterCategory;
    const matchesSearch = !searchQuery || 
      (c.title_en || c.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.source_pid || '').toString().includes(searchQuery);
    return matchesCat && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-[#F8F9FB] text-gray-900 font-sans selection:bg-blue-100">
      {/* Sidebar & Topbar omitted for brevity, focusing on the Audit Table */}
      
      <main className="p-8 max-w-7xl mx-auto">
        <div className="mb-10 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-black tracking-tight text-gray-900 flex items-center gap-3">
              <Shield size={36} className="text-blue-600" />
              0Buck 智理中控 (Brain Hub)
            </h1>
            <p className="text-gray-400 font-bold mt-2 flex items-center gap-2">
              <Activity size={16} className="text-green-500" />
              v5.3 Audit Protocol Active • {auditQueue.length} Candidates Pending
            </p>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={() => setIsAuditMode(!isAuditMode)}
              className={`px-4 py-2 text-xs font-black rounded-xl transition-all flex items-center gap-2 ${
                isAuditMode ? 'bg-orange-600 text-white shadow-lg shadow-orange-200' : 'bg-white text-gray-600 border border-gray-100'
              }`}
            >
              <Zap size={14} fill={isAuditMode ? "white" : "none"} />
              {isAuditMode ? '退出审计模式' : '审计模式 (Audit Mode)'}
            </button>
            <button 
              onClick={fetchData}
              className="p-3 bg-white border border-gray-100 text-gray-400 rounded-xl hover:text-blue-600 transition-colors"
            >
              <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* v5.3: Summary Statistics Grid */}
        <section className="mb-10">
          <h2 className="text-xl font-black text-gray-800 mb-6 flex items-center gap-3">
            <Activity size={20} className="text-blue-600" />
            SUMMARY STATISTICS
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            <SummaryCard icon={<Ticket size={24} />} title="Coupons" value={coupons.length} color="bg-blue-600 shadow-lg shadow-blue-100" />
            <SummaryCard icon={<Settings size={24} />} title="Rules" value={aiRules ? 1 : 0} color="bg-purple-600 shadow-lg shadow-purple-100" />
            <SummaryCard icon={<Activity size={24} />} title="Usage" value={usageStats.length} color="bg-green-600 shadow-lg shadow-green-100" />
            <SummaryCard icon={<Star size={24} />} title="Wishes" value={wishes.length} color="bg-amber-600 shadow-lg shadow-amber-100" />
            <SummaryCard icon={<TrendingUp size={24} />} title="Insights" value={insights.length} color="bg-cyan-600 shadow-lg shadow-cyan-100" />
            <SummaryCard icon={<Database size={24} />} title="Candidates" value={auditQueue.length} color="bg-indigo-600 shadow-lg shadow-indigo-100" />
            <SummaryCard icon={<Zap size={24} />} title="Strategy" value={pricingStrategy ? 1 : 0} color="bg-orange-600 shadow-lg shadow-orange-100" />
            <SummaryCard icon={<ShoppingBag size={24} />} title="Applications" value={talentApplications.length} color="bg-pink-600 shadow-lg shadow-pink-100" />
            <SummaryCard icon={<Coins size={24} />} title="Rates" value={rewardRates ? 1 : 0} color="bg-yellow-600 shadow-lg shadow-yellow-100" />
          </div>
        </section>

        {/* Audit Queue Section */}
        <section className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-8 border-b border-gray-50 flex items-center justify-between">
            <div className="flex items-center gap-6">
              <h2 className="text-xl font-black text-gray-800">候选池审核 (Candidate Pool)</h2>
              <div className="flex bg-gray-50 p-1 rounded-xl">
                {['ALL', 'HOT', 'TOPIC', 'DEMAND'].map(cat => (
                  <button
                    key={cat}
                    onClick={() => setFilterCategory(cat)}
                    className={`px-4 py-1.5 text-[10px] font-black rounded-lg transition-all ${
                      filterCategory === cat ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Activity size={12} className="text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="搜索标题或 1688 PID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-4 py-2 bg-gray-50 border-none text-[10px] font-black rounded-xl focus:ring-2 focus:ring-blue-500/20 w-64 transition-all"
                />
              </div>
            </div>
            {selectedCandidateIds.length > 0 && (
              <motion.button
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={handleBatchApprove}
                className="px-6 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-black shadow-lg shadow-blue-200 flex items-center gap-2"
              >
                <Layers size={16} />
                批量铺货 ({selectedCandidateIds.length})
              </motion.button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-gray-50/50 sticky top-0 z-10 backdrop-blur-md">
                <tr>
                  <th className="px-6 py-4">
                    <input 
                      type="checkbox" 
                      checked={selectedCandidateIds.length === filteredQueue.length && filteredQueue.length > 0}
                      onChange={() => toggleSelectAll(filteredQueue.map(i => i.id))}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </th>
                  <th className="px-6 py-4">ID/来源</th>
                  <th className="px-6 py-4">商品预览 (Preview)</th>
                  <th className="px-6 py-4">1688 采购 (CNY)</th>
                  <th className="px-6 py-4">CJ 报价 (USD)</th>
                  <th className="px-6 py-4">CJ 运费 (Freight)</th>
                  <th className="px-6 py-4">Amazon 参考 (Anchor)</th>
                  <th className="px-6 py-4">0Buck 售价 (0.6x)</th>
                  <th className="px-6 py-4">ROI</th>
                  <th className="px-6 py-4 text-right">决策控制</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredQueue.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-6 py-12 text-center text-gray-400 font-black italic">
                      该分类下没有待审核选品，请尝试切换分类或刷新同步。
                    </td>
                  </tr>
                ) : filteredQueue.map((item) => (
                  <tr key={item.id} className={`hover:bg-gray-50/50 transition-colors group ${selectedCandidateIds.includes(item.id) ? 'bg-blue-50/30' : ''}`}>
                    <td className="px-6 py-4">
                      <input 
                        type="checkbox" 
                        checked={selectedCandidateIds.includes(item.id)}
                        onChange={() => toggleSelectCandidate(item.id)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div className={`px-2 py-0.5 rounded-lg text-[8px] font-black uppercase w-fit ${
                        item.source_platform === 'ALIBABA' 
                          ? 'bg-amber-100 text-amber-700 border border-amber-200' 
                          : 'bg-orange-100 text-orange-700 border border-orange-200'
                      }`}>
                        {item.source_platform || '1688'}
                      </div>
                      <span className="text-[10px] font-black text-gray-300 block mt-1">#{item.id}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <img src={item.images?.[0]} className="w-10 h-10 rounded-lg object-cover bg-gray-50" alt="" />
                        <div>
                          <p className="font-black text-[12px] text-gray-800 line-clamp-1">{item.title_en || item.name}</p>
                          {item.source_url && (
                            <a href={item.source_url} target="_blank" rel="noreferrer" className="text-[10px] text-blue-500 font-bold flex items-center gap-1 mt-0.5">
                              <ExternalLink size={10} /> 访问采购源
                            </a>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-black text-gray-800">¥{item.cost_cny}</span>
                        <span className="text-[10px] text-gray-400 font-bold italic">≈ ${(item.cost_cny * 0.14).toFixed(2)} USD</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-black text-blue-600">
                          ${(item as any).cj_sourcing_price || 'Pending'}
                        </span>
                        <span className="text-[9px] text-gray-400 block font-bold uppercase tracking-tight">CJ Quote</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-black text-purple-600">
                          ${(item as any).cj_shipping_cost || '3.00'}
                        </span>
                        <span className="text-[9px] text-gray-400 block font-bold uppercase tracking-tight">Est. Freight</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-xs font-black text-orange-600">MSRP: ${(item as any).amazon_compare_at_price || 'N/A'}</span>
                        <span className="text-[10px] text-gray-400 font-bold">Sale: ${(item as any).amazon_price || 'N/A'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-md font-black text-blue-600">${(item.estimated_sale_price || 0).toFixed(2)}</span>
                      <span className="text-[9px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-full font-black ml-1 uppercase">0.6x Target</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className={`px-3 py-1 rounded-full text-[10px] font-black w-fit ${
                        item.profit_ratio >= 1.5 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {item.profit_ratio}x ROI
                      </div>
                      <span className="text-[8px] text-gray-400 block mt-1 font-bold italic">Based on Landed</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex flex-col gap-2 items-end">
                        <button 
                          onClick={() => handleApprove(item.id)}
                          className="px-6 py-2 bg-blue-600 text-white rounded-xl text-[10px] font-black hover:bg-blue-700 active:scale-95 transition-all flex items-center gap-2"
                        >
                          <Zap size={14} fill="white" />
                          一键铺货
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
};

export default AdminDashboard;
