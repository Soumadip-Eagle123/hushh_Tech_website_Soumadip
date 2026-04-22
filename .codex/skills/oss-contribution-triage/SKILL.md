---
name: oss-contribution-triage
description: Use when a contributor opens a pull request and a maintainer needs to decide whether to merge, patch-and-merge, request changes, or discard/close it.
---

# Hushhtech OSS Contribution Triage Skill

## Purpose and Trigger

- Primary scope: `oss-contribution-triage-intake`
- Trigger on contributor PR intake, maintainer review after agent + CI, and deciding whether a PR should merge, patch-and-merge, request changes, or be discarded.
- Avoid overlap with `repo-context`, `repo-operations`, and direct product implementation skills.

## Coverage and Ownership

- Role: `owner`
- Owner family: `oss-contribution-triage`

Owned repo surfaces:

1. `.codex/workflows/contribution-triage`
2. `docs/reference/operations/oss-contribution-triage.md`
3. `docs/reference/operations/pr-decision-rubric.md`
4. `.codex/skills/oss-contribution-triage/references/decision-buckets.md`

Non-owned surfaces:

1. `repo-operations`
2. `quality-contracts`
3. `security-audit`
4. `docs-governance`
5. `frontend`
6. `backend`

## Do Use

1. Turning a contributor PR into one maintainer decision bucket.
2. Deciding whether maintainer patching is allowed.
3. Routing bounded follow-up work into the right owner skill.

## Do Not Use

1. Broad repo orientation before the surface is known.
2. CI investigation without a PR decision goal.
3. Direct implementation fixes once the decision has already been made.

## Read First

1. `CONTRIBUTING.md`
2. `SECURITY.md`
3. `docs/reference/operations/ci-governance.md`
4. `docs/reference/operations/oss-contribution-triage.md`
5. `docs/reference/operations/pr-decision-rubric.md`
6. `.codex/skills/oss-contribution-triage/references/decision-buckets.md`

## Workflow

1. Read the agent review and check whether the full PR-check surface actually ran.
2. Ask `repo-operations` whether the CI story is complete and trustworthy.
3. Ask `quality-contracts` what proof is authoritative for the changed behavior.
4. Ask `security-audit` whether maintainer patching is unsafe.
5. Select exactly one bucket: `Merge`, `Patch-and-merge`, `Request changes`, or `Discard/close`.

## Handoff Rules

1. Route incomplete CI truth to `repo-operations`.
2. Route proof selection to `quality-contracts`.
3. Route auth, env, secret, deploy, or privileged API risk to `security-audit`.
4. Route docs-only follow-up to `docs-governance`.
5. Route bounded code patches to `frontend`, `frontend-design-system`, `backend`, or `backend-api-contracts`.

## Required Checks

```bash
npm run env:check
npm run lint:ci
npm test
npx tsc --noEmit
npm run build:web
```
