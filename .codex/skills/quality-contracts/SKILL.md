---
name: quality-contracts
description: Use when deciding which checks are authoritative for a Hushhtech PR and whether the right proof exists for the changed behavior.
---

# Hushhtech Quality Contracts Skill

## Purpose and Trigger

- Primary scope: `quality-contracts`
- Trigger on test selection, proof minimization, and deciding which checks are authoritative for a PR.
- Avoid overlap with `repo-operations` and direct implementation skills.

## Coverage and Ownership

- Role: `spoke`
- Owner family: `oss-contribution-triage`

Owned repo surfaces:

1. `tests`
2. `vitest.config.ts`
3. `docs/reference/quality/pr-impact-checklist.md`

Non-owned surfaces:

1. `oss-contribution-triage`
2. `repo-operations`
3. `frontend`
4. `backend`

## Do Use

1. Deciding whether unit, typecheck, build, smoke, or browser proof is authoritative.
2. Calling out missing proof in a contributor PR.
3. Keeping patch-and-merge bounded to the right validation bundle.

## Do Not Use

1. Pipeline ownership or workflow debugging.
2. Final PR bucket selection without first reasoning about proof.
3. Pure product implementation.

## Read First

1. `docs/reference/quality/pr-impact-checklist.md`
2. `package.json`
3. `vitest.config.ts`
4. `docs/reference/operations/ci-governance.md`

## Workflow

1. Start from the changed behavior, not from the largest available test suite.
2. Select the smallest authoritative proof.
3. Escalate to `security-audit` if the missing proof involves auth, env, or privileged routes.

## Handoff Rules

1. Route final bucket selection back to `oss-contribution-triage`.
2. Route workflow trust questions to `repo-operations`.
3. Route sensitive security risk to `security-audit`.
4. Route code fixes to `frontend` or `backend`.

## Required Checks

```bash
npm test
npx tsc --noEmit
npm run build:web
npm run smoke:ci
```
