# 06 — Integrations and Sponsor Plan

## PayPal (core and required)
- Use the official PayPal Developer Sandbox.
- Create Sandbox business and buyer accounts.
- Configure client ID and secret as backend environment variables.
- Use Orders API for create/capture and relevant Payments API operations for eligible refunds.
- Use the JavaScript SDK for buyer approval.
- Configure webhook event subscriptions that are actually needed by the implemented flow.
- Verify webhook signatures using the supported PayPal verification mechanism.
- Document Sandbox limitations and the exact API paths tested.

## AI
Proposed starting point: Gemini API with LangGraph. Verify current model availability, tool-calling support, terms, limits, and secret management. Keep provider/model access behind an internal agent service so it can be changed later.

## AG Grid AG Studio
Candidate sponsor integration and potential prize target. Check current official documentation, package access, event requirements, and specific prize rules. Build a genuine embedded analytics/investigation experience if feasible. Do not let a sponsor-specific SDK block PayPal and AI core functionality.

## APIMatic
Development support for API understanding/code generation where available. It is not a substitute for testing actual API requests. Follow its current licensing and tool terms.

## Postman
Create a collection for auth, order creation, payment flow, investigation endpoints, imports, and approval actions. Use environment variables without committing credentials. Include expected responses and negative cases.

## Render
Candidate host for frontend/backend. Confirm free-tier availability, sleep behaviour, persistent storage limitations, environment variables, outbound access, and webhook reachability before relying on it. PostgreSQL may be hosted separately (e.g. Supabase) if suitable.

## Marketplace/store connectors
Future connector targets may include Amazon, Flipkart, Shopify, WooCommerce, and other major sources. The MVP must not claim these are live. Start with a generic CSV import format and optional Amazon SP-API Sandbox exploration if time allows and official access is available. Access to a seller account, app registration, permissions, regional availability, and API terms may be required for live data.

## Integration status labels
Every connector must show one of:
- `Connected — Sandbox`
- `Connected — Live` (only after verified live testing and authorization)
- `CSV import`
- `Planned`
- `Unavailable / setup required`

## Sponsor prize caution
Sponsor tool use and sponsor prize eligibility are different. Read the active prize rules and required implementation criteria before making a sponsor-prize claim.
