import { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { investigationsApi } from '../services/api';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { Loader2, ChevronLeft, Sparkles } from 'lucide-react';

const issueTypes = [
  { value: 'status_mismatch', label: 'Status Mismatch' },
  { value: 'amount_mismatch', label: 'Amount Mismatch' },
  { value: 'currency_mismatch', label: 'Currency Mismatch' },
  { value: 'duplicate_event', label: 'Duplicate Event' },
  { value: 'unmatched_import', label: 'Unmatched Import' },
  { value: 'failed_checkout', label: 'Failed Checkout' },
  { value: 'refund_inconsistency', label: 'Refund Inconsistency' },
];

const priorities = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' },
];

export function InvestigationCreate() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [issueType, setIssueType] = useState(searchParams.get('issue_type') || 'amount_mismatch');
  const [priority, setPriority] = useState('high');
  const [orderId, setOrderId] = useState(searchParams.get('order_id') || '');
  const [paymentAttemptId, setPaymentAttemptId] = useState(searchParams.get('payment_id') || '');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsLoading(true);
    setError(null);
    try {
      const response = await investigationsApi.create({
        title,
        issue_type: issueType,
        priority,
        order_id: orderId || undefined,
        payment_attempt_id: paymentAttemptId || undefined,
      });
      navigate(`/investigations/${response.data.id}`);
    } catch (err) {
      console.error('Failed to create investigation:', err);
      setError('Failed to create investigation. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/investigations')} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Create Investigation</h1>
          <p className="text-gray-500 dark:text-gray-400">Open a new payment investigation</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Investigation Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="e.g., Amount mismatch on Order ORD-12345"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Issue Type *</label>
                <select
                  value={issueType}
                  onChange={(e) => setIssueType(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  {issueTypes.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Priority *</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  {priorities.map((p) => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Order ID (optional)</label>
                <input
                  type="text"
                  value={orderId}
                  onChange={(e) => setOrderId(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 font-mono text-sm"
                  placeholder="UUID"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Payment Attempt ID (optional)</label>
                <input
                  type="text"
                  value={paymentAttemptId}
                  onChange={(e) => setPaymentAttemptId(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 font-mono text-sm"
                  placeholder="UUID"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-gray-200 dark:border-gray-700 flex gap-3">
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                Create Investigation
              </button>
              <button
                type="button"
                onClick={() => navigate('/investigations')}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                <ChevronLeft className="w-4 h-4" />
                Cancel
              </button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
        <CardContent className="pt-4">
          <div className="flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
            <div className="text-sm text-blue-800 dark:text-blue-200">
              <p className="font-medium">Tip:</p>
              <p>After creating the investigation, you can run the AI agent to automatically analyze the order/payment mismatch and get evidence-backed findings.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}