import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { investigationsApi } from '../services/api';
import { Card, CardContent } from './ui/Card';
import { StatusBadge } from '../components/StatusBadge';
import { Search, Filter, Plus, AlertTriangle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { clsx } from 'clsx';

interface Investigation {
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

export function Investigations() {
  const navigate = useNavigate();
  const [investigations, setInvestigations] = useState<Investigation[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: '',
    issue_type: '',
    priority: '',
    search: '',
  });
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchInvestigations();
  }, [page, filters]);

  const fetchInvestigations = async () => {
    setIsLoading(true);
    try {
      const response = await investigationsApi.list({
        page,
        page_size: pageSize,
        status: filters.status || undefined,
        issue_type: filters.issue_type || undefined,
        priority: filters.priority || undefined,
      });
      setInvestigations(response.data.items);
      setTotal(response.data.total);
    } catch (error) {
      console.error('Failed to fetch investigations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = () => {
    navigate('/investigations/new');
  };

  const issueTypes = [
    'status_mismatch',
    'amount_mismatch',
    'currency_mismatch',
    'duplicate_event',
    'unmatched_import',
    'failed_checkout',
    'refund_inconsistency',
  ];

  const priorities = ['low', 'medium', 'high', 'critical'];

  if (isLoading && investigations.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Investigations</h1>
            <p className="text-gray-500 dark:text-gray-400">Manage and track payment investigations</p>
          </div>
        </div>
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-gray-200 dark:bg-gray-700 rounded-lg" />
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Investigations</h1>
          <p className="text-gray-500 dark:text-gray-400">Manage and track payment investigations</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <Filter className="w-4 h-4" />
            Filters
          </button>
          <button
            onClick={handleCreate}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Investigation
          </button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <Card>
          <CardContent className="pt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">All</option>
                  <option value="open">Open</option>
                  <option value="investigating">Investigating</option>
                  <option value="resolved">Resolved</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Issue Type</label>
                <select
                  value={filters.issue_type}
                  onChange={(e) => setFilters({ ...filters, issue_type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">All</option>
                  {issueTypes.map((type) => (
                    <option key={type} value={type}>{type.replace(/_/g, ' ')}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Priority</label>
                <select
                  value={filters.priority}
                  onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">All</option>
                  {priorities.map((p) => (
                    <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={filters.search}
                    onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                    placeholder="Search title, order ID..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Title</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Issue Type</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Priority</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Order / Payment</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Age</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {investigations.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                      <AlertTriangle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>No investigations found</p>
                    </td>
                  </tr>
                ) : (
                  investigations.map((inv) => (
                    <tr
                      key={inv.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer"
                      onClick={() => navigate(`/investigations/${inv.id}`)}
                    >
                      <td className="px-6 py-4">
                        <p className="font-medium text-gray-900 dark:text-white truncate max-w-xs">{inv.title}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{inv.id.slice(0, 8)}...</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className={clsx(
                          'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium',
                          inv.issue_type.includes('mismatch') ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' :
                          inv.issue_type === 'duplicate_event' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300' :
                          inv.issue_type === 'failed_checkout' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' :
                          'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                        )}>
                          {inv.issue_type.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={clsx(
                          'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium',
                          inv.priority === 'critical' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' :
                          inv.priority === 'high' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' :
                          inv.priority === 'medium' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300' :
                          'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                        )}>
                          {inv.priority.charAt(0).toUpperCase() + inv.priority.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={inv.status} />
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 font-mono">
                        {inv.order_id ? inv.order_id.slice(0, 8) + '...' : '—'}
                        {' / '}
                        {inv.payment_attempt_id ? inv.payment_attempt_id.slice(0, 8) + '...' : '—'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                        {formatDistanceToNow(new Date(inv.opened_at), { addSuffix: true })}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={(e) => { e.stopPropagation(); navigate(`/investigations/${inv.id}`); }}
                          className="text-primary-600 dark:text-primary-400 hover:underline text-sm font-medium"
                        >
                          View
                        </button>
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
                  className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage(page + 1)}
                  disabled={page * pageSize >= total}
                  className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
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