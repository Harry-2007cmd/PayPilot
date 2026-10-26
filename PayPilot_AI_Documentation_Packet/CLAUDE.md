# Instructions for Claude Code

You are implementing **PayPilot AI**, an AI-assisted payment investigation and safe-resolution application for the PayPal AI Hackathon.

## Required reading
Before editing code, read:
- `MASTER_PROJECT_SPEC.md`
- Every file in `docs/`
- `CLAUDE_MASTER_BUILD_PROMPT.md`

## Working rules
1. Inspect the existing repository and report its current structure before making changes.
2. Preserve useful existing code. Do not replace files wholesale without understanding them.
3. Implement in the order specified in `docs/09_IMPLEMENTATION_ROADMAP.md`.
4. Work in small, testable phases. At the end of each phase, run relevant tests and report:
   - files changed,
   - commands run,
   - test outcomes,
   - configuration still needed,
   - known limitations.
5. Never claim a provider integration is live unless it has been tested with the actual API. Clearly label sandbox, imported, fixture, and live data.
6. Never commit secrets. Use `.env` locally and provide `.env.example` with placeholders only.
7. Never expose PayPal client secrets to the browser.
8. Never let the language model directly run arbitrary SQL, execute shell commands, or authorize payments/refunds.
9. The model may request only registered, typed backend tools. The backend must validate inputs and enforce merchant ownership and permissions.
10. Payment amounts must use decimal-safe arithmetic and explicit currency codes. Never add different currencies without a documented conversion process.
11. Verify PayPal webhook signatures using the supported verification process before trusting event data. Make webhook handling idempotent.
12. Require authenticated human approval for refunds or other consequential operations. Revalidate the payment and action immediately before execution.
13. Do not create fake success responses that appear to be real PayPal data. Test fixtures must be clearly marked as fixtures.
14. If an API credential, sponsor tool access, or account approval is unavailable, implement a clearly labelled adapter boundary and document the limitation; do not silently substitute a mock.
15. Follow current official provider documentation for endpoints, SDKs, versions, permissions, and terms.

## Definition of done for a phase
- The feature works on the intended platform.
- Relevant automated tests pass.
- Error and loading states are handled.
- Security and ownership checks are present.
- Setup documentation is updated.
- No unsupported claims are made about integrations.
