# 10 — Decisions, Assumptions, and Risks

## Decisions already made
- Product direction: focused payment investigation and safe resolution, not a broad all-channel merchant dashboard.
- Working name: PayPilot AI; descriptive tagline: The Payment Detective.
- PayPal Sandbox is the core integration.
- AI agent must investigate actual app data through controlled backend tools.
- Human approval is required for refunds and other consequential actions.
- Stack preference: React + TypeScript + Vite, FastAPI, PostgreSQL, LangGraph, Gemini API.
- AG Grid AG Studio is the preferred sponsor product for investigation/analytics UI, subject to verified access and actual integration.
- APIMatic and Postman are development support; Render is a deployment candidate.
- Global-ready data structure; PayPal-first MVP.
- CSV import is an honest fallback for external marketplace records.
- Amazon, Flipkart, Shopify, WooCommerce, and other integrations are future connector targets, not assumed live.

## Assumptions to validate during implementation
- User has a PayPal Developer account and can create/use Sandbox credentials.
- The required sponsor tool packages and access are obtainable in time.
- Current AI API account, model, rate limits, and terms permit the planned use.
- Hosting/database plans are available and adequate for the demo.
- A sandbox refund can be demonstrated for an eligible captured payment in the selected test flow.

## Risks and mitigations
- **API access/time:** Keep marketplace connectors out of core path; use labelled CSV import.
- **On-demand verification:** Payment status is refreshed via the PayPal API when a merchant requests it; no automatic event notifications are consumed in this MVP.
- **AI hallucination:** Require evidence references, typed tools, deterministic checks, and uncertainty fields.
- **Duplicate financial action:** Use action state machine, idempotency, and revalidation.
- **Ambiguous provider timeout:** Mark outcome unknown and reconcile before retry.
- **Sponsor SDK access:** Verify early; don't fake usage; keep core product independent.
- **Scope creep:** Protect the end-to-end payment investigation flow as the release criterion.
- **Product name availability:** Treat PayPilot AI as a working name pending basic name/brand checks.
