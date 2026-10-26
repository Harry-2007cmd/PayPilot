# 05 — UI/UX and Analytics

## Product design direction
Professional, trustworthy operations dashboard. Prefer a clear hierarchy, neutral background, restrained accent colour, strong status labels, and readable tables. Avoid a generic chatbot landing page. The investigation evidence should be the main experience.

## Screens
1. **Overview:** payment health summary, investigation counts, recent payment activity, alerts, and quick search.
2. **Investigations:** filterable queue with issue type, priority, order/reference, status, age, and assigned user.
3. **Payment detail:** order/payment identifiers, amount and currency, status, source/provenance, timeline, linked investigations, and actions.
4. **AI investigation:** question input, investigation progress, evidence cards, deterministic comparison results, uncertainties, and recommendations.
5. **Approval center:** proposed action details, approve/reject controls, authorization context, and execution result.
6. **Audit history:** searchable history of investigations and consequential actions.
7. **Integrations/imports:** PayPal Sandbox connection/test status, webhook health, CSV upload/preview/import status.

## AG Grid AG Studio
Use AG Grid AG Studio only after checking current sponsor documentation, access, package/API, licensing, and eligibility requirements. Use it substantively where available for:
- Interactive investigation/payment tables.
- Filtering, sorting, grouping, and column selection.
- Relevant charts or dashboard interactions supported by the actual product.
- AI-assisted exploration only if the official SDK supports it and the implementation can be demonstrated.

Do not falsely label ordinary charts as AG Studio or claim sponsor features that were not integrated. Keep an accessible fallback UI if access is blocked, and document the limitation.

## Suggested dashboard metrics
- Total Sandbox payment attempts by status.
- Successful captures and failed/cancelled attempts.
- Open investigations by severity/type.
- Amount mismatch count.
- Unmatched imported records.
- Refund count and amount by currency.
- Webhook processing failures and duplicate event deliveries.

Metrics must have documented definitions and time windows. Do not label payment volume as revenue or captured amounts as payouts. Do not aggregate unlike currencies.

## Interaction standards
- Clear loading, empty, success, and error states.
- Search by local order ID, PayPal order ID, or capture ID.
- Status badges must have text labels, not colour alone.
- Approval buttons show the exact action, amount, currency, and target.
- Show source labels: PayPal API, verified PayPal webhook, CSV import, or test fixture.
- Never show a destructive or financial action as completed before backend confirmation.
