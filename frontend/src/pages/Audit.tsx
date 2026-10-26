import { useEffect, useState } from 'react';
import { actionsApi } from '../services/api';
import { Card, CardContent } from './ui/Card';
import { History, Filter, Clock, User, Database, Shield, CheckCircle2, XCircle, CreditCard, Upload } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { clsx } from 'clsx';

interface AuditEvent {
  id: string;
  merchant_id: string;
  actor_user_id: string | null;
  action: string;
  target_type: string;
  target_id: string;
  timestamp: string;
  outcome: string;
  correlation_id: string | null;
  details_redacted_json: Record<string, unknown>;
}

export function Audit() {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 50;
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState({ action: '', target_type: '' });
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchEvents();
  }, [page, filters]);

  const fetchEvents = async () => {
    setIsLoading(true);
    try {
      const response = await actionsApi.listAudit({ page, page_size: pageSize, action: filters.action || undefined, target_type: filters.target_type || undefined });
      setEvents(response.data.items);
      setTotal(response.data.total);
    } catch (error) {
      console.error('Failed to fetch audit events:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const actionIcons: Record<string, React.ReactNode> = {
    proposed_action_created: <Shield className="w-4 h-4 text-blue-600" />,
    proposed_action_approved: <CheckCircle2 className="w-4 h-4 text-green-600" />,
    proposed_action_rejected: <XCircle className="w-4 h-4 text-red-600" />,
    login: <User className="w-4 h-4 text-gray-600" />,
    order_created: <Database className="w-4 h-4 text-primary-600" />,
    payment_created: <CreditCard className="w-4 h-4 text-green-600" />,
    webhook_received: <Clock className="w-4 h-4 text-amber-600" />,
    import_completed: <Upload className="w-4 h-4 text-purple-600" />,
  };

    if (isLoading && events.length === 0) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <History className="w-6 h-6 text-primary-600" />
            Audit History
          </h1>
          <p className="text-gray-500 dark:text-gray-400">Searchable history of investigations and consequential actions</p>
        </div>
        <div className="animate-pulse space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-12 bg-gray-200 dark:bg-gray-700 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <History className="w-6 h-6 text-primary-600" />
            Audit History
          </h1>
          <p className="text-gray-500 dark:text-gray-400">Searchable history of investigations and consequential actions</p>
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          <Filter className="w-4 h-4" />
          Filters
        </button>
      </div>

      {/* Filters */}
      {showFilters && (
        <Card>
          <CardContent className="pt-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Action</label>
                <input
                  type="text"
                  value={filters.action}
                  onChange={(e) => setFilters({ ...filters, action: e.target.value })}
                  placeholder="Filter by action..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Target Type</label>
                <input
                  type="text"
                  value={filters.target_type}
                  onChange={(e) => setFilters({ ...filters, target_type: e.target.value })}
                  placeholder="Filter by target type..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div className="flex items-end">
                <button onClick={fetchEvents} className="w-full px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
                  Apply
                </button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Events Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Time</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Action</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Target</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actor</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Outcome</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Correlation ID</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {events.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                      <History className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>No audit events found</p>
                    </td>
                  </tr>
                ) : (
                  events.map((event) => (
                    <tr key={event.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
                        {formatDistanceToNow(new Date(event.timestamp), { addSuffix: true })}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {actionIcons[event.action] || <Shield className="w-4 h-4 text-gray-600" />}
                          <span className="text-sm font-medium text-gray-900 dark:text-white">{event.action.replace(/_/g, ' ')}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                        <div className="flex items-center gap-1">
                          <span className="font-mono">{event.target_type}</span>
                          <span className="text-gray-400">/</span>
                          <span className="font-mono text-xs">{event.target_id.slice(0, 12)}...</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                        {event.actor_user_id ? event.actor_user_id.slice(0, 8) + '...' : 'System'}
                      </td>
                      <td className="px-6 py-4">
                        <span className={clsx(
                          'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium',
                          event.outcome === 'success' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
                          event.outcome === 'failed' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' :
                          'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                        )}>
                          {event.outcome}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 font-mono">
                        {event.correlation_id ? event.correlation_id.slice(0, 16) + '...' : '—'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <details className="cursor-pointer">
                          <summary className="text-primary-600 dark:text-primary-400 hover:underline text-sm">View</summary>
                          <pre className="mt-2 p-2 bg-gray-100 dark:bg-gray-700 rounded text-xs overflow-x-auto max-w-xs">
                            {JSON.stringify(event.details_redacted_json, null, 2)}
                          </pre>
                        </details>
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
    </div>
  );
}