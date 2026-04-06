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
  Coins
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import WishingWellProgressBar from '../components/WishingWellProgressBar';

interface Summary {
  orders_today: number;
  profit_mtd: number;
  ids_conversion: { [key: string]: number };
  melting_count: number;
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
  title_en_preview: string;
  images: string[];
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
  const [meltedProducts, setMeltedProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchSummary();
    if (activeTab === 'ai_mgmt') fetchAIData();
    if (activeTab === 'coupons_mgmt') { fetchCoupons(); fetchAIRules(); }
    if (activeTab === 'persona_os') { fetchPersonaTemplates(); fetchAIUsageStats(); }
    if (activeTab === 'c2m_mgmt') { fetchWishes(); fetchInsights(); fetchC2MConfig(); }
    if (activeTab === 'sourcing') fetchAuditQueue();
    if (activeTab === 'melting') fetchMeltedQueue();
  }, [activeTab]);

  const fetchC2MConfig = async () => {
    try {
      const keys = ['C2M_ENABLED', 'C2M_VOTE_THRESHOLD', 'C2M_WISH_EXPIRY_HOURS'];
      const config: any = {};
      for (const k of keys) {
        const res = await fetch(`/api/v1/admin/config/global?key=${k}`);
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
      const res = await fetch('/api/v1/admin/c2m/wishes');
      setWishes(await res.json());
    } catch (e) { console.error(e); }
  };

  const fetchInsights = async () => {
    try {
      const res = await fetch('/api/v1/admin/c2m/insights');
      setInsights(await res.json());
    } catch (e) { console.error(e); }
  };

  const fetchAuditQueue = async () => {
    try {
      const res = await fetch('/api/v1/admin/sourcing/candidates?status=new');
      setAuditQueue(await res.json());
    } catch (e) { console.error(e); }
  };

  const fetchMeltedQueue = async () => {
    try {
      const res = await fetch('/api/v1/admin/melting/queue');
      setMeltedProducts(await res.json());
    } catch (e) { console.error(e); }
  };

  const handleApprove = async (id: number) => {
    if (!confirm(`确认同步并上架此候选商品吗？`)) return;
    try {
      const res = await fetch(`/api/v1/admin/sourcing/candidates/${id}/approve`, { method: 'POST' });
      const data = await res.json();
      if (data.status === 'success') {
        alert('上架成功！已同步至 Shopify 并备份到 Notion');
        fetchAuditQueue();
      } else {
        alert(`上架失败: ${data.detail || '未知错误'}`);
      }
    } catch (e) { alert('请求失败'); }
  };

  const handleReject = async (id: number) => {
    const reason = prompt('请输入拒绝原因:');
    if (!reason) return;
    try {
      const res = await fetch(`/api/v1/admin/sourcing/candidates/${id}/reject?reason=${encodeURIComponent(reason)}`, { method: 'POST' });
      if (res.ok) {
        alert('已拒绝并归档');
        fetchAuditQueue();
      }
    } catch (e) { alert('操作失败'); }
  };

  const fetchPersonaTemplates = async () => {
    try {
      const res = await fetch('/api/v1/admin/ai/persona-templates');
      setPersonaTemplates(await res.json());
    } catch (e) { console.error(e); }
  };

  const fetchAIUsageStats = async () => {
    try {
      const res = await fetch('/api/v1/admin/ai/usage-stats');
      setAIUsageStats(await res.json());
    } catch (e) { console.error(e); }
  };

  const handleUpdateTemplate = async (template: PersonaTemplate) => {
    try {
      await fetch('/api/v1/admin/ai/persona-templates', {
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
      const response = await fetch('/api/v1/admin/dashboard/kpis');
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
        fetch('/api/v1/admin/ai/contributions'),
        fetch('/api/v1/admin/ai/shield-audit')
      ]);
      setContributions(await contRes.json());
      setShieldAudit(await auditRes.json());
    } catch (error) {
      console.error('Failed to fetch AI data:', error);
    }
  };

  const fetchCoupons = async () => {
    try {
      const response = await fetch('/api/v1/admin/coupons');
      const data = await response.json();
      setCoupons(data);
    } catch (error) {
      console.error('Failed to fetch coupons:', error);
    }
  };

  const fetchAIRules = async () => {
    try {
      const response = await fetch('/api/v1/admin/config/ai-rules');
      const data = await response.json();
      setAIRules(data);
    } catch (error) {
      console.error('Failed to fetch AI rules:', error);
    }
  };

  const handleSyncCoupons = async () => {
    try {
      const res = await fetch('/api/v1/admin/coupons/sync');
      const data = await res.json();
      alert(`已同步 ${data.synced_count} 个优惠券`);
      fetchCoupons();
    } catch (error) {
      alert('同步失败');
    }
  };

  const handleAssignCategory = async (code: string, category: string, permission: string) => {
    try {
      await fetch(`/api/v1/admin/coupons/${code}/assign-category`, {
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

      await fetch('/api/v1/admin/config/global', {
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
    { label: '本月估算利润', value: `$${summary?.profit_mtd.toFixed(2) || '0.00'}`, icon: TrendingUp, color: 'green' },
    { label: '爆款策略覆盖', value: Object.keys(summary?.ids_conversion || {}).length, icon: Database, color: 'purple' },
    { label: '熔断预警', value: summary?.melting_count || 0, icon: Activity, color: 'red' }
  ];

  return (
    <div className="min-h-screen bg-[#F5F5F7] font-sans">
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

          <div className="mt-6 p-4 bg-gray-50 rounded-2xl border border-gray-100">
            <p className="text-[10px] uppercase font-black text-gray-400 mb-1 tracking-widest">v3.1 系统状态</p>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-xs font-bold">工业级运行中</span>
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
              <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
                <div className="p-6 border-b border-gray-50 flex items-center justify-between">
                  <h3 className="font-black text-lg">IDS 选品审核队列 (Following & Spy)</h3>
                  <div className="flex gap-2">
                    <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-xs font-black">待审核: {auditQueue.length}</span>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-gray-50 text-[10px] uppercase text-gray-400 font-black tracking-widest">
                      <tr>
                        <th className="px-6 py-4">商品名 / 策略</th>
                        <th className="px-6 py-4">成本 (CNY)</th>
                        <th className="px-6 py-4">预计售价</th>
                        <th className="px-6 py-4">利润比</th>
                        <th className="px-6 py-4 text-right">操作</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {auditQueue.map((item) => (
                        <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              {item.images && item.images.length > 0 && (
                                <img src={item.images[0]} alt="prod" className="w-10 h-10 rounded-lg object-cover bg-gray-100" />
                              )}
                              <div>
                                <p className="font-black text-sm">{item.name}</p>
                                <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                                  item.discovery_source === 'IDS_SPY' ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'
                                }`}>
                                  {item.discovery_source}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 font-bold text-gray-500">¥{item.cost_cny}</td>
                          <td className="px-6 py-4 font-black text-black">${item.estimated_sale_price?.toFixed(2) || 'N/A'}</td>
                          <td className="px-6 py-4">
                            <span className={`font-black ${item.profit_ratio >= 4.0 ? 'text-green-600' : 'text-orange-600'}`}>
                              {item.profit_ratio ? item.profit_ratio.toFixed(1) : 'N/A'}x
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right flex gap-2 justify-end">
                            <button 
                              onClick={() => handleReject(item.id)}
                              className="text-gray-400 hover:text-red-600 px-3 py-1.5 rounded-lg text-xs font-black transition-colors"
                            >
                              拒绝
                            </button>
                            <button 
                              onClick={() => handleApprove(item.id)}
                              className="bg-black text-white px-4 py-1.5 rounded-lg text-xs font-black hover:bg-gray-800 transition-colors"
                            >
                              批准并同步
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
                        <p className="text-xl font-black">${stat.cost_usd.toFixed(4)}</p>
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
                  <h3 className="font-black text-xl mb-1 tracking-tight">全局策略配置</h3>
                  <div className="space-y-3">
                    <div className="p-4 bg-white/10 rounded-2xl border border-white/5">
                      <p className="text-[10px] font-black uppercase text-white/30 tracking-widest mb-2">引流品利润率 (Traffic)</p>
                      <div className="flex items-center justify-between">
                        <span className="text-lg font-black">2.0x</span>
                        <button onClick={() => updateGlobalConfig('GLOBAL_TRAFFIC_MARKUP', 2.0)} className="text-xs font-black text-orange-500 uppercase">编辑</button>
                      </div>
                    </div>
                    <div className="p-4 bg-white/10 rounded-2xl border border-white/5">
                      <p className="text-[10px] font-black uppercase text-white/30 tracking-widest mb-2">利润品红线 (Profit)</p>
                      <div className="flex items-center justify-between">
                        <span className="text-lg font-black">4.0x</span>
                        <button onClick={() => updateGlobalConfig('GLOBAL_PROFIT_MARKUP', 4.0)} className="text-xs font-black text-orange-500 uppercase">编辑</button>
                      </div>
                    </div>
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
                            <td className="px-6 py-4 font-black text-green-600">${c.usd_saved.toFixed(2)}</td>
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
                        <th className="px-6 py-4 text-right">操作</th>
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
        </main>
      </div>
    </div>
  );
};

export default AdminDashboard;
