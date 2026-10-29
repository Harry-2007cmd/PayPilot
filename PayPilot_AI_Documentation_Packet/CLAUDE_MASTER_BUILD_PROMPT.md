# Claude Master Build Prompt — PayPilot AI

You are the lead full-stack engineer building PayPilot AI for the PayPal AI Hackathon. Read `CLAUDE.md`, `MASTER_PROJECT_SPEC.md`, and every document under `docs/` before implementing.

## First response
1. Inspect the existing workspace/repository and report the current stack, files, and what can be reused.
2. Compare it against the specification and identify conflicts or missing dependencies.
3. Present a short phase plan based on `docs/09_IMPLEMENTATION_ROADMAP.md`.
4. Start Phase 1 without waiting for me to repeat documented decisions. Ask only if a genuinely blocking choice cannot be resolved from the files.

## Product requirements
Build a functioning payment investigation application, not a static prototype:
- PayPal Sandbox checkout, server-side order creation/capture, persistent records.
- Deterministic discrepancy checks and investigation queue.
- Payment detail timeline with provenance labels.
- AI investigation agent using registered typed backend tools and actual application records.
- Evidence-backed findings with uncertainty and recommendations.
- Explicit human approval for refunds/actions; backend revalidates and executes supported operations.
- Audit history and merchant-scoped authorization.
- AG Grid AG Studio integration if feasible and verified; document exact package/access constraints and do not fake sponsor usage.
- CSV import for external records as a clearly labelled fallback; do not claim Amazon/Flipkart or other marketplaces are live unless they truly are.

## Required engineering process
- Work in small phases; do not attempt the entire application in one untested pass.
- Create `.env.example`, database migrations, seed/demo instructions, and automated tests.
- Use current official PayPal documentation and official docs for libraries/services.
- Keep client secrets on the backend.
- Use Decimal-safe currency arithmetic.
- No arbitrary model-generated SQL, shell execution, or direct payment operations by the model.
- Make UI loading, empty, success, and error states.
- At each phase, run tests and summarize changed files, commands, results, and blockers.
- Update docs whenever implementation differs from the spec.
- Do not state that a feature works until tested.
- Finish with a reliable end-to-end demo path and a concise under-three-minute video script.

Begin with repository inspection and Phase 1.