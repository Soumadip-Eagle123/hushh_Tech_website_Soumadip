---
name: backend
description: Use when a contributor PR touches Hushhtech API routes, runtime helpers, or backend behavior and the correct narrower backend spoke is not yet obvious.
---

# Hushhtech Backend Skill

## Purpose and Trigger

- Primary scope: `backend-intake`
- Trigger on broad backend runtime review, API route behavior, server behavior, and bounded backend patch-and-merge work.
- Avoid overlap with `backend-api-contracts`, `security-audit`, and `repo-operations`.

## Coverage and Ownership

- Role: `owner`
- Owner family: `backend`

Owned repo surfaces:

1. `api`
2. `api/shared`
3. `server.js`
4. `supabase`
5. `cloud-run`

Non-owned surfaces:

1. `backend-api-contracts`
2. `quality-contracts`
3. `security-audit`
4. `repo-operations`

## Do Use

1. Broad API and backend runtime intake during PR review.
2. Bounded maintainer patches for backend behavior when the PR is directionally correct.
3. Routing contract-specific issues into `backend-api-contracts`.

## Do Not Use

1. CI pipeline truth and branch-protection work.
2. Security analysis as the primary concern.
3. Broad repo orientation.

## Read First

1. `server.js`
2. `docs/reference/architecture/api-contracts.md`
3. `docs/project_context_map.md`
4. `package.json`

## Workflow

1. Identify whether the issue is runtime behavior or wire-contract shape.
2. Keep route behavior and shared helper behavior aligned.
3. Escalate to `security-audit` when the backend patch affects auth, secrets, or fail-closed behavior.

## Handoff Rules

1. Route wire-contract review to `backend-api-contracts`.
2. Route final PR bucket selection back to `oss-contribution-triage`.
3. Route proof selection to `quality-contracts`.
4. Route security-sensitive backend changes to `security-audit`.

## Required Checks

```bash
npm test
npx tsc --noEmit
npm run build:web
```
