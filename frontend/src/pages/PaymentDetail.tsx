import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ordersApi, paymentsApi } from '../services/api';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { StatusBadge } from '../components/StatusBadge';
import { ArrowLeft, CreditCard, DollarSign, Clock, AlertTriangle, Copy, RefreshCw, CreditCard as CreditCardIcon } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { clsx } from 'clsx';
import { PROVENANCE_LABELS } from '../types';

interface PaymentTimelineEvent {
  event_time: string;
  event_type: string;
  source: string;
  status: string;
  details: Record<string, unknown>;
  provenance: string;
}

export function PaymentDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [payment, setPayment] = useState<any>(null);
  const [timeline, setTimeline] = useState<PaymentTimelineEvent[]>([]);
  const [order, setOrder] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (id) {
      fetchPaymentDetail();
    }
  }, [id]);

  const fetchPaymentDetail = async () => {
    setIsLoading(true);
    try {
      const [paymentRes, timelineRes] = await Promise.all([
        paymentsApi.get(id!),
        paymentsApi.timeline(id!),
      ]);
      setPayment(paymentRes.data);
      setTimeline(timelineRes.data.timeline);

      if (paymentRes.data.order_id) {
        const orderRes = await ordersApi.get(paymentRes.data.order_id);
        setOrder(orderRes.data);
      }
    } catch (error) {
      console.error('Failed to fetch payment detail:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="animate-pulse">
            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-48" />
          </div>
        </div>
      </div>
    );
  }

  if (!payment) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="w-12 h-12 mx-auto mb-2 text-gray-400" />
        <p className="text-gray-500 dark:text-gray-400">Payment not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Payment Detail</h1>
          <p className="text-gray-500 dark:text-gray-400">{payment.capture_id || payment.provider_order_id}</p>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Payment Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Status & Amount */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-primary-100 dark:bg-primary-900/30 rounded-xl flex items-center justify-center">
                    <CreditCard className="w-8 h-8 text-primary-600 dark:text-primary-400" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Capture ID</p>
                    <div className="flex items-center gap-2">
                      <p className="font-mono text-lg font-semibold text-gray-900 dark:text-white">
                        {payment.capture_id || 'N/A'}
                      </p>
                      <button
                        onClick={() => copyToClipboard(payment.capture_id || '')}
                        className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
                        title="Copy"
                      >
                        <Copy className="w-4 h-4 text-gray-400" />
                      </button>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <StatusBadge status={payment.status} provenance={payment.provenance} />
                </div>
              </div>

              <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Amount</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <DollarSign className="w-5 h-5" />
                    {payment.amount} {payment.currency}
                  </p>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Provider Status</p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">{payment.provider_status || 'N/A'}</p>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Last Verified</p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">
                    {payment.last_verified_at
                      ? formatDistanceToNow(new Date(payment.last_verified_at), { addSuffix: true })
                      : 'Never'}
                  </p>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Created</p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">
                    {formatDistanceToNow(new Date(payment.created_at), { addSuffix: true })}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Order Comparison */}
          {order && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                  Order Comparison
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <p className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">Local Order</p>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500 dark:text-gray-400">Order ID</span>
                        <span className="font-mono font-medium">{order.external_order_id}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500 dark:text-gray-400">Amount</span>
                        <span className="font-mono font-medium">{order.total_amount} {order.currency}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500 dark:text-gray-400">Status</span>
                        <StatusBadge status={order.status} provenance={order.provenance} />
                      </div>
                    </div>
                  </div>
                  <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <p className="text-sm font-medium text-green-800 dark:text-green-200 mb-2">Payment Capture</p>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500 dark:text-gray-400">Capture ID</span>
                        <span className="font-mono font-medium">{payment.capture_id || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500 dark:text-gray-400">Amount</span>
                        <span className="font-mono font-medium">{payment.amount} {payment.currency}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500 dark:text-gray-400">Status</span>
                        <StatusBadge status={payment.status} provenance={payment.provenance} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Mismatch indicators */}
                {(order.total_amount !== payment.amount || order.currency !== payment.currency || order.status !== 'paid') && (
                  <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <div className="flex items-center gap-2 text-red-800 dark:text-red-200 mb-2">
                      <AlertTriangle className="w-5 h-5" />
                      <span className="font-medium">Discrepancies Detected</span>
                    </div>
                    <ul className="text-sm text-red-700 dark:text-red-300 space-y-1">
                      {order.total_amount !== payment.amount && (
                        <li>• Amount mismatch: Order {order.total_amount} {order.currency} vs Payment {payment.amount} {payment.currency}</li>
                      )}
                      {order.currency !== payment.currency && (
                        <li>• Currency mismatch: Order {order.currency} vs Payment {payment.currency}</li>
                      )}
                      {order.status !== 'paid' && (
                        <li>• Status mismatch: Order is {order.status} but payment is captured</li>
                      )}
                    </ul>
                    <button
                      onClick={() => navigate(`/investigations/new?order_id=${order.id}&payment_id=${payment.id}`)}
                      className="mt-3 text-sm font-medium text-red-700 dark:text-red-300 hover:underline"
                    >
                      Create Investigation →
                    </button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Event Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Event Timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              {timeline.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <Clock className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No events recorded</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {timeline.map((event, index) => (
                    <div
                      key={`${event.event_time}-${index}`}
                      className="flex gap-4 relative"
                    >
                      {/* Timeline line */}
                      <div className="relative flex-shrink-0 w-6">
                        <div className="absolute left-2.5 top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700" />
                        <div className={clsx(
                          'relative w-3 h-3 rounded-full border-2 border-white dark:border-gray-800 z-10',
                          (event.provenance === 'paypal_api_refresh' || event.provenance === 'provider_event') ? 'bg-green-500' :
                          event.provenance === 'paypal_api' ? 'bg-blue-500' :
                          event.provenance === 'merchant_csv_import' ? 'bg-amber-500' :
                          event.provenance === 'test_fixture' ? 'bg-gray-500' : 'bg-purple-500'
                        )} />
                      </div>

                      {/* Event content */}
                      <div className="flex-1 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900 dark:text-white">{event.event_type}</span>
                            <StatusBadge status={event.provenance} />
                          </div>
                          <span className="text-sm text-gray-500 dark:text-gray-400">
                            {formatDistanceToNow(new Date(event.event_time), { addSuffix: true })}
                          </span>
                        </div>
                        <div className="mt-2 text-sm text-gray-600 dark:text-gray-300 font-mono">
                          {JSON.stringify(event.details, null, 2)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Provenance Legend */}
          <Card>
            <CardHeader>
              <CardTitle>Source Labels</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {Object.values(PROVENANCE_LABELS).map((label) => (
                  <div key={label.value} className="flex items-center gap-2">
                    <span className={clsx('px-2 py-1 rounded text-xs font-medium', label.color)}>
                      {label.label}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <button
                onClick={() => navigate(`/ai-copilot?payment_id=${payment.id}`)}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                Investigate with AI
              </button>
              {order && (
                <button
                  onClick={() => navigate(`/investigations/new?order_id=${order.id}&payment_id=${payment.id}`)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Create Investigation
                </button>
              )}
              {order && order.status !== 'paid' && (
                <button
                  onClick={() => navigate(`/checkout/${order.id}`)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <CreditCardIcon className="w-4 h-4" />
                  Pay with PayPal
                </button>
              )}
              {payment.capture_id && payment.status === 'captured' && (
                <button
                  onClick={() => navigate(`/approvals/new?capture_id=${payment.capture_id}&amount=${payment.amount}&currency=${payment.currency}`)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
                >
                  Request Refund
                </button>
              )}
              <button
                onClick={async () => {
                  setIsRefreshing(true);
                  try {
                    await paymentsApi.refresh(payment.id);
                    await fetchPaymentDetail();
                  } finally {
                    setIsRefreshing(false);
                  }
                }}
                disabled={isRefreshing}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RefreshCw className={clsx('w-4 h-4', isRefreshing && 'animate-spin')} />
                {isRefreshing ? 'Refreshing...' : 'Refresh Status'}
              </button>
            </CardContent>
          </Card>

          {/* Related Investigations */}
          <Card>
            <CardHeader>
              <CardTitle>Related Investigations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-4 text-gray-500 dark:text-gray-400 text-sm">
                No related investigations yet
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}