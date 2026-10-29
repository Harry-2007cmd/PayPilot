# 04 — API and AI Agent Specification

## Suggested API endpoints
All endpoints must enforce authentication and merchant scope.

### Authentication
- `POST /api/auth/login`
- `POST /api/auth/logout` (if session strategy requires it)
- `GET /api/auth/me`

### Orders and payments
- `POST /api/orders`
- `GET /api/orders`
- `GET /api/orders/{order_id}`
- `POST /api/paypal/orders/{order_id}/create`
- `POST /api/paypal/orders/{order_id}/capture`
- `GET /api/payments`
- `GET /api/payments/{payment_id}`
- `GET /api/payments/{payment_id}/timeline`

### Payment verification
- `POST /api/payments/{payment_id}/refresh` — refresh a payment status directly through the PayPal API

### Investigations
- `GET /api/investigations`
- `POST /api/investigations`
- `GET /api/investigations/{id}`
- `POST /api/investigations/{id}/run`
- `POST /api/ai/investigate` (streaming optional; protect against abuse)

### Actions
- `POST /api/investigations/{id}/proposed-actions`
- `POST /api/proposed-actions/{id}/approve`
- `POST /api/proposed-actions/{id}/reject`
- `GET /api/audit-events`

### Imports
- `POST /api/imports/preview`
- `POST /api/imports/confirm`
- `GET /api/imports/{id}`

Use Pydantic schemas, consistent error formats, pagination, rate limits for AI endpoints, and request/correlation IDs.

## AI tool allowlist
1. `get_order_details(order_id)`
2. `get_payment_details(payment_attempt_id or provider reference)`
3. `get_event_timeline(order_id/payment_attempt_id)`
4. `compare_order_payment(order_id, payment_attempt_id)`
5. `find_related_records(query filters with strict bounds)`
6. `run_payment_rules(order_id/payment_attempt_id)`
7. `get_investigation_summary(investigation_id)`
8. `refresh_payment_status(payment_attempt_id)` — retrieves the current PayPal capture status on demand
9. `prepare_resolution(investigation_id, action_type, parameters)` — creates a pending proposal only; never executes a payment operation.

Tools must validate arguments and access scope. Do not expose arbitrary SQL or raw ORM query generation to the model.

## Agent output schema
Return structured output such as:
- `summary`: concise explanation.
- `issue_type`: controlled enum.
- `facts`: list of fact + evidence reference.
- `uncertainties`: list.
- `recommendation`: next step.
- `proposed_action`: optional pending proposal ID.
- `confidence`: optional calibrated qualitative label, not a guarantee.
- `needs_human_review`: boolean.

Every factual statement about a transaction must reference returned tool evidence. If tools fail or data is unavailable, say so.

## Agent orchestration
Use LangGraph for bounded steps:
1. Parse the user's question/issue.
2. Select relevant tools.
3. Execute tools with validated arguments.
4. Evaluate whether sufficient evidence exists.
5. If needed, call another allowed tool with a bounded iteration count.
6. Produce a structured evidence-grounded response.
7. Persist investigation finding and audit metadata.

## Financial safety
The agent cannot approve actions, change roles, bypass checks, call arbitrary URLs, access secrets, or issue refunds directly. Refund execution is a separate backend endpoint requiring authenticated authorization, explicit approval, revalidation, and idempotency protection.
