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