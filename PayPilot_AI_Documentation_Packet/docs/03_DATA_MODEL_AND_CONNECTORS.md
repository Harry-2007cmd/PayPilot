# 03 — Data Model and Connectors

## Suggested core tables
### merchants
- id (UUID primary key)
- name
- default_currency (optional; never assume all records use it)
- created_at

### users
- id, merchant_id, email, password_hash or identity-provider subject, role, created_at, disabled_at

### orders
- id (UUID), merchant_id, source_type, external_order_id, currency, total_amount, status, created_at, updated_at, provenance, metadata_json
- Unique key should prevent duplicate source order IDs within the appropriate merchant/source scope.

### payment_attempts
- id, merchant_id, order_id, provider, provider_order_id, capture_id, currency, amount, status, provider_status, created_at, updated_at, provenance, last_verified_at
- Do not assume one order has only one attempt.

### provider_events
- id, merchant_id, provider, provider_event_id, event_type, event_time, received_at, verification_status, processing_status, payload_minimized_json
- Unique provider event ID per provider/account scope. Store only the fields required for operation/audit.

### investigations
- id, merchant_id, created_by, issue_type, status, title, order_id, payment_attempt_id, priority, opened_at, resolved_at

### investigation_findings
- id, investigation_id, finding_type, severity, summary, evidence_refs_json, facts_json, uncertainties_json, recommendation, created_at, model_version (optional)

### proposed_actions
- id, merchant_id, investigation_id, action_type, target_capture_id, currency, amount, reason, status, proposed_by, approved_by, approved_at, executed_at, provider_request_id, idempotency_key, outcome_json

### audit_events
- id, merchant_id, actor_user_id (nullable for system events), action, target_type, target_id, timestamp, outcome, correlation_id, details_redacted_json

### imports and imported_records
Track uploaded file metadata, source label, uploader, import time, validation result, row count, and row-level source references. Treat imported rows as unverified until independently matched.

## Money and timestamps
- Use Decimal or integer minor units with explicit currency metadata.
- Validate currency precision and provider-supported currencies.
- Store timestamps in UTC; render in user locale.
- Never sum different currencies without an explicit conversion policy and exchange-rate provenance.

## Connector interface
Create a provider-neutral interface such as:
- `create_order(...)`
- `capture_order(...)`
- `get_order(...)`
- `get_capture(...)`
- `refund_capture(...)`
- `verify_webhook(...)`
- `normalize_event(...)`

Implement PayPal first. Marketplace/store adapters should be added independently. CSV is an ingestion adapter, not a live API integration.

## CSV import requirements
- Publish templates and sample files marked as examples.
- Validate required columns and supported values.
- Preview before committing.
- Preserve original source row number and external IDs.
- Reject or report malformed amounts/currencies/dates.
- Deduplicate repeat imports safely.
- Clearly label imported records in UI and AI evidence.
- Never treat a matching amount alone as proof two records are the same transaction.
