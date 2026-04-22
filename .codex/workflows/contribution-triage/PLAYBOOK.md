# OSS Contribution Triage

Use this workflow pack when the task matches `contribution-triage`.

## Goal

Classify an incoming pull request into `Merge`, `Patch-and-merge`, `Request changes`, or `Discard/close` after reading the agent review, CI state, diff surface, and risk profile.

## Steps

1. Start with `oss-contribution-triage` unless the repo surface is still ambiguous, in which case start with `repo-context`.
2. Capture the affected surface, agent-review findings, PR-check state, and whether the PR comes from a fork or trusted branch.
3. Use `repo-operations` to decide whether the check surface is complete and trustworthy.
4. Use `quality-contracts` to choose the smallest authoritative proof for the changed behavior.
5. Escalate to `security-audit` if the PR touches auth, env, secrets, sensitive API routes, or deployment controls.
6. Select exactly one bucket:
   - `Merge`
   - `Patch-and-merge`
   - `Request changes`
   - `Discard/close`
7. Record the reason, risk level, patch-allowed decision, required checks, and next owner skill if follow-up work is needed.

## Patch-and-merge boundary

`Patch-and-merge` is allowed only when the maintainer fix is small, local, and low-risk.

Good examples:

1. one wrong route
2. one missing test
3. one small docs or PR hygiene fix
4. one bounded UI behavior correction

Do not `Patch-and-merge` when the PR changes:

1. auth or session correctness
2. env or secret wiring
3. public API contract shape
4. deployment or CI governance
5. broad mixed-scope behavior that needs author intent clarified

## Common drift risks

1. treating green CI as enough even when the real contract was never tested
2. silently patching risky code instead of pushing responsibility back to the contributor
3. leaving duplicate or clearly unsalvageable PRs open instead of closing them
