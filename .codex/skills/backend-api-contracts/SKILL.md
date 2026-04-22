---
name: backend-api-contracts
description: Use when a contributor PR changes Hushhtech API request or response behavior, route semantics, or page-to-API contract alignment.
---

# Hushhtech Backend API Contracts Skill

## Purpose and Trigger

- Primary scope: `backend-api-contracts`
- Trigger on request/response shape review, route semantics, and page-to-API contract alignment during PR triage or patch-and-merge review.
- Avoid overlap with `backend`, `repo-operations`, and `frontend`.

## Coverage and Ownership

- Role: `spoke`
- Owner family: `backend`

Owned repo surfaces:

1. `api/public-investor-profile.js`
2. `api/google-wallet-pass.js`
3. `api/wallet-pass.js`
4. `api/delete-account.js`
5. `api/career-application.js`
6. `api/metrics`
7. `api/analytics`
8. `docs/reference/architecture/api-contracts.md`

Non-owned surfaces:

1. `backend`
2. `quality-contracts`
3. `security-audit`
4. `frontend`

## Do Use

1. Reviewing API wire-shape and route behavior changes.
2. Deciding whether a small contract correction is safe for maintainer patching.
3. Keeping page-to-API expectations aligned with route behavior.

## Do Not Use

1. Broad backend intake when the issue is not clearly a contract problem.
2. CI pipeline debugging.
3. Security review as the primary concern.

## Read First

1. `docs/reference/architecture/api-contracts.md`
2. `server.js`
3. `package.json`

## Workflow

1. Treat the route behavior and its calling surface as one contract.
2. Reject patch-and-merge when the change would alter contract intent in a broad or risky way.
3. Escalate to `security-audit` when the route behavior is privileged or fail-closed.

## Handoff Rules

1. Route broad backend intake back to `backend`.
2. Route final PR bucket selection back to `oss-contribution-triage`.
3. Route proof selection to `quality-contracts`.
4. Route sensitive privileged-route changes to `security-audit`.

## Required Checks

```bash
npm test
npx tsc --noEmit
npm run build:web
```
