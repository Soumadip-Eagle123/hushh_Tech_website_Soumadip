---
name: repo-operations
description: Use when working on Hushhtech PR checks, CI/CD, branch protection, merge queue, deploys, env parity, or operational verification.
---

# Hushhtech Repo Operations Skill

## Purpose and Trigger

- Primary scope: `repo-operations-intake`
- Trigger on PR-check failures, workflow truth, branch protection, merge queue, deploy state, and fork-approval questions.
- Avoid overlap with `oss-contribution-triage`, `repo-context`, and direct product implementation skills.

## Coverage and Ownership

- Role: `owner`
- Owner family: `repo-operations`

Owned repo surfaces:

1. `.github/workflows`
2. `scripts/ci`
3. `scripts/security`
4. `scripts/check-production.sh`
5. `scripts/deploy-gcp.sh`
6. `scripts/deploy-location-geocode.sh`
7. `scripts/deploy-ria-intelligence-api.sh`
8. `scripts/gcloud-devops-setup.sh`
9. `scripts/refresh-vertex-ai-token.sh`
10. `scripts/setup-cloud-scheduler-token-refresh.sh`
11. `scripts/setup-token-refresh-cron.sh`
12. `scripts/update-supabase-auth-url.sh`
13. `docs/reference/operations/README.md`
14. `docs/reference/operations/ci-governance.md`

Non-owned surfaces:

1. `oss-contribution-triage`
2. `frontend`
3. `backend`
4. `security-audit`

## Do Use

1. Deciding whether checks ran, what failed, and which statuses are authoritative.
2. Branch protection, merge queue, and post-merge workflow questions.
3. UAT or production workflow governance.

## Do Not Use

1. Final PR bucket selection by itself.
2. Product logic review or UI review.
3. Deep auth/security reasoning beyond operational controls.

## Read First

1. `docs/reference/operations/ci-governance.md`
2. `docs/reference/operations/README.md`
3. `.github/workflows/ci.yml`
4. `.github/workflows/pr-agent.yml`
5. `.github/workflows/pr-intake.yml`
6. `scripts/ci/orchestrate.sh`

## Workflow

1. Determine whether the visible checks are the full intended check surface.
2. Separate PR feedback lane, queue lane, and post-merge lane.
3. Report which failing checks are process-only versus code-authoritative.
4. Hand back the PR decision to `oss-contribution-triage` once the CI truth is clear.

## Handoff Rules

1. Route final PR bucket selection back to `oss-contribution-triage`.
2. Route proof-selection questions to `quality-contracts`.
3. Route auth, env, secret, or fail-closed risk to `security-audit`.
4. Route code fixes to `frontend` or `backend`.

## Required Checks

```bash
npm run env:check
npm run lint:ci
npm run security:audit
bash scripts/ci/orchestrate.sh queue
```
