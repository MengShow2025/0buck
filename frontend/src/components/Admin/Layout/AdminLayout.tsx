import React from 'react';
import { Routes, Route, NavLink } from 'react-router-dom';
import { LayoutDashboard, Package, ShoppingCart, Wallet, Bot } from 'lucide-react';

const AdminSidebar = () => {
  const links = [
    { to: "/admin", icon: LayoutDashboard, label: "Overview" },
    { to: "/admin/products", icon: Package, label: "Products" },
    { to: "/admin/orders", icon: ShoppingCart, label: "Orders" },
    { to: "/admin/finance", icon: Wallet, label: "Finance" },
    { to: "/admin/ai", icon: Bot, label: "AI Butler" },
  ];

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
    </div>
  );
};

export const AdminLayout: React.FC = () => {
  return (
    <div className="flex h-screen w-full bg-gray-50 overflow-hidden font-sans">
      <AdminSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-gray-200 h-16 shrink-0 flex items-center px-8">
          <span className="font-bold text-gray-500">Admin Dashboard Mode</span>
        </header>
        <main className="flex-1 overflow-auto p-8">
          <Routes>
            <Route path="/" element={<h2 className="text-2xl font-black text-gray-900">Overview</h2>} />
            <Route path="/products" element={<h2 className="text-2xl font-black text-gray-900">Products Management</h2>} />
            <Route path="/orders" element={<h2 className="text-2xl font-black text-gray-900">Order Fulfillment</h2>} />
            <Route path="/finance" element={<h2 className="text-2xl font-black text-gray-900">Finance & Rewards</h2>} />
            <Route path="/ai" element={<h2 className="text-2xl font-black text-gray-900">AI Butler Config</h2>} />
          </Routes>
        </main>
      </div>
    </div>
  );
};