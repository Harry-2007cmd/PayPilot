# 09 — Implementation Roadmap

## Phase 0 — Repository inspection and setup
- Inspect existing files and preserve reusable work.
- Decide package manager and auth strategy based on existing repository.
- Establish backend/frontend structure, formatting, linting, `.env.example`, and README.
- Deliverable: app starts locally; health endpoint works; database connection configured.

## Phase 1 — Persistence and authentication
- Create migrations and core tables.
- Implement sign-in and merchant-scoped authorization.
- Seed only clearly labelled demo merchant/user records.
- Tests: auth, ownership isolation, migrations.

## Phase 2 — PayPal Sandbox payment
- Configure Sandbox buyer/business accounts.
- Implement server-side order creation, client approval, capture, and persistence.
- Tests: API integration where credentials are present; unit tests for error paths.

Note: PayPilot AI does not receive automatic PayPal event notifications in this MVP. Merchants can refresh payment status or initiate an investigation when they need an updated provider check.

The end-to-end payment flow is: Sandbox checkout → backend capture → persisted payment → on-demand PayPal API verification → deterministic issue detection → AI investigation → evidence-backed recommendation → human-approved action → audit history.

## Phase 3 — Deterministic investigation engine
- Define issue enums and rule checks.
- Implement investigation queue, transaction details, and event timeline.
- Add controlled test scenarios that are labelled and never misrepresented as PayPal events.
- Tests: each rule and provenance handling.

## Phase 4 — AI investigation agent
- Implement typed tool registry and LangGraph flow.
- Use application records and deterministic comparison outputs.
- Validate structured output and evidence references.
- Add bounded loops, timeouts, and model failure handling.
- Tests: tool permissions, insufficient evidence, unsupported question, fabricated-evidence guard.

## Phase 5 — UI and sponsor integration
- Build overview, investigations, payment detail, AI copilot, approval, audit, and integrations screens.
- Verify AG Grid AG Studio current SDK/access and implement actual integration where feasible.
- If unavailable, document blocker and use a clearly separated table/chart fallback without claiming AG Studio usage.
- Test loading/empty/error states and keyboard interaction.

## Phase 6 — Approved actions
- Implement proposal/approve/reject state machine.
- Add eligible Sandbox refund flow only after verifying official API requirements.
- Revalidate role, ownership, payment state, amount, currency, and idempotency before execution.
- Record audit and provider outcome.

## Phase 7 — Imports, polish, deployment
- Add CSV template, preview, validation, import history, and source labels.
- Deploy with HTTPS.
- Run end-to-end demo and regression tests.
- Publish setup guide, license, and demo script.

## Scope rule
The PayPal Sandbox investigation journey takes priority over marketplace API breadth. If time is short, postpone marketplace connectors and advanced charts rather than compromising payment correctness, AI evidence grounding, or demo reliability.
