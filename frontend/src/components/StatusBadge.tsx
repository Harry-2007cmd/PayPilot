import { clsx } from 'clsx';

interface StatusBadgeProps {
  status: string;
  provenance?: string;
  className?: string;
}

export function StatusBadge({ status, provenance, className }: StatusBadgeProps) {
  const statusConfig: Record<string, { label: string; color: string }> = {
    created: { label: 'Created', color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200' },
    paid: { label: 'Paid', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' },
    captured: { label: 'Captured', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' },
    completed: { label: 'Completed', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' },
    pending: { label: 'Pending', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200' },
    processing: { label: 'Processing', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' },
    cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' },
    failed: { label: 'Failed', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' },
    refunded: { label: 'Refunded', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' },
    partially_refunded: { label: 'Partially Refunded', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' },
    open: { label: 'Open', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' },
    investigating: { label: 'Investigating', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200' },
    resolved: { label: 'Resolved', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' },
    rejected: { label: 'Rejected', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' },
    executing: { label: 'Executing', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' },
    executed: { label: 'Executed', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' },
    preview: { label: 'Preview', color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200' },
  };

  const config = statusConfig[status.toLowerCase()] || { label: status, color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200' };

  const provenanceColors: Record<string, string> = {
    paypal_api: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    paypal_webhook_verified: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    merchant_csv_import: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
    test_fixture: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
    local: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  };

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <span className={clsx('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium', config.color, className)}>
        {config.label}
      </span>
      {provenance && provenanceColors[provenance] && (
        <span className={clsx('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', provenanceColors[provenance])}>
          {provenance.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
        </span>
      )}
    </div>
  );
}