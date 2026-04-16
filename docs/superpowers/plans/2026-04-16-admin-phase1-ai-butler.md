# Admin AI Butler Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the AI Butler Configuration page (`/admin/ai`) to fetch and update `PersonaTemplate` records and view AI usage stats.

**Architecture:** 
1. Create a `Card`, `Button`, `Input`, `Textarea` and `Badge` component in `frontend/src/components/Admin/ui/` using raw Tailwind (avoiding shadcn init conflicts with Tailwind v4 for now).
2. Add API methods to `frontend/src/services/api.ts` to fetch and update `/admin/ai/persona-templates` and fetch `/admin/ai/usage-stats`.
3. Create `AIPersonaPage.tsx` and wire it up to `AdminLayout.tsx`.

**Tech Stack:** React, Tailwind CSS, Axios

---

### Task 1: Create Admin UI Primitives

**Files:**
- Create: `frontend/src/components/Admin/ui/Card.tsx`
- Create: `frontend/src/components/Admin/ui/Button.tsx`
- Create: `frontend/src/components/Admin/ui/Input.tsx`
- Create: `frontend/src/components/Admin/ui/Textarea.tsx`

- [ ] **Step 1: Write Card Component**

Create `frontend/src/components/Admin/ui/Card.tsx`:
```tsx
import React from 'react';

export const Card = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden ${className}`}>
    {children}
  </div>
);

export const CardHeader = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`px-6 py-4 border-b border-gray-100 ${className}`}>{children}</div>
);

export const CardTitle = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <h3 className={`text-lg font-bold text-gray-900 ${className}`}>{children}</h3>
);

export const CardContent = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`p-6 ${className}`}>{children}</div>
);
```

- [ ] **Step 2: Write Button Component**

Create `frontend/src/components/Admin/ui/Button.tsx`:
```tsx
import React from 'react';

export const Button = ({ children, variant = 'primary', className = '', ...props }: any) => {
  const baseStyle = "inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-lg transition-colors focus:outline-none disabled:opacity-50 disabled:pointer-events-none";
  const variants = {
    primary: "bg-gray-900 text-white hover:bg-gray-800",
    secondary: "bg-gray-100 text-gray-900 hover:bg-gray-200",
    outline: "border border-gray-200 text-gray-900 hover:bg-gray-50",
    danger: "bg-red-600 text-white hover:bg-red-700"
  };
  return (
    <button className={`${baseStyle} ${variants[variant as keyof typeof variants]} ${className}`} {...props}>
      {children}
    </button>
  );
};
```

- [ ] **Step 3: Write Input and Textarea**

Create `frontend/src/components/Admin/ui/Input.tsx`:
```tsx
import React from 'react';

export const Input = ({ className = '', ...props }: any) => (
  <input className={`flex h-10 w-full rounded-md border border-gray-300 bg-transparent px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50 ${className}`} {...props} />
);
```

Create `frontend/src/components/Admin/ui/Textarea.tsx`:
```tsx
import React from 'react';

export const Textarea = ({ className = '', ...props }: any) => (
  <textarea className={`flex min-h-[80px] w-full rounded-md border border-gray-300 bg-transparent px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50 ${className}`} {...props} />
);
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/Admin/ui/
git commit -m "feat(admin): add core UI primitive components"
```

### Task 2: Add API Endpoints

**Files:**
- Modify: `frontend/src/services/api.ts`

- [ ] **Step 1: Add Admin API methods**

Modify `frontend/src/services/api.ts` (add inside a new `export const adminApi = { ... }` block at the bottom):
```typescript
export const adminApi = {
  getPersonaTemplates: () => api.get('/admin/ai/persona-templates'),
  updatePersonaTemplate: (id: string, data: any) => api.post('/admin/ai/persona-templates', { id, ...data }),
  getUsageStats: () => api.get('/admin/ai/usage-stats'),
};
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/services/api.ts
git commit -m "feat(admin): add AI admin API endpoints"
```

### Task 3: Build AI Butler Page

**Files:**
- Create: `frontend/src/components/Admin/Pages/AIPersonaPage.tsx`
- Modify: `frontend/src/components/Admin/Layout/AdminLayout.tsx`

- [ ] **Step 1: Write AIPersonaPage component**

Create `frontend/src/components/Admin/Pages/AIPersonaPage.tsx`:
```tsx
import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { adminApi } from '../../../services/api';
import { Save, RefreshCw } from 'lucide-react';

