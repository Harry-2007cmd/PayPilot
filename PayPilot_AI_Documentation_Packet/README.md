# PayPilot AI — Documentation Packet

**Working product name:** PayPilot AI  
**Product concept:** The Payment Detective  
**Purpose:** Hackathon-ready specification and Claude Code build guide.

## How to use this packet
1. Read `CLAUDE.md`.
2. Read `MASTER_PROJECT_SPEC.md`.
3. Read the documents in `docs/` in numerical order.
4. Give Claude `CLAUDE_MASTER_BUILD_PROMPT.md` after the documents are available.
5. Ask Claude to inspect the repository before changing anything, then implement one phase at a time and run tests after each phase.

## Source of truth
`MASTER_PROJECT_SPEC.md` is the primary product and engineering source of truth. Where a detail is not finalized, the docs label it as an assumption or a future extension rather than inventing a commitment.

## Product in one sentence
PayPilot AI helps merchants investigate payment problems by bringing together verified payment records, order data, and event timelines, then using a controlled AI agent to explain the evidence and recommend safe next steps.

## MVP principles
- PayPal Sandbox is the core payment integration and must be real, not mocked.
- The AI must use backend tools and actual application data.
- Financial calculations and authorization decisions are deterministic backend responsibilities.
- No automatic refunds or consequential actions without authenticated human approval.
- External marketplace integrations are not required for the core MVP; imported CSV records are clearly labelled.
- Do not claim live integrations where only a CSV import, test fixture, or sandbox is implemented.
