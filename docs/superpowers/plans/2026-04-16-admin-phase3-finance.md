# Admin Orders & Finance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the Orders (`/admin/orders`) and Finance (`/admin/finance`) pages to track order statuses, payment failures, and system-wide KPI metrics.

**Architecture:** 
1. Add API methods to `frontend/src/services/api.ts` to fetch `/admin/finance/balance-sheet` and `/admin/dashboard/kpis`. Note: Orders might not have a direct bulk endpoint yet, we'll need to check or mock it.
2. Create `OrdersPage.tsx` and `FinancePage.tsx`.

**Tech Stack:** React, Tailwind CSS, Axios

---

### Task 1: Add API Endpoints

**Files:**
- Modify: `frontend/src/services/api.ts`

- [ ] **Step 1: Add Admin API methods**

Modify `frontend/src/services/api.ts` (add inside `adminApi`):
```typescript
  getKpis: () => api.get('/admin/dashboard/kpis'),
  getBalanceSheet: () => api.get('/admin/finance/balance-sheet'),
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/services/api.ts
git commit -m "feat(admin): add dashboard KPIs and finance API endpoints"
```

### Task 2: Build Finance & KPIs Page

**Files:**
- Create: `frontend/src/components/Admin/Pages/FinancePage.tsx`
- Modify: `frontend/src/components/Admin/Layout/AdminLayout.tsx`

- [ ] **Step 1: Write FinancePage component**

Create `frontend/src/components/Admin/Pages/FinancePage.tsx`:
```tsx
import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { adminApi } from '../../../services/api';
import { Wallet, TrendingUp, Users, ShoppingCart } from 'lucide-react';

export const FinancePage = () => {
  const [kpis, setKpis] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchKpis = async () => {
    setLoading(true);
    try {
      const res = await adminApi.getKpis();
      if (res.data?.status === 'success') {
        setKpis(res.data.kpis);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKpis();
  }, []);

  if (loading) return <div className="p-8">Loading metrics...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-black text-gray-900">Platform Finance & KPIs</h2>
      </div>

      {kpis && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-50 text-blue-500 rounded-xl flex items-center justify-center"><Users className="w-6 h-6" /></div>
                <div>
                  <div className="text-sm font-bold text-gray-500">Total Users</div>
                  <div className="text-2xl font-black">{kpis.total_users || 0}</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-emerald-50 text-emerald-500 rounded-xl flex items-center justify-center"><ShoppingCart className="w-6 h-6" /></div>
                <div>
                  <div className="text-sm font-bold text-gray-500">Active Plans</div>
                  <div className="text-2xl font-black">{kpis.active_plans || 0}</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-amber-50 text-amber-500 rounded-xl flex items-center justify-center"><Wallet className="w-6 h-6" /></div>
                <div>
                  <div className="text-sm font-bold text-gray-500">Total Points Issued</div>
                  <div className="text-2xl font-black">{kpis.total_points_issued || 0}</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-purple-50 text-purple-500 rounded-xl flex items-center justify-center"><TrendingUp className="w-6 h-6" /></div>
                <div>
                  <div className="text-sm font-bold text-gray-500">Pending Withdrawals</div>
                  <div className="text-2xl font-black">{kpis.pending_withdrawals || 0}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Recent Financial Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-gray-500 py-8 text-center border-2 border-dashed border-gray-100 rounded-xl">
            Detailed balance sheet integration coming in Phase 4.
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
```

- [ ] **Step 2: Connect to AdminLayout**

Modify `frontend/src/components/Admin/Layout/AdminLayout.tsx`:
```tsx
// add import
import { FinancePage } from '../Pages/FinancePage';

// replace Route in main
<Route path="/finance" element={<FinancePage />} />
```

- [ ] **Step 3: Run build to verify types**

Run: `cd frontend && npm run build`

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/Admin/Pages/FinancePage.tsx frontend/src/components/Admin/Layout/AdminLayout.tsx
git commit -m "feat(admin): build finance and KPI dashboard page"
```
EOF