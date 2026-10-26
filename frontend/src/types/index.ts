export interface User {
  id: string;
  email: string;
  role: string;
  merchant_id: string;
  created_at: string;
  disabled_at: string | null;
}

export interface Merchant {
  id: string;
  name: string;
  default_currency: string | null;
  created_at: string;
}

export interface Order {
  id: string;
  merchant_id: string;
  source_type: string;
  external_order_id: string;
  currency: string;
  total_amount: string;
  status: string;
  created_at: string;
  updated_at: string;
  provenance: string;
  metadata_json: Record<string, unknown>;
}

export interface PaymentAttempt {
  id: string;
  merchant_id: string;
  order_id: string;
  provider: string;
  provider_order_id: string;
  capture_id: string | null;
  currency: string;
  amount: string;
  status: string;
  provider_status: string | null;
  created_at: string;
  updated_at: string;
  provenance: string;
  last_verified_at: string | null;
}

export interface PaymentTimelineEvent {
  event_time: string;
  event_type: string;
  source: string;
  status: string;
  details: Record<string, unknown>;
  provenance: string;
}

export interface ProviderEvent {
  id: string;
  merchant_id: string;
  provider: string;
  provider_event_id: string;
  event_type: string;
  event_time: string;
  received_at: string;
  verification_status: string;
  processing_status: string;
  payload_minimized_json: Record<string, unknown>;
}

export interface Investigation {
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
  findings: InvestigationFinding[];
}

export interface InvestigationFinding {
  id: string;
  investigation_id: string;
  finding_type: string;
  severity: string;
  summary: string;
  evidence_refs_json: Record<string, unknown>;
  facts_json: Record<string, unknown>;
  uncertainties_json: Record<string, unknown>;
  recommendation: string;
  created_at: string;
  model_version: string | null;
}

export interface ProposedAction {
  id: string;
  merchant_id: string;
  investigation_id: string;
  action_type: string;
  target_capture_id: string;
  currency: string;
  amount: string;
  reason: string;
  status: string;
  proposed_by: string;
  approved_by: string | null;
  approved_at: string | null;
  executed_at: string | null;
  provider_request_id: string | null;
  idempotency_key: string;
  outcome_json: Record<string, unknown>;
}

export interface AuditEvent {
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

export interface ImportRecord {
  id: string;
  merchant_id: string;
  uploaded_by: string;
  filename: string;
  source_label: string;
  row_count: number;
  valid_count: number;
  error_count: number;
  status: string;
  uploaded_at: string;
  completed_at: string | null;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}

export interface AIInvestigateRequest {
  question: string;
  investigation_id?: string;
  order_id?: string;
  payment_attempt_id?: string;
}

export interface AIInvestigateResponse {
  summary: string;
  issue_type: string;
  facts: Array<{
    statement: string;
    evidence: string;
    verified: boolean;
  }>;
  uncertainties: Array<{
    statement: string;
    reason: string;
    evidence: string;
  }>;
  recommendation: string;
  proposed_action_id: string | null;
  confidence: string | null;
  needs_human_review: boolean;
}

export interface ProvenanceLabel {
  value: string;
  label: string;
  color: string;
  description: string;
}

export const PROVENANCE_LABELS: Record<string, ProvenanceLabel> = {
  paypal_api: {
    value: 'paypal_api',
    label: 'PayPal API',
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    description: 'Retrieved directly from PayPal API',
  },
  paypal_webhook_verified: {
    value: 'paypal_webhook_verified',
    label: 'PayPal Webhook (Verified)',
    color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    description: 'Received and signature-verified from PayPal',
  },
  merchant_csv_import: {
    value: 'merchant_csv_import',
    label: 'CSV Import',
    color: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
    description: 'Uploaded by merchant; not independently verified',
  },
  test_fixture: {
    value: 'test_fixture',
    label: 'Test Fixture',
    color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
    description: 'Synthetic test data',
  },
  local: {
    value: 'local',
    label: 'Local Record',
    color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
    description: 'Created in PayPilot AI',
  },
};