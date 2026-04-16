# Admin Product Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the Product & Sourcing Management page (`/admin/products`) to list `candidate_products`, approve/reject them, and manage existing products.

**Architecture:** 
1. Create a `Table` and `Badge` component in `frontend/src/components/Admin/ui/`.
2. Add API methods to `frontend/src/services/api.ts` to fetch and update `/admin/sourcing/candidates`.
3. Create `ProductsPage.tsx` and wire it up to `AdminLayout.tsx`.

**Tech Stack:** React, Tailwind CSS, Axios

---

### Task 1: Create Admin UI Primitives (Table & Badge)

**Files:**
- Create: `frontend/src/components/Admin/ui/Table.tsx`
- Create: `frontend/src/components/Admin/ui/Badge.tsx`

- [ ] **Step 1: Write Table Component**

Create `frontend/src/components/Admin/ui/Table.tsx`:
```tsx
import React from 'react';

export const Table = ({ children, className = '' }: any) => (
  <div className={`w-full overflow-auto rounded-xl border border-gray-200 bg-white ${className}`}>
    <table className="w-full text-sm text-left">{children}</table>
  </div>
);

export const TableHeader = ({ children }: any) => <thead className="bg-gray-50 border-b border-gray-200">{children}</thead>;
export const TableRow = ({ children, className = '' }: any) => <tr className={`border-b border-gray-100 hover:bg-gray-50/50 ${className}`}>{children}</tr>;
export const TableHead = ({ children, className = '' }: any) => <th className={`h-12 px-4 text-left font-bold text-gray-500 ${className}`}>{children}</th>;
export const TableCell = ({ children, className = '' }: any) => <td className={`p-4 align-middle ${className}`}>{children}</td>;
export const TableBody = ({ children }: any) => <tbody>{children}</tbody>;
```

- [ ] **Step 2: Write Badge Component**

Create `frontend/src/components/Admin/ui/Badge.tsx`:
```tsx
import React from 'react';

export const Badge = ({ children, variant = 'default', className = '' }: any) => {
  const variants = {
    default: "bg-gray-100 text-gray-900",
    success: "bg-green-100 text-green-800",
    warning: "bg-amber-100 text-amber-800",
    danger: "bg-red-100 text-red-800",
    outline: "border border-gray-200 text-gray-900"
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${variants[variant as keyof typeof variants]} ${className}`}>
      {children}
    </span>
  );
};
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/Admin/ui/
git commit -m "feat(admin): add table and badge ui primitives"
```

### Task 2: Add API Endpoints

**Files:**
- Modify: `frontend/src/services/api.ts`

- [ ] **Step 1: Add Admin API methods**

Modify `frontend/src/services/api.ts` (add inside `adminApi`):
```typescript
  getCandidates: () => api.get('/admin/sourcing/candidates'),
  approveCandidate: (id: string) => api.post(`/admin/sourcing/candidates/${id}/approve`),
  rejectCandidate: (id: string) => api.post(`/admin/sourcing/candidates/${id}/reject`),
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/services/api.ts
git commit -m "feat(admin): add sourcing candidates API endpoints"
```

### Task 3: Build Products Page

**Files:**
- Create: `frontend/src/components/Admin/Pages/ProductsPage.tsx`
- Modify: `frontend/src/components/Admin/Layout/AdminLayout.tsx`

- [ ] **Step 1: Write ProductsPage component**

Create `frontend/src/components/Admin/Pages/ProductsPage.tsx`:
```tsx
import React, { useEffect, useState } from 'react';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '../ui/Table';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { adminApi } from '../../../services/api';
import { CheckCircle2, XCircle, ExternalLink } from 'lucide-react';

export const ProductsPage = () => {
  const [candidates, setCandidates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCandidates = async () => {
    setLoading(true);
    try {
      const res = await adminApi.getCandidates();
      if (res.data?.status === 'success') {
        setCandidates(res.data.candidates || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCandidates();
  }, []);

  const handleAction = async (id: string, action: 'approve' | 'reject') => {
    try {
      if (action === 'approve') await adminApi.approveCandidate(id);
      else await adminApi.rejectCandidate(id);
      fetchCandidates();
    } catch (e) {
      alert(`Failed to ${action} candidate`);
    }
  };

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'approved': return <Badge variant="success">Approved</Badge>;
      case 'rejected': return <Badge variant="danger">Rejected</Badge>;
      case 'pending': return <Badge variant="warning">Pending</Badge>;
      default: return <Badge variant="default">{status}</Badge>;
    }
  };

  if (loading) return <div className="p-8">Loading products...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-black text-gray-900">Sourcing Candidates</h2>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Title / Platform</TableHead>
            <TableHead>Supplier Info</TableHead>
            <TableHead>Score</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {candidates.length === 0 ? (
            <TableRow><TableCell colSpan={5} className="text-center py-8 text-gray-500">No candidates found.</TableCell></TableRow>
          ) : (
            candidates.map((item) => (
              <TableRow key={item.id}>
                <TableCell>
                  <div className="font-bold text-gray-900">{item.title || 'Unknown Item'}</div>
                  <div className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                    {item.platform}
                    {item.platform_url && (
                      <a href={item.platform_url} target="_blank" rel="noreferrer" className="text-blue-500 hover:underline inline-flex items-center">
                        <ExternalLink className="w-3 h-3 ml-0.5" />
                      </a>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-sm">{item.supplier_name}</div>
                  <div className="text-xs text-gray-500">Est. Price: ${item.estimated_cost_usd}</div>
                </TableCell>
                <TableCell>
                  <div className="font-mono text-sm">{item.ai_score}/100</div>
                </TableCell>
                <TableCell>
                  {getStatusBadge(item.status)}
                </TableCell>
                <TableCell>
                  {item.status === 'pending' && (
                    <div className="flex gap-2">
                      <Button variant="outline" className="h-8 px-2 text-green-600 border-green-200 hover:bg-green-50" onClick={() => handleAction(item.id, 'approve')}>
                        <CheckCircle2 className="w-4 h-4 mr-1" /> Approve
                      </Button>
                      <Button variant="outline" className="h-8 px-2 text-red-600 border-red-200 hover:bg-red-50" onClick={() => handleAction(item.id, 'reject')}>
                        <XCircle className="w-4 h-4 mr-1" /> Reject
                      </Button>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
};
```

- [ ] **Step 2: Connect to AdminLayout**

Modify `frontend/src/components/Admin/Layout/AdminLayout.tsx`:
```tsx
// add import
import { ProductsPage } from '../Pages/ProductsPage';

// replace Route in main
<Route path="/products" element={<ProductsPage />} />
```

- [ ] **Step 3: Run build to verify types**

Run: `cd frontend && npm run build`

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/Admin/Pages/ProductsPage.tsx frontend/src/components/Admin/Layout/AdminLayout.tsx
git commit -m "feat(admin): build sourcing candidate management page"
```
EOF