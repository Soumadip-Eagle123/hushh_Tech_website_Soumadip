# PR Impact Checklist

Use this checklist during OSS contribution triage.

## Capture these fields

1. What user-facing behavior changed?
2. Which repo surface owns the change?
3. Which files prove the contract?
4. Which checks actually ran?
5. Which checks are still needed?
6. Is the change safe for maintainer patching?

## Smallest authoritative proof

Default to the smallest proof that actually demonstrates the changed behavior:

1. `npm test` for unit and integration behavior
2. `npx tsc --noEmit` for type-safety and contract drift
3. `npm run build:web` for runtime/build viability
4. `npm run smoke:ci` for real route/runtime smoke
5. Playwright only when the bug is genuinely browser-dependent

## Patch-and-merge checklist

Only patch-and-merge when all of these are true:

1. the PR is directionally correct
2. the patch is small and local
3. the patch does not change contributor intent
4. the patch can be validated with bounded checks
5. the change does not involve auth, env, secrets, deploy governance, or risky API semantics
