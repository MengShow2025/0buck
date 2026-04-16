# Admin Dashboard Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate React Router and Shadcn UI into the existing frontend to serve a robust Admin Dashboard without breaking the current C-end chat experience.

**Architecture:** 
Wrap the main application in a `<BrowserRouter>` inside `main.tsx`. Use a top-level route split where `/admin/*` loads an `<AdminLayout>` (with sidebar) and `/` loads the existing `<MainApp>`.

**Tech Stack:** React, TypeScript, React Router DOM, Tailwind CSS, Lucide React

---

### Task 1: Install Dependencies and Initialize Router

**Files:**
- Modify: `frontend/package.json`
- Modify: `frontend/src/main.tsx`
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: Install React Router DOM**

Run: `cd frontend && npm install react-router-dom @types/react-router-dom`
Expected: Successfully installs react-router-dom v6+.

- [ ] **Step 2: Update `main.tsx` with Router**

Modify `frontend/src/main.tsx` to wrap `<App />` in `<BrowserRouter>`:
```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';
import { AppProvider } from './components/VCC/AppContext';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <AppProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </AppProvider>
  </React.StrictMode>
);
```

- [ ] **Step 3: Update `App.tsx` to handle routing**

Modify `frontend/src/App.tsx` (around line 250):
```tsx
import { Routes, Route, Navigate } from 'react-router-dom';

// ... (keep MainApp definition exactly as is) ...

// A placeholder for the Admin section
const AdminPlaceholder = () => (
  <div className="p-8">
    <h1 className="text-2xl font-bold">Admin Dashboard</h1>
    <p>Coming soon...</p>
  </div>
);

export default function App() {
  return (
    <Routes>
      {/* Existing C-end Application */}
      <Route path="/" element={<MainApp />} />
      <Route path="/diagram" element={<ArchitectureDiagram />} />
      
      {/* New B-end Admin Dashboard */}
      <Route path="/admin/*" element={<AdminPlaceholder />} />
      
      {/* Fallback to main app */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
```

- [ ] **Step 4: Run build to verify types**

Run: `cd frontend && npm run build`
Expected: Build passes without errors.

- [ ] **Step 5: Commit**

```bash
git add frontend/package.json frontend/package-lock.json frontend/src/main.tsx frontend/src/App.tsx
git commit -m "feat(frontend): integrate react-router-dom for admin route splitting"
```

### Task 2: Scaffold Admin Layout Component

**Files:**
- Create: `frontend/src/components/Admin/Layout/AdminLayout.tsx`
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: Create AdminLayout**

Create `frontend/src/components/Admin/Layout/AdminLayout.tsx`:
```tsx
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
```

- [ ] **Step 2: Connect AdminLayout in App.tsx**

Modify `frontend/src/App.tsx` (replace the `AdminPlaceholder` with `AdminLayout`):
```tsx
import { AdminLayout } from './components/Admin/Layout/AdminLayout';

// ...

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<MainApp />} />
      <Route path="/diagram" element={<ArchitectureDiagram />} />
      <Route path="/admin/*" element={<AdminLayout />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
```

- [ ] **Step 3: Run build to verify types**

Run: `cd frontend && npm run build`
Expected: Build passes.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/Admin/Layout/AdminLayout.tsx frontend/src/App.tsx
git commit -m "feat(frontend): scaffold admin dashboard layout and nested routing"
```
EOF