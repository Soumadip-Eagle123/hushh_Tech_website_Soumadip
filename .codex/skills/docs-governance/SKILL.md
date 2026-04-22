---
name: docs-governance
description: Use when PR triage or patching depends on contributor docs, policy docs, or documentation placement and wording.
---

# Hushhtech Docs Governance Skill

## Purpose and Trigger

- Primary scope: `docs-governance-intake`
- Trigger on docs-only PRs, contributor-policy drift, and PR triage decisions that depend on documentation correctness.
- Avoid overlap with `repo-context`, `repo-operations`, and product implementation skills.

## Coverage and Ownership

- Role: `owner`
- Owner family: `docs-governance`

Owned repo surfaces:

1. `README.md`
2. `CONTRIBUTING.md`
3. `SECURITY.md`
4. `docs/reference/README.md`

Non-owned surfaces:

1. `repo-context`
2. `oss-contribution-triage`
3. `repo-operations`
4. `frontend`
5. `backend`

## Do Use

1. Routing docs-only PRs into `Merge`, `Patch-and-merge`, or `Discard/close`.
2. Deciding where contributor-policy or governance docs belong.
3. Maintaining contributor-facing documentation that supports OSS review flow.

## Do Not Use

1. CI pipeline debugging.
2. Product logic implementation.
3. Broad repo orientation once the docs surface is already clear.

## Read First

1. `README.md`
2. `CONTRIBUTING.md`
3. `SECURITY.md`
4. `docs/reference/README.md`
5. `docs/reference/operations/oss-contribution-triage.md`

## Workflow

1. Decide whether the change is canonical, additive, or duplicate.
2. Keep contributor and security guidance aligned with PR governance.
3. Patch-and-merge docs only when the fix is obvious and local.

## Handoff Rules

1. Route final bucket selection back to `oss-contribution-triage`.
2. Route broad repo scans to `repo-context`.
3. Route CI or workflow policy questions to `repo-operations`.
4. Route product implementation to `frontend` or `backend`.

## Required Checks

```bash
git diff --check
rg -n "PR Agent|CI Status Gate|Patch-and-merge|Discard/close" README.md CONTRIBUTING.md SECURITY.md docs
```
