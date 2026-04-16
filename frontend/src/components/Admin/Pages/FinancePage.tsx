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