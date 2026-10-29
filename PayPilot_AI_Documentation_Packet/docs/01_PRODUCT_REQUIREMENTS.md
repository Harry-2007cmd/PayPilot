# 01 — Product Requirements

## Personas
1. **Merchant owner:** needs to understand and resolve payment exceptions.
2. **Operations/support staff:** investigates customer payment questions and order/payment inconsistencies.
3. **Workspace administrator:** manages user access and configuration.

## Functional requirements
- FR-01: Authentication and merchant-scoped workspace.
- FR-02: Create a local order and PayPal Sandbox order from the backend.
- FR-03: Complete buyer approval and capture using the PayPal flow.
- FR-04: Persist local order and payment attempt with provider IDs and provenance.
- FR-05: Refresh payment status on demand through the PayPal API, verify the provider response, and update local records only through valid state transitions.
- FR-06: List/search/filter orders, payments, and investigations.
- FR-07: Show a payment timeline and source/trust labels.
- FR-08: Run deterministic rules for selected mismatch cases.
- FR-09: Allow a user to ask an investigation question in natural language.
- FR-10: AI calls only registered backend tools and returns structured findings.
- FR-11: Findings include evidence references, known facts, uncertainties, and recommended next step.
- FR-12: Prepare and approve a supported refund with authorization and eligibility checks.
- FR-13: Record investigation and sensitive action audit events.
- FR-14: Import external records through documented CSV templates with preview and validation.
- FR-15: Clearly separate sandbox, API-verified, imported, and fixture records.
- FR-16: Show useful empty, loading, failure, and retry states.

## Non-functional requirements
- Security: secrets stay server-side; all records are merchant-scoped.
- Reliability: safe handling of duplicate requests and provider timeouts; payment status is verified on demand rather than assumed current.
- Auditability: sensitive actions have actor, time, target, decision, and outcome.
- Explainability: AI claims map to stored evidence references.
- Usability: an issue should be understandable without reading raw logs.
- Maintainability: provider adapters, rules, and AI tools are modular.
- Portability: local development and documented deployment.
- Accessibility: keyboard-operable controls, readable contrast, labelled forms.

## Acceptance criteria
A reviewer can:
1. Configure Sandbox credentials using `.env`.
2. Start the application following the README.
3. Sign in using documented demo instructions.
4. complete a Sandbox checkout and see a persisted order/payment.
5. Refresh a payment status directly through the PayPal API and see the verified provider response reflected in local records.
6. open an issue and inspect its timeline.
7. ask the AI to investigate it and receive evidence-grounded output.
8. review/approve a supported test refund and see the result/audit record.
9. run automated tests and distinguish any tests requiring credentials.
