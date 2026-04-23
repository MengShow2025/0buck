import React from 'react';
import { Routes, Route, NavLink, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Package, ShoppingCart, Wallet, Bot, LogOut } from 'lucide-react';
import { AIPersonaPage } from '../Pages/AIPersonaPage';
import { ProductsPage } from '../Pages/ProductsPage';
import { FinancePage } from '../Pages/FinancePage';
import { OrdersPage } from '../Pages/OrdersPage';
import { useSessionContext } from '../../VCC/contexts/SessionContext';
import { authApi } from '../../../services/api';
import { clearStoredAuthTokens } from '../../../services/authSession';

const AdminSidebar = () => {
    const { user, setUser } = useSessionContext();
  const navigate = useNavigate();

  const links = [
    { to: "/admin", icon: LayoutDashboard, label: "概览 (Overview)" },
    { to: "/admin/products", icon: Package, label: "商品管理" },
    { to: "/admin/orders", icon: ShoppingCart, label: "订单履约" },
    { to: "/admin/finance", icon: Wallet, label: "财务与大盘" },
    { to: "/admin/ai", icon: Bot, label: "AI 管家配置" },
  ];

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } catch {
      // Best-effort logout for admin area as well.
    } finally {
      clearStoredAuthTokens(window.localStorage);
      setUser(null);
      navigate('/admin/login');
    }
  };

  return (
    <div className="w-64 bg-gray-900 text-white flex flex-col h-full shrink-0">
      <div className="p-6">
        <h1 className="text-xl font-black tracking-tight text-amber-500">0Buck Admin</h1>
      </div>
      <nav className="flex-1 px-4 space-y-2">
        {links.map(link => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.to === "/admin"}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-bold ${
                isActive ? 'bg-white/10 text-white' : 'text-gray-400 hover:bg-white/5 hover:text-white'
              }`
            }
          >
            <link.icon className="w-5 h-5" />
            {link.label}
          </NavLink>
        ))}
      </nav>
      
      <div className="p-4 border-t border-white/10">
        <div className="mb-4 px-4">
          <div className="text-xs text-gray-500 font-bold uppercase">当前登录管理员</div>
          <div className="text-sm text-white font-bold truncate">{user?.email}</div>
        </div>
        <button 
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-3 w-full rounded-xl transition-all font-bold text-red-400 hover:bg-red-500/10"
        >
          <LogOut className="w-5 h-5" />
          退出登录
        </button>
      </div>
    </div>
  );
};

export const AdminLayout: React.FC = () => {
    const { user } = useSessionContext();
  const location = useLocation();

  // Protect the entire /admin/* route
  if (!user || user.user_type !== 'admin') {
    // Redirect to login page, but save the current location they were trying to go to
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  return (
    <div className="flex h-screen w-full bg-gray-50 overflow-hidden font-sans">
      <AdminSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-gray-200 h-16 shrink-0 flex items-center justify-between px-8">
          <span className="font-black text-gray-900 uppercase tracking-tighter">0Buck Truth Control Center</span>
          <div className="flex items-center gap-2">
            <span className="text-[10px] px-2 py-0.5 bg-amber-500 text-white rounded-full font-black uppercase tracking-widest">
              v8.5.8 INDUSTRIAL PRO
            </span>
          </div>
        </header>
        <main className="flex-1 overflow-auto p-8">
          <Routes>
            <Route path="/" element={<h2 className="text-2xl font-black text-gray-900">概览 (Overview)</h2>} />
            <Route path="/products" element={<ProductsPage />} />
            <Route path="/orders" element={<OrdersPage />} />
            <Route path="/finance" element={<FinancePage />} />
            <Route path="/ai" element={<AIPersonaPage />} />
          </Routes>
        </main>
      </div>
    </div>
  );
};
