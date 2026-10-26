import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ordersApi, paymentsApi, investigationsApi, webhooksApi } from '../services/api';
import { investigationsApi as invApi } from '../services/api';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { StatusBadge } from '../components/StatusBadge';
import {
  CreditCard,
  AlertTriangle,
  CheckCircle2,
  Clock,
  RefreshCw,
  TrendingUp,
  DollarSign,
  Search,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { clsx } from 'clsx';

interface DashboardMetrics {
  total_payments: number;
  captured_payments: number;
  failed_payments: number;
  open_investigations: number;
  mismatch_count: number;
  total_amount_captured: string;
}

export function Overview() {
  const { merchant } = useAuth();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [recentPayments, setRecentPayments] = useState<any[]>([]);
  const [recentInvestigations, setRecentInvestigations] = useState<any[]>([]);
  const [webhookStatus, setWebhookStatus] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [paymentsRes, investigationsRes, webhookRes] = await Promise.all([
        paymentsApi.list({ page_size: 5 }),
        invApi.list({ page_size: 5, status: 'open' }),
        webhooksApi.status(),
      ]);

      const payments = paymentsRes.data.items;
      const investigations = investigationsRes.data.items;

      // Calculate metrics
      const totalPayments = paymentsRes.data.total;
      const capturedPayments = payments.filter(p => p.status === 'captured').length;
      const failedPayments = payments.filter(p => ['failed', 'cancelled'].includes(p.status)).length;
      const openInvestigations = investigationsRes.data.total;
      const mismatchCount = investigations.filter(i =>
        ['amount_mismatch', 'currency_mismatch', 'status_mismatch'].includes(i.issue_type)
      ).length;
      const totalAmount = payments
        .filter(p => p.status === 'captured')
        .reduce((sum, p) => sum + parseFloat(p.amount), 0);

      setMetrics({
        total_payments: totalPayments,
        captured_payments: capturedPayments,
        failed_payments: failedPayments,
        open_investigations: openInvestigations,
        mismatch_count: mismatchCount,
        total_amount_captured: totalAmount.toFixed(2),
      });

      setRecentPayments(payments);
      setRecentInvestigations(investigations);
      setWebhookStatus(webhookRes.data);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const metricCards = [
    {
      title: 'Total Payments',
      value: metrics?.total_payments ?? 0,
      icon: CreditCard,
      color: 'text-primary-600 bg-primary-100 dark:bg-primary-900/30 dark:text-primary-400',
    },
    {
      title: 'Captured',
      value: metrics?.captured_payments ?? 0,
      icon: CheckCircle2,
      color: 'text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400',
    },
    {
      title: 'Failed/Cancelled',
      value: metrics?.failed_payments ?? 0,
      icon: AlertTriangle,
      color: 'text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400',
    },
    {
      title: 'Open Investigations',
      value: metrics?.open_investigations ?? 0,
      icon: Search,
      color: 'text-amber-600 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400',
    },
    {
      title: 'Amount Mismatches',
      value: metrics?.mismatch_count ?? 0,
      icon: DollarSign,
      color: 'text-purple-600 bg-purple-100 dark:bg-purple-900/30 dark:text-purple-400',
    },
    {
      title: 'Total Captured',
      value: `$${metrics?.total_amount_captured ?? '0.00'}`,
      icon: TrendingUp,
      color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400',
    },
  ];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {metricCards.map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="pt-6">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2" />
                <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4" />
              </CardContent>
            </Card>
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Overview</h1>
          <p className="text-gray-500 dark:text-gray-400">Payment health summary and recent activity</p>
        </div>
        <button
          onClick={fetchDashboardData}
          className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {metricCards.map((metric) => (
          <Card key={metric.title}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{metric.title}</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{metric.value}</p>
                </div>
                <div className={clsx('p-3 rounded-xl', metric.color)}>
                  <metric.icon className="w-6 h-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Payments */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Recent Payments</CardTitle>
          </CardHeader>
          <CardContent>
            {recentPayments.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <CreditCard className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No payments yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentPayments.map((payment) => (
                  <div
                    key={payment.id}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex items-center justify-center">
                        <CreditCard className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {payment.capture_id ? payment.capture_id.slice(0, 12) + '...' : payment.provider_order_id.slice(0, 12) + '...'}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {payment.amount} {payment.currency}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={payment.status} provenance={payment.provenance} />
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {formatDistanceToNow(new Date(payment.created_at), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Investigations */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Open Investigations</CardTitle>
          </CardHeader>
          <CardContent>
            {recentInvestigations.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <Search className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No open investigations</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentInvestigations.map((inv) => (
                  <div
                    key={inv.id}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className={clsx('w-10 h-10 rounded-lg flex items-center justify-center',
                        inv.priority === 'high' || inv.priority === 'critical'
                          ? 'bg-red-100 dark:bg-red-900/30'
                          : inv.priority === 'medium'
                          ? 'bg-amber-100 dark:bg-amber-900/30'
                          : 'bg-blue-100 dark:bg-blue-900/30'
                      )}>
                        <AlertTriangle className={clsx('w-5 h-5',
                          inv.priority === 'high' || inv.priority === 'critical'
                            ? 'text-red-600 dark:text-red-400'
                            : inv.priority === 'medium'
                            ? 'text-amber-600 dark:text-amber-400'
                            : 'text-blue-600 dark:text-blue-400'
                        )} />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{inv.title}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{inv.issue_type.replace(/_/g, ' ')}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={inv.status} />
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {formatDistanceToNow(new Date(inv.opened_at), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Webhook Health */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Webhook Health</CardTitle>
        </CardHeader>
        <CardContent>
          {webhookStatus ? (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">{webhookStatus.verified}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Verified</p>
              </div>
              <div className="text-center p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{webhookStatus.pending}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Pending</p>
              </div>
              <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">{webhookStatus.failed}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Failed</p>
              </div>
              <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <p className="text-2xl font-bold text-gray-600 dark:text-gray-400">{webhookStatus.duplicate}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Duplicates</p>
              </div>
              <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{webhookStatus.total_events}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Events</p>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <RefreshCw className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>Webhook status unavailable</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}