import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { paymentsApi } from '../services/api';
import { Card, CardContent } from './ui/Card';
import { StatusBadge } from '../components/StatusBadge';
import { CreditCard } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export function Payments() {
  const navigate = useNavigate();
  const [payments, setPayments] = useState<any[]>([]);
  const [filters, setFilters] = useState({ status: '' });

  useEffect(() => {
    fetchPayments();
  }, [filters]);

  const fetchPayments = async () => {
    try {
      const response = await paymentsApi.list({
        page: 1,
        page_size: 50,
        status: filters.status || undefined,
      });
      setPayments(response.data.items);
    } catch (error) {
      console.error('Failed to fetch payments:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Payments</h1>
          <p className="text-gray-500 dark:text-gray-400">View and track all payment attempts and captures</p>
        </div>
      </div>

      <Card>
        <CardContent className="pt-4 pb-2">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Status:</label>
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">All</option>
                <option value="captured">Captured</option>
                <option value="refunded">Refunded</option>
                <option value="failed">Failed</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Capture ID / Order ID</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Provider</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Provenance</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Date</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {payments.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                      <CreditCard className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>No payments found</p>
                    </td>
                  </tr>
                ) : (
                  payments.map((p) => (
                    <tr
                      key={p.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer"
                      onClick={() => navigate(`/payments/${p.id}`)}
                    >
                      <td className="px-6 py-4 font-mono text-sm">
                        <p className="font-semibold text-gray-900 dark:text-white">{p.capture_id || 'N/A'}</p>
                        <p className="text-xs text-gray-500">{p.provider_order_id}</p>
                      </td>
                      <td className="px-6 py-4 capitalize text-sm">{p.provider}</td>
                      <td className="px-6 py-4 font-semibold text-gray-900 dark:text-white">
                        {p.amount} {p.currency}
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={p.status} />
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={p.provenance} provenance={p.provenance} />
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {formatDistanceToNow(new Date(p.created_at), { addSuffix: true })}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={(e) => { e.stopPropagation(); navigate(`/payments/${p.id}`); }}
                          className="text-primary-600 dark:text-primary-400 hover:underline text-sm font-medium"
                        >
                          Details
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}