export const AIPersonaPage = () => {
  const [templates, setTemplates] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [tplRes, statRes] = await Promise.all([
        adminApi.getPersonaTemplates(),
        adminApi.getUsageStats().catch(() => ({ data: {} })) // optional fallback
      ]);
      if (tplRes.data?.status === 'success') {
        setTemplates(tplRes.data.data || []);
      }
      if (statRes.data?.status === 'success') {
        setStats(statRes.data.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSave = async (tpl: any) => {
    setSaving(tpl.id);
    try {
      await adminApi.updatePersonaTemplate(tpl.id, {
        name: tpl.name,
        system_prompt: tpl.system_prompt,
        capabilities: tpl.capabilities
      });
      alert('Saved successfully!');
    } catch (e) {
      alert('Error saving template');
    } finally {
      setSaving(null);
    }
  };

  const updateTemplate = (id: string, field: string, value: string) => {
    setTemplates(prev => prev.map(t => t.id === id ? { ...t, [field]: value } : t));
  };

  if (loading) return <div className="p-8">Loading AI config...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-black text-gray-900">AI Butler Configuration</h2>
        <Button onClick={fetchData} variant="outline"><RefreshCw className="w-4 h-4 mr-2" /> Refresh</Button>
      </div>

      {stats && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          <Card><CardContent className="p-4">
            <div className="text-sm text-gray-500 font-bold">Total Tokens</div>
            <div className="text-2xl font-black">{stats.total_tokens || 0}</div>
          </CardContent></Card>
          <Card><CardContent className="p-4">
            <div className="text-sm text-gray-500 font-bold">Total Sessions</div>
            <div className="text-2xl font-black">{stats.total_sessions || 0}</div>
          </CardContent></Card>
        </div>
      )}

      <div className="space-y-4">
        {templates.map(tpl => (
          <Card key={tpl.id}>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Template: {tpl.template_id}</CardTitle>
              <Button 
                onClick={() => handleSave(tpl)} 
                disabled={saving === tpl.id}
              >
                <Save className="w-4 h-4 mr-2" /> 
                {saving === tpl.id ? 'Saving...' : 'Save Changes'}
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Name</label>
                <Input 
                  value={tpl.name} 
                  onChange={(e: any) => updateTemplate(tpl.id, 'name', e.target.value)} 
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">System Prompt</label>
                <Textarea 
                  value={tpl.system_prompt} 
                  onChange={(e: any) => updateTemplate(tpl.id, 'system_prompt', e.target.value)}
                  className="min-h-[200px] font-mono text-xs"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Capabilities (JSON Array)</label>
                <Input 
                  value={JSON.stringify(tpl.capabilities || [])} 
                  onChange={(e: any) => {
                    try {
                      const parsed = JSON.parse(e.target.value);
                      updateTemplate(tpl.id, 'capabilities', parsed);
                    } catch(err) { /* ignore invalid JSON while typing */ }
                  }} 
                />
              </div>
            </CardContent>
          </Card>
        ))}
        {templates.length === 0 && <p className="text-gray-500">No persona templates found in database.</p>}
      </div>
    </div>
  );
};
```

- [ ] **Step 2: Connect to AdminLayout**

Modify `frontend/src/components/Admin/Layout/AdminLayout.tsx` (import and replace `<Route path="/ai" />`):
```tsx
// add import at top
import { AIPersonaPage } from '../Pages/AIPersonaPage';

// replace Route in main
<Route path="/ai" element={<AIPersonaPage />} />
```

- [ ] **Step 3: Run build to verify types**

Run: `cd frontend && npm run build`

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/Admin/Pages/AIPersonaPage.tsx frontend/src/components/Admin/Layout/AdminLayout.tsx
git commit -m "feat(admin): build AI persona configuration page"
```
EOF