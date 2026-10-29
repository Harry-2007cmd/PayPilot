# Master Project Specification — PayPilot AI

## 1. Executive summary
PayPilot AI, internally described as **The Payment Detective**, is an AI-assisted payment investigation and safe-resolution system for merchants. It helps merchants understand why an order and payment record disagree, why a payment attempt failed or was cancelled, whether an event was processed more than once, or what the available records say about a refund.

The product is not a generic finance chatbot and not merely a dashboard. Its core workflow is:
**detect or receive an issue → retrieve relevant records → run deterministic checks → explain evidence and uncertainty → recommend a next step → obtain human approval for consequential actions → execute supported action → audit the result.**

The live payment workflow is: **Sandbox checkout → backend capture → persisted payment → on-demand PayPal API verification → deterministic issue detection → AI investigation → evidence-backed recommendation → human-approved action → audit history.**

## 2. Target users and problem
### Primary user
A small or medium-sized merchant or support/operations employee who handles online orders and payments and needs to investigate payment-related discrepancies.

### Problem
Payment evidence can be spread across a merchant's local order database, PayPal order/capture details, and manually imported external records. Manually comparing IDs, statuses, amounts, and timestamps is time-consuming and error-prone.

### Value proposition
PayPilot AI shortens the path from a payment question to an evidence-backed investigation and safe next step. It must distinguish verified facts from inferences and explicitly state when evidence is missing.

## 3. Hackathon fit
The hackathon requires an application that centrally integrates the PayPal developer platform using its free Sandbox environment and an AI tool/model/platform. The PayPal integration must be a genuine, meaningful part of the product. PayPilot AI uses PayPal Sandbox for checkout/capture and on-demand provider verification, while AI uses controlled tools to investigate the resulting application records.

Sponsor tools are optional. Planned candidates:
- AG Grid AG Studio: interactive investigation and analytics UI; integrate substantively if access and terms permit.
- APIMatic: API development assistance.
- Postman: API testing.
- Render: hosting, subject to available plan limits.
The AI model/orchestration choice is Gemini API + LangGraph unless implementation research identifies a better fit within the available time and terms. Do not imply sponsor prize eligibility without checking the current official prize rules.

## 4. MVP goals
1. A merchant can sign in to a protected workspace.
2. A merchant can initiate a PayPal Sandbox checkout.
3. The backend creates and captures PayPal orders using server-side credentials.
4. Local orders and payment attempts persist in PostgreSQL with provider identifiers, amounts, currencies, statuses, and timestamps.
5. Payment status can be refreshed on demand through the PayPal API.
6. A deterministic rules engine can flag a small set of testable payment inconsistencies.
7. The merchant can open an investigation and inspect a transaction/event timeline.
8. The AI agent can call registered backend tools to retrieve evidence and explain findings.
9. The AI response includes evidence references, verified facts, uncertainties, and a recommendation.
10. A merchant can prepare and approve a supported Sandbox refund; the backend revalidates authorization and payment eligibility before execution.
11. Actions and investigation outcomes are recorded in an audit trail.
12. The app has setup instructions, tests, and a working demo path.

## 5. Explicit non-goals for MVP
- Universal live integration with Amazon, Flipkart, Shopify, every POS, or every payment provider.
- Fraud detection claims or financial guarantees.
- Automatic refunds without human approval.
- AI access to arbitrary SQL, shell, secrets, or unbounded APIs.
- Real-money transactions.
- Live access to a merchant's entire PayPal account history unless a separate authorized integration is implemented.
- Multi-currency aggregation without explicit conversion logic and rates.
- Replacing accounting, dispute-management, or payment-provider systems.

## 6. Core user journeys
### Journey A — Successful Sandbox payment
Sign in → create checkout/order → approve with Sandbox buyer → backend capture → persist result → show payment timeline → event updates status as appropriate.

### Journey B — Investigate mismatch
Open flagged issue or ask a question → agent identifies required records → backend tools retrieve authorized records → deterministic checks compare identifiers/status/amount/currency → agent explains evidence and uncertainty → merchant sees references and recommended action.

### Journey C — Review a refund
Merchant opens eligible captured payment → system prepares refund request → merchant reviews amount/reason → explicit approval → backend revalidates ownership, eligibility, amount, currency, and duplicate request state → provider API call → persist result and audit event → refresh timeline.

### Journey D — Imported external record
Merchant uploads a supported CSV template → validate and preview rows → show source as imported file and preserve external reference → deduplicate according to documented keys → store records as imported/unverified with provenance → include only in appropriate comparisons, with limitations visible.

## 7. Issue types in MVP
- Local order/payment status mismatch.
- Amount or currency mismatch.
- Duplicate provider event processing.
- Unmatched imported payment/order record.
- Failed or cancelled checkout based on recorded provider response.
- Refund timeline/status inconsistency where provider data is available.

A flagged issue is an investigation lead, not proof of fraud or loss.

## 8. Data trust and provenance
Every record must identify its origin and trust state, such as:
- `paypal_api` — retrieved from PayPal API.
- `paypal_api_refresh` — verified via a direct on-demand PayPal API status check.
- `merchant_csv_import` — uploaded by a merchant; not independently verified by PayPal.
- `test_fixture` — synthetic test data, visibly labelled.
Never present CSV/imported/fixture data as verified PayPal records.

## 9. AI behaviour
The model is an investigator and explainer, not the source of financial truth. It can plan investigations and call registered tools. Backend code performs financial arithmetic, status checks, authorization, validation, and external side effects. AI output must not invent amounts, statuses, IDs, timestamps, provider responses, or citations. When evidence is incomplete, the answer must say so.

## 10. Security and reliability
- Store secrets only in backend environment variables.
- Use authenticated, merchant-scoped API requests.
- Validate all inputs with typed schemas.
- Use decimal-safe amounts and explicit currency.
- Verify provider responses and make event processing idempotent.
- Add unique constraints and duplicate-action protections.
- Use audit records for sensitive actions.
- Do not log secrets, full payment credentials, or unnecessary personal data.
- Handle provider timeouts, retries, and ambiguous outcomes safely.
- Do not retry non-idempotent operations blindly.

## 11. Success criteria
The project is successful when a reviewer can run the documented demo and observe a real Sandbox payment flow, persisted records, a reproducible issue investigation, an AI explanation grounded in retrieved evidence, and an auditable approval-controlled action. A reviewer can also refresh a payment status directly through the PayPal API and see the provider response reflected in local records.

PayPilot AI does not receive automatic PayPal event notifications in this MVP. Merchants can refresh payment status or initiate an investigation when they need an updated provider check. The UI must be coherent and the repository must explain how to configure and run the system.

## 12. Assumptions and open implementation choices
- Working name is PayPilot AI; check name/branding before public release.
- Initial market is global-ready, but the MVP is provider-neutral in data structure and PayPal-first in actual integration.
- Use PostgreSQL, FastAPI, React + TypeScript + Vite, and a controlled LangGraph agent unless repository inspection reveals an existing compatible stack worth preserving.
- Exact AG Grid AG Studio SDK/package and sponsor capabilities must be verified from current official materials before implementation.
- Marketplace CSV templates will be documented rather than claiming direct live integrations.
