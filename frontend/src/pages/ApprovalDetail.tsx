import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { actionsApi } from '../services/api';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { StatusBadge } from '../components/StatusBadge';
import { ArrowLeft, CheckCircle2, XCircle, Loader2, DollarSign, Copy, ShieldCheck } from 'lucide-react';
import type { ProposedAction } from '../types';

export function ApprovalDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [action, setAction] = useState<ProposedAction | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [confirmLoading, setConfirmLoading] = useState(false);

  useEffect(() => {
    if (id) fetchAction();
  }, [id]);

  const fetchAction = async () => {
    try {
      const response = await actionsApi.get(id!);
      setAction(response.data);
    } catch (error) {
      console.error('Failed to fetch action:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!action) return;
    setConfirmLoading(true);
    try {
      await actionsApi.approve(action.id, true);
      await fetchAction();
    } catch (error) {
      console.error('Approval failed:', error);
      alert('Approval failed. The payment may no longer be eligible.');
    } finally {
      setConfirmLoading(false);
    }
  };

  const handleReject = async () => {
    if (!action || !confirm('Reject this action?')) return;
    setConfirmLoading(true);
    try {
      await actionsApi.reject(action.id);
      await fetchAction();
    } catch (error) {
      console.error('Rejection failed:', error);
    } finally {
      setConfirmLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-gray-200 dark:bg-gray-700 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (!action) {
    return (
      <div className="text-center py-12 text-gray-500 dark:text-gray-400">
        <ShieldCheck className="w-12 h-12 mx-auto mb-2 opacity-50" />
        <p>Action not found</p>
        <button onClick={() => navigate('/approvals')} className="mt-4 text-primary-600 hover:underline text-sm">
          Back to Approvals
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/approvals')} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
          <ArrowLeft className="w-5 h-5 text-gray-500" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-primary-600" />
            Action Detail
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">Review and approve or reject this proposed action</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Proposed {action.action_type}</CardTitle>
            <StatusBadge status={action.status} />
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Action ID" value={action.id} mono />
            <Field label="Investigation ID" value={action.investigation_id} mono />
            <Field label="Type" value={action.action_type} />
            <Field label="Status" value={action.status} />
            <div className="col-span-2">
              <Field label="Target Capture ID" value={action.target_capture_id} mono copyable />
            </div>
            <Field label="Amount">
              <span className="font-semibold text-gray-900 dark:text-white flex items-center gap-1">
                <DollarSign className="w-4 h-4" />
                {action.amount} {action.currency}
              </span>
            </Field>
            <Field label="Idempotency Key" value={action.idempotency_key} mono />
            <div className="col-span-2">
              <Field label="Reason" value={action.reason} />
            </div>
            <Field label="Proposed By" value={action.proposed_by} mono />
            <Field label="Approved By" value={action.approved_by || '—'} mono />
            <Field label="Approved At" value={action.approved_at ? new Date(action.approved_at).toLocaleString() : '—'} />
            <Field label="Executed At" value={action.executed_at ? new Date(action.executed_at).toLocaleString() : '—'} />
            {action.provider_request_id && (
              <Field label="Provider Request ID" value={action.provider_request_id} mono />
            )}
          </div>

          {Object.keys(action.outcome_json).length > 0 && (
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Outcome</p>
              <pre className="text-xs bg-gray-100 dark:bg-gray-700 p-3 rounded-lg overflow-x-auto max-h-48">
                {JSON.stringify(action.outcome_json, null, 2)}
              </pre>
            </div>
          )}

          {action.status === 'pending' && (
            <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={handleApprove}
                disabled={confirmLoading}
                className="flex-1 px-4 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {confirmLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Approve & Execute Refund
              </button>
              <button
                onClick={handleReject}
                disabled={confirmLoading}
                className="flex-1 px-4 py-3 border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 font-medium rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {confirmLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                Reject
              </button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ label, value, mono, copyable, children }: { label: string; value?: string; mono?: boolean; copyable?: boolean; children?: React.ReactNode }) {
  return (
    <div>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-0.5">{label}</p>
      {children || (
        <div className="flex items-center gap-1">
          <p className={`text-sm text-gray-900 dark:text-white ${mono ? 'font-mono' : ''}`}>{value || '—'}</p>
          {copyable && value && (
            <button onClick={() => navigator.clipboard.writeText(value)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
              <Copy className="w-3 h-3 text-gray-400" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}