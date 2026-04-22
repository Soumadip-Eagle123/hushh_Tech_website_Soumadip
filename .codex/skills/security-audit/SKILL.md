---
name: security-audit
description: Use when auth, env, secrets, fail-closed behavior, or sensitive API routes make a Hushhtech PR risky to patch or merge.
---

# Hushhtech Security Audit Skill

## Purpose and Trigger

- Primary scope: `security-audit-intake`
- Trigger on auth correctness, env wiring, secret handling, fail-closed behavior, and sensitive API route risk during PR review.
- Avoid overlap with `repo-operations`, `repo-context`, and broad product implementation.

## Coverage and Ownership

- Role: `owner`
- Owner family: `security-audit`

Owned repo surfaces:

1. `src/auth`
2. `src/resources/config`
3. `api/delete-account-service.js`
4. `api/delete-account.js`
5. `api/public-investor-profile.js`
6. `api/send-email-notification.js`
7. `api/gemini-ephemeral-token.js`
8. `api/google-wallet-pass.js`
9. `api/wallet-pass.js`
10. `docs/HUSHH_TECH_SECRET_RUNBOOK.md`
11. `docs/OPEN_SOURCE_SECRET_AUDIT.md`
12. `docs/HUSHH_TECH_SECURITY_AUDIT.md`

Non-owned surfaces:

1. `repo-operations`
2. `oss-contribution-triage`
3. `frontend`
4. `backend`

## Do Use

1. Deciding whether maintainer patching is unsafe.
2. Reviewing auth/session, env contract, and secret exposure risk.
3. Escalating risky PRs into `Request changes` or `Discard/close`.

## Do Not Use

1. Generic CI lane debugging.
2. Routine docs or UI review without security implications.
3. Broad repo orientation.

## Read First

1. `SECURITY.md`
2. `docs/HUSHH_TECH_SECRET_RUNBOOK.md`
3. `docs/OPEN_SOURCE_SECRET_AUDIT.md`
4. `docs/HUSHH_TECH_SECURITY_AUDIT.md`
5. `scripts/ci/check-env-contract.mjs`

## Workflow

1. Identify whether the PR changes auth correctness, secret handling, env contract, or privileged data access.
2. Fail closed on maintainer patching when the risk is not obviously small and local.
3. Route safe bounded follow-up only after the risk surface is clearly contained.

## Handoff Rules

1. Route final PR bucket selection back to `oss-contribution-triage`.
2. Route check-surface trust to `repo-operations`.
3. Route proof selection to `quality-contracts`.
4. Route bounded frontend or backend fixes only after the security boundary is deemed safe.

## Required Checks

```bash
npm run env:check
npm run security:gitleaks
npm run security:audit
```
