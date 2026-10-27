import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { actionsApi } from '../services/api';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { StatusBadge } from '../components/StatusBadge';
import { ShieldCheck, CheckCircle2, XCircle, DollarSign, Copy, ExternalLink, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { clsx } from 'clsx';
import type { ProposedAction } from '../types';

export function Approvals() {
  const [searchParams] = useSearchParams();
  const [actions, setActions] = useState<ProposedAction[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState({ status: '' });
  const [selectedAction, setSelectedAction] = useState<ProposedAction | null>(null);
  const [confirmLoading, setConfirmLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchActions();
  }, [page, filters]);

  const fetchActions = async () => {
    setIsLoading(true);
    try {
      const response = await actionsApi.listProposed({ page, page_size: pageSize, status: filters.status || undefined });
      setActions(response.data.items);
      setTotal(response.data.total);
    } catch (error) {
      console.error('Failed to fetch proposed actions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (action: ProposedAction) => {
    setConfirmLoading(action.id);
    try {
      await actionsApi.approve(action.id, true);
      fetchActions();
      setSelectedAction(null);
    } catch (error) {
      console.error('Failed to approve:', error);
      alert('Approval failed. Please try again.');
    } finally {
      setConfirmLoading(null);
    }
  };

  const handleReject = async (action: ProposedAction) => {
    if (!confirm('Are you sure you want to reject this action?')) return;
    setConfirmLoading(action.id);
    try {
      await actionsApi.reject(action.id);
      fetchActions();
      setSelectedAction(null);
    } catch (error) {
      console.error('Failed to reject:', error);
      alert('Rejection failed. Please try again.');
    } finally {
      setConfirmLoading(null);
    }
  };

  const handleCreateFromParams = async () => {
    const captureId = searchParams.get('capture_id');
    const amount = searchParams.get('amount');
    const currency = searchParams.get('currency');
    const investigationId = searchParams.get('investigation_id');

    if (captureId && amount && currency && investigationId) {
      // Check if already exists
      const existing = actions.find(a => a.target_capture_id === captureId && a.status === 'pending');
      if (!existing) {
        try {
          await actionsApi.create({
            investigation_id: investigationId,
            action_type: 'refund',
            target_capture_id: captureId,
            currency,
            amount: parseFloat(amount),
            reason: 'Refund requested from payment detail',
            idempotency_key: `refund-${captureId}-${investigationId}`,
          });
          fetchActions();
        } catch (error) {
          console.error('Failed to create action:', error);
        }
      }
    }
  };

  useEffect(() => {
    handleCreateFromParams();
  }, [searchParams]);

  if (isLoading && actions.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Approvals</h1>
            <p className="text-gray-500 dark:text-gray-400">Review and approve proposed actions</p>
          </div>
        </div>
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-gray-200 dark:bg-gray-700 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-primary-600" />
            Approvals
          </h1>
          <p className="text-gray-500 dark:text-gray-400">Review and approve proposed actions</p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4 pb-2">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Status:</label>
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">All</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="executing">Executing</option>
                <option value="executed">Executed</option>
                <option value="failed">Failed</option>
              </select>
            </div>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {total} total • {actions.filter(a => a.status === 'pending').length} pending
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Actions List */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Action</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Capture ID</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Reason</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Proposed</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {actions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                      <ShieldCheck className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>No proposed actions</p>
                    </td>
                  </tr>
                ) : (
                  actions.map((action) => (
                    <tr key={action.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-6 py-4">
                        <span className={clsx(
                          'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium',
                          action.action_type === 'refund' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300' :
                          'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                        )}>
                          {action.action_type}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-mono text-sm text-gray-900 dark:text-white">
                        {action.target_capture_id.slice(0, 12)}...
                      </td>
                      <td className="px-6 py-4 font-semibold text-gray-900 dark:text-white">
                        {action.amount} {action.currency}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300 max-w-xs truncate">
                        {action.reason}
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={action.status} />
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                        {action.approved_at
                          ? formatDistanceToNow(new Date(action.approved_at), { addSuffix: true })
                          : '—'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setSelectedAction(action)}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-gray-500 dark:text-gray-400"
                            title="View Details"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </button>
                          {action.status === 'pending' && (
                            <>
                              <button
                                onClick={() => handleApprove(action)}
                                disabled={confirmLoading === action.id}
                                className="px-3 py-1.5 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                              >
                                {confirmLoading === action.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                                Approve
                              </button>
                              <button
                                onClick={() => handleReject(action)}
                                disabled={confirmLoading === action.id}
                                className="px-3 py-1.5 border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 text-sm font-medium rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                              >
                                {confirmLoading === action.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <XCircle className="w-3 h-3" />}
                                Reject
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {total > pageSize && (
            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, total)} of {total}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1}
                  className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage(page + 1)}
                  disabled={page * pageSize >= total}
                  className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Action Detail Modal */}
      {selectedAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setSelectedAction(null)}>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <CardHeader className="flex flex-row items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <CardTitle>Action Details</CardTitle>
              <button onClick={() => setSelectedAction(null)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
                <XCircle className="w-5 h-5" />
              </button>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Action ID</p>
                  <p className="font-mono text-sm text-gray-900 dark:text-white">{selectedAction.id}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Type</p>
                  <p className="font-medium text-gray-900 dark:text-white capitalize">{selectedAction.action_type}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Capture ID</p>
                  <div className="flex items-center gap-2">
                    <p className="font-mono text-sm text-gray-900 dark:text-white">{selectedAction.target_capture_id}</p>
                    <button onClick={() => copyToClipboard(selectedAction.target_capture_id)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
                      <Copy className="w-4 h-4 text-gray-400" />
                    </button>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Amount</p>
                  <p className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <DollarSign className="w-4 h-4" />
                    {selectedAction.amount} {selectedAction.currency}
                  </p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Reason</p>
                  <p className="text-gray-900 dark:text-white">{selectedAction.reason}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Status</p>
                  <StatusBadge status={selectedAction.status} />
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Idempotency Key</p>
                  <p className="font-mono text-xs text-gray-900 dark:text-white">{selectedAction.idempotency_key}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Outcome</p>
                  <pre className="text-xs bg-gray-100 dark:bg-gray-700 p-3 rounded overflow-x-auto max-h-40">
                    {JSON.stringify(selectedAction.outcome_json, null, 2)}
                  </pre>
                </div>
              </div>

              {selectedAction.status === 'pending' && (
                <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <button
                    onClick={() => handleApprove(selectedAction!)}
                    disabled={confirmLoading === selectedAction.id}
                    className="flex-1 px-4 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {confirmLoading === selectedAction.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    Approve & Execute Refund
                  </button>
                  <button
                    onClick={() => handleReject(selectedAction!)}
                    disabled={confirmLoading === selectedAction.id}
                    className="flex-1 px-4 py-3 border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 font-medium rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {confirmLoading === selectedAction.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                    Reject
                  </button>
                </div>
              )}
            </CardContent>
          </div>
        </div>
      )}
    </div>
  );
}

const copyToClipboard = (text: string) => {
  navigator.clipboard.writeText(text);
};