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