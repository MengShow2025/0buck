import React, { useState, useEffect } from 'react';
import { 
  Users, 
  ShoppingBag, 
  Wallet, 
  Database, 
  Activity, 
  ArrowLeft,
  ChevronRight,
  PlusCircle,
  History,
  TrendingUp,
  RefreshCw
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

interface Summary {
  users_count: number;
  orders_count: number;
  total_balance: number;
  products_count: number;
  recent_transactions: any[];
}

const AdminDashboard: React.FC = () => {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchSummary();
  }, []);

  const fetchSummary = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/v1/admin/summary');
      const data = await response.json();
      setSummary(data);
    } catch (error) {
      console.error('Failed to fetch admin summary:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const stats = [
    { label: '总用户数', value: summary?.users_count || 0, icon: Users, color: 'blue' },
    { label: '总订单量', value: summary?.orders_count || 0, icon: ShoppingBag, color: 'purple' },
    { label: '累计余额', value: `$${summary?.total_balance.toFixed(2) || '0.00'}`, icon: Wallet, color: 'orange' },
    { label: '已同步商品', value: summary?.products_count || 0, icon: Database, color: 'green' }
  ];

  return (
    <div className="min-h-screen bg-[#F5F5F7] font-sans">
      {/* Sidebar for Desktop / Header for Mobile */}
      <div className="flex flex-col lg:flex-row h-screen">
        <aside className="w-full lg:w-64 bg-white border-r border-gray-100 p-6 flex flex-col h-auto lg:h-full">
          <div className="flex items-center gap-2 mb-10">
            <Link to="/" className="p-2 hover:bg-gray-50 rounded-full transition-colors">
              <ArrowLeft size={20} />
            </Link>
            <h1 className="text-xl font-black tracking-tighter uppercase italic">业务运营 <span className="text-orange-600">中台</span></h1>
          </div>

          <nav className="space-y-2 flex-1">
            {[
              { id: 'overview', label: '运营概览', icon: Activity },
              { id: 'users', label: '用户与达人', icon: Users },
              { id: 'products', label: '库存管理', icon: Database },
              { id: 'rewards', label: '奖励配置', icon: History }
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

          <div className="mt-auto p-4 bg-gray-50 rounded-2xl border border-gray-100">
            <p className="text-[10px] uppercase font-black text-gray-400 mb-1 tracking-widest">系统运行状态</p>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-xs font-bold">API 运行正常</span>
            </div>
          </div>
        </aside>

        {/* Main Panel */}
        <main className="flex-1 overflow-y-auto p-6 lg:p-10">
          <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div>
              <h2 className="text-2xl font-black text-gray-900">0Buck 业务运营看板</h2>
              <p className="text-sm text-gray-500 font-medium">AI 电商业务实时运行状态</p>
            </div>
            <button 
              onClick={fetchSummary}
              className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl border border-gray-100 shadow-sm font-bold text-sm hover:bg-gray-50 transition-colors"
            >
              <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
              立即同步
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

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Recent Transactions Table */}
            <div className="lg:col-span-2 bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
              <div className="p-6 border-b border-gray-50 flex items-center justify-between">
                <h3 className="font-black text-lg flex items-center gap-2">
                  <TrendingUp size={20} className="text-orange-600" />
                  近期返现与交易记录
                </h3>
                <button className="text-xs font-black uppercase text-blue-600 tracking-tighter">查看全部</button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-gray-50 text-[10px] uppercase text-gray-400 font-black tracking-widest">
                    <tr>
                      <th className="px-6 py-4">用户</th>
                      <th className="px-6 py-4">类型</th>
                      <th className="px-6 py-4">金额</th>
                      <th className="px-6 py-4">状态</th>
                      <th className="px-6 py-4 text-right">日期</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {summary?.recent_transactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-4 font-bold text-sm">#{tx.user_id}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded-full text-[10px] font-black uppercase ${
                            tx.type === 'checkin' ? 'bg-orange-50 text-orange-600' : 'bg-blue-50 text-blue-600'
                          }`}>
                            {tx.type === 'checkin' ? '签到奖励' : tx.type}
                          </span>
                        </td>
                        <td className={`px-6 py-4 font-black text-sm ${tx.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {tx.amount > 0 ? '+' : ''}{tx.amount.toFixed(2)}
                        </td>
                        <td className="px-6 py-4">
                          <span className="flex items-center gap-1.5 text-xs font-bold text-gray-700">
                            <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                            {tx.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right text-xs font-medium text-gray-400">
                          {new Date(tx.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Quick Actions Panel */}
            <div className="bg-black rounded-3xl p-6 shadow-xl flex flex-col text-white gap-6">
              <div>
                <h3 className="font-black text-xl mb-1 tracking-tight">快速操作</h3>
                <p className="text-xs text-gray-400 font-medium italic">手动调整系统规则</p>
              </div>

              <div className="space-y-3">
                <button className="w-full flex items-center justify-between p-4 bg-white/10 hover:bg-white/15 rounded-2xl border border-white/5 transition-all text-left">
                  <div className="flex items-center gap-3">
                    <PlusCircle size={20} className="text-orange-500" />
                    <span className="font-bold text-sm">调整用户钱包</span>
                  </div>
                  <ChevronRight size={16} className="text-white/20" />
                </button>
                <button className="w-full flex items-center justify-between p-4 bg-white/10 hover:bg-white/15 rounded-2xl border border-white/5 transition-all text-left">
                  <div className="flex items-center gap-3">
                    <RefreshCw size={20} className="text-blue-500" />
                    <span className="font-bold text-sm">强制同步 Shopify</span>
                  </div>
                  <ChevronRight size={16} className="text-white/20" />
                </button>
                <button className="w-full flex items-center justify-between p-4 bg-white/10 hover:bg-white/15 rounded-2xl border border-white/5 transition-all text-left">
                  <div className="flex items-center gap-3">
                    <Users size={20} className="text-green-500" />
                    <span className="font-bold text-sm">审核达人申请</span>
                  </div>
                  <ChevronRight size={16} className="text-white/20" />
                </button>
              </div>

              <div className="mt-auto bg-white/5 rounded-2xl p-4 border border-white/5">
                <p className="text-[10px] font-black uppercase text-white/30 tracking-widest mb-3">营收预测</p>
                <div className="flex items-end gap-2 mb-2">
                  <span className="text-2xl font-black">$4,281.00</span>
                  <span className="text-xs text-green-500 font-black mb-1.5">+12.5%</span>
                </div>
                <div className="w-full bg-white/10 h-1.5 rounded-full">
                  <div className="bg-orange-600 h-full rounded-full" style={{ width: '70%' }}></div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminDashboard;
