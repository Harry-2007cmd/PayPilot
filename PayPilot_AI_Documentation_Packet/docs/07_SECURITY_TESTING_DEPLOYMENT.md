# 07 — Security, Testing, and Deployment

## Security controls
- Backend-only PayPal client secret and AI API key.
- Password hashing or a well-configured external identity provider.
- Merchant-level data isolation enforced in every query and action.
- Role/permission checks for approvals.
- CSRF/CORS/session strategy appropriate to chosen auth mechanism.
- Request validation, upload limits, rate limiting, and safe error messages.
- PayPal API response validation and idempotent payment-status refresh.
- Idempotency keys and duplicate-action prevention for payment operations.
- Audit trail for approvals, rejects, refunds, imports, and configuration changes.
- Redact secrets and minimize sensitive data in logs.
- Validate imported files and guard against formula injection when exporting CSV.
- Keep dependency versions and secrets out of source control.

## Test plan
### Unit tests
- Currency/amount comparisons.
- Status transition rules.
- Duplicate event detection.
- CSV validation/deduplication.
- Agent output schema and evidence-reference validation.
- Authorization and merchant scoping.
- Proposed-action state machine.

### Integration tests
- PayPal Sandbox order creation/capture with configured credentials.
- Payment-status refresh success and failure, including provider timeout and ambiguous outcomes.
- Database persistence and migrations.
- AI tool execution against seeded application records.
- Refund request validation and supported Sandbox refund path.

### End-to-end demo test
1. Sign in.
2. Create and approve Sandbox checkout.
3. Confirm payment/capture is persisted.
4. Refresh payment status directly through the PayPal API.
5. Open an investigation or create a reproducible mismatch scenario.
6. Ask the AI to investigate.
7. Inspect evidence references and explanation.
8. Prepare and approve a supported Sandbox action, or show a safe recommendation if refund preconditions are not met.
9. Verify audit record and refreshed status.

## Deployment
- Frontend and backend configured with environment variables.
- Managed PostgreSQL with migrations.
- HTTPS and outbound access to the PayPal API for on-demand verification.
- Health/readiness endpoints.
- Seed/demo setup that does not create fake PayPal confirmations.
- Document cold starts/sleep limitations if using a free hosting tier.
- Keep a reliable local demo path if hosting is unavailable.

## Required environment template
Include placeholders for:
- `DATABASE_URL`
- `APP_SECRET_KEY`
- `PAYPAL_CLIENT_ID`
- `PAYPAL_CLIENT_SECRET`
- `PAYPAL_BASE_URL` (Sandbox by default)
- `PAYPAL_BASE_URL` (Sandbox by default)
- `GEMINI_API_KEY`
- `FRONTEND_ORIGIN`
Never put actual credentials in documentation or version control.
