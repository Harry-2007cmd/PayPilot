import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { investigationsApi } from '../services/api';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { StatusBadge } from '../components/StatusBadge';
import { Loader2, AlertTriangle, ChevronLeft, ArrowRight, Sparkles, ExternalLink } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { clsx } from 'clsx';

interface InvestigationDetail {
  id: string;
  merchant_id: string;
  created_by: string;
  issue_type: string;
  status: string;
  title: string;
  order_id: string | null;
  payment_attempt_id: string | null;
  priority: string;
  opened_at: string;
  resolved_at: string | null;
  findings: any[];
}

export function InvestigationDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [investigation, setInvestigation] = useState<InvestigationDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [runLoading, setRunLoading] = useState(false);

  useEffect(() => {
    if (id) fetchInvestigation();
  }, [id]);

  const fetchInvestigation = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await investigationsApi.get(id!);
      setInvestigation(response.data);
    } catch (err) {
      console.error('Failed to fetch investigation:', err);
      setError('Failed to load investigation');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRun = async () => {
    if (!id) return;
    setRunLoading(true);
    try {
      const response = await investigationsApi.run(id);
      setInvestigation(prev => prev ? { ...prev, findings: response.data.findings } : null);
    } catch (err) {
      console.error('Failed to run investigation:', err);
      alert('Investigation failed. Please try again.');
    } finally {
      setRunLoading(false);
    }
  };

  const issueTypeColors = {
    amount_mismatch: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    currency_mismatch: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    status_mismatch: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    duplicate_event: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
    failed_checkout: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    unmatched_import: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    refund_inconsistency: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  };

  const priorityColors = {
    critical: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    high: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    medium: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
    low: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4" />
        <div className="h-48 bg-gray-200 dark:bg-gray-700 rounded" />
      </div>
    );
  }

  if (error || !investigation) {
    return (
      <div className="space-y-4 text-center py-12">
        <AlertTriangle className="w-16 h-16 mx-auto text-red-500" />
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Investigation not found</h2>
        <p className="text-gray-500 dark:text-gray-400">{error || 'Investigation does not exist'}</p>
        <button onClick={() => navigate('/investigations')} className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
          Back to Investigations
        </button>
      </div>
    );
  }

  const inv = investigation;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/investigations')} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{inv.title}</h1>
              <span className={clsx(
                'inline-flex items-center px-3 py-1 rounded-full text-xs font-medium',
                issueTypeColors[inv.issue_type as keyof typeof issueTypeColors] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
              )}>
                {inv.issue_type.replace(/_/g, ' ')}
              </span>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{inv.id}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className={clsx(
            'inline-flex items-center px-3 py-1 rounded-full text-xs font-medium',
            priorityColors[inv.priority as keyof typeof priorityColors] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
          )}>
            {inv.priority.charAt(0).toUpperCase() + inv.priority.slice(1)}
          </span>
          <StatusBadge status={inv.status} />
        </div>
      </div>

      {/* Meta Grid */}
      <Card>
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Created</p>
              <p className="text-gray-900 dark:text-white">{formatDistanceToNow(new Date(inv.opened_at), { addSuffix: true })}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Resolved</p>
              <p className="text-gray-900 dark:text-white">{inv.resolved_at ? formatDistanceToNow(new Date(inv.resolved_at), { addSuffix: true }) : '—'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Order ID</p>
              <p className="text-gray-900 dark:text-white font-mono text-sm">{inv.order_id?.slice(0, 12) + '...' || '—'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Payment ID</p>
              <p className="text-gray-900 dark:text-white font-mono text-sm">{inv.payment_attempt_id?.slice(0, 12) + '...' || '—'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Findings */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Findings</CardTitle>
          <button
            onClick={handleRun}
            disabled={runLoading || inv.status === 'resolved'}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {runLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            Run AI Investigation
          </button>
        </CardHeader>
        <CardContent>
          {inv.findings.length === 0 ? (
            <div className="text-center py-8">
              <AlertTriangle className="w-12 h-12 mx-auto text-gray-400 mb-2" />
              <p className="text-gray-500 dark:text-gray-400">No findings yet. Run the AI investigation to analyze this case.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {inv.findings.map((finding: any, idx: number) => (
                <div key={idx} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <div className={clsx(
                      'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
                      finding.severity === 'high' ? 'bg-red-100 dark:bg-red-900/30' :
                      finding.severity === 'medium' ? 'bg-amber-100 dark:bg-amber-900/30' :
                      'bg-blue-100 dark:bg-blue-900/30'
                    )}>
                      <span className={clsx(
                        'text-xs font-bold',
                        finding.severity === 'high' ? 'text-red-600 dark:text-red-400' :
                        finding.severity === 'medium' ? 'text-amber-600 dark:text-amber-400' :
                        'text-blue-600 dark:text-blue-400'
                      )}>
                        {finding.severity.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 dark:text-white">{finding.summary}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 capitalize">{finding.type?.replace(/_/g, ' ') || 'Finding'}</p>
                      {finding.recommendation && (
                        <p className="text-sm text-primary-600 dark:text-primary-400 mt-2">{finding.recommendation}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      {inv.status !== 'resolved' && (
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => inv.order_id && navigate(`/payments/${inv.order_id}`)}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                <ExternalLink className="w-4 h-4" />
                View Order
              </button>
              <button
                onClick={() => inv.payment_attempt_id && navigate(`/payments/${inv.payment_attempt_id}`)}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                <ExternalLink className="w-4 h-4" />
                View Payment
              </button>
              <button
                onClick={() => navigate(`/ai-copilot?investigation_id=${inv.id}`)}
                className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
              >
                <Sparkles className="w-4 h-4" />
                Ask AI Copilot
              </button>
              <button
                onClick={() => navigate(`/approvals/new?investigation_id=${inv.id}&capture_id=${inv.payment_attempt_id || ''}`)}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
              >
                <ArrowRight className="w-4 h-4" />
                Propose Refund
              </button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}